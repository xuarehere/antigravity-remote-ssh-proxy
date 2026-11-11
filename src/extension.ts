import * as vscode from 'vscode';
import { ProxyController } from './proxyController';
import { StatusBarManager } from './statusBar';
import { RemoteDeployer } from './remoteDeployer';
import { DiagnosticsRunner } from './diagnostics';
import { SettingsWebviewPanel } from './settingsWebview';

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
    vscode.commands.registerCommand('antigravityRemoteProxy.openSettings', () => {
      SettingsWebviewPanel.createOrShow(context.extensionUri, controller, diagnostics);
    }),

    vscode.commands.registerCommand('antigravityRemoteProxy.menu', async () => {
      const enabled = controller.isEnabled();
      const host = controller.getProxyHost();
      const port = controller.getProxyPort();

      const items = [
        {
          label: '$(gear) 打开代理配置与连通测试面板 (Settings & Test)',
          description: `修改主机(${host})与端口(${port})，进行网络连通性测试`,
          action: 'settings'
        },
        {
          label: enabled
            ? '$(circle-slash) 切换为纯直连模式 (Disable Proxy)'
            : '$(plug) 切换为代理加速模式 (Enable Proxy)',
          description: enabled
            ? '关闭代理，AI 核心走远程服务器本地直连'
            : `开启代理，AI 核心走本地 ${host}:${port} 隧道加速`,
          action: 'toggle'
        },
        {
          label: '$(checklist) 运行网络连通性诊断 (Run Diagnostics)',
          description: '测试 SSH 反向隧道与 Google AI 接口详细状态',
          action: 'diagnose'
        }
      ];

      const selected = await vscode.window.showQuickPick(items, {
        placeHolder: `Antigravity 代理快捷菜单 (当前: ${enabled ? '已开启' : '纯直连'})`
      });

      if (!selected) {
        return;
      }

      if (selected.action === 'settings') {
        SettingsWebviewPanel.createOrShow(context.extensionUri, controller, diagnostics);
      } else if (selected.action === 'toggle') {
        const isNowEnabled = await controller.toggle();
        await statusBar.update();
        vscode.window.showInformationMessage(
          isNowEnabled
            ? 'Antigravity 代理: 已【开启 (ON)】，正在走本地反向隧道。'
            : 'Antigravity 代理: 已【关闭 (OFF)】，已切换为纯直连模式。'
        );
      } else if (selected.action === 'diagnose') {
        await diagnostics.run();
      }
    }),

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
      const host = controller.getProxyHost();
      const port = controller.getProxyPort();
      const tunnel = await controller.checkPort(port, host);

      const msg = enabled
        ? `当前状态: 【已开启 (ON)】 | 隧道端口 ${host}:${port}: ${tunnel ? '✓ 连通正常' : '✗ 未连通'}`
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
