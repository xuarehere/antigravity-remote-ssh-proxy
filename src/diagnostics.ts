import * as vscode from 'vscode';
import { exec } from 'child_process';
import { ProxyController } from './proxyController';
import { SshBridge } from './sshBridge';

export interface DiagnosticStep {
  name: string;
  status: 'pending' | 'success' | 'warning' | 'error';
  latencyMs?: number;
  message: string;
  detail?: string;
}

export interface DiagnosticReport {
  timestamp: string;
  proxyHost: string;
  proxyPort: number;
  isEnabled: boolean;
  tunnelReachable: boolean;
  steps: DiagnosticStep[];
  overallStatus: 'success' | 'warning' | 'error';
  summary: string;
}

export class DiagnosticsRunner {
  private controller: ProxyController;
  private outputChannel: vscode.OutputChannel;

  constructor(controller: ProxyController) {
    this.controller = controller;
    this.outputChannel = vscode.window.createOutputChannel('Antigravity Proxy Diagnostics');
  }

  public async testConnection(host?: string, port?: number): Promise<DiagnosticReport> {
    const targetHost = (host || this.controller.getProxyHost() || '127.0.0.1').trim();
    const targetPort = Number(port) || this.controller.getProxyPort() || 7897;
    const isEnabled = this.controller.isEnabled();
    const remoteHost = this.controller.detectRemoteHost();
    const isRemote = Boolean(remoteHost);
    const portLabel = isRemote
      ? `反向隧道端口 (${targetHost}:${targetPort})`
      : `本地代理端口 (${targetHost}:${targetPort})`;

    const steps: DiagnosticStep[] = [];
    let tunnelReachable = false;

    // Step 1: Test tunnel or local proxy port TCP handshake
    const tunnelStart = Date.now();
    try {
      tunnelReachable = await this.controller.checkPort(targetPort, targetHost, 2000);
      const tunnelLatency = Date.now() - tunnelStart;

      if (tunnelReachable) {
        steps.push({
          name: portLabel,
          status: 'success',
          latencyMs: tunnelLatency,
          message: `连通正常 (TCP 握手耗时 ${tunnelLatency}ms)`
        });
      } else {
        steps.push({
          name: portLabel,
          status: 'error',
          latencyMs: tunnelLatency,
          message: isRemote
            ? `无法建立 TCP 握手！请检查本地代理工具是否启动，且动态 SSH 反向隧道是否正常运行。`
            : `无法建立 TCP 握手！请检查本地代理工具（如 Clash / v2ray）是否启动并监听 ${targetPort} 端口。`
        });
      }
    } catch (err: any) {
      steps.push({
        name: portLabel,
        status: 'error',
        message: `检测异常: ${err.message}`
      });
    }

    // Proxy argument for curl
    const proxyArg = tunnelReachable ? `-x http://${targetHost}:${targetPort}` : '';

    // Step 2: Test aicode.googleapis.com
    const aiStep = await this.probeUrl(
      remoteHost,
      'Google AI 核心接口 (aicode.googleapis.com)',
      'https://aicode.googleapis.com',
      proxyArg
    );
    steps.push(aiStep);

    // Step 3: Test play.googleapis.com/log
    const playStep = await this.probeUrl(
      remoteHost,
      'Google 遥测服务 (play.googleapis.com/log)',
      'https://play.googleapis.com/log',
      proxyArg
    );
    steps.push(playStep);

    // Step 4: Test oauth2.googleapis.com/token (resolves account login issues)
    const oauthStep = await this.probeUrl(
      remoteHost,
      'Google 账号令牌认证接口 (oauth2.googleapis.com/token)',
      'https://oauth2.googleapis.com/token',
      proxyArg
    );
    steps.push(oauthStep);

    // Compute overall status
    let overallStatus: 'success' | 'warning' | 'error' = 'success';
    let summary = '🎉 代理通道畅通，Google AI 与账号认证接口连通正常！';

    const hasError = steps.some((s) => s.status === 'error');
    const hasSuccess = steps.some((s) => s.status === 'success');

    if (!tunnelReachable) {
      overallStatus = 'error';
      summary = isRemote
        ? `❌ 反向隧道未连通 (${targetHost}:${targetPort})，请检查本地代理及动态隧道状态。`
        : `❌ 本地代理端口未连通 (${targetHost}:${targetPort})，请检查 Clash 等代理软件是否启动。`;
    } else if (hasError) {
      if (hasSuccess) {
        overallStatus = 'warning';
        summary = '⚠️ 部分 Google 服务响应异常，请检查节点规则或重试。';
      } else {
        overallStatus = 'error';
        summary = '❌ 无法访问 Google 服务，请检查本地代理规则与节点可用性。';
      }
    }

    return {
      timestamp: new Date().toLocaleTimeString(),
      proxyHost: targetHost,
      proxyPort: targetPort,
      isEnabled,
      tunnelReachable,
      steps,
      overallStatus,
      summary
    };
  }

