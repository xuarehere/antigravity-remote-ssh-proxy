# deploy-agy-proxy.ps1: Universal One-Click Deployment for Antigravity Remote Proxy Switch
param(
    [Parameter(Mandatory=$true)]
    [string]$TargetHost
)

Write-Host "==========================================================" -ForegroundColor Green
Write-Host " 开始向远程主机 [$TargetHost] 自动部署 Antigravity 代理切换组件..." -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Green

$remoteScript = @'
#!/bin/bash
set -e

echo "[1/4] 创建 Antigravity 服务脚本目录..."
mkdir -p "$HOME/.antigravity-ide-server/bin"
mkdir -p "$HOME/.antigravity-ide-server/data/User"

echo "[2/4] 安装 agy-proxy 控制脚本..."
cat << 'EOF' > "$HOME/.antigravity-ide-server/bin/agy-proxy"
#!/bin/bash
# Antigravity IDE Remote Proxy Control Script
DISABLED_FLAG="$HOME/.antigravity-ide-server/proxy.disabled"

restart_agy() {
    for p in $(pidof agy agy.real 2>/dev/null); do
        kill -9 "$p" 2>/dev/null || true
    done
}

case "$1" in
    on|enable)
        rm -f "$DISABLED_FLAG"
        echo "============================================="
        echo " [OK] Antigravity Proxy: ENABLED [ON]"
        echo " Mode: Routes via local 7897 reverse tunnel"
        echo " Reloading AI core service..."
        restart_agy
        echo " Reload complete! AI network is now ACTIVE."
        echo "============================================="
        ;;
    off|disable)
        touch "$DISABLED_FLAG"
        echo "============================================="
        echo " [OFF] Antigravity Proxy: DISABLED [OFF]"
        echo " Mode: Pure Direct Connection (No proxy variables)"
        echo " Note: 100% direct connection when remote has no proxy"
        echo " Reloading AI core service..."
        restart_agy
        echo " Reload complete! Proxy completely detached."
        echo "============================================="
        ;;
    toggle)
        if [ -f "$DISABLED_FLAG" ]; then
            exec "$0" on
        else
            exec "$0" off
        fi
        ;;
    status|"")
        echo "============================================="
        if [ -f "$DISABLED_FLAG" ]; then
            echo " Status: [DISABLED / OFF]"
            echo " Mode: Pure Direct Connection (zero proxy injected)"
        else
            echo " Status: [ENABLED / ON]"
            echo " Target: 127.0.0.1:7897 (Local reverse tunnel)"
            if nc -z 127.0.0.1 7897 2>/dev/null; then
                echo " Tunnel: OK (Port 7897 is reachable)"
            else
                echo " Tunnel: WARN (Port 7897 is not listening, check SSH RemoteForward)"
            fi
        fi
        echo "============================================="
        ;;
    *)
        echo "Usage: agy-proxy {on|off|toggle|status}"
        exit 1
        ;;
esac
EOF
chmod +x "$HOME/.antigravity-ide-server/bin/agy-proxy"

mkdir -p "$HOME/.local/bin"
ln -sf "$HOME/.antigravity-ide-server/bin/agy-proxy" "$HOME/.local/bin/agy-proxy" 2>/dev/null || true

echo "[3/4] 包装 Antigravity AI 后端二进制 (~/.gemini/bin/agy)..."
if [ -f "$HOME/.gemini/bin/agy" ] && [ ! -L "$HOME/.gemini/bin/agy" ]; then
    if ! grep -q "agy.real" "$HOME/.gemini/bin/agy" 2>/dev/null; then
        mv "$HOME/.gemini/bin/agy" "$HOME/.gemini/bin/agy.real"
        cat << 'EOF' > "$HOME/.gemini/bin/agy"
#!/bin/bash
DISABLED_FLAG="$HOME/.antigravity-ide-server/proxy.disabled"
if [ ! -f "$DISABLED_FLAG" ] && nc -z 127.0.0.1 7897 2>/dev/null; then
    export http_proxy="http://127.0.0.1:7897"
    export https_proxy="http://127.0.0.1:7897"
    export HTTP_PROXY="http://127.0.0.1:7897"
    export HTTPS_PROXY="http://127.0.0.1:7897"
    export all_proxy="socks5://127.0.0.1:7897"
    export ALL_PROXY="socks5://127.0.0.1:7897"
    export no_proxy="localhost,127.0.0.1,10.0.0.0/8,192.168.0.0/16"
    export NO_PROXY="localhost,127.0.0.1,10.0.0.0/8,192.168.0.0/16"
else
    unset http_proxy https_proxy HTTP_PROXY HTTPS_PROXY all_proxy ALL_PROXY
fi
exec "$HOME/.gemini/bin/agy.real" "$@"
EOF
        chmod +x "$HOME/.gemini/bin/agy"
        chmod +x "$HOME/.gemini/bin/agy.real"
        echo "  -> agy 包装成功。"
    else
        echo "  -> agy 已处于包装状态，跳过。"
    fi
fi

echo "[4/4] 注册 IDE 快捷任务 (~/.antigravity-ide-server/data/User/tasks.json)..."
cat << 'EOF' > "$HOME/.antigravity-ide-server/data/User/tasks.json"
{
    "version": "2.0.0",
    "tasks": [
        {
            "label": "Antigravity 代理: 切换开启/关闭",
            "type": "shell",
            "command": "$HOME/.antigravity-ide-server/bin/agy-proxy toggle",
            "problemMatcher": [],
            "presentation": {
                "reveal": "always",
                "panel": "shared"
            }
        },
        {
            "label": "Antigravity 代理: 查看状态",
            "type": "shell",
            "command": "$HOME/.antigravity-ide-server/bin/agy-proxy status",
            "problemMatcher": [],
            "presentation": {
                "reveal": "always",
                "panel": "shared"
            }
        },
        {
            "label": "Antigravity 代理: 强制开启 (ON)",
            "type": "shell",
            "command": "$HOME/.antigravity-ide-server/bin/agy-proxy on",
            "problemMatcher": [],
            "presentation": {
                "reveal": "always",
                "panel": "shared"
            }
        },
        {
            "label": "Antigravity 代理: 强制关闭 (OFF - 纯直连)",
            "type": "shell",
            "command": "$HOME/.antigravity-ide-server/bin/agy-proxy off",
            "problemMatcher": [],
            "presentation": {
                "reveal": "always",
                "panel": "shared"
            }
        }
    ]
}
EOF

# 热重启运行中的 agy 进程
for p in $(pidof agy agy.real 2>/dev/null); do
    kill -9 "$p" 2>/dev/null || true
done

echo "部署完成！当前状态如下："
"$HOME/.antigravity-ide-server/bin/agy-proxy" status
'@

$remoteBase64 = [Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes($remoteScript))
ssh -n -o BatchMode=yes $TargetHost "echo '$remoteBase64' | base64 -d | bash"

Write-Host "==========================================================" -ForegroundColor Green
Write-Host " 主机 [$TargetHost] 部署完成！" -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Green
