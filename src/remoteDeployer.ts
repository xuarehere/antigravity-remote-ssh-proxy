import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as vscode from 'vscode';

export class RemoteDeployer {
  private homeDir: string;
  private serverBinDir: string;
  private agyProxyPath: string;
  private geminiBinDir: string;
  private agyPath: string;
  private agyRealPath: string;

  constructor() {
    this.homeDir = os.homedir();
    this.serverBinDir = path.join(this.homeDir, '.antigravity-ide-server', 'bin');
    this.agyProxyPath = path.join(this.serverBinDir, 'agy-proxy');
    this.geminiBinDir = path.join(this.homeDir, '.gemini', 'bin');
    this.agyPath = path.join(this.geminiBinDir, 'agy');
    this.agyRealPath = path.join(this.geminiBinDir, 'agy.real');
  }

  public isDeployed(): boolean {
    try {
      const proxyExists = fs.existsSync(this.agyProxyPath);
      const agyRealExists = fs.existsSync(this.agyRealPath);
      return proxyExists && agyRealExists;
    } catch {
      return false;
    }
  }

  public async deploy(): Promise<boolean> {
    try {
      // 1. Ensure server bin dir exists
      if (!fs.existsSync(this.serverBinDir)) {
        fs.mkdirSync(this.serverBinDir, { recursive: true });
      }

      // 2. Write agy-proxy script
      const agyProxyContent = `#!/bin/bash
# Antigravity IDE Remote Proxy Control Script
CONF_FILE="$HOME/.antigravity-ide-server/proxy.conf"
PROXY_HOST="127.0.0.1"
PROXY_PORT="7897"
[ -f "$CONF_FILE" ] && source "$CONF_FILE"

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
        echo " Target: \${PROXY_HOST}:\${PROXY_PORT} (Local reverse tunnel)"
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
            echo " Target: \${PROXY_HOST}:\${PROXY_PORT} (Local reverse tunnel)"
            if nc -w 1 -z "$PROXY_HOST" "$PROXY_PORT" 2>/dev/null; then
                echo " Tunnel: OK (Port \${PROXY_PORT} is reachable)"
            else
                echo " Tunnel: WARN (Port \${PROXY_PORT} is not listening, check SSH RemoteForward)"
            fi
        fi
        echo "============================================="
        ;;
    *)
        echo "Usage: agy-proxy {on|off|toggle|status}"
        exit 1
        ;;
esac
`;
      fs.writeFileSync(this.agyProxyPath, agyProxyContent, { mode: 0o755 });

      // Link to ~/.local/bin/agy-proxy if possible
      const localBinDir = path.join(this.homeDir, '.local', 'bin');
      try {
        if (!fs.existsSync(localBinDir)) {
          fs.mkdirSync(localBinDir, { recursive: true });
        }
        const localBinLink = path.join(localBinDir, 'agy-proxy');
        if (!fs.existsSync(localBinLink)) {
          fs.symlinkSync(this.agyProxyPath, localBinLink);
        }
      } catch {
        // Non-critical, ignore
      }

      // 3. Wrap ~/.gemini/bin/agy
      if (fs.existsSync(this.agyPath) && !fs.existsSync(this.agyRealPath)) {
        fs.renameSync(this.agyPath, this.agyRealPath);

        const agyWrapperContent = `#!/bin/bash
CONF_FILE="$HOME/.antigravity-ide-server/proxy.conf"
PROXY_HOST="127.0.0.1"
PROXY_PORT="7897"
[ -f "$CONF_FILE" ] && source "$CONF_FILE"

DISABLED_FLAG="$HOME/.antigravity-ide-server/proxy.disabled"
if [ ! -f "$DISABLED_FLAG" ] && nc -w 1 -z "$PROXY_HOST" "$PROXY_PORT" 2>/dev/null; then
    export http_proxy="http://\${PROXY_HOST}:\${PROXY_PORT}"
    export https_proxy="http://\${PROXY_HOST}:\${PROXY_PORT}"
    export HTTP_PROXY="http://\${PROXY_HOST}:\${PROXY_PORT}"
    export HTTPS_PROXY="http://\${PROXY_HOST}:\${PROXY_PORT}"
    export all_proxy="socks5://\${PROXY_HOST}:\${PROXY_PORT}"
    export ALL_PROXY="socks5://\${PROXY_HOST}:\${PROXY_PORT}"
    export no_proxy="localhost,127.0.0.1,10.0.0.0/8,192.168.0.0/16"
    export NO_PROXY="localhost,127.0.0.1,10.0.0.0/8,192.168.0.0/16"
else
    unset http_proxy https_proxy HTTP_PROXY HTTPS_PROXY all_proxy ALL_PROXY
fi
exec "$HOME/.gemini/bin/agy.real" "$@"
`;
        fs.writeFileSync(this.agyPath, agyWrapperContent, { mode: 0o755 });
        fs.chmodSync(this.agyRealPath, 0o755);
      }

      return true;
    } catch (err: any) {
      vscode.window.showErrorMessage(`配置远端代理组件失败: ${err.message}`);
      return false;
    }
  }
}
