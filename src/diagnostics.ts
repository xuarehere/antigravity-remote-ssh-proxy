import * as vscode from 'vscode';
import { exec } from 'child_process';
import { ProxyController } from './proxyController';

export class DiagnosticsRunner {
  private controller: ProxyController;
  private outputChannel: vscode.OutputChannel;

  constructor(controller: ProxyController) {
    this.controller = controller;
    this.outputChannel = vscode.window.createOutputChannel('Antigravity Proxy Diagnostics');
  }

  public async run(): Promise<void> {
    this.outputChannel.clear();
    this.outputChannel.show(true);

    const config = vscode.workspace.getConfiguration('antigravityRemoteProxy');
    const port = config.get<number>('proxyPort', 7897);
    const enabled = this.controller.isEnabled();

    this.log('====================================================');
    this.log(' Antigravity Remote Proxy - 网络连通性诊断报告');
    this.log(` 时间: ${new Date().toLocaleString()}`);
    this.log('====================================================\n');

    this.log(`[1] 代理开关状态: ${enabled ? '【已开启 (ON)】' : '【已关闭 (OFF - 纯直连)】'}`);

    // Check tunnel port
    this.log(`[2] 检查本地 SSH 反向隧道端口 (127.0.0.1:${port})...`);
    const portReachable = await this.controller.checkPort(port);
    if (portReachable) {
      this.log(`    ✓ 端口 127.0.0.1:${port} 正常监听并可连通！`);
    } else {
      this.log(`    ✗ 端口 127.0.0.1:${port} 无法连接！`);
      this.log(`      原因分析: 本地 SSH 未配置 RemoteForward ${port} 127.0.0.1:${port}，或本地代理未开启。`);
    }

    // Check Google AI API
    this.log('\n[3] 测试 Google AI API 核心接口响应...');
    const proxyArg = enabled && portReachable ? `-x http://127.0.0.1:${port}` : '';
    await this.testEndpoint('https://aicode.googleapis.com', proxyArg);
    await this.testEndpoint('https://play.googleapis.com/log', proxyArg);

    this.log('\n====================================================');
    this.log(' 诊断完成！');
    this.log('====================================================');
  }

  private testEndpoint(url: string, proxyArg: string): Promise<void> {
    return new Promise((resolve) => {
      const cmd = `curl -sI -m 6 ${proxyArg} "${url}" | head -n 5`;
      this.log(`    发起请求 -> ${url} ${proxyArg ? `(通过代理 ${proxyArg})` : '(直连)'}`);

      exec(cmd, (error, stdout) => {
        if (error) {
          this.log(`    ✗ 请求失败: ${error.message.trim()}`);
        } else {
          const firstLine = stdout.split('\n')[0] || '';
          this.log(`    ✓ 响应成功: ${firstLine.trim()}`);
        }
        resolve();
      });
    });
  }

  private log(message: string): void {
    this.outputChannel.appendLine(message);
  }
}
