# Antigravity Remote SSH Proxy (ATP)

<div align="center">

<img src="./resources/icon.png" width="128" />

# Antigravity Remote SSH Proxy Extension

**Plug & Play · Status Bar One-Click Toggle · 100% Isolated · Zero Pollution**

[English](./README.en.md) · [简体中文](./README.md)

</div>

---

## 💡 Why this extension?

When using **Antigravity IDE** for Remote-SSH development on Linux workstations, the AI core and Language Server (`agy`) execute directly on the remote machine. In regions where Google AI endpoints (`aicode.googleapis.com` / `play.googleapis.com`) are restricted, developers face:
1. **Regional Restrictions**: `403 Forbidden: Your location is not eligible for this service at this time. Detected location: CN.`
2. **Timeouts & Connection Resets**: `TLS handshake timeout` or `connection reset by peer`.
3. **Environment Pollution Risks**: Hardcoding proxy settings in `~/.bashrc` pollutes terminal sessions, model training, and cluster services.
4. **Conflicting Development Needs**: Sometimes AI assistance is needed; other times, internal cluster training or local LLM inference strictly forbids proxy usage.

**This extension achieves true Plug & Play and seamless state management**:
- **One-Click Status Bar Toggle**: A resident status bar button allows instant switching between [Proxy ON] and [Pure Direct OFF] in 1 second!
- **Two Distinct Modes**:
  - **ON**: Routes through local 7897 SSH reverse tunnel for high-speed AI access.
  - **OFF**: Unsets all proxy variables; **100% direct connection when remote has no proxy**.
- **Auto Self-Deployment**: Automatically provisions required components when connecting to any new remote server.
- **Clean Regular SSH Guarantee**: Native `ssh user@host` commands remain completely unaffected, warning-free, and unpolluted.

---

## 📸 Key Features

### 1. Status Bar Item
Resident on the bottom status bar:
- 🟢 **`$(plug) AI代理: 开启 (7897)`**: Active proxy tunnel; click to disable.
- ⚪ **`$(circle-slash) AI代理: 纯直连`**: Pure direct connection; click to enable.
- 🟡 **`$(warning) AI代理: 隧道未通`**: Port 7897 unreachable; click to view troubleshooting.

### 2. Command Palette (`Ctrl + Shift + P`)
- `Antigravity 代理: 切换开启/关闭 (Toggle Proxy)`
- `Antigravity 代理: 开启 (Enable Proxy)`
- `Antigravity 代理: 关闭 (Disable Proxy)`
- `Antigravity 代理: 运行网络诊断 (Run Diagnostics)`
- `Antigravity 代理: 自动配置远端环境 (Setup Remote)`

### 3. Integrated Terminal Commands
```bash
agy-proxy on      # Enable proxy (Hot-reloaded in 1s)
agy-proxy off     # Disable proxy (Reverts to direct connection)
agy-proxy toggle  # Toggle between ON and OFF
agy-proxy status  # Check status & tunnel reachability
```

---

## 📦 Installation

### Method 1: Install from VSIX (Plug & Play)
1. Download `antigravity-remote-ssh-proxy-1.0.0.vsix` from Releases or repo root.
2. In Antigravity IDE, go to Extensions (`Ctrl + Shift + X`).
3. Click `...` in the top right $\to$ **`Install from VSIX...`**.
4. Select the `.vsix` file.
5. Connect to your remote workstation and enjoy one-click proxy control!

### Method 2: Build from Source
```bash
git clone https://github.com/xuarehere/antigravity-remote-ssh-proxy.git
cd antigravity-remote-ssh-proxy
npm install
npm run package
```

---

## 📄 License

This project is licensed under the [MIT License](./LICENSE).
