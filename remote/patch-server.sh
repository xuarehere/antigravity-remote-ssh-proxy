#!/bin/bash
# Patch script for ~/.antigravity-ide-server/bin/*/bin/antigravity-ide-server

set -e

SERVER_BIN=$(ls -d $HOME/.antigravity-ide-server/bin/*/bin/antigravity-ide-server 2>/dev/null | head -n 1)

if [ -z "$SERVER_BIN" ] || [ ! -f "$SERVER_BIN" ]; then
    echo "Error: antigravity-ide-server launch script not found."
    exit 1
fi

if grep -q "Antigravity IDE Remote Proxy (Dynamic Switch)" "$SERVER_BIN"; then
    echo "Already patched: $SERVER_BIN"
    exit 0
fi

cp "$SERVER_BIN" "$SERVER_BIN.bak"

# Insert patch before "$ROOT/node"
PATCH_CODE='
# Antigravity IDE Remote Proxy (Dynamic Switch)
SWITCH_DISABLED="$HOME/.antigravity-ide-server/proxy.disabled"
if [ ! -f "$SWITCH_DISABLED" ] && nc -z 127.0.0.1 7897 2>/dev/null; then
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
'

awk -v patch="$PATCH_CODE" '
/"\$ROOT\/node"/ && !inserted {
    print patch
    inserted=1
}
{ print }
' "$SERVER_BIN.bak" > "$SERVER_BIN"

chmod +x "$SERVER_BIN"
echo "Successfully patched: $SERVER_BIN"
