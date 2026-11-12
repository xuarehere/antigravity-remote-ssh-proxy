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
    const remoteHost = this.controller.detectRemoteHost();
    const envTag = remoteHost ? `[远程]` : `[本机]`;
    const envDesc = remoteHost ? `远程 (${remoteHost})` : 'Windows 本机';

    if (!enabled) {
      this.statusBarItem.text = `$(circle-slash) AI代理${envTag}: 纯直连`;
      this.statusBarItem.tooltip = `Antigravity 代理: 已关闭 (纯直连模式)\n运行环境: ${envDesc}\n目标主机与端口: ${host}:${port}\n点击打开快捷操作菜单`;
      this.statusBarItem.backgroundColor = undefined;
      return;
    }

    const reachable = await this.controller.checkPort(port, host);
    if (reachable) {
      this.statusBarItem.text = `$(plug) AI代理${envTag}: 开启 (${port})`;
      this.statusBarItem.tooltip = `Antigravity 代理: 已开启 (走 ${host}:${port})\n运行环境: ${envDesc}\n代理端口状态: ✓ 正常连通\n点击打开快捷操作菜单`;
      this.statusBarItem.backgroundColor = undefined;
    } else {
      this.statusBarItem.text = `$(warning) AI代理${envTag}: 未连通 (${port})`;
      this.statusBarItem.tooltip = `Antigravity 代理: 已开启，但 ${host}:${port} 无法连通！\n运行环境: ${envDesc}\n请检查本地代理软件或 SSH 连接\n点击打开设置面板进行测试与诊断`;
      this.statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
    }
  }
}
