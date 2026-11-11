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
    this.statusBarItem.command = 'antigravityRemoteProxy.toggle';
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
    const config = vscode.workspace.getConfiguration('antigravityRemoteProxy');
    const port = config.get<number>('proxyPort', 7897);
    const enabled = this.controller.isEnabled();

    if (!enabled) {
      this.statusBarItem.text = `$(circle-slash) AI代理: 纯直连`;
      this.statusBarItem.tooltip = `Antigravity 代理: 已关闭 (纯直连模式)\n点击开启本地 127.0.0.1:${port} 代理加速`;
      this.statusBarItem.backgroundColor = undefined;
      return;
    }

    const tunnelReachable = await this.controller.checkPort(port);
    if (tunnelReachable) {
      this.statusBarItem.text = `$(plug) AI代理: 开启 (${port})`;
      this.statusBarItem.tooltip = `Antigravity 代理: 已开启 (走本地 ${port} 反向隧道)\n隧道状态: 正常连通\n点击切换为纯直连模式`;
      this.statusBarItem.backgroundColor = undefined;
    } else {
      this.statusBarItem.text = `$(warning) AI代理: 隧道未通`;
      this.statusBarItem.tooltip = `Antigravity 代理: 已开启，但 127.0.0.1:${port} 未连通！\n请检查本地 SSH 配置是否包含 RemoteForward ${port} 127.0.0.1:${port}`;
      this.statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
    }
  }
}