  private async probeUrl(
    remoteHost: string | null,
    name: string,
    url: string,
    proxyArg: string
  ): Promise<DiagnosticStep> {
    const startTime = Date.now();
    const curlExe = remoteHost ? 'curl' : 'curl.exe';
    const curlCmd = `${curlExe} -sI -m 6 ${proxyArg} "${url}"`;

    if (remoteHost) {
      // Execute curl INSIDE the remote container
      const res = await SshBridge.execRemote(remoteHost, curlCmd, 8000);
      const latency = Date.now() - startTime;

      if (res.exitCode !== 0 && !res.stdout.includes('HTTP/')) {
        const errMsg = res.stderr.trim() || `Exit code ${res.exitCode}`;
        return {
          name,
          status: 'error',
          latencyMs: latency,
          message: `请求失败 (${latency}ms): ${errMsg.slice(0, 100)}`
        };
      }

      return this.evaluateCurlOutput(name, res.stdout, latency);
    }

    // Local fallback
    return new Promise((resolve) => {
      exec(curlCmd, (error, stdout, stderr) => {
        const latency = Date.now() - startTime;
        if (error && !stdout.includes('HTTP/')) {
          const errMsg = stderr ? stderr.trim() : error.message.trim();
          resolve({
            name,
            status: 'error',
            latencyMs: latency,
            message: `请求失败 (${latency}ms): ${errMsg.slice(0, 100)}`
          });
          return;
        }

        resolve(this.evaluateCurlOutput(name, stdout, latency));
      });
    });
  }

  private evaluateCurlOutput(name: string, stdout: string, latency: number): DiagnosticStep {
    const lines = stdout.split('\n').map((l) => l.trim()).filter(Boolean);
    const statusLine = lines[0] || '';
    const isGoogleESF =
      stdout.includes('server: ESF') ||
      stdout.includes('Server: ESF') ||
      stdout.includes('200 Connection established') ||
      stdout.includes('HTTPServer2') ||
      stdout.includes('scaffolding on HTTPServer2');

    if (
      statusLine.includes('200') ||
      statusLine.includes('204') ||
      statusLine.includes('404') ||
      statusLine.includes('405') ||
      isGoogleESF
    ) {
      return {
        name,
        status: 'success',
        latencyMs: latency,
        message: `访问正常 (${statusLine || 'HTTP 200'}, 耗时 ${latency}ms)`
      };
    } else if (statusLine.includes('403')) {
      return {
        name,
        status: 'error',
        latencyMs: latency,
        message: `返回 403 Forbidden（受地域限制阻止，请切换支持 Google AI 的代理节点）`
      };
    } else {
      return {
        name,
        status: 'warning',
        latencyMs: latency,
        message: `返回状态异常: ${statusLine}`
      };
    }
  }

  public async run(): Promise<void> {
    this.outputChannel.clear();
    this.outputChannel.show(true);
    this.outputChannel.appendLine('========================================');
    this.outputChannel.appendLine('Antigravity Proxy 网络连通性诊断报告');
    this.outputChannel.appendLine('========================================');

    const report = await this.testConnection();
    const envDesc = this.controller.detectRemoteHost() || 'Windows 本机';
    this.outputChannel.appendLine(`运行环境: ${envDesc}`);
    this.outputChannel.appendLine(`测试时间: ${report.timestamp}`);
    this.outputChannel.appendLine(`代理配置: ${report.proxyHost}:${report.proxyPort}`);
    this.outputChannel.appendLine(`代理模式: ${report.isEnabled ? '已开启 (ON)' : '纯直连 (OFF)'}`);
    this.outputChannel.appendLine('');

    for (const step of report.steps) {
      const icon = step.status === 'success' ? '✓' : step.status === 'warning' ? '⚠' : '✗';
      this.outputChannel.appendLine(`[${icon}] ${step.name}`);
      this.outputChannel.appendLine(`    状态: ${step.message}`);
    }

    this.outputChannel.appendLine('');
    this.outputChannel.appendLine(`诊断总结: ${report.summary}`);
    this.outputChannel.appendLine('========================================');
  }
}
