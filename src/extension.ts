import * as vscode from 'vscode';
import { ProxyController } from './proxyController';
import { StatusBarManager } from './statusBar';
import { DiagnosticsRunner } from './diagnostics';
import { SettingsWebviewPanel } from './settingsWebview';

export function activate(context: vscode.ExtensionContext) {
  const controller = new ProxyController();
  const statusBar = new StatusBarManager(controller);
  const deployer = controller.getDeployer();
  const diagnostics = new DiagnosticsRunner(controller);

  // Auto-setup and auto-tunnel if running in remote environment
  const initRemoteSession = async () => {
    if (!vscode.env.remoteName) {
      return;
    }
    const config = vscode.workspace.getConfiguration('antigravityRemoteProxy');
    const autoSetup = config.get<boolean>('autoSetup', true);
    if (!autoSetup) {
      return;
    }

    const remoteHost = await controller.waitForRemoteHost(12, 500);
    if (!remoteHost) {
      return;
    }

    try {
      const port = controller.getProxyPort();
      const host = controller.getProxyHost();

      // 1. Establish reverse tunnel first so that remote downloads or pre-provisioning can use proxy
      if (controller.isEnabled()) {
        await controller.getTunnelManager().startTunnel(remoteHost, port, port);

        // Update VS Code internal workspace http.proxy for extension host
        try {
          const httpConfig = vscode.workspace.getConfiguration('http');
          await httpConfig.update('proxy', `http://${host}:${port}`, vscode.ConfigurationTarget.Workspace);
        } catch {
          // Ignore if no workspace folder open
        }
      }

      await controller.syncStatusFromRemote();
      const isDeployed = await deployer.isDeployed(remoteHost);
      if (!isDeployed) {
        await deployer.deploy(remoteHost, host, port);
      }

      if (controller.isEnabled()) {
        // Ensure agy process on remote container is reloaded with proxy
        await controller.restartAgy(remoteHost);
      }
      await statusBar.update();
    } catch {
      // Ignore background startup errors
    }
  };

  // Auto-setup for local Windows environment
  const initLocalSession = async () => {
    if (vscode.env.remoteName) {
      return;
    }
    const config = vscode.workspace.getConfiguration('antigravityRemoteProxy');
    const autoSetup = config.get<boolean>('autoSetup', true);
    if (!autoSetup) {
      return;
    }

    try {
      const port = controller.getProxyPort();
      const host = controller.getProxyHost();
      if (controller.isEnabled()) {
        const httpConfig = vscode.workspace.getConfiguration('http');
        const currentProxy = httpConfig.inspect<string>('proxy')?.globalValue;
        const expectedProxy = `http://${host}:${port}`;
        if (currentProxy !== expectedProxy) {
          await httpConfig.update('proxy', expectedProxy, vscode.ConfigurationTarget.Global);
          await controller.restartLocalAgy();
        }
      }
      await statusBar.update();
    } catch {
      // Ignore background startup errors
    }
  };

  // Run appropriate session setup based on environment
  if (vscode.env.remoteName) {
    initRemoteSession();
  } else {
    initLocalSession();
  }

  // Also listen for workspace folder attachments
  context.subscriptions.push(
    vscode.workspace.onDidChangeWorkspaceFolders(() => {
      if (vscode.env.remoteName) {
        initRemoteSession();
      } else {
        initLocalSession();
      }
    })
  );

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
      const detectedHost = controller.detectRemoteHost();
      const envName = detectedHost ? `远程: ${detectedHost}` : 'Windows 本机';

      const items = [
        {
          label: '$(gear) 打开代理配置与连通测试面板 (Settings & Test)',
          description: `修改主机(${host})与端口(${port})，网络连通性诊断 [环境: ${envName}]`,
          action: 'settings'
        },
        {
          label: enabled
            ? '$(circle-slash) 切换为纯直连模式 (Disable Proxy)'
            : '$(plug) 切换为代理加速模式 (Enable Proxy)',
          description: enabled
            ? `关闭代理，AI 核心服务恢复直连 [当前环境: ${envName}]`
            : `开启代理，AI 核心服务走 ${host}:${port} 代理加速 [当前环境: ${envName}]`,
          action: 'toggle'
        },
        {
          label: '$(checklist) 运行网络连通性诊断 (Run Diagnostics)',
          description: '测试代理端口、Google AI 核心接口与 Google 账号认证 (OAuth2) 状态',
          action: 'diagnose'
        },
        {
          label: '$(refresh) 重启 AI 核心服务 (Restart Agy Service)',
          description: '强制终止并重新加载 agy 服务，立即应用最新代理配置',
          action: 'restartAgy'
        }
      ];

      const selected = await vscode.window.showQuickPick(items, {
        placeHolder: `Antigravity 代理快捷菜单 (当前: ${enabled ? '已开启' : '纯直连'} | 环境: ${envName})`
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
            ? `Antigravity 代理 [${envName}]: 已【开启 (ON)】，代理加速已就绪。`
            : `Antigravity 代理 [${envName}]: 已【关闭 (OFF)】，已恢复纯直连模式。`
        );
      } else if (selected.action === 'diagnose') {
        await diagnostics.run();
      } else if (selected.action === 'restartAgy') {
        if (detectedHost) {
          await controller.restartAgy(detectedHost);
          vscode.window.showInformationMessage(`[${detectedHost}] 远程 agy 服务已成功重启！`);
        } else {
          await controller.restartLocalAgy();
          vscode.window.showInformationMessage(`[Windows 本机] 本地 agy.exe 服务已重置并重新加载！`);
        }
      }
    }),

    vscode.commands.registerCommand('antigravityRemoteProxy.toggle', async () => {
      const isNowEnabled = await controller.toggle();
      const detectedHost = controller.detectRemoteHost();
      const envName = detectedHost ? `远程: ${detectedHost}` : 'Windows 本机';
      await statusBar.update();
      if (isNowEnabled) {
        vscode.window.showInformationMessage(`Antigravity 代理 [${envName}]: 已【开启 (ON)】。`);
      } else {
        vscode.window.showInformationMessage(`Antigravity 代理 [${envName}]: 已【关闭 (OFF)】（纯直连）。`);
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
      const remote = controller.detectRemoteHost() || 'Windows 本机';

      const msg = enabled
        ? `[${remote}] 当前状态: 【已开启 (ON)】 | 代理端口 ${host}:${port}: ${tunnel ? '✓ 连通正常' : '✗ 未连通'}`
        : `[${remote}] 当前状态: 【已关闭 (OFF)】 | 纯直连模式`;

      vscode.window.showInformationMessage(msg);
      await statusBar.update();
    }),

    vscode.commands.registerCommand('antigravityRemoteProxy.setupRemote', async () => {
      const remoteHost = controller.detectRemoteHost();
      if (!remoteHost) {
        vscode.window.showWarningMessage('未检测到远程 SSH 主机。');
        return;
      }
      const host = controller.getProxyHost();
      const port = controller.getProxyPort();
      if (controller.isEnabled()) {
        await controller.getTunnelManager().startTunnel(remoteHost, port, port);
      }
      const ok = await deployer.deploy(remoteHost, host, port);
      if (ok) {
        if (controller.isEnabled()) {
          await controller.restartAgy(remoteHost);
        }
        vscode.window.showInformationMessage('Antigravity 远端代理组件已成功部署！');
        await statusBar.update();
      }
    }),

    vscode.commands.registerCommand('antigravityRemoteProxy.restore', async () => {
      const ok = await controller.restoreRemote();
      if (ok) {
        vscode.window.showInformationMessage('环境已 100% 彻底复原为初始纯净状态！');
        await statusBar.update();
      }
    }),

    vscode.commands.registerCommand('antigravityRemoteProxy.restartAgy', async () => {
      const detectedHost = controller.detectRemoteHost();
      if (detectedHost) {
        await controller.restartAgy(detectedHost);
        vscode.window.showInformationMessage(`[${detectedHost}] 远程 agy 服务已成功重启！`);
      } else {
        await controller.restartLocalAgy();
        vscode.window.showInformationMessage(`[Windows 本机] 本地 agy.exe 服务已重置并重新加载！`);
      }
    }),

    controller
  );
}

export function deactivate() {}
