import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as net from 'net';
import { exec } from 'child_process';
import * as vscode from 'vscode';

export class ProxyController {
  private serverDir: string;
  private disabledFlagPath: string;

  constructor() {
    this.serverDir = path.join(os.homedir(), '.antigravity-ide-server');
    this.disabledFlagPath = path.join(this.serverDir, 'proxy.disabled');
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

  public async restartAgy(): Promise<void> {
    return new Promise((resolve) => {
      // Use pidof to terminate agy processes cleanly without hanging on D-state
      const cmd = `for p in $(pidof agy agy.real 2>/dev/null); do kill -9 "$p" 2>/dev/null || true; done`;
      exec(cmd, () => {
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
