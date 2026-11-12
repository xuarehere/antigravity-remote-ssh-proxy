import * as net from 'net';
import * as vscode from 'vscode';
import { TunnelManager } from './tunnelManager';
import { SshBridge } from './sshBridge';
import { RemoteDeployer } from './remoteDeployer';

export class ProxyController implements vscode.Disposable {
  private tunnelManager: TunnelManager;
  private deployer: RemoteDeployer;
  private cachedEnabledState: boolean = true;

  constructor() {
    this.tunnelManager = new TunnelManager();
    this.deployer = new RemoteDeployer();
  }

  public getTunnelManager(): TunnelManager {
    return this.tunnelManager;
  }

  public getDeployer(): RemoteDeployer {
    return this.deployer;
  }

  /**
   * Decode host alias from VS Code Remote-SSH authority.
   * VS Code Remote-SSH encodes authority as: ssh-remote+<hex-encoded-json> or ssh-remote+<plain-host>
   */
  public static parseRemoteHostFromAuthority(rawAuth: string): string | null {
    if (!rawAuth || !rawAuth.startsWith('ssh-remote+')) {
      return null;
    }
    const payload = rawAuth.substring('ssh-remote+'.length);

    // 1. Check if hex-encoded JSON (VS Code Remote-SSH standard format)
    if (/^[0-9a-fA-F]+$/.test(payload) && payload.length % 2 === 0) {
      try {
        const decoded = Buffer.from(payload, 'hex').toString('utf8');
        if (decoded.startsWith('{') && decoded.endsWith('}')) {
          const parsed = JSON.parse(decoded);
          const rawHost = (parsed.hostName || parsed.hostname || parsed.host || '').trim();
          if (rawHost) {
            const port = parsed.port ? Number(parsed.port) : undefined;
            const user = parsed.user ? String(parsed.user).trim() : undefined;
            if (port && port !== 22) {
              const target = user ? `${user}@${rawHost}` : rawHost;
              return `-p ${port} ${target}`;
            }
            return user ? `${user}@${rawHost}` : rawHost;
          }
        }
      } catch {
        // Fallback to direct decoding
      }
    }

    // 2. Fallback to URI-encoded / plain string
    try {
      const decoded = decodeURIComponent(payload).trim();
      if (decoded) {
        return decoded;
      }
    } catch {
      // fallback
    }

    return payload.trim() || null;
  }

  /**
   * Auto-detect remote host alias from VS Code remote workspace.
   */
  public detectRemoteHost(): string | null {
    if (vscode.env.remoteName !== 'ssh-remote') {
      return null;
    }

    // 1. Check workspace folders authority (e.g. ssh-remote+10.192.41.183-container-p6680-antigravity-plugin)
    const folders = vscode.workspace.workspaceFolders;
    if (folders && folders.length > 0) {
      for (const f of folders) {
        const host = ProxyController.parseRemoteHostFromAuthority(f.uri.authority);
        if (host) {
          return host;
        }
      }
    }

    // 2. Check active text editor document authority
    const editorUri = vscode.window.activeTextEditor?.document.uri;
    if (editorUri && editorUri.authority) {
      const host = ProxyController.parseRemoteHostFromAuthority(editorUri.authority);
      if (host) {
        return host;
      }
    }

    // 3. Check workspace file authority
    const wsFile = vscode.workspace.workspaceFile;
    if (wsFile && wsFile.authority) {
      const host = ProxyController.parseRemoteHostFromAuthority(wsFile.authority);
      if (host) {
        return host;
      }
    }

    // 4. Check visible tab groups
    for (const group of vscode.window.tabGroups.all) {
      for (const tab of group.tabs) {
        const inputUri = (tab.input as any)?.uri;
        if (inputUri && inputUri.authority) {
          const host = ProxyController.parseRemoteHostFromAuthority(inputUri.authority);
          if (host) {
            return host;
          }
        }
      }
    }

    // 5. Fallback to user-configured remote host (if explicitly set, otherwise null)
    const config = vscode.workspace.getConfiguration('antigravityRemoteProxy');
    const configured = config.get<string>('remoteHost', '').trim();
    if (configured) {
      return configured;
    }

    return null;
  }

