"use strict";var L=Object.create;var $=Object.defineProperty;var N=Object.getOwnPropertyDescriptor;var Y=Object.getOwnPropertyNames;var X=Object.getPrototypeOf,z=Object.prototype.hasOwnProperty;var U=(i,t)=>{for(var e in t)$(i,e,{get:t[e],enumerable:!0})},C=(i,t,e,o)=>{if(t&&typeof t=="object"||typeof t=="function")for(let s of Y(t))!z.call(i,s)&&s!==e&&$(i,s,{get:()=>t[s],enumerable:!(o=N(t,s))||o.enumerable});return i};var b=(i,t,e)=>(e=i!=null?L(X(i)):{},C(t||!i||!i.__esModule?$(e,"default",{value:i,enumerable:!0}):e,i)),G=i=>C($({},"__esModule",{value:!0}),i);var V={};U(V,{activate:()=>W,deactivate:()=>j});module.exports=G(V);var l=b(require("vscode"));var M=b(require("net")),d=b(require("vscode"));var O=require("child_process"),B=b(require("os")),E=class{tunnelProcess=null;currentHost=null;activePort=7897;isTunnelActive(){return this.tunnelProcess!==null&&!this.tunnelProcess.killed}getActiveHost(){return this.currentHost}async startTunnel(t,e=7897,o=7897){let s=(t||"").trim();if(!s)return!1;if(this.isTunnelActive()&&this.currentHost===s&&this.activePort===e)return!0;this.stopTunnel(),this.currentHost=s,this.activePort=e;try{let n=["-N","-o","BatchMode=yes","-o","ExitOnForwardFailure=yes","-o","ServerAliveInterval=15","-o","ServerAliveCountMax=3","-R",`${e}:127.0.0.1:${o}`,s];return this.tunnelProcess=(0,O.spawn)("ssh",n,{windowsHide:!0,stdio:"ignore",detached:!1}),this.tunnelProcess.on("exit",()=>{this.tunnelProcess=null}),this.tunnelProcess.on("error",()=>{this.tunnelProcess=null}),await new Promise(r=>setTimeout(r,1500)),this.isTunnelActive()}catch{return this.tunnelProcess=null,!1}}stopTunnel(){if(this.tunnelProcess){try{B.platform()==="win32"&&this.tunnelProcess.pid?(0,O.exec)(`taskkill /PID ${this.tunnelProcess.pid} /F /T`,()=>{}):this.tunnelProcess.kill("SIGTERM")}catch{}this.tunnelProcess=null}}dispose(){this.stopTunnel()}};var I=require("child_process"),u=class{static execRemote(t,e,o=1e4){return new Promise(s=>{let n=(t||"").trim();if(!n){s({stdout:"",stderr:"No remote host specified",exitCode:-1});return}(0,I.execFile)("ssh",["-n","-o","BatchMode=yes","-o","ConnectTimeout=5",n,e],{timeout:o,windowsHide:!0},(a,c,g)=>{let p=a?typeof a.code=="number"?a.code:1:0;s({stdout:c||"",stderr:g||(a?a.message:""),exitCode:p})})})}static async isHostReachable(t){let e=await this.execRemote(t,"echo SSH_OK",4e3);return e.exitCode===0&&e.stdout.includes("SSH_OK")}};var R=class{async isDeployed(t){return(await u.execRemote(t,'[ -f "$HOME/.gemini/bin/agy.real" ] && grep -q "agy.real" "$HOME/.gemini/bin/agy" 2>/dev/null && echo "DEPLOYED"',5e3)).stdout.includes("DEPLOYED")}async deploy(t,e="127.0.0.1",o=7897){let s=`#!/bin/bash
CONF_FILE="$HOME/.antigravity-ide-server/proxy.conf"
PROXY_HOST="${e}"
PROXY_PORT="${o}"
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
`,n=`#!/bin/bash
CONF_FILE="$HOME/.antigravity-ide-server/proxy.conf"
PROXY_HOST="${e}"
PROXY_PORT="${o}"
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
                echo "Tunnel: OK (Port $PROXY_PORT is reachable)"
            else
                echo "Tunnel: WARN (Port $PROXY_PORT is NOT reachable)"
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
`,r=Buffer.from(s,"utf8").toString("base64"),a=Buffer.from(n,"utf8").toString("base64"),c=`
mkdir -p "$HOME/.antigravity-ide-server/bin" "$HOME/.gemini/bin"

PROXY_HOST="${e}"
PROXY_PORT="${o}"
TAR_URL="https://storage.googleapis.com/antigravity-public/antigravity-cli/1.5.6-6212266538958848/linux-x64/cli_linux_x64.tar.gz"

# 1. Check existing binary and backup to agy.real if not already done
if [ -f "$HOME/.gemini/bin/agy" ] && ! grep -q "agy.real" "$HOME/.gemini/bin/agy" 2>/dev/null; then
    mv -f "$HOME/.gemini/bin/agy" "$HOME/.gemini/bin/agy.real"
fi

# 2. If agy.real still doesn't exist, download via reverse proxy tunnel in seconds
if [ ! -f "$HOME/.gemini/bin/agy.real" ]; then
    echo "[DEPLOY] agy.real not found, accelerating download via reverse proxy \${PROXY_HOST}:\${PROXY_PORT}..."
    TMP_DL="$HOME/.gemini/bin/agy.fast_download.tar.gz"
    if curl -s -m 60 -x "http://\${PROXY_HOST}:\${PROXY_PORT}" -o "$TMP_DL" "$TAR_URL"; then
        tar -xzf "$TMP_DL" -C "$HOME/.gemini/bin/" 2>/dev/null || true
        if [ -f "$HOME/.gemini/bin/agy" ] && ! grep -q "agy.real" "$HOME/.gemini/bin/agy" 2>/dev/null; then
            mv -f "$HOME/.gemini/bin/agy" "$HOME/.gemini/bin/agy.real"
        fi
        rm -f "$TMP_DL"
        # Write valid version sidecar
        cat << 'VERSION_EOF' > "$HOME/.gemini/bin/agy.version.json"
{
  "schemaVersion": 1,
  "version": "1.5.6",
  "size": 279462288,
  "mtimeMs": 1794393639000,
  "ino": 0,
  "installedAt": 1794473588534,
  "sha512": "0c67824908caf9cc3156699802b8097f2fd02c4608ae9293c9aa7f17e1bcd342c4b9c2e158388253a37804ef6bd9c6b1d25cfaca3c07bbb7587378fc91839bb4",
  "releaseBaseUrl": "https://antigravity-cli-auto-updater-974169037036.us-central1.run.app"
}
VERSION_EOF
    fi
fi

# 3. Clean up any stalled lock or temporary partial downloads from official extension
rm -f "$HOME/.gemini/bin/.agy-install.lock"
rm -f "$HOME/.gemini/bin/agy.tmp."*

# 4. Write wrapper script with base64 decoding (100% immune to escaping issues)
echo "${r}" | base64 -d > "$HOME/.gemini/bin/agy"
chmod +x "$HOME/.gemini/bin/agy"
[ -f "$HOME/.gemini/bin/agy.real" ] && chmod +x "$HOME/.gemini/bin/agy.real"

# 5. Write CLI tool agy-proxy for remote manual use
echo "${a}" | base64 -d > "$HOME/.antigravity-ide-server/bin/agy-proxy"
chmod +x "$HOME/.antigravity-ide-server/bin/agy-proxy"

echo "DEPLOY_SUCCESS"
`;return(await u.execRemote(t,c,6e4)).stdout.includes("DEPLOY_SUCCESS")}async restore(t){return(await u.execRemote(t,`
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
`,1e4)).stdout.includes("RESTORE_SUCCESS")}};var S=class i{tunnelManager;deployer;cachedEnabledState=!0;constructor(){this.tunnelManager=new E,this.deployer=new R}getTunnelManager(){return this.tunnelManager}getDeployer(){return this.deployer}static parseRemoteHostFromAuthority(t){if(!t||!t.startsWith("ssh-remote+"))return null;let e=t.substring(11);if(/^[0-9a-fA-F]+$/.test(e)&&e.length%2===0)try{let o=Buffer.from(e,"hex").toString("utf8");if(o.startsWith("{")&&o.endsWith("}")){let s=JSON.parse(o);if(s&&typeof s.hostName=="string"&&s.hostName.trim())return s.hostName.trim()}}catch{}try{return decodeURIComponent(e).trim()}catch{return e.trim()}}detectRemoteHost(){let t=d.workspace.workspaceFolders;if(t&&t.length>0)for(let r of t){let a=i.parseRemoteHostFromAuthority(r.uri.authority);if(a)return a}let e=d.window.activeTextEditor?.document.uri;if(e&&e.authority){let r=i.parseRemoteHostFromAuthority(e.authority);if(r)return r}let o=d.workspace.workspaceFile;if(o&&o.authority){let r=i.parseRemoteHostFromAuthority(o.authority);if(r)return r}let n=d.workspace.getConfiguration("antigravityRemoteProxy").get("remoteHost","").trim();return n||null}async waitForRemoteHost(t=10,e=500){for(let o=0;o<t;o++){let s=this.detectRemoteHost();if(s)return s;await new Promise(n=>setTimeout(n,e))}return null}getProxyHost(){return d.workspace.getConfiguration("antigravityRemoteProxy").get("proxyHost","127.0.0.1").trim()||"127.0.0.1"}getProxyPort(){let e=d.workspace.getConfiguration("antigravityRemoteProxy").get("proxyPort",7897);return typeof e=="number"&&e>0&&e<=65535?e:7897}isEnabled(){return this.cachedEnabledState}async syncStatusFromRemote(){let t=this.detectRemoteHost();if(!t)return this.cachedEnabledState;try{let o=await u.execRemote(t,'[ -f "$HOME/.antigravity-ide-server/proxy.disabled" ] && echo "DISABLED" || echo "ENABLED"',4e3);this.cachedEnabledState=!o.stdout.includes("DISABLED")}catch{}return this.cachedEnabledState}async enable(){let t=this.detectRemoteHost(),e=this.getProxyPort(),o=this.getProxyHost();try{if(t){await this.tunnelManager.startTunnel(t,e,e);try{await d.workspace.getConfiguration("http").update("proxy",`http://${o}:${e}`,d.ConfigurationTarget.Workspace)}catch{}await u.execRemote(t,'rm -f "$HOME/.antigravity-ide-server/proxy.disabled"',4e3),await this.deployer.isDeployed(t)||await this.deployer.deploy(t,o,e),await this.restartAgy(t)}this.cachedEnabledState=!0}catch(s){d.window.showErrorMessage(`\u5F00\u542F\u4EE3\u7406\u5931\u8D25: ${s.message}`)}}async disable(){let t=this.detectRemoteHost();try{if(t){try{await d.workspace.getConfiguration("http").update("proxy",void 0,d.ConfigurationTarget.Workspace)}catch{}await u.execRemote(t,'mkdir -p "$HOME/.antigravity-ide-server" && touch "$HOME/.antigravity-ide-server/proxy.disabled"',4e3),this.tunnelManager.stopTunnel(),await this.restartAgy(t)}this.cachedEnabledState=!1}catch(e){d.window.showErrorMessage(`\u5173\u95ED\u4EE3\u7406\u5931\u8D25: ${e.message}`)}}async toggle(){return this.isEnabled()?(await this.disable(),!1):(await this.enable(),!0)}async saveConfig(t,e){let o=(t||"127.0.0.1").trim(),s=Number(e)||7897,n=d.workspace.getConfiguration("antigravityRemoteProxy");await n.update("proxyHost",o,d.ConfigurationTarget.Global),await n.update("proxyPort",s,d.ConfigurationTarget.Global);let r=this.detectRemoteHost();if(r){let a=`mkdir -p "$HOME/.antigravity-ide-server" && printf 'PROXY_HOST="%s"\\nPROXY_PORT="%s"\\n' '${o}' '${s}' > "$HOME/.antigravity-ide-server/proxy.conf"`;if(await u.execRemote(r,a,4e3),this.isEnabled()){await this.tunnelManager.startTunnel(r,s,s);try{await d.workspace.getConfiguration("http").update("proxy",`http://${o}:${s}`,d.ConfigurationTarget.Workspace)}catch{}await this.restartAgy(r)}}}async restoreRemote(){let t=this.detectRemoteHost();this.tunnelManager.stopTunnel();try{await d.workspace.getConfiguration("http").update("proxy",void 0,d.ConfigurationTarget.Workspace)}catch{}if(!t)return!0;let e=await this.deployer.restore(t);return this.cachedEnabledState=!1,e}async restartAgy(t){let e=t||this.detectRemoteHost();if(!e)return;await u.execRemote(e,'for p in $(pidof agy agy.real 2>/dev/null); do kill -9 "$p" 2>/dev/null || true; done',4e3)}async checkPort(t,e="127.0.0.1",o=1500){let s=this.detectRemoteHost();if(s){let n=`if command -v nc >/dev/null 2>&1; then nc -w 1 -z "${e}" "${t}" 2>/dev/null && echo "OPEN" || echo "CLOSED"; else timeout 1 bash -c "cat < /dev/null > /dev/tcp/${e}/${t}" 2>/dev/null && echo "OPEN" || echo "CLOSED"; fi`;return(await u.execRemote(s,n,o+1e3)).stdout.includes("OPEN")}return new Promise(n=>{let r=new M.Socket;r.setTimeout(o),r.on("connect",()=>{r.destroy(),n(!0)}),r.on("timeout",()=>{r.destroy(),n(!1)}),r.on("error",()=>{r.destroy(),n(!1)}),r.connect(t,e)})}dispose(){this.tunnelManager.dispose()}};var v=b(require("vscode")),H=class{statusBarItem;controller;updateTimer=null;constructor(t){this.controller=t,this.statusBarItem=v.window.createStatusBarItem(v.StatusBarAlignment.Right,100),this.statusBarItem.command="antigravityRemoteProxy.menu"}init(t){t.subscriptions.push(this.statusBarItem),this.update(),this.statusBarItem.show(),this.updateTimer=setInterval(()=>{this.update()},5e3),t.subscriptions.push({dispose:()=>{this.updateTimer&&clearInterval(this.updateTimer)}})}async update(){let t=this.controller.getProxyHost(),e=this.controller.getProxyPort();if(!this.controller.isEnabled()){this.statusBarItem.text="$(circle-slash) AI\u4EE3\u7406: \u7EAF\u76F4\u8FDE",this.statusBarItem.tooltip=`Antigravity \u4EE3\u7406: \u5DF2\u5173\u95ED (\u7EAF\u76F4\u8FDE\u6A21\u5F0F)
\u76EE\u6807\u4E3B\u673A\u4E0E\u7AEF\u53E3: ${t}:${e}
\u70B9\u51FB\u6253\u5F00\u8BBE\u7F6E\u9762\u677F\u6216\u5207\u6362`,this.statusBarItem.backgroundColor=void 0;return}await this.controller.checkPort(e,t)?(this.statusBarItem.text=`$(plug) AI\u4EE3\u7406: \u5F00\u542F (${e})`,this.statusBarItem.tooltip=`Antigravity \u4EE3\u7406: \u5DF2\u5F00\u542F (\u8D70\u53CD\u5411\u96A7\u9053 ${t}:${e})
\u96A7\u9053\u72B6\u6001: \u2713 \u6B63\u5E38\u8FDE\u901A
\u70B9\u51FB\u6253\u5F00\u8BBE\u7F6E\u9762\u677F\u6216\u5207\u6362`,this.statusBarItem.backgroundColor=void 0):(this.statusBarItem.text="$(warning) AI\u4EE3\u7406: \u96A7\u9053\u672A\u901A",this.statusBarItem.tooltip=`Antigravity \u4EE3\u7406: \u5DF2\u5F00\u542F\uFF0C\u4F46 ${t}:${e} \u65E0\u6CD5\u8FDE\u901A\uFF01
\u8BF7\u68C0\u67E5\u672C\u5730 SSH \u914D\u7F6E\u6216\u4EE3\u7406\u8F6F\u4EF6
\u70B9\u51FB\u6253\u5F00\u8BBE\u7F6E\u9762\u677F\u8FDB\u884C\u6D4B\u8BD5`,this.statusBarItem.backgroundColor=new v.ThemeColor("statusBarItem.warningBackground"))}};var k=b(require("vscode")),_=require("child_process");var T=class{controller;outputChannel;constructor(t){this.controller=t,this.outputChannel=k.window.createOutputChannel("Antigravity Proxy Diagnostics")}async testConnection(t,e){let o=(t||this.controller.getProxyHost()||"127.0.0.1").trim(),s=Number(e)||this.controller.getProxyPort()||7897,n=this.controller.isEnabled(),r=this.controller.detectRemoteHost(),a=[],c=!1,g=Date.now();try{c=await this.controller.checkPort(s,o,2e3);let y=Date.now()-g;c?a.push({name:`\u53CD\u5411\u96A7\u9053\u7AEF\u53E3 (${o}:${s})`,status:"success",latencyMs:y,message:`\u8FDE\u901A\u6B63\u5E38 (TCP \u63E1\u624B\u8017\u65F6 ${y}ms)`}):a.push({name:`\u53CD\u5411\u96A7\u9053\u7AEF\u53E3 (${o}:${s})`,status:"error",latencyMs:y,message:"\u65E0\u6CD5\u5EFA\u7ACB TCP \u63E1\u624B\uFF01\u8BF7\u68C0\u67E5\u672C\u5730\u4EE3\u7406\u5DE5\u5177\u662F\u5426\u542F\u52A8\uFF0C\u4E14\u53CD\u5411\u96A7\u9053\u8FDB\u7A0B\u662F\u5426\u6B63\u5E38\u8FD0\u884C\u3002"})}catch(y){a.push({name:`\u53CD\u5411\u96A7\u9053\u7AEF\u53E3 (${o}:${s})`,status:"error",message:`\u68C0\u6D4B\u5F02\u5E38: ${y.message}`})}let p=c?`-x http://${o}:${s}`:"",m=await this.probeUrl(r,"Google AI \u6838\u5FC3\u63A5\u53E3 (aicode.googleapis.com)","https://aicode.googleapis.com",p);a.push(m);let f=await this.probeUrl(r,"Google \u9065\u6D4B\u670D\u52A1 (play.googleapis.com/log)","https://play.googleapis.com/log",p);a.push(f);let D=await this.probeUrl(r,"Google \u8D26\u53F7\u4EE4\u724C\u8BA4\u8BC1\u63A5\u53E3 (oauth2.googleapis.com/token)","https://oauth2.googleapis.com/token",p);a.push(D);let w="success",P="\u{1F389} \u4EE3\u7406\u901A\u9053\u7545\u901A\uFF0CGoogle AI \u4E0E\u8D26\u53F7\u8BA4\u8BC1\u63A5\u53E3\u8FDE\u901A\u6B63\u5E38\uFF01",A=a.some(y=>y.status==="error"),F=a.some(y=>y.status==="success");return c?A&&(F?(w="warning",P="\u26A0\uFE0F \u90E8\u5206 Google \u670D\u52A1\u54CD\u5E94\u5F02\u5E38\uFF0C\u8BF7\u68C0\u67E5\u8282\u70B9\u89C4\u5219\u6216\u91CD\u8BD5\u3002"):(w="error",P="\u274C \u65E0\u6CD5\u8BBF\u95EE Google \u670D\u52A1\uFF0C\u8BF7\u68C0\u67E5\u672C\u5730\u4EE3\u7406\u89C4\u5219\u4E0E\u8282\u70B9\u53EF\u7528\u6027\u3002")):(w="error",P=`\u274C \u53CD\u5411\u96A7\u9053\u672A\u8FDE\u901A (${o}:${s})\uFF0C\u8BF7\u68C0\u67E5\u672C\u5730\u4EE3\u7406\u53CA\u52A8\u6001\u96A7\u9053\u72B6\u6001\u3002`),{timestamp:new Date().toLocaleTimeString(),proxyHost:o,proxyPort:s,isEnabled:n,tunnelReachable:c,steps:a,overallStatus:w,summary:P}}async probeUrl(t,e,o,s){let n=Date.now(),r=`curl -sI -m 6 ${s} "${o}"`;if(t){let a=await u.execRemote(t,r,8e3),c=Date.now()-n;if(a.exitCode!==0&&!a.stdout.includes("HTTP/")){let g=a.stderr.trim()||`Exit code ${a.exitCode}`;return{name:e,status:"error",latencyMs:c,message:`\u8BF7\u6C42\u5931\u8D25 (${c}ms): ${g.slice(0,100)}`}}return this.evaluateCurlOutput(e,a.stdout,c)}return new Promise(a=>{(0,_.exec)(r,(c,g,p)=>{let m=Date.now()-n;if(c){let f=p?p.trim():c.message.trim();a({name:e,status:"error",latencyMs:m,message:`\u8BF7\u6C42\u5931\u8D25 (${m}ms): ${f.slice(0,100)}`});return}a(this.evaluateCurlOutput(e,g,m))})})}evaluateCurlOutput(t,e,o){let n=e.split(`
`).map(a=>a.trim()).filter(Boolean)[0]||"",r=e.includes("server: ESF")||e.includes("Server: ESF")||e.includes("200 Connection established")||e.includes("HTTPServer2");return n.includes("200")||n.includes("404")||n.includes("405")||r?{name:t,status:"success",latencyMs:o,message:`\u8BBF\u95EE\u6B63\u5E38 (${n||"HTTP 200"}, \u8017\u65F6 ${o}ms)`}:n.includes("403")?{name:t,status:"error",latencyMs:o,message:"\u8FD4\u56DE 403 Forbidden\uFF08\u53D7\u5730\u57DF\u9650\u5236\u963B\u6B62\uFF0C\u8BF7\u5207\u6362\u652F\u6301 Google AI \u7684\u4EE3\u7406\u8282\u70B9\uFF09"}:{name:t,status:"warning",latencyMs:o,message:`\u8FD4\u56DE\u72B6\u6001: ${n||"\u672A\u77E5"} (${o}ms)`}}async run(){this.outputChannel.clear(),this.outputChannel.show(!0),this.log("===================================================="),this.log(" Antigravity Remote Proxy - \u7F51\u7EDC\u8FDE\u901A\u6027\u8BCA\u65AD\u62A5\u544A"),this.log(` \u65F6\u95F4: ${new Date().toLocaleString()}`),this.log(`====================================================
`);let t=await this.testConnection();this.log(`[1] \u4EE3\u7406\u5F00\u5173: ${t.isEnabled?"\u3010\u5DF2\u5F00\u542F (ON)\u3011":"\u3010\u5DF2\u5173\u95ED (OFF - \u7EAF\u76F4\u8FDE)\u3011"}`),this.log(`[2] \u4EE3\u7406\u76EE\u6807: ${t.proxyHost}:${t.proxyPort}`),this.log(`
--- \u8BCA\u65AD\u660E\u7EC6 ---`);for(let e of t.steps){let o=e.status==="success"?"\u2713":e.status==="warning"?"!":"\u2717";this.log(` ${o} ${e.name}: ${e.message}`)}this.log(`
====================================================`),this.log(` \u7ED3\u8BBA: ${t.summary}`),this.log("====================================================")}log(t){this.outputChannel.appendLine(t)}};var h=b(require("vscode")),x=class i{static currentPanel;_panel;_disposables=[];_controller;_diagnostics;static createOrShow(t,e,o){let s=h.window.activeTextEditor?h.window.activeTextEditor.viewColumn:void 0;if(i.currentPanel){i.currentPanel._panel.reveal(s),i.currentPanel.refresh();return}let n=h.window.createWebviewPanel("antigravityRemoteProxySettings","Antigravity \u4EE3\u7406\u8BBE\u7F6E",s||h.ViewColumn.One,{enableScripts:!0,retainContextWhenHidden:!0,localResourceRoots:[t]});i.currentPanel=new i(n,e,o)}constructor(t,e,o){this._panel=t,this._controller=e,this._diagnostics=o,this._update(),this._panel.onDidDispose(()=>this.dispose(),null,this._disposables),this._panel.webview.onDidReceiveMessage(async s=>{switch(s.command){case"save":{let n=(s.host||"127.0.0.1").trim(),r=parseInt(s.port,10)||7897;await this._controller.saveConfig(n,r),h.window.showInformationMessage(`Antigravity \u4EE3\u7406\u914D\u7F6E\u5DF2\u4FDD\u5B58\uFF01\u4EE3\u7406\u76EE\u6807: ${n}:${r}\uFF0CAI \u670D\u52A1\u5DF2\u79D2\u7EA7\u91CD\u8F7D\u3002`),this.postMessage({type:"saveResult",success:!0,message:`\u914D\u7F6E\u5DF2\u6210\u529F\u4FDD\u5B58\uFF01\u5F53\u524D\u751F\u6548: ${n}:${r}`});break}case"toggle":{let n=await this._controller.toggle();this.postMessage({type:"statusUpdate",isEnabled:n});break}case"testConnection":{let n=(s.host||this._controller.getProxyHost()||"127.0.0.1").trim(),r=parseInt(s.port,10)||this._controller.getProxyPort()||7897;this.postMessage({type:"testStarted"});try{let a=await this._diagnostics.testConnection(n,r);this.postMessage({type:"testResult",report:a})}catch(a){this.postMessage({type:"testError",error:a.message})}break}case"restoreRemote":{await this._controller.restoreRemote()?(h.window.showInformationMessage("\u8FDC\u7A0B\u73AF\u5883\u5DF2 100% \u5F7B\u5E95\u590D\u539F\u4E3A\u539F\u751F\u521D\u59CB\u72B6\u6001\uFF01"),this.postMessage({type:"restoreResult",success:!0,message:"\u8FDC\u7A0B\u73AF\u5883\u5DF2\u5F7B\u5E95\u590D\u539F\u4E3A\u521D\u59CB\u539F\u751F\u72B6\u6001\uFF0C\u6240\u6709\u4EE3\u7406\u5305\u88C5\u4E0E\u7EC4\u4EF6\u5DF2\u5B8C\u5168\u6E05\u9664\u3002"})):this.postMessage({type:"restoreResult",success:!1,message:"\u590D\u539F\u8FDC\u7A0B\u73AF\u5883\u5931\u8D25\uFF0C\u8BF7\u67E5\u770B\u65E5\u5FD7\u3002"});break}case"refresh":{this.refresh();break}}},null,this._disposables)}refresh(){let t=this._controller.isEnabled(),e=this._controller.getProxyHost(),o=this._controller.getProxyPort();this.postMessage({type:"initialData",isEnabled:t,proxyHost:e,proxyPort:o})}postMessage(t){this._panel.webview.postMessage(t)}dispose(){for(i.currentPanel=void 0,this._panel.dispose();this._disposables.length;){let t=this._disposables.pop();t&&t.dispose()}}_update(){this._panel.webview.html=this._getHtmlForWebview()}_getHtmlForWebview(){let t=this._controller.isEnabled(),e=this._controller.getProxyHost(),o=this._controller.getProxyPort(),s=this._controller.detectRemoteHost()||"\u672C\u5730\u5DE5\u4F5C\u533A (\u672A\u8FDE\u63A5\u8FDC\u7A0B SSH)";return`<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Antigravity \u4EE3\u7406\u8BBE\u7F6E\u4E0E\u8BCA\u65AD</title>
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
      <div>
        <div class="header-title">
          <span>\u26A1 Antigravity \u4EE3\u7406\u4E0E\u7F51\u7EDC\u4E2D\u5FC3</span>
          <span id="headerStatusBadge" class="header-badge ${t?"badge-on":"badge-off"}">
            ${t?"\u25CF \u4EE3\u7406\u6A21\u5F0F\u5DF2\u5F00\u542F":"\u25CB \u7EAF\u76F4\u8FDE\u6A21\u5F0F"}
          </span>
        </div>
        <div style="margin-top: 6px; font-size: 11px; opacity: 0.8; font-family: var(--font-mono);">
          <span>\u{1F310} \u5F53\u524D\u76EE\u6807\u4E3B\u673A: <strong>${s}</strong></span>
        </div>
      </div>
      <div>
        <button id="toggleBtn" class="btn-secondary" onclick="toggleProxy()">
          ${t?"\u5207\u6362\u4E3A\u7EAF\u76F4\u8FDE (OFF)":"\u5207\u6362\u4E3A\u4EE3\u7406\u6A21\u5F0F (ON)"}
        </button>
      </div>
    </div>

    <!-- Configuration Form -->
    <div class="card">
      <div class="card-title">
        <span>\u2699\uFE0F \u4EE3\u7406\u53C2\u6570\u914D\u7F6E</span>
        <span style="font-size: 11px; font-weight: normal; opacity: 0.7;">\u5373\u6539\u5373\u5B58\uFF0C\u79D2\u7EA7\u70ED\u751F\u6548</span>
      </div>

      <div class="form-row">
        <div class="form-col">
          <div class="form-group">
            <label for="proxyHost">\u4EE3\u7406\u4E3B\u673A (Proxy Host)</label>
            <input type="text" id="proxyHost" value="${e}" placeholder="127.0.0.1" />
            <div class="field-hint">SSH \u53CD\u5411\u96A7\u9053\u76D1\u542C\u7684\u4E3B\u673A\u5730\u5740 (\u901A\u5E38\u4E3A 127.0.0.1)</div>
          </div>
        </div>
        <div class="form-col">
          <div class="form-group">
            <label for="proxyPort">\u4EE3\u7406\u7AEF\u53E3 (Proxy Port)</label>
            <input type="number" id="proxyPort" value="${o}" placeholder="7897" min="1" max="65535" />
            <div class="field-hint">\u672C\u5730 Clash/\u4EE3\u7406\u6620\u5C04\u5230\u8FDC\u7AEF\u7684\u7AEF\u53E3 (\u5982 7897)</div>
          </div>
        </div>
      </div>

      <div class="btn-group">
        <button id="saveBtn" class="btn-primary" onclick="saveSettings()">
          <span>\u{1F4BE} \u4FDD\u5B58\u914D\u7F6E (Save)</span>
        </button>
        <button class="btn-secondary" onclick="resetDefaults()">
          <span>\u{1F504} \u6062\u590D\u9ED8\u8BA4\u503C</span>
        </button>
      </div>

      <div id="saveStatusMsg" class="status-msg"></div>
    </div>

    <!-- Diagnostics / Connection Test -->
    <div class="card">
      <div class="card-title">
        <span>\u{1F50D} \u771F\u5B9E\u7F51\u7EDC\u8FDE\u901A\u6027\u6D4B\u8BD5 (Remote Test)</span>
        <span style="font-size: 11px; font-weight: normal; opacity: 0.7;">\u8FDC\u7A0B\u5BB9\u5668\u76F4\u6D4B\uFF1ASSH \u96A7\u9053\u3001Google AI\u3001OAuth \u8BA4\u8BC1</span>
      </div>

      <p style="font-size: 12px; opacity: 0.8; margin-bottom: 14px;">
        \u70B9\u51FB\u201C\u91CD\u65B0\u6D4B\u8BD5\u201D\u6309\u94AE\uFF0C\u5C06\u5728<strong>\u8FDC\u7A0B\u5BB9\u5668\u5185\u90E8</strong>\u5B9E\u65F6\u68C0\u6D4B SSH \u53CD\u5411\u96A7\u9053\u8FDE\u901A\u6027\u3001Google AI (aicode) \u6838\u5FC3\u63A5\u53E3\u3001\u9065\u6D4B\u670D\u52A1\u4E0E <strong>Google OAuth \u8D26\u53F7\u8BA4\u8BC1\u63A5\u53E3</strong>\u7684\u771F\u5B9E HTTP \u72B6\u6001\u548C\u6BEB\u79D2\u5EF6\u8FDF\u3002
      </p>

      <div class="btn-group">
        <button id="testBtn" class="btn-test" onclick="runConnectionTest()">
          <span id="testBtnText">\u{1F680} \u5F00\u59CB\u8FDE\u63A5\u6D4B\u8BD5 (Test Connection)</span>
        </button>
      </div>

      <div id="diagResults" class="diag-results">
        <div id="diagItems"></div>
        <div id="diagSummary" class="diag-summary"></div>
      </div>
    </div>

    <!-- Environment Restore Card -->
    <div class="card">
      <div class="card-title">
        <span>\u{1F6E1}\uFE0F \u8FDC\u7A0B\u73AF\u5883\u65E0\u635F\u4E0E\u590D\u539F</span>
        <span style="font-size: 11px; font-weight: normal; opacity: 0.7;">100% \u7269\u7406\u9694\u79BB \xB7 \u96F6\u6B8B\u7559\u4FDD\u8BC1</span>
      </div>

      <p style="font-size: 12px; opacity: 0.8; margin-bottom: 14px;">
        \u672C\u63D2\u4EF6\u7EDD\u4E0D\u4FEE\u6539\u4EFB\u4F55\u672C\u5730 SSH \u914D\u7F6E\u6587\u4EF6\uFF0C\u4E5F\u7EDD\u4E0D\u6C61\u67D3\u8FDC\u7A0B\u7CFB\u7EDF\u7684 bashrc \u6216\u7CFB\u7EDF\u5168\u5C40\u6587\u4EF6\u3002\u82E5\u60A8\u5E0C\u671B\u5F7B\u5E95\u6E05\u9664\u8FDC\u7AEF\u6240\u6709\u4EE3\u7406\u5305\u88C5\u5668\u5E76\u4F7F\u8FDC\u7AEF\u5B8C\u5168\u6062\u590D\u81F3\u672A\u5B89\u88C5\u63D2\u4EF6\u7684\u521D\u59CB\u72B6\u6001\uFF0C\u53EF\u70B9\u51FB\u4E0B\u65B9\u6309\u94AE\u3002
      </p>

      <div class="btn-group">
        <button id="restoreBtn" class="btn-secondary" style="color: #f14c4c; border: 1px solid #f14c4c;" onclick="restoreRemoteEnvironment()">
          <span>\u{1F504} \u4E00\u952E\u5F7B\u5E95\u590D\u539F\u8FDC\u7A0B\u73AF\u5883 (Clean Restore)</span>
        </button>
      </div>

      <div id="restoreStatusMsg" class="status-msg"></div>
    </div>
  </div>

  <script>
    const vscode = acquireVsCodeApi();

    let currentEnabled = ${t};

    function saveSettings() {
      const hostInput = document.getElementById('proxyHost');
      const portInput = document.getElementById('proxyPort');
      const saveBtn = document.getElementById('saveBtn');

      const host = hostInput.value.trim() || '127.0.0.1';
      const port = parseInt(portInput.value.trim(), 10) || 7897;

      saveBtn.disabled = true;
      saveBtn.innerHTML = '<span class="spinner"></span> \u4FDD\u5B58\u4E2D...';

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
      testBtnText.innerHTML = '<span class="spinner"></span> \u6B63\u5728\u6D4B\u8BD5\u4E2D\uFF0C\u8BF7\u7A0D\u5019...';

      vscode.postMessage({
        command: 'testConnection',
        host: host,
        port: port
      });
    }

    function restoreRemoteEnvironment() {
      const restoreBtn = document.getElementById('restoreBtn');
      restoreBtn.disabled = true;
      restoreBtn.innerHTML = '<span class="spinner"></span> \u6B63\u5728\u590D\u539F\u8FDC\u7AEF\u73AF\u5883...';

      vscode.postMessage({
        command: 'restoreRemote'
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
          saveBtn.innerHTML = '<span>\u{1F4BE} \u4FDD\u5B58\u914D\u7F6E (Save)</span>';

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
          testBtnText.innerHTML = '<span>\u{1F680} \u91CD\u65B0\u6D4B\u8BD5 (Test Again)</span>';

          renderDiagnosticReport(msg.report);
          break;
        }

        case 'testError': {
          const testBtn = document.getElementById('testBtn');
          const testBtnText = document.getElementById('testBtnText');
          testBtn.disabled = false;
          testBtnText.innerHTML = '<span>\u{1F680} \u91CD\u65B0\u6D4B\u8BD5 (Test Again)</span>';

          const diagResults = document.getElementById('diagResults');
          const diagItems = document.getElementById('diagItems');
          const diagSummary = document.getElementById('diagSummary');

          diagResults.className = 'diag-results show';
          diagItems.innerHTML = '';
          diagSummary.className = 'diag-summary error';
          diagSummary.innerText = '\u6D4B\u8BD5\u5931\u8D25: ' + msg.error;
          break;
        }

        case 'restoreResult': {
          const restoreBtn = document.getElementById('restoreBtn');
          restoreBtn.disabled = false;
          restoreBtn.innerHTML = '<span>\u{1F504} \u4E00\u952E\u5F7B\u5E95\u590D\u539F\u8FDC\u7A0B\u73AF\u5883 (Clean Restore)</span>';

          const msgEl = document.getElementById('restoreStatusMsg');
          msgEl.className = 'status-msg show ' + (msg.success ? 'success' : 'error');
          msgEl.innerText = msg.message;

          setTimeout(() => {
            msgEl.className = 'status-msg';
          }, 5000);
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
        badge.innerText = '\u25CF \u4EE3\u7406\u6A21\u5F0F\u5DF2\u5F00\u542F';
        toggleBtn.innerText = '\u5207\u6362\u4E3A\u7EAF\u76F4\u8FDE (OFF)';
      } else {
        badge.className = 'header-badge badge-off';
        badge.innerText = '\u25CB \u7EAF\u76F4\u8FDE\u6A21\u5F0F';
        toggleBtn.innerText = '\u5207\u6362\u4E3A\u4EE3\u7406\u6A21\u5F0F (ON)';
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
        const icon = step.status === 'success' ? '\u2713' : step.status === 'warning' ? '!' : '\u2717';

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
</html>`}};function W(i){let t=new S,e=new H(t),o=t.getDeployer(),s=new T(t),n=async()=>{if(!l.env.remoteName||!l.workspace.getConfiguration("antigravityRemoteProxy").get("autoSetup",!0))return;let c=await t.waitForRemoteHost(12,500);if(c)try{let g=t.getProxyPort(),p=t.getProxyHost();if(t.isEnabled()){await t.getTunnelManager().startTunnel(c,g,g);try{await l.workspace.getConfiguration("http").update("proxy",`http://${p}:${g}`,l.ConfigurationTarget.Workspace)}catch{}}await t.syncStatusFromRemote(),await o.isDeployed(c)||await o.deploy(c,p,g),t.isEnabled()&&await t.restartAgy(c),await e.update()}catch{}};n(),i.subscriptions.push(l.workspace.onDidChangeWorkspaceFolders(()=>{n()})),e.init(i),i.subscriptions.push(l.commands.registerCommand("antigravityRemoteProxy.openSettings",()=>{x.createOrShow(i.extensionUri,t,s)}),l.commands.registerCommand("antigravityRemoteProxy.menu",async()=>{let r=t.isEnabled(),a=t.getProxyHost(),c=t.getProxyPort(),g=t.detectRemoteHost()||"\u672A\u68C0\u6D4B\u5230\u8FDC\u7A0B\u4E3B\u673A",p=[{label:"$(gear) \u6253\u5F00\u4EE3\u7406\u914D\u7F6E\u4E0E\u8FDE\u901A\u6D4B\u8BD5\u9762\u677F (Settings & Test)",description:`\u4FEE\u6539\u4E3B\u673A(${a})\u4E0E\u7AEF\u53E3(${c})\uFF0C\u8FDB\u884C\u7F51\u7EDC\u8FDE\u901A\u6027\u6D4B\u8BD5 [\u76EE\u6807: ${g}]`,action:"settings"},{label:r?"$(circle-slash) \u5207\u6362\u4E3A\u7EAF\u76F4\u8FDE\u6A21\u5F0F (Disable Proxy)":"$(plug) \u5207\u6362\u4E3A\u4EE3\u7406\u52A0\u901F\u6A21\u5F0F (Enable Proxy)",description:r?"\u5173\u95ED\u4EE3\u7406\uFF0CAI \u6838\u5FC3\u8D70\u8FDC\u7A0B\u670D\u52A1\u5668\u672C\u5730\u76F4\u8FDE":`\u5F00\u542F\u4EE3\u7406\uFF0CAI \u6838\u5FC3\u8D70\u672C\u5730 ${a}:${c} \u96A7\u9053\u52A0\u901F`,action:"toggle"},{label:"$(checklist) \u8FD0\u884C\u7F51\u7EDC\u8FDE\u901A\u6027\u8BCA\u65AD (Run Diagnostics)",description:"\u6D4B\u8BD5 SSH \u53CD\u5411\u96A7\u9053\u3001Google AI \u63A5\u53E3\u4E0E OAuth \u4EE4\u724C\u63A5\u53E3\u8BE6\u7EC6\u72B6\u6001",action:"diagnose"}],m=await l.window.showQuickPick(p,{placeHolder:`Antigravity \u4EE3\u7406\u5FEB\u6377\u83DC\u5355 (\u5F53\u524D: ${r?"\u5DF2\u5F00\u542F":"\u7EAF\u76F4\u8FDE"} | \u4E3B\u673A: ${g})`});if(m)if(m.action==="settings")x.createOrShow(i.extensionUri,t,s);else if(m.action==="toggle"){let f=await t.toggle();await e.update(),l.window.showInformationMessage(f?"Antigravity \u4EE3\u7406: \u5DF2\u3010\u5F00\u542F (ON)\u3011\uFF0C\u6B63\u5728\u8D70\u672C\u5730\u53CD\u5411\u96A7\u9053\u3002":"Antigravity \u4EE3\u7406: \u5DF2\u3010\u5173\u95ED (OFF)\u3011\uFF0C\u5DF2\u5207\u6362\u4E3A\u7EAF\u76F4\u8FDE\u6A21\u5F0F\u3002")}else m.action==="diagnose"&&await s.run()}),l.commands.registerCommand("antigravityRemoteProxy.toggle",async()=>{let r=await t.toggle();await e.update(),r?l.window.showInformationMessage("Antigravity \u4EE3\u7406: \u5DF2\u3010\u5F00\u542F (ON)\u3011\uFF0C\u6B63\u5728\u8D70\u672C\u5730\u53CD\u5411\u96A7\u9053\u3002"):l.window.showInformationMessage("Antigravity \u4EE3\u7406: \u5DF2\u3010\u5173\u95ED (OFF)\u3011\uFF0C\u5DF2\u5207\u6362\u4E3A\u7EAF\u76F4\u8FDE\u6A21\u5F0F\u3002")}),l.commands.registerCommand("antigravityRemoteProxy.enable",async()=>{await t.enable(),await e.update(),l.window.showInformationMessage("Antigravity \u4EE3\u7406: \u5DF2\u3010\u5F00\u542F (ON)\u3011\u3002")}),l.commands.registerCommand("antigravityRemoteProxy.disable",async()=>{await t.disable(),await e.update(),l.window.showInformationMessage("Antigravity \u4EE3\u7406: \u5DF2\u3010\u5173\u95ED (OFF)\u3011\uFF08\u7EAF\u76F4\u8FDE\uFF09\u3002")}),l.commands.registerCommand("antigravityRemoteProxy.status",async()=>{let r=t.isEnabled(),a=t.getProxyHost(),c=t.getProxyPort(),g=await t.checkPort(c,a),p=t.detectRemoteHost()||"\u672C\u5730",m=r?`[${p}] \u5F53\u524D\u72B6\u6001: \u3010\u5DF2\u5F00\u542F (ON)\u3011 | \u96A7\u9053\u7AEF\u53E3 ${a}:${c}: ${g?"\u2713 \u8FDE\u901A\u6B63\u5E38":"\u2717 \u672A\u8FDE\u901A"}`:`[${p}] \u5F53\u524D\u72B6\u6001: \u3010\u5DF2\u5173\u95ED (OFF)\u3011 | \u7EAF\u76F4\u8FDE\u6A21\u5F0F`;l.window.showInformationMessage(m),await e.update()}),l.commands.registerCommand("antigravityRemoteProxy.setupRemote",async()=>{let r=t.detectRemoteHost();if(!r){l.window.showWarningMessage("\u672A\u68C0\u6D4B\u5230\u8FDC\u7A0B SSH \u4E3B\u673A\u3002");return}let a=t.getProxyHost(),c=t.getProxyPort();t.isEnabled()&&await t.getTunnelManager().startTunnel(r,c,c),await o.deploy(r,a,c)&&(t.isEnabled()&&await t.restartAgy(r),l.window.showInformationMessage("Antigravity \u8FDC\u7AEF\u4EE3\u7406\u7EC4\u4EF6\u5DF2\u6210\u529F\u90E8\u7F72\uFF01"),await e.update())}),l.commands.registerCommand("antigravityRemoteProxy.restore",async()=>{await t.restoreRemote()&&(l.window.showInformationMessage("\u8FDC\u7A0B\u73AF\u5883\u5DF2 100% \u5F7B\u5E95\u590D\u539F\u4E3A\u521D\u59CB\u7EAF\u51C0\u72B6\u6001\uFF01"),await e.update())}),t)}function j(){}0&&(module.exports={activate,deactivate});
