import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as net from 'net';
import { exec } from 'child_process';
import * as vscode from 'vscode';

export class ProxyController {
  private serverDir: string;
  private disabledFlagPath: string;
  private confFilePath: string;

  constructor() {
    this.serverDir = path.join(os.homedir(), '.antigravity-ide-server');
    this.disabledFlagPath = path.join(this.serverDir, 'proxy.disabled');
    this.confFilePath = path.join(this.serverDir, 'proxy.conf');
  }

  public getProxyHost(): string {
    const config = vscode.workspace.getConfiguration('antigravityRemoteProxy');
    let host = config.get<string>('proxyHost', '127.0.0.1');

    try {
      if (fs.existsSync(this.confFilePath)) {
        const raw = fs.readFileSync(this.confFilePath, 'utf8');
        const match = raw.match(/PROXY_HOST=["']?([^"'\s\r\n]+)["']?/);
        if (match && match[1]) {
          host = match[1];
        }
      }
    } catch {
      // Ignore read errors, fallback to config
    }

    return host;
  }

  public getProxyPort(): number {
    const config = vscode.workspace.getConfiguration('antigravityRemoteProxy');
    let port = config.get<number>('proxyPort', 7897);

    try {
      if (fs.existsSync(this.confFilePath)) {
        const raw = fs.readFileSync(this.confFilePath, 'utf8');
        const match = raw.match(/PROXY_PORT=["']?([0-9]+)["']?/);
        if (match && match[1]) {
          const parsed = parseInt(match[1], 10);
          if (!isNaN(parsed) && parsed > 0 && parsed <= 65535) {
            port = parsed;
          }
        }
      }
    } catch {
      // Ignore read errors, fallback to config
    }

    return port;
  }

  public isEnabled(): boolean {
    try {
      return !fs.existsSync(this.disabledFlagPath);
    } catch {
      return true;
    }
  }

  public async enable(): Promise<void> {
    try {
      if (fs.existsSync(this.disabledFlagPath)) {
        fs.unlinkSync(this.disabledFlagPath);
      }
      await this.restartAgy();
    } catch (err: any) {
      vscode.window.showErrorMessage(`开启代理失败: ${err.message}`);
    }
  }

  public async disable(): Promise<void> {
    try {
      if (!fs.existsSync(this.serverDir)) {
        fs.mkdirSync(this.serverDir, { recursive: true });
      }
      fs.writeFileSync(this.disabledFlagPath, '');
      await this.restartAgy();
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

    // 2. Write to ~/.antigravity-ide-server/proxy.conf
    try {
      if (!fs.existsSync(this.serverDir)) {
        fs.mkdirSync(this.serverDir, { recursive: true });
      }
      const confContent = `PROXY_HOST="${trimmedHost}"\nPROXY_PORT="${portNum}"\n`;
      fs.writeFileSync(this.confFilePath, confContent, 'utf8');
    } catch (err: any) {
      vscode.window.showWarningMessage(`写入本地配置文件失败: ${err.message}`);
    }

    // 3. If running on local Windows, sync to remote via SSH if remoteHost configured
    if (!vscode.env.remoteName && os.platform() === 'win32') {
      const remoteHost = config.get<string>('remoteHost', '10.192.41.183-zbz-3090');
      if (remoteHost) {
        await this.syncToRemoteSsh(remoteHost, trimmedHost, portNum);
      }
    }

    // 4. Restart agy process
    await this.restartAgy();
  }

  private syncToRemoteSsh(remoteHost: string, host: string, port: number): Promise<void> {
    return new Promise((resolve) => {
      const script = `mkdir -p ~/.antigravity-ide-server && printf 'PROXY_HOST="%s"\\nPROXY_PORT="%s"\\n' '${host}' '${port}' > ~/.antigravity-ide-server/proxy.conf && for p in $(pidof agy agy.real 2>/dev/null); do kill -9 $p 2>/dev/null || true; done`;
      const cmd = `ssh -n ${remoteHost} "${script}"`;
      exec(cmd, { timeout: 6000 }, () => {
        resolve();
      });
    });
  }

  public async restartAgy(): Promise<void> {
    return new Promise((resolve) => {
      // Use pidof to terminate agy processes cleanly without hanging on D-state
      const cmd = `for p in $(pidof agy agy.real 2>/dev/null); do kill -9 "$p" 2>/dev/null || true; done`;
      exec(cmd, { timeout: 4000 }, () => {
        resolve();
      });
    });
  }

  public checkPort(port: number, host = '127.0.0.1', timeout = 1500): Promise<boolean> {
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
}
