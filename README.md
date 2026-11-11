# Antigravity Remote SSH Proxy (ATP)

<div align="center">

<img src="./resources/icon.png" width="128" />

# Antigravity Remote SSH Proxy 专属扩展

**可视化 UI 配置 · 一键连通性测试 · 状态栏秒切 · 100% 物理隔离 · 零系统污染**

[English](./README.en.md) · [简体中文](./README.md)

</div>

---

## 💡 为什么需要这个插件？

在使用 **Antigravity IDE** 远程连接 Linux 工作站进行 Remote-SSH 远程开发时，AI 核心服务和后台（Language Server / `agy`）直接运行在远程机器上。国内远程工作站访问 Google AI 核心接口（`aicode.googleapis.com` / `play.googleapis.com`）时，通常会遇到：
1. **地区限制拦截**：`403 Forbidden: Your location is not eligible for this service at this time. Detected location: CN.`
2. **连接超时与重置**：`TLS handshake timeout` 或 `connection reset by peer`。
3. **环境污染顾虑**：直接在远程 `~/.bashrc` 中写入全局代理会污染普通终端、训练脚本与内网集群服务。
4. **不同研发场景的矛盾**：有时候需要翻墙使用 AI 辅助，有时候内网开发/本地大模型推理绝不能走代理。

**本插件实现了真正意义上的“可视化管理”、“即插即用”与“全自动适配”**：
- 🖥️ **可视化 UI 设置面板**：直接在图形界面中修改**代理主机**（如 `127.0.0.1`）与**代理端口**（如 `7897`），点击保存立即热重载生效！
- 🚀 **一键连接测试（Test Connection）**：一键全面测试反向隧道 TCP 握手、Google AI 核心接口（`aicode.googleapis.com`）及遥测服务的连通性与毫秒级延迟，结果直观可视。
- ⚡ **状态栏一键切换**：底部常驻状态栏按钮，随时弹出快捷菜单或一键在“代理加速”与“纯直连”模式间切换。
- 🛡️ **纯净隔离保证**：绝不污染 `~/.bashrc` 或系统全局环境，本地终端执行 `ssh user@host` 零警告、零多余转发。

---

## 📸 核心功能展示

### 1. 现代化可视化设置面板 (Settings & Diagnostics Panel)
在 IDE 命令面板中按 `Ctrl + Shift + P` 输入 `Antigravity 代理: 打开配置与测试面板`，或点击状态栏按钮打开面板：

- **参数配置**：
  - **代理主机 (Proxy Host)**：默认 `127.0.0.1`，可自定义配置。
  - **代理端口 (Proxy Port)**：默认 `7897`，可自定义配置。
  - **[ 💾 保存配置 (Save) ]**：自动持久化至 IDE 设置和远端 `~/.antigravity-ide-server/proxy.conf`，并秒级热重载 AI 核心进程，无需重启 IDE！
- **连通性测试**：
  - **[ 🚀 开始连接测试 (Test Connection) ]**：一键探测本地端口反向转发状态与 Google AI 接口的 HTTP 响应状态码及延迟（PASS / FAIL 徽章清晰展示）。

### 2. 底部常驻状态栏（Status Bar）
- 🟢 **`$(plug) AI代理: 开启 (7897)`**：反向隧道连通正常，AI 流量走代理加速。
- ⚪ **`$(circle-slash) AI代理: 纯直连`**：处于纯直连状态，点击可立即开启代理或打开设置面板。
- 🟡 **`$(warning) AI代理: 隧道未通`**：提示目标端口未监听，点击可快速排查 SSH 转发配置。

### 3. 命令面板快捷操作 (`Ctrl + Shift + P`)
- `Antigravity 代理: 打开配置与测试面板 (Settings & Test)`
- `Antigravity 代理: 弹出快捷操作菜单`
- `Antigravity 代理: 切换开启/关闭 (Toggle Proxy)`
- `Antigravity 代理: 开启 (Enable Proxy)`
- `Antigravity 代理: 关闭 (Disable Proxy)`
- `Antigravity 代理: 运行网络诊断 (Run Diagnostics)`
- `Antigravity 代理: 自动配置远端环境 (Setup Remote)`

### 4. 远程终端命令行支持
在远程内置终端中也可直接键入：
```bash
agy-proxy on      # 开启代理 (秒级生效，无需重启窗口)
agy-proxy off     # 关闭代理 (恢复纯直连模式)
agy-proxy toggle  # 一键翻转
agy-proxy status  # 查看状态与连通性
```

---

## 📦 安装方法

### 方式一：从 VSIX 安装（最简单，即插即用）
1. 从本项目 Release 或根目录获取 `antigravity-remote-ssh-proxy-1.1.0.vsix`。
2. 打开 Antigravity IDE，进入左侧扩展视图（`Ctrl + Shift + X`）。
3. 点击右上角菜单图标 `...` $\to$ 选择 **`Install from VSIX...`（从 VSIX 安装...）**。
4. 选择 `.vsix` 文件完成安装。
5. 连接远程服务器，底部状态栏即可自动显示并正常使用！

### 方式二：源码构建打包
```bash
git clone https://github.com/xuarehere/antigravity-remote-ssh-proxy.git
cd antigravity-remote-ssh-proxy
npm install
npm run package
```
打包成功后将在根目录生成 `.vsix` 文件。

---

## 🏗️ 架构原理解析

```mermaid
flowchart TD
    subgraph Local["本地电脑 (Windows / macOS)"]
        L1["本地代理软件 (如 Clash 7897)<br>支持 Google AI 的节点"]
        L2["SSH 客户端 (配置 RemoteForward 7897 127.0.0.1:7897)"]
    end

    subgraph IDE_Extension["Antigravity IDE 插件 (本扩展)"]
        UI["Webview 配置面板 (Host/Port 配置 + 连接测试)"]
        E1["底部状态栏控制器"]
        E2["远程环境自愈模块 (Auto Deployer)"]
        E3["热重载控制器 (Hot Reloader)"]
    end

    subgraph Remote["远程 Linux 工作站"]
        R0["动态配置 (~/.antigravity-ide-server/proxy.conf)"]
        R1["状态标记 (~/.antigravity-ide-server/proxy.disabled)"]
        R2["AI 核心动态感应包装器 (~/.gemini/bin/agy)"]
        R3["用户终端 / Python 脚本 / Docker (100% 物理隔离，无任何污染)"]
    end

    L1 <==>|SSH 反向隧道| L2
    UI -->|保存参数| R0
    UI -->|连接测试| L2
    IDE_Extension --> E1 & E2 & E3
    E1 <-->|一键点击| E3
    E3 -->|生成/清除| R1
    R0 & R1 -->|热重载感应| R2
    L2 -->|代理流量| R2
    R3 -.->|完全不受影响| Remote
```

---

## 🔒 隔离与安全性设计

1. **绝对零系统污染**：
   - 绝不改动远程主机的 `/etc/environment`、`/etc/profile`、`~/.bashrc`、`~/.profile`。
   - 所有代理变量均只在 Antigravity 专有的进程树中流转。
2. **纯直连保障**：
   - 在关闭（OFF）模式下，插件显式 `unset` 所有代理变量。远程机若未开代理，所有连接均为物理网卡纯直连。
3. **多服务器独立隔离**：
   - 每台服务器的状态与配置仅保存在自身服务器的私有配置目录下，多台服务器并发工作时互不干扰。

---

## 📄 开源许可证

本项目基于 [MIT License](./LICENSE) 开源。