  /**
   * Async helper that polls for remote host resolution during IDE startup.
   */
  public async waitForRemoteHost(maxAttempts = 10, delayMs = 500): Promise<string | null> {
    for (let i = 0; i < maxAttempts; i++) {
      const host = this.detectRemoteHost();
      if (host) {
        return host;
      }
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
    return null;
  }

  public getProxyHost(): string {
    const config = vscode.workspace.getConfiguration('antigravityRemoteProxy');
    return config.get<string>('proxyHost', '127.0.0.1').trim() || '127.0.0.1';
  }

  public getProxyPort(): number {
    const config = vscode.workspace.getConfiguration('antigravityRemoteProxy');
    const port = config.get<number>('proxyPort', 7897);
    return typeof port === 'number' && port > 0 && port <= 65535 ? port : 7897;
  }

  public isEnabled(): boolean {
    return this.cachedEnabledState;
  }

  /**
   * Sync enabled state and configuration from remote container.
   */
  public async syncStatusFromRemote(): Promise<boolean> {
    const host = this.detectRemoteHost();
    if (!host) {
      return this.cachedEnabledState;
    }

    try {
      const checkCmd = `[ -f "$HOME/.antigravity-ide-server/proxy.disabled" ] && echo "DISABLED" || echo "ENABLED"`;
      const res = await SshBridge.execRemote(host, checkCmd, 4000);
      this.cachedEnabledState = !res.stdout.includes('DISABLED');
    } catch {
      // Keep cached state on error
    }

    return this.cachedEnabledState;
  }

  public async restartLocalAgy(): Promise<void> {
    if (process.platform === 'win32') {
      const { exec } = require('child_process');
      exec('taskkill /IM agy.exe /F', () => {});
    }
  }

  public async enable(): Promise<void> {
    const host = this.detectRemoteHost();
    const port = this.getProxyPort();
    const proxyHost = this.getProxyHost();

    try {
      if (host) {
        // --- Remote Container Branch ---
        await this.tunnelManager.startTunnel(host, port, port);
        try {
          const httpConfig = vscode.workspace.getConfiguration('http');
          await httpConfig.update('proxy', `http://${proxyHost}:${port}`, vscode.ConfigurationTarget.Workspace);
        } catch {
          // Ignore if no workspace folder open
        }

        await SshBridge.execRemote(host, 'rm -f "$HOME/.antigravity-ide-server/proxy.disabled"', 4000);
        const isDeployed = await this.deployer.isDeployed(host);
        if (!isDeployed) {
          await this.deployer.deploy(host, proxyHost, port);
        }
        await this.restartAgy(host);
      } else {
        // --- Local Windows Branch ---
        const httpConfig = vscode.workspace.getConfiguration('http');
        await httpConfig.update('proxy', `http://${proxyHost}:${port}`, vscode.ConfigurationTarget.Global);
        await this.restartLocalAgy();
      }

      this.cachedEnabledState = true;
    } catch (err: any) {
      vscode.window.showErrorMessage(`开启代理失败: ${err.message}`);
    }
  }

  public async disable(): Promise<void> {
    const host = this.detectRemoteHost();

    try {
      if (host) {
        // --- Remote Container Branch ---
        try {
          const httpConfig = vscode.workspace.getConfiguration('http');
          await httpConfig.update('proxy', undefined, vscode.ConfigurationTarget.Workspace);
        } catch {
          // Ignore
        }

        const cmd = 'mkdir -p "$HOME/.antigravity-ide-server" && touch "$HOME/.antigravity-ide-server/proxy.disabled"';
        await SshBridge.execRemote(host, cmd, 4000);
        this.tunnelManager.stopTunnel();
        await this.restartAgy(host);
      } else {
        // --- Local Windows Branch ---
        const httpConfig = vscode.workspace.getConfiguration('http');
        await httpConfig.update('proxy', undefined, vscode.ConfigurationTarget.Global);
        await this.restartLocalAgy();
      }

      this.cachedEnabledState = false;
    } catch (err: any) {
      vscode.window.showErrorMessage(`关闭代理失败: ${err.message}`);
    }
  }

  public async toggle(): Promise<boolean> {
    if (this.isEnabled()) {
      await this.disable();
      return false;
    } else {
      await this.enable();
      return true;
    }
  }

  public async saveConfig(host: string, port: number): Promise<void> {
    const trimmedHost = (host || '127.0.0.1').trim();
    const portNum = Number(port) || 7897;

    // 1. Update VS Code configuration
    const config = vscode.workspace.getConfiguration('antigravityRemoteProxy');
    await config.update('proxyHost', trimmedHost, vscode.ConfigurationTarget.Global);
    await config.update('proxyPort', portNum, vscode.ConfigurationTarget.Global);

    const remoteHost = this.detectRemoteHost();
    if (remoteHost) {
      // 2. Update remote container proxy.conf
      const remoteCmd = `mkdir -p "$HOME/.antigravity-ide-server" && printf 'PROXY_HOST="%s"\\nPROXY_PORT="%s"\\n' '${trimmedHost}' '${portNum}' > "$HOME/.antigravity-ide-server/proxy.conf"`;
      await SshBridge.execRemote(remoteHost, remoteCmd, 4000);

      // 3. If currently enabled, ensure tunnel and restart agy
      if (this.isEnabled()) {
        await this.tunnelManager.startTunnel(remoteHost, portNum, portNum);
        try {
          const httpConfig = vscode.workspace.getConfiguration('http');
          await httpConfig.update('proxy', `http://${trimmedHost}:${portNum}`, vscode.ConfigurationTarget.Workspace);
        } catch {
          // Ignore
        }
        await this.restartAgy(remoteHost);
      }
    } else {
      // Local Windows: update global http.proxy if enabled
      if (this.isEnabled()) {
        const httpConfig = vscode.workspace.getConfiguration('http');
        await httpConfig.update('proxy', `http://${trimmedHost}:${portNum}`, vscode.ConfigurationTarget.Global);
        await this.restartLocalAgy();
      }
    }
  }

  public async restoreRemote(): Promise<boolean> {
    const host = this.detectRemoteHost();
    this.tunnelManager.stopTunnel();

    try {
      const httpConfig = vscode.workspace.getConfiguration('http');
      await httpConfig.update('proxy', undefined, vscode.ConfigurationTarget.Workspace);
      if (!host) {
        await httpConfig.update('proxy', undefined, vscode.ConfigurationTarget.Global);
        await this.restartLocalAgy();
      }
    } catch {
      // Ignore
    }

    if (!host) {
      this.cachedEnabledState = false;
      return true;
    }

    // Clean restore remote environment
    const success = await this.deployer.restore(host);
    this.cachedEnabledState = false;
    return success;
  }

  public async restartAgy(targetHost?: string): Promise<void> {
    const host = targetHost || this.detectRemoteHost();
    if (!host) {
      return;
    }

    const cmd = 'for p in $(pidof agy agy.real 2>/dev/null); do kill -9 "$p" 2>/dev/null || true; done';
    await SshBridge.execRemote(host, cmd, 4000);
  }

  /**
   * Check if proxy port is listening. Runs INSIDE remote container if host is available.
   */
  public async checkPort(port: number, host = '127.0.0.1', timeout = 1500): Promise<boolean> {
    const remoteHost = this.detectRemoteHost();
    if (remoteHost) {
      const probeCmd = `if command -v nc >/dev/null 2>&1; then nc -w 1 -z "${host}" "${port}" 2>/dev/null && echo "OPEN" || echo "CLOSED"; else timeout 1 bash -c "cat < /dev/null > /dev/tcp/${host}/${port}" 2>/dev/null && echo "OPEN" || echo "CLOSED"; fi`;
      const res = await SshBridge.execRemote(remoteHost, probeCmd, timeout + 1000);
      return res.stdout.includes('OPEN');
    }

    // Local fallback
    return new Promise((resolve) => {
      const socket = new net.Socket();
      socket.setTimeout(timeout);

      socket.on('connect', () => {
        socket.destroy();
        resolve(true);
      });

      socket.on('timeout', () => {
        socket.destroy();
        resolve(false);
      });

      socket.on('error', () => {
        socket.destroy();
        resolve(false);
      });

      socket.connect(port, host);
    });
  }

  public dispose(): void {
    this.tunnelManager.dispose();
  }
}
