import * as vscode from 'vscode';
import { ProxyController } from './proxyController';
import { StatusBarManager } from './statusBar';
import { RemoteDeployer } from './remoteDeployer';
import { DiagnosticsRunner } from './diagnostics';

export function activate(context: vscode.ExtensionContext) {
  const controller = new ProxyController();
  const statusBar = new StatusBarManager(controller);
  const deployer = new RemoteDeployer();
  const diagnostics = new DiagnosticsRunner(controller);

  // Auto-setup if running in remote environment
  if (vscode.env.remoteName) {
    const config = vscode.workspace.getConfiguration('antigravityRemoteProxy');
    const autoSetup = config.get<boolean>('autoSetup', true);

    if (autoSetup && !deployer.isDeployed()) {
      deployer.deploy().then((success) => {
        if (success) {
          statusBar.update();
        }
      });
    }
  }

  // Initialize status bar
  statusBar.init(context);

  // Register commands
  context.subscriptions.push(
    vscode.commands.registerCommand('antigravityRemoteProxy.toggle', async () => {
      const isNowEnabled = await controller.toggle();
      await statusBar.update();
      if (isNowEnabled) {
        vscode.window.showInformationMessage('Antigravity 代理: 已【开启 (ON)】，正在走本地反向隧道。');
      } else {
        vscode.window.showInformationMessage('Antigravity 代理: 已【关闭 (OFF)】，已切换为纯直连模式。');
      }
    }),

    vscode.commands.registerCommand('antigravityRemoteProxy.enable', async () => {
      await controller.enable();
      await statusBar.update();
      vscode.window.showInformationMessage('Antigravity 代理: 已【开启 (ON)】。');
    }),

    vscode.commands.registerCommand('antigravityRemoteProxy.disable', async () => {
      await controller.disable();
      await statusBar.update();
      vscode.window.showInformationMessage('Antigravity 代理: 已【关闭 (OFF)】（纯直连）。');
    }),

    vscode.commands.registerCommand('antigravityRemoteProxy.status', async () => {
      const enabled = controller.isEnabled();
      const config = vscode.workspace.getConfiguration('antigravityRemoteProxy');
      const port = config.get<number>('proxyPort', 7897);
      const tunnel = await controller.checkPort(port);

      const msg = enabled
        ? `当前状态: 【已开启 (ON)】 | 隧道端口 127.0.0.1:${port}: ${tunnel ? '✓ 连通正常' : '✗ 未连通'}`
        : `当前状态: 【已关闭 (OFF)】 | 纯直连模式`;

      vscode.window.showInformationMessage(msg);
      await statusBar.update();
    }),

    vscode.commands.registerCommand('antigravityRemoteProxy.diagnose', async () => {
      await diagnostics.run();
    }),

    vscode.commands.registerCommand('antigravityRemoteProxy.setupRemote', async () => {
      const ok = await deployer.deploy();
      if (ok) {
        vscode.window.showInformationMessage('Antigravity 远端代理组件已成功部署！');
        await statusBar.update();
      }
    })
  );
}

export function deactivate() {}
