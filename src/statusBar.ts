import * as vscode from 'vscode';
import { ProxyController } from './proxyController';

export class StatusBarManager {
  private statusBarItem: vscode.StatusBarItem;
  private controller: ProxyController;
  private updateTimer: NodeJS.Timeout | null = null;

  constructor(controller: ProxyController) {
    this.controller = controller;
    this.statusBarItem = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Right,
      100
    );
    this.statusBarItem.command = 'antigravityRemoteProxy.menu';
  }

  public init(context: vscode.ExtensionContext): void {
    context.subscriptions.push(this.statusBarItem);
    this.update();
    this.statusBarItem.show();

    // Poll status periodically (every 5 seconds)
    this.updateTimer = setInterval(() => {
      this.update();
    }, 5000);

    context.subscriptions.push({
      dispose: () => {
        if (this.updateTimer) {
          clearInterval(this.updateTimer);
        }
      }
    });
  }

  public async update(): Promise<void> {
    const host = this.controller.getProxyHost();
    const port = this.controller.getProxyPort();
    const enabled = this.controller.isEnabled();

    if (!enabled) {
      this.statusBarItem.text = `$(circle-slash) AI代理: 纯直连`;
      this.statusBarItem.tooltip = `Antigravity 代理: 已关闭 (纯直连模式)\n目标主机与端口: ${host}:${port}\n点击打开设置面板或切换`;
      this.statusBarItem.backgroundColor = undefined;
      return;
    }

    const tunnelReachable = await this.controller.checkPort(port, host);
    if (tunnelReachable) {
      this.statusBarItem.text = `$(plug) AI代理: 开启 (${port})`;
      this.statusBarItem.tooltip = `Antigravity 代理: 已开启 (走反向隧道 ${host}:${port})\n隧道状态: ✓ 正常连通\n点击打开设置面板或切换`;
      this.statusBarItem.backgroundColor = undefined;
    } else {
      this.statusBarItem.text = `$(warning) AI代理: 隧道未通`;
      this.statusBarItem.tooltip = `Antigravity 代理: 已开启，但 ${host}:${port} 无法连通！\n请检查本地 SSH 配置或代理软件\n点击打开设置面板进行测试`;
      this.statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
    }
  }
}
