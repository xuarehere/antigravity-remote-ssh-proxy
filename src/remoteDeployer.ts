import { SshBridge } from './sshBridge';

export class RemoteDeployer {
  /**
   * Check if remote environment is already deployed with the wrapper.
   */
  public async isDeployed(targetHost: string): Promise<boolean> {
    const cmd = `[ -f "$HOME/.gemini/bin/agy.real" ] && grep -q "agy.real" "$HOME/.gemini/bin/agy" 2>/dev/null && echo "DEPLOYED"`;
    const res = await SshBridge.execRemote(targetHost, cmd, 5000);
    return res.stdout.includes('DEPLOYED');
  }

  /**
   * Deploy wrapper and proxy controller to remote host via SSH bridge.
   */
  public async deploy(targetHost: string): Promise<boolean> {
    const deployScript = `
mkdir -p "$HOME/.antigravity-ide-server/bin" "$HOME/.gemini/bin"

# 1. Backup original agy to agy.real if not already done
if [ -f "$HOME/.gemini/bin/agy" ] && ! grep -q "agy.real" "$HOME/.gemini/bin/agy" 2>/dev/null; then
    mv -f "$HOME/.gemini/bin/agy" "$HOME/.gemini/bin/agy.real"
fi

# 2. Write wrapper script
cat << 'EOF' > "$HOME/.gemini/bin/agy"
#!/bin/bash
CONF_FILE="$HOME/.antigravity-ide-server/proxy.conf"
PROXY_HOST="127.0.0.1"
PROXY_PORT="7897"
[ -f "$CONF_FILE" ] && source "$CONF_FILE"

DISABLED_FLAG="$HOME/.antigravity-ide-server/proxy.disabled"
if [ ! -f "$DISABLED_FLAG" ]; then
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
EOF

chmod +x "$HOME/.gemini/bin/agy"
[ -f "$HOME/.gemini/bin/agy.real" ] && chmod +x "$HOME/.gemini/bin/agy.real"

# 3. Write CLI tool agy-proxy for remote manual use
cat << 'EOF' > "$HOME/.antigravity-ide-server/bin/agy-proxy"
#!/bin/bash
CONF_FILE="$HOME/.antigravity-ide-server/proxy.conf"
PROXY_HOST="127.0.0.1"
PROXY_PORT="7897"
[ -f "$CONF_FILE" ] && source "$CONF_FILE"
DISABLED_FLAG="$HOME/.antigravity-ide-server/proxy.disabled"

check_port() {
    local host="$1"
    local port="$2"
    if command -v nc >/dev/null 2>&1; then
        nc -w 1 -z "$host" "$port" 2>/dev/null
    else
        timeout 1 bash -c "cat < /dev/null > /dev/tcp/$host/$port" 2>/dev/null
    fi
}

restart_agy() {
    for p in $(pidof agy agy.real 2>/dev/null); do
        kill -9 "$p" 2>/dev/null || true
    done
}

case "$1" in
    on|enable)
        rm -f "$DISABLED_FLAG"
        echo "[OK] Antigravity Proxy: ENABLED [ON]"
        restart_agy
        ;;
    off|disable)
        touch "$DISABLED_FLAG"
        echo "[OFF] Antigravity Proxy: DISABLED [OFF] (Pure Direct Connection)"
        restart_agy
        ;;
    toggle)
        if [ -f "$DISABLED_FLAG" ]; then
            exec "$0" on
        else
            exec "$0" off
        fi
        ;;
    status|"")
        if [ -f "$DISABLED_FLAG" ]; then
            echo "Status: [OFF / Direct Connection]"
        else
            echo "Status: [ON / Proxy Enabled: \${PROXY_HOST}:\${PROXY_PORT}]"
            if check_port "$PROXY_HOST" "$PROXY_PORT"; then
                echo "Tunnel: OK (Port \$PROXY_PORT is reachable)"
            else
                echo "Tunnel: WARN (Port \$PROXY_PORT is NOT reachable)"
            fi
        fi
        ;;
    test)
        echo "Testing connection from container to Google AI..."
        curl -sI -m 5 -x "http://\${PROXY_HOST}:\${PROXY_PORT}" https://aicode.googleapis.com
        ;;
    *)
        echo "Usage: $0 {on|off|toggle|status|test}"
        exit 1
        ;;
esac
EOF

chmod +x "$HOME/.antigravity-ide-server/bin/agy-proxy"
echo "DEPLOY_SUCCESS"
`;

    const res = await SshBridge.execRemote(targetHost, deployScript, 10000);
    return res.stdout.includes('DEPLOY_SUCCESS');
  }

  /**
   * Completely restore remote environment back to clean initial state.
   */
  public async restore(targetHost: string): Promise<boolean> {
    const restoreScript = `
if [ -f "$HOME/.gemini/bin/agy.real" ]; then
    rm -f "$HOME/.gemini/bin/agy"
    mv -f "$HOME/.gemini/bin/agy.real" "$HOME/.gemini/bin/agy"
    chmod +x "$HOME/.gemini/bin/agy"
fi
rm -f "$HOME/.antigravity-ide-server/bin/agy-proxy"
rm -f "$HOME/.antigravity-ide-server/proxy.conf"
rm -f "$HOME/.antigravity-ide-server/proxy.disabled"
for p in $(pidof agy agy.real 2>/dev/null); do
    kill -9 "$p" 2>/dev/null || true
done
echo "RESTORE_SUCCESS"
`;

    const res = await SshBridge.execRemote(targetHost, restoreScript, 10000);
    return res.stdout.includes('RESTORE_SUCCESS');
  }
}
