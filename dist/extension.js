"use strict";var L=Object.create;var P=Object.defineProperty;var N=Object.getOwnPropertyDescriptor;var Y=Object.getOwnPropertyNames;var X=Object.getPrototypeOf,z=Object.prototype.hasOwnProperty;var G=(i,e)=>{for(var t in e)P(i,t,{get:e[t],enumerable:!0})},I=(i,e,t,s)=>{if(e&&typeof e=="object"||typeof e=="function")for(let r of Y(e))!z.call(i,r)&&r!==t&&P(i,r,{get:()=>e[r],enumerable:!(s=N(e,r))||s.enumerable});return i};var h=(i,e,t)=>(t=i!=null?L(X(i)):{},I(e||!i||!i.__esModule?P(t,"default",{value:i,enumerable:!0}):t,i)),U=i=>I(P({},"__esModule",{value:!0}),i);var K={};G(K,{activate:()=>W,deactivate:()=>j});module.exports=U(K);var c=h(require("vscode"));var M=h(require("net")),u=h(require("vscode"));var $=require("child_process"),B=h(require("os")),E=class{tunnelProcess=null;currentHost=null;activePort=7897;isTunnelActive(){return this.tunnelProcess!==null&&!this.tunnelProcess.killed}getActiveHost(){return this.currentHost}async startTunnel(e,t=7897,s=7897){let r=(e||"").trim();if(!r)return!1;if(this.isTunnelActive()&&this.currentHost===r&&this.activePort===t)return!0;this.stopTunnel(),this.currentHost=r,this.activePort=t;try{let o=["-N","-o","BatchMode=yes","-o","ExitOnForwardFailure=yes","-o","ServerAliveInterval=15","-o","ServerAliveCountMax=3","-R",`${t}:127.0.0.1:${s}`,r];return this.tunnelProcess=(0,$.spawn)("ssh",o,{windowsHide:!0,stdio:"ignore",detached:!1}),this.tunnelProcess.on("exit",()=>{this.tunnelProcess=null}),this.tunnelProcess.on("error",()=>{this.tunnelProcess=null}),await new Promise(a=>setTimeout(a,1500)),this.isTunnelActive()}catch{return this.tunnelProcess=null,!1}}stopTunnel(){if(this.tunnelProcess){try{B.platform()==="win32"&&this.tunnelProcess.pid?(0,$.exec)(`taskkill /PID ${this.tunnelProcess.pid} /F /T`,()=>{}):this.tunnelProcess.kill("SIGTERM")}catch{}this.tunnelProcess=null}}dispose(){this.stopTunnel()}};var C=require("child_process"),p=class{static execRemote(e,t,s=1e4){return new Promise(r=>{let o=(e||"").trim();if(!o){r({stdout:"",stderr:"No remote host specified",exitCode:-1});return}(0,C.execFile)("ssh",["-n","-o","BatchMode=yes","-o","ConnectTimeout=5",o,t],{timeout:s,windowsHide:!0},(n,l,d)=>{let g=n?typeof n.code=="number"?n.code:1:0;r({stdout:l||"",stderr:d||(n?n.message:""),exitCode:g})})})}static async isHostReachable(e){let t=await this.execRemote(e,"echo SSH_OK",4e3);return t.exitCode===0&&t.stdout.includes("SSH_OK")}};var R=class{async isDeployed(e){return(await p.execRemote(e,'[ -f "$HOME/.gemini/bin/agy.real" ] && grep -q "agy.real" "$HOME/.gemini/bin/agy" 2>/dev/null && echo "DEPLOYED"',5e3)).stdout.includes("DEPLOYED")}async deploy(e){return(await p.execRemote(e,`
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
EOF

chmod +x "$HOME/.antigravity-ide-server/bin/agy-proxy"
echo "DEPLOY_SUCCESS"
`,1e4)).stdout.includes("DEPLOY_SUCCESS")}async restore(e){return(await p.execRemote(e,`
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
`,1e4)).stdout.includes("RESTORE_SUCCESS")}};var O=class{tunnelManager;deployer;cachedEnabledState=!0;constructor(){this.tunnelManager=new E,this.deployer=new R}getTunnelManager(){return this.tunnelManager}getDeployer(){return this.deployer}detectRemoteHost(){let e=u.workspace.workspaceFolders;if(e&&e.length>0)for(let a of e){let n=a.uri.authority;if(n&&n.startsWith("ssh-remote+"))return decodeURIComponent(n.substring(11))}let t=u.window.activeTextEditor?.document.uri;if(t&&t.authority&&t.authority.startsWith("ssh-remote+"))return decodeURIComponent(t.authority.substring(11));let s=u.workspace.workspaceFile;if(s&&s.authority&&s.authority.startsWith("ssh-remote+"))return decodeURIComponent(s.authority.substring(11));let o=u.workspace.getConfiguration("antigravityRemoteProxy").get("remoteHost","").trim();return o||null}getProxyHost(){return u.workspace.getConfiguration("antigravityRemoteProxy").get("proxyHost","127.0.0.1").trim()||"127.0.0.1"}getProxyPort(){let t=u.workspace.getConfiguration("antigravityRemoteProxy").get("proxyPort",7897);return typeof t=="number"&&t>0&&t<=65535?t:7897}isEnabled(){return this.cachedEnabledState}async syncStatusFromRemote(){let e=this.detectRemoteHost();if(!e)return this.cachedEnabledState;try{let s=await p.execRemote(e,'[ -f "$HOME/.antigravity-ide-server/proxy.disabled" ] && echo "DISABLED" || echo "ENABLED"',4e3);this.cachedEnabledState=!s.stdout.includes("DISABLED")}catch{}return this.cachedEnabledState}async enable(){let e=this.detectRemoteHost(),t=this.getProxyPort();try{e&&(await p.execRemote(e,'rm -f "$HOME/.antigravity-ide-server/proxy.disabled"',4e3),await this.deployer.isDeployed(e)||await this.deployer.deploy(e),await this.tunnelManager.startTunnel(e,t,t),await this.restartAgy(e)),this.cachedEnabledState=!0}catch(s){u.window.showErrorMessage(`\u5F00\u542F\u4EE3\u7406\u5931\u8D25: ${s.message}`)}}async disable(){let e=this.detectRemoteHost();try{e&&(await p.execRemote(e,'mkdir -p "$HOME/.antigravity-ide-server" && touch "$HOME/.antigravity-ide-server/proxy.disabled"',4e3),this.tunnelManager.stopTunnel(),await this.restartAgy(e)),this.cachedEnabledState=!1}catch(t){u.window.showErrorMessage(`\u5173\u95ED\u4EE3\u7406\u5931\u8D25: ${t.message}`)}}async toggle(){return this.isEnabled()?(await this.disable(),!1):(await this.enable(),!0)}async saveConfig(e,t){let s=(e||"127.0.0.1").trim(),r=Number(t)||7897,o=u.workspace.getConfiguration("antigravityRemoteProxy");await o.update("proxyHost",s,u.ConfigurationTarget.Global),await o.update("proxyPort",r,u.ConfigurationTarget.Global);let a=this.detectRemoteHost();if(a){let n=`mkdir -p "$HOME/.antigravity-ide-server" && printf 'PROXY_HOST="%s"\\nPROXY_PORT="%s"\\n' '${s}' '${r}' > "$HOME/.antigravity-ide-server/proxy.conf"`;await p.execRemote(a,n,4e3),this.isEnabled()&&(await this.tunnelManager.startTunnel(a,r,r),await this.restartAgy(a))}}async restoreRemote(){let e=this.detectRemoteHost();if(this.tunnelManager.stopTunnel(),!e)return!0;let t=await this.deployer.restore(e);return this.cachedEnabledState=!1,t}async restartAgy(e){let t=e||this.detectRemoteHost();if(!t)return;await p.execRemote(t,'for p in $(pidof agy agy.real 2>/dev/null); do kill -9 "$p" 2>/dev/null || true; done',4e3)}async checkPort(e,t="127.0.0.1",s=1500){let r=this.detectRemoteHost();if(r){let o=`if command -v nc >/dev/null 2>&1; then nc -w 1 -z "${t}" "${e}" 2>/dev/null && echo "OPEN" || echo "CLOSED"; else timeout 1 bash -c "cat < /dev/null > /dev/tcp/${t}/${e}" 2>/dev/null && echo "OPEN" || echo "CLOSED"; fi`;return(await p.execRemote(r,o,s+1e3)).stdout.includes("OPEN")}return new Promise(o=>{let a=new M.Socket;a.setTimeout(s),a.on("connect",()=>{a.destroy(),o(!0)}),a.on("timeout",()=>{a.destroy(),o(!1)}),a.on("error",()=>{a.destroy(),o(!1)}),a.connect(e,t)})}dispose(){this.tunnelManager.dispose()}};var v=h(require("vscode")),S=class{statusBarItem;controller;updateTimer=null;constructor(e){this.controller=e,this.statusBarItem=v.window.createStatusBarItem(v.StatusBarAlignment.Right,100),this.statusBarItem.command="antigravityRemoteProxy.menu"}init(e){e.subscriptions.push(this.statusBarItem),this.update(),this.statusBarItem.show(),this.updateTimer=setInterval(()=>{this.update()},5e3),e.subscriptions.push({dispose:()=>{this.updateTimer&&clearInterval(this.updateTimer)}})}async update(){let e=this.controller.getProxyHost(),t=this.controller.getProxyPort();if(!this.controller.isEnabled()){this.statusBarItem.text="$(circle-slash) AI\u4EE3\u7406: \u7EAF\u76F4\u8FDE",this.statusBarItem.tooltip=`Antigravity \u4EE3\u7406: \u5DF2\u5173\u95ED (\u7EAF\u76F4\u8FDE\u6A21\u5F0F)
\u76EE\u6807\u4E3B\u673A\u4E0E\u7AEF\u53E3: ${e}:${t}
\u70B9\u51FB\u6253\u5F00\u8BBE\u7F6E\u9762\u677F\u6216\u5207\u6362`,this.statusBarItem.backgroundColor=void 0;return}await this.controller.checkPort(t,e)?(this.statusBarItem.text=`$(plug) AI\u4EE3\u7406: \u5F00\u542F (${t})`,this.statusBarItem.tooltip=`Antigravity \u4EE3\u7406: \u5DF2\u5F00\u542F (\u8D70\u53CD\u5411\u96A7\u9053 ${e}:${t})
\u96A7\u9053\u72B6\u6001: \u2713 \u6B63\u5E38\u8FDE\u901A
\u70B9\u51FB\u6253\u5F00\u8BBE\u7F6E\u9762\u677F\u6216\u5207\u6362`,this.statusBarItem.backgroundColor=void 0):(this.statusBarItem.text="$(warning) AI\u4EE3\u7406: \u96A7\u9053\u672A\u901A",this.statusBarItem.tooltip=`Antigravity \u4EE3\u7406: \u5DF2\u5F00\u542F\uFF0C\u4F46 ${e}:${t} \u65E0\u6CD5\u8FDE\u901A\uFF01
\u8BF7\u68C0\u67E5\u672C\u5730 SSH \u914D\u7F6E\u6216\u4EE3\u7406\u8F6F\u4EF6
\u70B9\u51FB\u6253\u5F00\u8BBE\u7F6E\u9762\u677F\u8FDB\u884C\u6D4B\u8BD5`,this.statusBarItem.backgroundColor=new v.ThemeColor("statusBarItem.warningBackground"))}};var k=h(require("vscode")),_=require("child_process");var H=class{controller;outputChannel;constructor(e){this.controller=e,this.outputChannel=k.window.createOutputChannel("Antigravity Proxy Diagnostics")}async testConnection(e,t){let s=(e||this.controller.getProxyHost()||"127.0.0.1").trim(),r=Number(t)||this.controller.getProxyPort()||7897,o=this.controller.isEnabled(),a=this.controller.detectRemoteHost(),n=[],l=!1,d=Date.now();try{l=await this.controller.checkPort(r,s,2e3);let m=Date.now()-d;l?n.push({name:`\u53CD\u5411\u96A7\u9053\u7AEF\u53E3 (${s}:${r})`,status:"success",latencyMs:m,message:`\u8FDE\u901A\u6B63\u5E38 (TCP \u63E1\u624B\u8017\u65F6 ${m}ms)`}):n.push({name:`\u53CD\u5411\u96A7\u9053\u7AEF\u53E3 (${s}:${r})`,status:"error",latencyMs:m,message:"\u65E0\u6CD5\u5EFA\u7ACB TCP \u63E1\u624B\uFF01\u8BF7\u68C0\u67E5\u672C\u5730\u4EE3\u7406\u5DE5\u5177\u662F\u5426\u542F\u52A8\uFF0C\u4E14\u53CD\u5411\u96A7\u9053\u8FDB\u7A0B\u662F\u5426\u6B63\u5E38\u8FD0\u884C\u3002"})}catch(m){n.push({name:`\u53CD\u5411\u96A7\u9053\u7AEF\u53E3 (${s}:${r})`,status:"error",message:`\u68C0\u6D4B\u5F02\u5E38: ${m.message}`})}let g=l?`-x http://${s}:${r}`:"",b=await this.probeUrl(a,"Google AI \u6838\u5FC3\u63A5\u53E3 (aicode.googleapis.com)","https://aicode.googleapis.com",g);n.push(b);let T=await this.probeUrl(a,"Google \u9065\u6D4B\u670D\u52A1 (play.googleapis.com/log)","https://play.googleapis.com/log",g);n.push(T);let D=await this.probeUrl(a,"Google \u8D26\u53F7\u4EE4\u724C\u8BA4\u8BC1\u63A5\u53E3 (oauth2.googleapis.com/token)","https://oauth2.googleapis.com/token",g);n.push(D);let x="success",w="\u{1F389} \u4EE3\u7406\u901A\u9053\u7545\u901A\uFF0CGoogle AI \u4E0E\u8D26\u53F7\u8BA4\u8BC1\u63A5\u53E3\u8FDE\u901A\u6B63\u5E38\uFF01",A=n.some(m=>m.status==="error"),F=n.some(m=>m.status==="success");return l?A&&(F?(x="warning",w="\u26A0\uFE0F \u90E8\u5206 Google \u670D\u52A1\u54CD\u5E94\u5F02\u5E38\uFF0C\u8BF7\u68C0\u67E5\u8282\u70B9\u89C4\u5219\u6216\u91CD\u8BD5\u3002"):(x="error",w="\u274C \u65E0\u6CD5\u8BBF\u95EE Google \u670D\u52A1\uFF0C\u8BF7\u68C0\u67E5\u672C\u5730\u4EE3\u7406\u89C4\u5219\u4E0E\u8282\u70B9\u53EF\u7528\u6027\u3002")):(x="error",w=`\u274C \u53CD\u5411\u96A7\u9053\u672A\u8FDE\u901A (${s}:${r})\uFF0C\u8BF7\u68C0\u67E5\u672C\u5730\u4EE3\u7406\u53CA\u52A8\u6001\u96A7\u9053\u72B6\u6001\u3002`),{timestamp:new Date().toLocaleTimeString(),proxyHost:s,proxyPort:r,isEnabled:o,tunnelReachable:l,steps:n,overallStatus:x,summary:w}}async probeUrl(e,t,s,r){let o=Date.now(),a=`curl -sI -m 6 ${r} "${s}"`;if(e){let n=await p.execRemote(e,a,8e3),l=Date.now()-o;if(n.exitCode!==0&&!n.stdout.includes("HTTP/")){let d=n.stderr.trim()||`Exit code ${n.exitCode}`;return{name:t,status:"error",latencyMs:l,message:`\u8BF7\u6C42\u5931\u8D25 (${l}ms): ${d.slice(0,100)}`}}return this.evaluateCurlOutput(t,n.stdout,l)}return new Promise(n=>{(0,_.exec)(a,(l,d,g)=>{let b=Date.now()-o;if(l){let T=g?g.trim():l.message.trim();n({name:t,status:"error",latencyMs:b,message:`\u8BF7\u6C42\u5931\u8D25 (${b}ms): ${T.slice(0,100)}`});return}n(this.evaluateCurlOutput(t,d,b))})})}evaluateCurlOutput(e,t,s){let o=t.split(`
`).map(n=>n.trim()).filter(Boolean)[0]||"",a=t.includes("server: ESF")||t.includes("Server: ESF")||t.includes("200 Connection established")||t.includes("HTTPServer2");return o.includes("200")||o.includes("404")||o.includes("405")||a?{name:e,status:"success",latencyMs:s,message:`\u8BBF\u95EE\u6B63\u5E38 (${o||"HTTP 200"}, \u8017\u65F6 ${s}ms)`}:o.includes("403")?{name:e,status:"error",latencyMs:s,message:"\u8FD4\u56DE 403 Forbidden\uFF08\u53D7\u5730\u57DF\u9650\u5236\u963B\u6B62\uFF0C\u8BF7\u5207\u6362\u652F\u6301 Google AI \u7684\u4EE3\u7406\u8282\u70B9\uFF09"}:{name:e,status:"warning",latencyMs:s,message:`\u8FD4\u56DE\u72B6\u6001: ${o||"\u672A\u77E5"} (${s}ms)`}}async run(){this.outputChannel.clear(),this.outputChannel.show(!0),this.log("===================================================="),this.log(" Antigravity Remote Proxy - \u7F51\u7EDC\u8FDE\u901A\u6027\u8BCA\u65AD\u62A5\u544A"),this.log(` \u65F6\u95F4: ${new Date().toLocaleString()}`),this.log(`====================================================
`);let e=await this.testConnection();this.log(`[1] \u4EE3\u7406\u5F00\u5173: ${e.isEnabled?"\u3010\u5DF2\u5F00\u542F (ON)\u3011":"\u3010\u5DF2\u5173\u95ED (OFF - \u7EAF\u76F4\u8FDE)\u3011"}`),this.log(`[2] \u4EE3\u7406\u76EE\u6807: ${e.proxyHost}:${e.proxyPort}`),this.log(`
--- \u8BCA\u65AD\u660E\u7EC6 ---`);for(let t of e.steps){let s=t.status==="success"?"\u2713":t.status==="warning"?"!":"\u2717";this.log(` ${s} ${t.name}: ${t.message}`)}this.log(`
====================================================`),this.log(` \u7ED3\u8BBA: ${e.summary}`),this.log("====================================================")}log(e){this.outputChannel.appendLine(e)}};var y=h(require("vscode")),f=class i{static currentPanel;_panel;_disposables=[];_controller;_diagnostics;static createOrShow(e,t,s){let r=y.window.activeTextEditor?y.window.activeTextEditor.viewColumn:void 0;if(i.currentPanel){i.currentPanel._panel.reveal(r),i.currentPanel.refresh();return}let o=y.window.createWebviewPanel("antigravityRemoteProxySettings","Antigravity \u4EE3\u7406\u8BBE\u7F6E",r||y.ViewColumn.One,{enableScripts:!0,retainContextWhenHidden:!0,localResourceRoots:[e]});i.currentPanel=new i(o,t,s)}constructor(e,t,s){this._panel=e,this._controller=t,this._diagnostics=s,this._update(),this._panel.onDidDispose(()=>this.dispose(),null,this._disposables),this._panel.webview.onDidReceiveMessage(async r=>{switch(r.command){case"save":{let o=(r.host||"127.0.0.1").trim(),a=parseInt(r.port,10)||7897;await this._controller.saveConfig(o,a),y.window.showInformationMessage(`Antigravity \u4EE3\u7406\u914D\u7F6E\u5DF2\u4FDD\u5B58\uFF01\u4EE3\u7406\u76EE\u6807: ${o}:${a}\uFF0CAI \u670D\u52A1\u5DF2\u79D2\u7EA7\u91CD\u8F7D\u3002`),this.postMessage({type:"saveResult",success:!0,message:`\u914D\u7F6E\u5DF2\u6210\u529F\u4FDD\u5B58\uFF01\u5F53\u524D\u751F\u6548: ${o}:${a}`});break}case"toggle":{let o=await this._controller.toggle();this.postMessage({type:"statusUpdate",isEnabled:o});break}case"testConnection":{let o=(r.host||this._controller.getProxyHost()||"127.0.0.1").trim(),a=parseInt(r.port,10)||this._controller.getProxyPort()||7897;this.postMessage({type:"testStarted"});try{let n=await this._diagnostics.testConnection(o,a);this.postMessage({type:"testResult",report:n})}catch(n){this.postMessage({type:"testError",error:n.message})}break}case"restoreRemote":{await this._controller.restoreRemote()?(y.window.showInformationMessage("\u8FDC\u7A0B\u73AF\u5883\u5DF2 100% \u5F7B\u5E95\u590D\u539F\u4E3A\u539F\u751F\u521D\u59CB\u72B6\u6001\uFF01"),this.postMessage({type:"restoreResult",success:!0,message:"\u8FDC\u7A0B\u73AF\u5883\u5DF2\u5F7B\u5E95\u590D\u539F\u4E3A\u521D\u59CB\u539F\u751F\u72B6\u6001\uFF0C\u6240\u6709\u4EE3\u7406\u5305\u88C5\u4E0E\u7EC4\u4EF6\u5DF2\u5B8C\u5168\u6E05\u9664\u3002"})):this.postMessage({type:"restoreResult",success:!1,message:"\u590D\u539F\u8FDC\u7A0B\u73AF\u5883\u5931\u8D25\uFF0C\u8BF7\u67E5\u770B\u65E5\u5FD7\u3002"});break}case"refresh":{this.refresh();break}}},null,this._disposables)}refresh(){let e=this._controller.isEnabled(),t=this._controller.getProxyHost(),s=this._controller.getProxyPort();this.postMessage({type:"initialData",isEnabled:e,proxyHost:t,proxyPort:s})}postMessage(e){this._panel.webview.postMessage(e)}dispose(){for(i.currentPanel=void 0,this._panel.dispose();this._disposables.length;){let e=this._disposables.pop();e&&e.dispose()}}_update(){this._panel.webview.html=this._getHtmlForWebview()}_getHtmlForWebview(){let e=this._controller.isEnabled(),t=this._controller.getProxyHost(),s=this._controller.getProxyPort(),r=this._controller.detectRemoteHost()||"\u672C\u5730\u5DE5\u4F5C\u533A (\u672A\u8FDE\u63A5\u8FDC\u7A0B SSH)";return`<!DOCTYPE html>
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
          <span id="headerStatusBadge" class="header-badge ${e?"badge-on":"badge-off"}">
            ${e?"\u25CF \u4EE3\u7406\u6A21\u5F0F\u5DF2\u5F00\u542F":"\u25CB \u7EAF\u76F4\u8FDE\u6A21\u5F0F"}
          </span>
        </div>
        <div style="margin-top: 6px; font-size: 11px; opacity: 0.8; font-family: var(--font-mono);">
          <span>\u{1F310} \u5F53\u524D\u76EE\u6807\u4E3B\u673A: <strong>${r}</strong></span>
        </div>
      </div>
      <div>
        <button id="toggleBtn" class="btn-secondary" onclick="toggleProxy()">
          ${e?"\u5207\u6362\u4E3A\u7EAF\u76F4\u8FDE (OFF)":"\u5207\u6362\u4E3A\u4EE3\u7406\u6A21\u5F0F (ON)"}
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
            <input type="text" id="proxyHost" value="${t}" placeholder="127.0.0.1" />
            <div class="field-hint">SSH \u53CD\u5411\u96A7\u9053\u76D1\u542C\u7684\u4E3B\u673A\u5730\u5740 (\u901A\u5E38\u4E3A 127.0.0.1)</div>
          </div>
        </div>
        <div class="form-col">
          <div class="form-group">
            <label for="proxyPort">\u4EE3\u7406\u7AEF\u53E3 (Proxy Port)</label>
            <input type="number" id="proxyPort" value="${s}" placeholder="7897" min="1" max="65535" />
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

    let currentEnabled = ${e};

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
</html>`}};function W(i){let e=new O,t=new S(e),s=e.getDeployer(),r=new H(e);if(c.env.remoteName){let a=c.workspace.getConfiguration("antigravityRemoteProxy").get("autoSetup",!0),n=e.detectRemoteHost();n&&a&&(async()=>{try{if(await e.syncStatusFromRemote(),await s.isDeployed(n)||await s.deploy(n),e.isEnabled()){let d=e.getProxyPort();await e.getTunnelManager().startTunnel(n,d,d),await e.restartAgy(n)}await t.update()}catch{}})()}t.init(i),i.subscriptions.push(c.commands.registerCommand("antigravityRemoteProxy.openSettings",()=>{f.createOrShow(i.extensionUri,e,r)}),c.commands.registerCommand("antigravityRemoteProxy.menu",async()=>{let o=e.isEnabled(),a=e.getProxyHost(),n=e.getProxyPort(),l=e.detectRemoteHost()||"\u672A\u68C0\u6D4B\u5230\u8FDC\u7A0B\u4E3B\u673A",d=[{label:"$(gear) \u6253\u5F00\u4EE3\u7406\u914D\u7F6E\u4E0E\u8FDE\u901A\u6D4B\u8BD5\u9762\u677F (Settings & Test)",description:`\u4FEE\u6539\u4E3B\u673A(${a})\u4E0E\u7AEF\u53E3(${n})\uFF0C\u8FDB\u884C\u7F51\u7EDC\u8FDE\u901A\u6027\u6D4B\u8BD5 [\u76EE\u6807: ${l}]`,action:"settings"},{label:o?"$(circle-slash) \u5207\u6362\u4E3A\u7EAF\u76F4\u8FDE\u6A21\u5F0F (Disable Proxy)":"$(plug) \u5207\u6362\u4E3A\u4EE3\u7406\u52A0\u901F\u6A21\u5F0F (Enable Proxy)",description:o?"\u5173\u95ED\u4EE3\u7406\uFF0CAI \u6838\u5FC3\u8D70\u8FDC\u7A0B\u670D\u52A1\u5668\u672C\u5730\u76F4\u8FDE":`\u5F00\u542F\u4EE3\u7406\uFF0CAI \u6838\u5FC3\u8D70\u672C\u5730 ${a}:${n} \u96A7\u9053\u52A0\u901F`,action:"toggle"},{label:"$(checklist) \u8FD0\u884C\u7F51\u7EDC\u8FDE\u901A\u6027\u8BCA\u65AD (Run Diagnostics)",description:"\u6D4B\u8BD5 SSH \u53CD\u5411\u96A7\u9053\u3001Google AI \u63A5\u53E3\u4E0E OAuth \u4EE4\u724C\u63A5\u53E3\u8BE6\u7EC6\u72B6\u6001",action:"diagnose"}],g=await c.window.showQuickPick(d,{placeHolder:`Antigravity \u4EE3\u7406\u5FEB\u6377\u83DC\u5355 (\u5F53\u524D: ${o?"\u5DF2\u5F00\u542F":"\u7EAF\u76F4\u8FDE"} | \u4E3B\u673A: ${l})`});if(g)if(g.action==="settings")f.createOrShow(i.extensionUri,e,r);else if(g.action==="toggle"){let b=await e.toggle();await t.update(),c.window.showInformationMessage(b?"Antigravity \u4EE3\u7406: \u5DF2\u3010\u5F00\u542F (ON)\u3011\uFF0C\u6B63\u5728\u8D70\u672C\u5730\u53CD\u5411\u96A7\u9053\u3002":"Antigravity \u4EE3\u7406: \u5DF2\u3010\u5173\u95ED (OFF)\u3011\uFF0C\u5DF2\u5207\u6362\u4E3A\u7EAF\u76F4\u8FDE\u6A21\u5F0F\u3002")}else g.action==="diagnose"&&await r.run()}),c.commands.registerCommand("antigravityRemoteProxy.toggle",async()=>{let o=await e.toggle();await t.update(),o?c.window.showInformationMessage("Antigravity \u4EE3\u7406: \u5DF2\u3010\u5F00\u542F (ON)\u3011\uFF0C\u6B63\u5728\u8D70\u672C\u5730\u53CD\u5411\u96A7\u9053\u3002"):c.window.showInformationMessage("Antigravity \u4EE3\u7406: \u5DF2\u3010\u5173\u95ED (OFF)\u3011\uFF0C\u5DF2\u5207\u6362\u4E3A\u7EAF\u76F4\u8FDE\u6A21\u5F0F\u3002")}),c.commands.registerCommand("antigravityRemoteProxy.enable",async()=>{await e.enable(),await t.update(),c.window.showInformationMessage("Antigravity \u4EE3\u7406: \u5DF2\u3010\u5F00\u542F (ON)\u3011\u3002")}),c.commands.registerCommand("antigravityRemoteProxy.disable",async()=>{await e.disable(),await t.update(),c.window.showInformationMessage("Antigravity \u4EE3\u7406: \u5DF2\u3010\u5173\u95ED (OFF)\u3011\uFF08\u7EAF\u76F4\u8FDE\uFF09\u3002")}),c.commands.registerCommand("antigravityRemoteProxy.status",async()=>{let o=e.isEnabled(),a=e.getProxyHost(),n=e.getProxyPort(),l=await e.checkPort(n,a),d=e.detectRemoteHost()||"\u672C\u5730",g=o?`[${d}] \u5F53\u524D\u72B6\u6001: \u3010\u5DF2\u5F00\u542F (ON)\u3011 | \u96A7\u9053\u7AEF\u53E3 ${a}:${n}: ${l?"\u2713 \u8FDE\u901A\u6B63\u5E38":"\u2717 \u672A\u8FDE\u901A"}`:`[${d}] \u5F53\u524D\u72B6\u6001: \u3010\u5DF2\u5173\u95ED (OFF)\u3011 | \u7EAF\u76F4\u8FDE\u6A21\u5F0F`;c.window.showInformationMessage(g),await t.update()}),c.commands.registerCommand("antigravityRemoteProxy.setupRemote",async()=>{let o=e.detectRemoteHost();if(!o){c.window.showWarningMessage("\u672A\u68C0\u6D4B\u5230\u8FDC\u7A0B SSH \u4E3B\u673A\u3002");return}await s.deploy(o)&&(c.window.showInformationMessage("Antigravity \u8FDC\u7AEF\u4EE3\u7406\u7EC4\u4EF6\u5DF2\u6210\u529F\u90E8\u7F72\uFF01"),await t.update())}),c.commands.registerCommand("antigravityRemoteProxy.restore",async()=>{await e.restoreRemote()&&(c.window.showInformationMessage("\u8FDC\u7A0B\u73AF\u5883\u5DF2 100% \u5F7B\u5E95\u590D\u539F\u4E3A\u521D\u59CB\u7EAF\u51C0\u72B6\u6001\uFF01"),await t.update())}),e)}function j(){}0&&(module.exports={activate,deactivate});
