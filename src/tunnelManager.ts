import { ChildProcess, spawn, exec } from 'child_process';
import * as os from 'os';
import * as vscode from 'vscode';

export class TunnelManager implements vscode.Disposable {
  private tunnelProcess: ChildProcess | null = null;
  private currentHost: string | null = null;
  private activePort: number = 7897;

  public isTunnelActive(): boolean {
    return this.tunnelProcess !== null && !this.tunnelProcess.killed;
  }

  public getActiveHost(): string | null {
    return this.currentHost;
  }

  public async startTunnel(targetHost: string, remotePort = 7897, localPort = 7897): Promise<boolean> {
    const trimmedHost = (targetHost || '').trim();
    if (!trimmedHost) {
      return false;
    }

    // If tunnel is already running for the same host, reuse
    if (this.isTunnelActive() && this.currentHost === trimmedHost && this.activePort === remotePort) {
      return true;
    }

    // Stop existing tunnel if switching host or port
    this.stopTunnel();

    this.currentHost = trimmedHost;
    this.activePort = remotePort;

    try {
      // Spawn ssh -N -R in the background without affecting any ssh config
      const args = [
        '-N',
        '-R',
        `${remotePort}:127.0.0.1:${localPort}`,
        trimmedHost
      ];

      this.tunnelProcess = spawn('ssh', args, {
        windowsHide: true,
        stdio: 'ignore',
        detached: false
      });

      this.tunnelProcess.on('exit', () => {
        this.tunnelProcess = null;
      });

      this.tunnelProcess.on('error', () => {
        this.tunnelProcess = null;
      });

      // Brief pause to allow SSH handshake to establish
      await new Promise((resolve) => setTimeout(resolve, 1500));
      return this.isTunnelActive();
    } catch {
      this.tunnelProcess = null;
      return false;
    }
  }

  public stopTunnel(): void {
    if (this.tunnelProcess) {
      try {
        if (os.platform() === 'win32' && this.tunnelProcess.pid) {
          exec(`taskkill /PID ${this.tunnelProcess.pid} /F /T`, () => {});
        } else {
          this.tunnelProcess.kill('SIGTERM');
        }
      } catch {
        // Ignore kill errors
      }
      this.tunnelProcess = null;
    }
  }

  public dispose(): void {
    this.stopTunnel();
  }
}
