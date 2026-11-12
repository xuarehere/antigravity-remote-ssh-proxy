#!/bin/bash
CONF_FILE="$HOME/.antigravity-ide-server/proxy.conf"
PROXY_HOST="127.0.0.1"
PROXY_PORT="7897"
[ -f "$CONF_FILE" ] && source "$CONF_FILE"

check_port() {
    local host="$1"
    local port="$2"
    if command -v nc >/dev/null 2>&1; then
        nc -w 1 -z "$host" "$port" 2>/dev/null
    else
        timeout 1 bash -c "cat < /dev/null > /dev/tcp/$host/$port" 2>/dev/null
    fi
}

DISABLED_FLAG="$HOME/.antigravity-ide-server/proxy.disabled"
if [ ! -f "$DISABLED_FLAG" ] && check_port "$PROXY_HOST" "$PROXY_PORT"; then
    export http_proxy="http://${PROXY_HOST}:${PROXY_PORT}"
    export https_proxy="http://${PROXY_HOST}:${PROXY_PORT}"
    export HTTP_PROXY="http://${PROXY_HOST}:${PROXY_PORT}"
    export HTTPS_PROXY="http://${PROXY_HOST}:${PROXY_PORT}"
    export all_proxy="socks5://${PROXY_HOST}:${PROXY_PORT}"
    export ALL_PROXY="socks5://${PROXY_HOST}:${PROXY_PORT}"
    export no_proxy="localhost,127.0.0.1,10.0.0.0/8,192.168.0.0/16"
    export NO_PROXY="localhost,127.0.0.1,10.0.0.0/8,192.168.0.0/16"
else
    unset http_proxy https_proxy HTTP_PROXY HTTPS_PROXY all_proxy ALL_PROXY
fi
exec "$HOME/.gemini/bin/agy.real" "$@"
