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
   * Auto-detect remote host alias from VS Code remote workspace.
   */
  public detectRemoteHost(): string | null {
    // 1. Check workspace folders authority (e.g. ssh-remote+10.192.41.183-container-p6680-antigravity-plugin)
    const folders = vscode.workspace.workspaceFolders;
    if (folders && folders.length > 0) {
      for (const f of folders) {
        const auth = f.uri.authority;
        if (auth && auth.startsWith('ssh-remote+')) {
          return decodeURIComponent(auth.substring('ssh-remote+'.length));
        }
      }
    }

    // 2. Check active text editor document authority
    const editorUri = vscode.window.activeTextEditor?.document.uri;
    if (editorUri && editorUri.authority && editorUri.authority.startsWith('ssh-remote+')) {
      return decodeURIComponent(editorUri.authority.substring('ssh-remote+'.length));
    }

    // 3. Check workspace file authority
    const wsFile = vscode.workspace.workspaceFile;
    if (wsFile && wsFile.authority && wsFile.authority.startsWith('ssh-remote+')) {
      return decodeURIComponent(wsFile.authority.substring('ssh-remote+'.length));
    }

    // 4. Fallback to user-configured remote host
    const config = vscode.workspace.getConfiguration('antigravityRemoteProxy');
    const configured = config.get<string>('remoteHost', '').trim();
    if (configured) {
      return configured;
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

  public async enable(): Promise<void> {
    const host = this.detectRemoteHost();
    const port = this.getProxyPort();

    try {
      if (host) {
        // 1. Remove remote disabled flag
        await SshBridge.execRemote(host, 'rm -f "$HOME/.antigravity-ide-server/proxy.disabled"', 4000);

        // 2. Ensure remote wrapper is deployed
        const isDeployed = await this.deployer.isDeployed(host);
        if (!isDeployed) {
          await this.deployer.deploy(host);
        }

        // 3. Start dynamic local tunnel to remote host
        await this.tunnelManager.startTunnel(host, port, port);

        // 4. Restart agy on remote container
        await this.restartAgy(host);
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
        // 1. Create remote disabled flag
        const cmd = 'mkdir -p "$HOME/.antigravity-ide-server" && touch "$HOME/.antigravity-ide-server/proxy.disabled"';
        await SshBridge.execRemote(host, cmd, 4000);

        // 2. Stop local dynamic tunnel
        this.tunnelManager.stopTunnel();

        // 3. Restart agy on remote container (switches to 100% direct connection)
        await this.restartAgy(host);
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

    // 2. Update remote container proxy.conf
    const remoteHost = this.detectRemoteHost();
    if (remoteHost) {
      const remoteCmd = `mkdir -p "$HOME/.antigravity-ide-server" && printf 'PROXY_HOST="%s"\\nPROXY_PORT="%s"\\n' '${trimmedHost}' '${portNum}' > "$HOME/.antigravity-ide-server/proxy.conf"`;
      await SshBridge.execRemote(remoteHost, remoteCmd, 4000);

      // 3. If currently enabled, ensure tunnel and restart agy
      if (this.isEnabled()) {
        await this.tunnelManager.startTunnel(remoteHost, portNum, portNum);
        await this.restartAgy(remoteHost);
      }
    }
  }

  public async restoreRemote(): Promise<boolean> {
    const host = this.detectRemoteHost();
    // 1. Stop local dynamic tunnel
    this.tunnelManager.stopTunnel();

    if (!host) {
      return true;
    }

    // 2. Clean restore remote environment
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
