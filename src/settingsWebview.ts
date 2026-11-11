import * as vscode from 'vscode';
import { ProxyController } from './proxyController';
import { DiagnosticsRunner, DiagnosticReport } from './diagnostics';

export class SettingsWebviewPanel {
  public static currentPanel: SettingsWebviewPanel | undefined;
  private readonly _panel: vscode.WebviewPanel;
  private _disposables: vscode.Disposable[] = [];
  private _controller: ProxyController;
  private _diagnostics: DiagnosticsRunner;

  public static createOrShow(
    extensionUri: vscode.Uri,
    controller: ProxyController,
    diagnostics: DiagnosticsRunner
  ) {
    const column = vscode.window.activeTextEditor
      ? vscode.window.activeTextEditor.viewColumn
      : undefined;

    if (SettingsWebviewPanel.currentPanel) {
      SettingsWebviewPanel.currentPanel._panel.reveal(column);
      SettingsWebviewPanel.currentPanel.refresh();
      return;
    }

    const panel = vscode.window.createWebviewPanel(
      'antigravityRemoteProxySettings',
      'Antigravity 代理设置',
      column || vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [extensionUri]
      }
    );

    SettingsWebviewPanel.currentPanel = new SettingsWebviewPanel(
      panel,
      controller,
      diagnostics
    );
  }

  private constructor(
    panel: vscode.WebviewPanel,
    controller: ProxyController,
    diagnostics: DiagnosticsRunner
  ) {
    this._panel = panel;
    this._controller = controller;
    this._diagnostics = diagnostics;

    this._update();

    this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

    // Handle messages from Webview
    this._panel.webview.onDidReceiveMessage(
      async (message) => {
        switch (message.command) {
          case 'save': {
            const host = (message.host || '127.0.0.1').trim();
            const port = parseInt(message.port, 10) || 7897;

            await this._controller.saveConfig(host, port);
            vscode.window.showInformationMessage(`Antigravity 代理配置已保存！代理目标: ${host}:${port}，AI 服务已秒级重载。`);
            this.postMessage({
              type: 'saveResult',
              success: true,
              message: `配置已成功保存！当前生效: ${host}:${port}`
            });
            break;
          }
          case 'toggle': {
            const enabled = await this._controller.toggle();
            this.postMessage({
              type: 'statusUpdate',
              isEnabled: enabled
            });
            break;
          }
          case 'testConnection': {
            const host = (message.host || this._controller.getProxyHost() || '127.0.0.1').trim();
            const port = parseInt(message.port, 10) || this._controller.getProxyPort() || 7897;

            this.postMessage({ type: 'testStarted' });
            try {
              const report: DiagnosticReport = await this._diagnostics.testConnection(host, port);
              this.postMessage({
                type: 'testResult',
                report
              });
            } catch (err: any) {
              this.postMessage({
                type: 'testError',
                error: err.message
              });
            }
            break;
          }
          case 'refresh': {
            this.refresh();
            break;
          }
        }
      },
      null,
      this._disposables
    );
  }

  public refresh() {
    const isEnabled = this._controller.isEnabled();
    const proxyHost = this._controller.getProxyHost();
    const proxyPort = this._controller.getProxyPort();

    this.postMessage({
      type: 'initialData',
      isEnabled,
      proxyHost,
      proxyPort
    });
  }

  public postMessage(message: any) {
    this._panel.webview.postMessage(message);
  }

  public dispose() {
    SettingsWebviewPanel.currentPanel = undefined;
    this._panel.dispose();
    while (this._disposables.length) {
      const x = this._disposables.pop();
      if (x) {
        x.dispose();
      }
    }
  }

  private _update() {
    this._panel.webview.html = this._getHtmlForWebview();
  }

  private _getHtmlForWebview(): string {
    const isEnabled = this._controller.isEnabled();
    const proxyHost = this._controller.getProxyHost();
    const proxyPort = this._controller.getProxyPort();

    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Antigravity 代理设置与诊断</title>
  <style>
    :root {
      --bg: var(--vscode-editor-background, #1e1e1e);
      --fg: var(--vscode-editor-foreground, #cccccc);
      --card-bg: var(--vscode-editorWidget-background, #252526);
      --border: var(--vscode-widget-border, #3c3c3c);
      --input-bg: var(--vscode-input-background, #3c3c3c);
      --input-fg: var(--vscode-input-foreground, #ffffff);
      --input-border: var(--vscode-input-border, #555555);
      --btn-bg: var(--vscode-button-background, #007acc);
      --btn-fg: var(--vscode-button-foreground, #ffffff);
      --btn-hover: var(--vscode-button-hoverBackground, #0062a3);
      --btn-secondary-bg: var(--vscode-button-secondaryBackground, #3a3d41);
      --btn-secondary-fg: var(--vscode-button-secondaryForeground, #ffffff);
      --success: #4ec9b0;
      --warning: #cca700;
      --error: #f14c4c;
      --font-mono: var(--vscode-editor-font-family, Consolas, 'Courier New', monospace);
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      background-color: var(--bg);
      color: var(--fg);
      font-family: var(--vscode-font-family, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif);
      font-size: var(--vscode-font-size, 13px);
      padding: 24px;
      line-height: 1.5;
    }

    .container {
      max-width: 680px;
      margin: 0 auto;
    }

    .header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 1px solid var(--border);
      padding-bottom: 16px;
      margin-bottom: 24px;
    }

    .header-title {
      font-size: 18px;
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .header-badge {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 12px;
      font-size: 11px;
      font-weight: normal;
    }

    .badge-on {
      background-color: rgba(78, 201, 176, 0.2);
      color: var(--success);
      border: 1px solid var(--success);
    }

    .badge-off {
      background-color: rgba(204, 167, 0, 0.2);
      color: var(--warning);
      border: 1px solid var(--warning);
    }

    .card {
      background-color: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 6px;
      padding: 20px;
      margin-bottom: 20px;
    }

    .card-title {
      font-size: 14px;
      font-weight: 600;
      margin-bottom: 14px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .form-group {
      margin-bottom: 16px;
    }

    .form-group label {
      display: block;
      margin-bottom: 6px;
      font-weight: 500;
      font-size: 12px;
      color: var(--fg);
      opacity: 0.9;
    }

    .form-row {
      display: flex;
      gap: 16px;
    }

    .form-col {
      flex: 1;
    }

    input[type="text"], input[type="number"] {
      width: 100%;
      background-color: var(--input-bg);
      color: var(--input-fg);
      border: 1px solid var(--input-border);
      padding: 8px 10px;
      border-radius: 4px;
      font-family: var(--font-mono);
      font-size: 13px;
      outline: none;
      transition: border-color 0.2s;
    }

    input[type="text"]:focus, input[type="number"]:focus {
      border-color: var(--btn-bg);
    }

    .field-hint {
      font-size: 11px;
      opacity: 0.7;
      margin-top: 4px;
    }

    .btn-group {
      display: flex;
      gap: 10px;
      margin-top: 18px;
    }

    button {
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      font-size: 13px;
      font-weight: 500;
      padding: 8px 16px;
      border-radius: 4px;
      border: none;
      transition: background-color 0.15s, opacity 0.15s;
    }

    button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .btn-primary {
      background-color: var(--btn-bg);
      color: var(--btn-fg);
    }

    .btn-primary:hover:not(:disabled) {
      background-color: var(--btn-hover);
    }

    .btn-secondary {
      background-color: var(--btn-secondary-bg);
      color: var(--btn-secondary-fg);
    }

    .btn-secondary:hover:not(:disabled) {
      opacity: 0.9;
    }

    .btn-test {
      background-color: #2e7d32;
      color: #ffffff;
    }

    .btn-test:hover:not(:disabled) {
      background-color: #256628;
    }

    .status-msg {
      margin-top: 12px;
      padding: 10px 14px;
      border-radius: 4px;
      font-size: 12px;
      display: none;
    }

    .status-msg.show {
      display: block;
    }

    .status-msg.success {
      background-color: rgba(78, 201, 176, 0.15);
      border: 1px solid var(--success);
      color: var(--success);
    }

    .status-msg.error {
      background-color: rgba(241, 76, 76, 0.15);
      border: 1px solid var(--error);
      color: var(--error);
    }

    /* Diagnostics styling */
    .diag-results {
      margin-top: 16px;
      display: none;
    }

    .diag-results.show {
      display: block;
    }

    .diag-item {
      background-color: var(--input-bg);
      border-left: 3px solid var(--border);
      padding: 10px 14px;
      border-radius: 0 4px 4px 0;
      margin-bottom: 8px;
    }

    .diag-item.success {
      border-left-color: var(--success);
    }

    .diag-item.error {
      border-left-color: var(--error);
    }

    .diag-item.warning {
      border-left-color: var(--warning);
    }

    .diag-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 4px;
    }

    .diag-name {
      font-weight: 600;
      font-size: 12px;
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .diag-badge {
      font-size: 10px;
      padding: 1px 6px;
      border-radius: 10px;
      font-family: var(--font-mono);
    }

    .diag-badge.pass {
      background-color: rgba(78, 201, 176, 0.2);
      color: var(--success);
    }

    .diag-badge.fail {
      background-color: rgba(241, 76, 76, 0.2);
      color: var(--error);
    }

    .diag-badge.warn {
      background-color: rgba(204, 167, 0, 0.2);
      color: var(--warning);
    }

    .diag-msg {
      font-size: 11px;
      opacity: 0.85;
      font-family: var(--font-mono);
    }

    .diag-summary {
      margin-top: 12px;
      padding: 12px;
      border-radius: 4px;
      font-weight: 500;
      font-size: 13px;
      text-align: center;
    }

    .diag-summary.success {
      background-color: rgba(78, 201, 176, 0.15);
      border: 1px solid var(--success);
      color: var(--success);
    }

    .diag-summary.error {
      background-color: rgba(241, 76, 76, 0.15);
      border: 1px solid var(--error);
      color: var(--error);
    }

    .spinner {
      border: 2px solid rgba(255, 255, 255, 0.3);
      border-radius: 50%;
      border-top: 2px solid #ffffff;
      width: 14px;
      height: 14px;
      animation: spin 0.8s linear infinite;
      display: inline-block;
    }

    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="header-title">
        <span>⚡ Antigravity 代理与网络中心</span>
        <span id="headerStatusBadge" class="header-badge ${isEnabled ? 'badge-on' : 'badge-off'}">
          ${isEnabled ? '● 代理模式已开启' : '○ 纯直连模式'}
        </span>
      </div>
      <div>
        <button id="toggleBtn" class="btn-secondary" onclick="toggleProxy()">
          ${isEnabled ? '切换为纯直连 (OFF)' : '切换为代理模式 (ON)'}
        </button>
      </div>
    </div>

    <!-- Configuration Form -->
    <div class="card">
      <div class="card-title">
        <span>⚙️ 代理参数配置</span>
        <span style="font-size: 11px; font-weight: normal; opacity: 0.7;">即改即存，秒级热生效</span>
      </div>

      <div class="form-row">
        <div class="form-col">
          <div class="form-group">
            <label for="proxyHost">代理主机 (Proxy Host)</label>
            <input type="text" id="proxyHost" value="${proxyHost}" placeholder="127.0.0.1" />
            <div class="field-hint">SSH 反向隧道监听的主机地址 (通常为 127.0.0.1)</div>
          </div>
        </div>
        <div class="form-col">
          <div class="form-group">
            <label for="proxyPort">代理端口 (Proxy Port)</label>
            <input type="number" id="proxyPort" value="${proxyPort}" placeholder="7897" min="1" max="65535" />
            <div class="field-hint">本地 Clash/代理映射到远端的端口 (如 7897)</div>
          </div>
        </div>
      </div>

      <div class="btn-group">
        <button id="saveBtn" class="btn-primary" onclick="saveSettings()">
          <span>💾 保存配置 (Save)</span>
        </button>
        <button class="btn-secondary" onclick="resetDefaults()">
          <span>🔄 恢复默认值</span>
        </button>
      </div>

      <div id="saveStatusMsg" class="status-msg"></div>
    </div>

    <!-- Diagnostics / Connection Test -->
    <div class="card">
      <div class="card-title">
        <span>🔍 网络连通性测试</span>
        <span style="font-size: 11px; font-weight: normal; opacity: 0.7;">全面测试 SSH 隧道与 Google AI 服务</span>
      </div>

      <p style="font-size: 12px; opacity: 0.8; margin-bottom: 14px;">
        点击“连接测试”按钮，将针对当前输入的主机与端口，实时检测 SSH 反向隧道连通性、Google AI (aicode) 接口与遥测服务的 HTTP 状态和毫秒延迟。
      </p>

      <div class="btn-group">
        <button id="testBtn" class="btn-test" onclick="runConnectionTest()">
          <span id="testBtnText">🚀 开始连接测试 (Test Connection)</span>
        </button>
      </div>

      <div id="diagResults" class="diag-results">
        <div id="diagItems"></div>
        <div id="diagSummary" class="diag-summary"></div>
      </div>
    </div>
  </div>

  <script>
    const vscode = acquireVsCodeApi();

    let currentEnabled = ${isEnabled};

    function saveSettings() {
      const hostInput = document.getElementById('proxyHost');
      const portInput = document.getElementById('proxyPort');
      const saveBtn = document.getElementById('saveBtn');

      const host = hostInput.value.trim() || '127.0.0.1';
      const port = parseInt(portInput.value.trim(), 10) || 7897;

      saveBtn.disabled = true;
      saveBtn.innerHTML = '<span class="spinner"></span> 保存中...';

      vscode.postMessage({
        command: 'save',
        host: host,
        port: port
      });
    }

    function resetDefaults() {
      document.getElementById('proxyHost').value = '127.0.0.1';
      document.getElementById('proxyPort').value = '7897';
    }

    function toggleProxy() {
      vscode.postMessage({
        command: 'toggle'
      });
    }

    function runConnectionTest() {
      const host = document.getElementById('proxyHost').value.trim() || '127.0.0.1';
      const port = parseInt(document.getElementById('proxyPort').value.trim(), 10) || 7897;

      const testBtn = document.getElementById('testBtn');
      const testBtnText = document.getElementById('testBtnText');
      const diagResults = document.getElementById('diagResults');

      testBtn.disabled = true;
      testBtnText.innerHTML = '<span class="spinner"></span> 正在测试中，请稍候...';

      vscode.postMessage({
        command: 'testConnection',
        host: host,
        port: port
      });
    }

    window.addEventListener('message', (event) => {
      const msg = event.data;

      switch (msg.type) {
        case 'initialData': {
          if (msg.proxyHost) document.getElementById('proxyHost').value = msg.proxyHost;
          if (msg.proxyPort) document.getElementById('proxyPort').value = msg.proxyPort;
          updateStatusUI(msg.isEnabled);
          break;
        }

        case 'saveResult': {
          const saveBtn = document.getElementById('saveBtn');
          saveBtn.disabled = false;
          saveBtn.innerHTML = '<span>💾 保存配置 (Save)</span>';

          const msgEl = document.getElementById('saveStatusMsg');
          msgEl.className = 'status-msg show ' + (msg.success ? 'success' : 'error');
          msgEl.innerText = msg.message;

          setTimeout(() => {
            msgEl.className = 'status-msg';
          }, 4000);
          break;
        }

        case 'statusUpdate': {
          updateStatusUI(msg.isEnabled);
          break;
        }

        case 'testResult': {
          const testBtn = document.getElementById('testBtn');
          const testBtnText = document.getElementById('testBtnText');
          testBtn.disabled = false;
          testBtnText.innerHTML = '<span>🚀 重新测试 (Test Again)</span>';

          renderDiagnosticReport(msg.report);
          break;
        }

        case 'testError': {
          const testBtn = document.getElementById('testBtn');
          const testBtnText = document.getElementById('testBtnText');
          testBtn.disabled = false;
          testBtnText.innerHTML = '<span>🚀 重新测试 (Test Again)</span>';

          const diagResults = document.getElementById('diagResults');
          const diagItems = document.getElementById('diagItems');
          const diagSummary = document.getElementById('diagSummary');

          diagResults.className = 'diag-results show';
          diagItems.innerHTML = '';
          diagSummary.className = 'diag-summary error';
          diagSummary.innerText = '测试失败: ' + msg.error;
          break;
        }
      }
    });

    function updateStatusUI(enabled) {
      currentEnabled = enabled;
      const badge = document.getElementById('headerStatusBadge');
      const toggleBtn = document.getElementById('toggleBtn');

      if (enabled) {
        badge.className = 'header-badge badge-on';
        badge.innerText = '● 代理模式已开启';
        toggleBtn.innerText = '切换为纯直连 (OFF)';
      } else {
        badge.className = 'header-badge badge-off';
        badge.innerText = '○ 纯直连模式';
        toggleBtn.innerText = '切换为代理模式 (ON)';
      }
    }

    function renderDiagnosticReport(report) {
      const diagResults = document.getElementById('diagResults');
      const diagItems = document.getElementById('diagItems');
      const diagSummary = document.getElementById('diagSummary');

      diagResults.className = 'diag-results show';
      diagItems.innerHTML = '';

      for (const step of report.steps) {
        const item = document.createElement('div');
        item.className = 'diag-item ' + step.status;

        const badgeClass = step.status === 'success' ? 'pass' : step.status === 'warning' ? 'warn' : 'fail';
        const badgeText = step.status === 'success' ? 'PASS' : step.status === 'warning' ? 'WARN' : 'FAIL';
        const icon = step.status === 'success' ? '✓' : step.status === 'warning' ? '!' : '✗';

        item.innerHTML = \`
          <div class="diag-header">
            <div class="diag-name">
              <span>\${icon}</span>
              <span>\${step.name}</span>
            </div>
            <span class="diag-badge \${badgeClass}">\${badgeText}</span>
          </div>
          <div class="diag-msg">\${step.message}</div>
        \`;

        diagItems.appendChild(item);
      }

      diagSummary.className = 'diag-summary ' + report.overallStatus;
      diagSummary.innerText = report.summary;
    }
  </script>
</body>
</html>`;
  }
}
