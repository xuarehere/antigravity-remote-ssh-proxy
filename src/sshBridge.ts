import { execFile } from 'child_process';

export interface SshExecResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

export class SshBridge {
  /**
   * Execute a command on the remote host via SSH.
   * Uses OpenSSH client with -n (redirect stdin from /dev/null) to prevent hanging.
   */
  public static execRemote(
    targetHost: string,
    remoteCommand: string,
    timeoutMs = 10000
  ): Promise<SshExecResult> {
    return new Promise((resolve) => {
      const trimmedHost = (targetHost || '').trim();
      if (!trimmedHost) {
        resolve({
          stdout: '',
          stderr: 'No remote host specified',
          exitCode: -1
        });
        return;
      }

      // Use -n to prevent OpenSSH from blocking on stdin
      // Use BatchMode=yes to fail fast instead of hanging on interactive prompts if key auth is needed
      const hostArgs = trimmedHost.split(/\s+/).filter(Boolean);
      const args = [
        '-n',
        '-o', 'BatchMode=yes',
        '-o', 'ConnectTimeout=5',
        ...hostArgs,
        remoteCommand
      ];

      execFile('ssh', args, { timeout: timeoutMs, windowsHide: true }, (error, stdout, stderr) => {
        const exitCode = error ? (typeof error.code === 'number' ? error.code : 1) : 0;
        resolve({
          stdout: stdout || '',
          stderr: stderr || (error ? error.message : ''),
          exitCode
        });
      });
    });
  }

  /**
   * Test if the remote host is reachable via SSH.
   */
  public static async isHostReachable(targetHost: string): Promise<boolean> {
    const result = await this.execRemote(targetHost, 'echo SSH_OK', 4000);
    return result.exitCode === 0 && result.stdout.includes('SSH_OK');
  }
}
