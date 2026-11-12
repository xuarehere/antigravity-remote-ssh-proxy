"use strict";var N=Object.create;var S=Object.defineProperty;var Y=Object.getOwnPropertyDescriptor;var X=Object.getOwnPropertyNames;var z=Object.getPrototypeOf,G=Object.prototype.hasOwnProperty;var j=(n,t)=>{for(var e in t)S(n,e,{get:t[e],enumerable:!0})},D=(n,t,e,r)=>{if(t&&typeof t=="object"||typeof t=="function")for(let s of X(t))!G.call(n,s)&&s!==e&&S(n,s,{get:()=>t[s],enumerable:!(r=Y(t,s))||r.enumerable});return n};var g=(n,t,e)=>(e=n!=null?N(z(n)):{},D(t||!n||!n.__esModule?S(e,"default",{value:n,enumerable:!0}):e,n)),U=n=>D(S({},"__esModule",{value:!0}),n);var K={};j(K,{activate:()=>W,deactivate:()=>V});module.exports=U(K);var i=g(require("vscode"));var d=g(require("fs")),R=g(require("path")),I=g(require("os")),C=g(require("net")),_=require("child_process"),p=g(require("vscode")),O=class{serverDir;disabledFlagPath;confFilePath;constructor(){this.serverDir=R.join(I.homedir(),".antigravity-ide-server"),this.disabledFlagPath=R.join(this.serverDir,"proxy.disabled"),this.confFilePath=R.join(this.serverDir,"proxy.conf")}getProxyHost(){let e=p.workspace.getConfiguration("antigravityRemoteProxy").get("proxyHost","127.0.0.1");try{if(d.existsSync(this.confFilePath)){let s=d.readFileSync(this.confFilePath,"utf8").match(/PROXY_HOST=["']?([^"'\s\r\n]+)["']?/);s&&s[1]&&(e=s[1])}}catch{}return e}getProxyPort(){let e=p.workspace.getConfiguration("antigravityRemoteProxy").get("proxyPort",7897);try{if(d.existsSync(this.confFilePath)){let s=d.readFileSync(this.confFilePath,"utf8").match(/PROXY_PORT=["']?([0-9]+)["']?/);if(s&&s[1]){let o=parseInt(s[1],10);!isNaN(o)&&o>0&&o<=65535&&(e=o)}}}catch{}return e}isEnabled(){try{return!d.existsSync(this.disabledFlagPath)}catch{return!0}}async enable(){try{d.existsSync(this.disabledFlagPath)&&d.unlinkSync(this.disabledFlagPath),await this.restartAgy()}catch(t){p.window.showErrorMessage(`\u5F00\u542F\u4EE3\u7406\u5931\u8D25: ${t.message}`)}}async disable(){try{d.existsSync(this.serverDir)||d.mkdirSync(this.serverDir,{recursive:!0}),d.writeFileSync(this.disabledFlagPath,""),await this.restartAgy()}catch(t){p.window.showErrorMessage(`\u5173\u95ED\u4EE3\u7406\u5931\u8D25: ${t.message}`)}}async toggle(){return this.isEnabled()?(await this.disable(),!1):(await this.enable(),!0)}async saveConfig(t,e){let r=(t||"127.0.0.1").trim(),s=Number(e)||7897,o=p.workspace.getConfiguration("antigravityRemoteProxy");await o.update("proxyHost",r,p.ConfigurationTarget.Global),await o.update("proxyPort",s,p.ConfigurationTarget.Global);try{d.existsSync(this.serverDir)||d.mkdirSync(this.serverDir,{recursive:!0});let a=`PROXY_HOST="${r}"
PROXY_PORT="${s}"
`;d.writeFileSync(this.confFilePath,a,"utf8")}catch(a){p.window.showWarningMessage(`\u5199\u5165\u672C\u5730\u914D\u7F6E\u6587\u4EF6\u5931\u8D25: ${a.message}`)}if(!p.env.remoteName&&I.platform()==="win32"){let a=o.get("remoteHost","10.192.41.183-zbz-3090");a&&await this.syncToRemoteSsh(a,r,s)}await this.restartAgy()}syncToRemoteSsh(t,e,r){return new Promise(s=>{let o=`mkdir -p ~/.antigravity-ide-server && printf 'PROXY_HOST="%s"\\nPROXY_PORT="%s"\\n' '${e}' '${r}' > ~/.antigravity-ide-server/proxy.conf && for p in $(pidof agy agy.real 2>/dev/null); do kill -9 $p 2>/dev/null || true; done`,a=`ssh -n ${t} "${o}"`;(0,_.exec)(a,{timeout:6e3},()=>{s()})})}async restartAgy(){return new Promise(t=>{(0,_.exec)('for p in $(pidof agy agy.real 2>/dev/null); do kill -9 "$p" 2>/dev/null || true; done',{timeout:4e3},()=>{t()})})}checkPort(t,e="127.0.0.1",r=1500){return new Promise(s=>{let o=new C.Socket;o.setTimeout(r),o.on("connect",()=>{o.destroy(),s(!0)}),o.on("timeout",()=>{o.destroy(),s(!1)}),o.on("error",()=>{o.destroy(),s(!1)}),o.connect(t,e)})}};var P=g(require("vscode")),B=class{statusBarItem;controller;updateTimer=null;constructor(t){this.controller=t,this.statusBarItem=P.window.createStatusBarItem(P.StatusBarAlignment.Right,100),this.statusBarItem.command="antigravityRemoteProxy.menu"}init(t){t.subscriptions.push(this.statusBarItem),this.update(),this.statusBarItem.show(),this.updateTimer=setInterval(()=>{this.update()},5e3),t.subscriptions.push({dispose:()=>{this.updateTimer&&clearInterval(this.updateTimer)}})}async update(){let t=this.controller.getProxyHost(),e=this.controller.getProxyPort();if(!this.controller.isEnabled()){this.statusBarItem.text="$(circle-slash) AI\u4EE3\u7406: \u7EAF\u76F4\u8FDE",this.statusBarItem.tooltip=`Antigravity \u4EE3\u7406: \u5DF2\u5173\u95ED (\u7EAF\u76F4\u8FDE\u6A21\u5F0F)
\u76EE\u6807\u4E3B\u673A\u4E0E\u7AEF\u53E3: ${t}:${e}
\u70B9\u51FB\u6253\u5F00\u8BBE\u7F6E\u9762\u677F\u6216\u5207\u6362`,this.statusBarItem.backgroundColor=void 0;return}await this.controller.checkPort(e,t)?(this.statusBarItem.text=`$(plug) AI\u4EE3\u7406: \u5F00\u542F (${e})`,this.statusBarItem.tooltip=`Antigravity \u4EE3\u7406: \u5DF2\u5F00\u542F (\u8D70\u53CD\u5411\u96A7\u9053 ${t}:${e})
\u96A7\u9053\u72B6\u6001: \u2713 \u6B63\u5E38\u8FDE\u901A
\u70B9\u51FB\u6253\u5F00\u8BBE\u7F6E\u9762\u677F\u6216\u5207\u6362`,this.statusBarItem.backgroundColor=void 0):(this.statusBarItem.text="$(warning) AI\u4EE3\u7406: \u96A7\u9053\u672A\u901A",this.statusBarItem.tooltip=`Antigravity \u4EE3\u7406: \u5DF2\u5F00\u542F\uFF0C\u4F46 ${t}:${e} \u65E0\u6CD5\u8FDE\u901A\uFF01
\u8BF7\u68C0\u67E5\u672C\u5730 SSH \u914D\u7F6E\u6216\u4EE3\u7406\u8F6F\u4EF6
\u70B9\u51FB\u6253\u5F00\u8BBE\u7F6E\u9762\u677F\u8FDB\u884C\u6D4B\u8BD5`,this.statusBarItem.backgroundColor=new P.ThemeColor("statusBarItem.warningBackground"))}};var l=g(require("fs")),b=g(require("path")),H=g(require("os")),A=g(require("vscode")),T=class{homeDir;serverBinDir;agyProxyPath;geminiBinDir;agyPath;agyRealPath;constructor(){this.homeDir=H.homedir(),this.serverBinDir=b.join(this.homeDir,".antigravity-ide-server","bin"),this.agyProxyPath=b.join(this.serverBinDir,"agy-proxy"),this.geminiBinDir=b.join(this.homeDir,".gemini","bin"),this.agyPath=b.join(this.geminiBinDir,"agy"),this.agyRealPath=b.join(this.geminiBinDir,"agy.real")}isDeployed(){try{let t=l.existsSync(this.agyProxyPath),e=l.existsSync(this.agyRealPath);return t&&e}catch{return!1}}async deploy(){try{l.existsSync(this.serverBinDir)||l.mkdirSync(this.serverBinDir,{recursive:!0}),l.writeFileSync(this.agyProxyPath,`#!/bin/bash
# Antigravity IDE Remote Proxy Control Script
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
            if check_port "$PROXY_HOST" "$PROXY_PORT"; then
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
`,{mode:493});let e=b.join(this.homeDir,".local","bin");try{l.existsSync(e)||l.mkdirSync(e,{recursive:!0});let r=b.join(e,"agy-proxy");l.existsSync(r)||l.symlinkSync(this.agyProxyPath,r)}catch{}return l.existsSync(this.agyPath)&&!l.existsSync(this.agyRealPath)&&(l.renameSync(this.agyPath,this.agyRealPath),l.writeFileSync(this.agyPath,`#!/bin/bash
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
`,{mode:493}),l.chmodSync(this.agyRealPath,493)),!0}catch(t){return A.window.showErrorMessage(`\u914D\u7F6E\u8FDC\u7AEF\u4EE3\u7406\u7EC4\u4EF6\u5931\u8D25: ${t.message}`),!1}}};var F=g(require("vscode")),M=require("child_process"),E=class{controller;outputChannel;constructor(t){this.controller=t,this.outputChannel=F.window.createOutputChannel("Antigravity Proxy Diagnostics")}async testConnection(t,e){let r=(t||this.controller.getProxyHost()||"127.0.0.1").trim(),s=Number(e)||this.controller.getProxyPort()||7897,o=this.controller.isEnabled(),a=[],c=!1,h=Date.now();try{c=await this.controller.checkPort(s,r,2e3);let v=Date.now()-h;c?a.push({name:`\u53CD\u5411\u96A7\u9053\u7AEF\u53E3 (${r}:${s})`,status:"success",latencyMs:v,message:`\u8FDE\u901A\u6B63\u5E38 (TCP \u63E1\u624B\u8017\u65F6 ${v}ms)`}):a.push({name:`\u53CD\u5411\u96A7\u9053\u7AEF\u53E3 (${r}:${s})`,status:"error",latencyMs:v,message:`\u65E0\u6CD5\u5EFA\u7ACB TCP \u63E1\u624B\uFF01\u8BF7\u68C0\u67E5\u672C\u5730\u4EE3\u7406\u5DE5\u5177\u662F\u5426\u542F\u52A8\uFF0C\u4E14 SSH \u662F\u5426\u914D\u7F6E\u4E86 RemoteForward ${s} 127.0.0.1:${s}`})}catch(v){a.push({name:`\u53CD\u5411\u96A7\u9053\u7AEF\u53E3 (${r}:${s})`,status:"error",message:`\u68C0\u6D4B\u5F02\u5E38: ${v.message}`})}let m=c?`-x http://${r}:${s}`:"",u=await this.probeUrl("Google AI \u6838\u5FC3\u63A5\u53E3 (aicode.googleapis.com)","https://aicode.googleapis.com",m);a.push(u);let k=await this.probeUrl("Google \u9065\u6D4B\u670D\u52A1 (play.googleapis.com/log)","https://play.googleapis.com/log",m);a.push(k);let y="success",x="\u{1F389} \u4EE3\u7406\u901A\u9053\u7545\u901A\uFF0CGoogle AI \u63A5\u53E3\u8FDE\u901A\u6B63\u5E38\uFF01",w=a.some(v=>v.status==="error"),L=a.some(v=>v.status==="success");return c?w&&(L?(y="warning",x="\u26A0\uFE0F \u96A7\u9053\u5DF2\u8FDE\u901A\uFF0C\u4F46\u90E8\u5206 Google \u670D\u52A1\u63A2\u6D4B\u5F02\u5E38\uFF0C\u8BF7\u786E\u8BA4\u4EE3\u7406\u8282\u70B9\u662F\u5426\u80FD\u591F\u8BBF\u95EE Google AI\u3002"):(y="error",x="\u274C \u65E0\u6CD5\u8BBF\u95EE Google AI \u670D\u52A1\uFF0C\u8BF7\u68C0\u67E5\u672C\u5730\u4EE3\u7406\u89C4\u5219\u4E0E\u8282\u70B9\u53EF\u7528\u6027\u3002")):(y="error",x=`\u274C \u53CD\u5411\u96A7\u9053\u672A\u8FDE\u901A (${r}:${s})\uFF0C\u8BF7\u68C0\u67E5\u672C\u5730\u4EE3\u7406\u53CA SSH \u8F6C\u53D1\u3002`),{timestamp:new Date().toLocaleTimeString(),proxyHost:r,proxyPort:s,isEnabled:o,tunnelReachable:c,steps:a,overallStatus:y,summary:x}}probeUrl(t,e,r){return new Promise(s=>{let o=Date.now(),a=`curl -sI -m 6 ${r} "${e}"`;(0,M.exec)(a,(c,h,m)=>{let u=Date.now()-o;if(c){let w=m?m.trim():c.message.trim();s({name:t,status:"error",latencyMs:u,message:`\u8BF7\u6C42\u5931\u8D25 (${u}ms): ${w.slice(0,100)}`});return}let y=h.split(`
`).map(w=>w.trim()).filter(Boolean)[0]||"",x=h.includes("server: ESF")||h.includes("Server: ESF")||h.includes("200 Connection established");y.includes("200")||y.includes("404")||y.includes("405")||x?s({name:t,status:"success",latencyMs:u,message:`\u8BBF\u95EE\u6B63\u5E38 (${y||"HTTP 200"}, \u8017\u65F6 ${u}ms)`}):y.includes("403")?s({name:t,status:"error",latencyMs:u,message:"\u8FD4\u56DE 403 Forbidden\uFF08\u53D7\u5730\u57DF\u9650\u5236\u963B\u6B62\uFF0C\u8BF7\u5207\u6362\u652F\u6301 Google AI \u7684\u4EE3\u7406\u8282\u70B9\uFF09"}):s({name:t,status:"warning",latencyMs:u,message:`\u8FD4\u56DE\u72B6\u6001: ${y||"\u672A\u77E5"} (${u}ms)`})})})}async run(){this.outputChannel.clear(),this.outputChannel.show(!0),this.log("===================================================="),this.log(" Antigravity Remote Proxy - \u7F51\u7EDC\u8FDE\u901A\u6027\u8BCA\u65AD\u62A5\u544A"),this.log(` \u65F6\u95F4: ${new Date().toLocaleString()}`),this.log(`====================================================
`);let t=await this.testConnection();this.log(`[1] \u4EE3\u7406\u5F00\u5173: ${t.isEnabled?"\u3010\u5DF2\u5F00\u542F (ON)\u3011":"\u3010\u5DF2\u5173\u95ED (OFF - \u7EAF\u76F4\u8FDE)\u3011"}`),this.log(`[2] \u4EE3\u7406\u76EE\u6807: ${t.proxyHost}:${t.proxyPort}`),this.log(`
--- \u8BCA\u65AD\u660E\u7EC6 ---`);for(let e of t.steps){let r=e.status==="success"?"\u2713":e.status==="warning"?"!":"\u2717";this.log(` ${r} ${e.name}: ${e.message}`)}this.log(`
====================================================`),this.log(` \u7ED3\u8BBA: ${t.summary}`),this.log("====================================================")}log(t){this.outputChannel.appendLine(t)}};var f=g(require("vscode")),$=class n{static currentPanel;_panel;_disposables=[];_controller;_diagnostics;static createOrShow(t,e,r){let s=f.window.activeTextEditor?f.window.activeTextEditor.viewColumn:void 0;if(n.currentPanel){n.currentPanel._panel.reveal(s),n.currentPanel.refresh();return}let o=f.window.createWebviewPanel("antigravityRemoteProxySettings","Antigravity \u4EE3\u7406\u8BBE\u7F6E",s||f.ViewColumn.One,{enableScripts:!0,retainContextWhenHidden:!0,localResourceRoots:[t]});n.currentPanel=new n(o,e,r)}constructor(t,e,r){this._panel=t,this._controller=e,this._diagnostics=r,this._update(),this._panel.onDidDispose(()=>this.dispose(),null,this._disposables),this._panel.webview.onDidReceiveMessage(async s=>{switch(s.command){case"save":{let o=(s.host||"127.0.0.1").trim(),a=parseInt(s.port,10)||7897;await this._controller.saveConfig(o,a),f.window.showInformationMessage(`Antigravity \u4EE3\u7406\u914D\u7F6E\u5DF2\u4FDD\u5B58\uFF01\u4EE3\u7406\u76EE\u6807: ${o}:${a}\uFF0CAI \u670D\u52A1\u5DF2\u79D2\u7EA7\u91CD\u8F7D\u3002`),this.postMessage({type:"saveResult",success:!0,message:`\u914D\u7F6E\u5DF2\u6210\u529F\u4FDD\u5B58\uFF01\u5F53\u524D\u751F\u6548: ${o}:${a}`});break}case"toggle":{let o=await this._controller.toggle();this.postMessage({type:"statusUpdate",isEnabled:o});break}case"testConnection":{let o=(s.host||this._controller.getProxyHost()||"127.0.0.1").trim(),a=parseInt(s.port,10)||this._controller.getProxyPort()||7897;this.postMessage({type:"testStarted"});try{let c=await this._diagnostics.testConnection(o,a);this.postMessage({type:"testResult",report:c})}catch(c){this.postMessage({type:"testError",error:c.message})}break}case"refresh":{this.refresh();break}}},null,this._disposables)}refresh(){let t=this._controller.isEnabled(),e=this._controller.getProxyHost(),r=this._controller.getProxyPort();this.postMessage({type:"initialData",isEnabled:t,proxyHost:e,proxyPort:r})}postMessage(t){this._panel.webview.postMessage(t)}dispose(){for(n.currentPanel=void 0,this._panel.dispose();this._disposables.length;){let t=this._disposables.pop();t&&t.dispose()}}_update(){this._panel.webview.html=this._getHtmlForWebview()}_getHtmlForWebview(){let t=this._controller.isEnabled(),e=this._controller.getProxyHost(),r=this._controller.getProxyPort();return`<!DOCTYPE html>
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
      <div class="header-title">
        <span>\u26A1 Antigravity \u4EE3\u7406\u4E0E\u7F51\u7EDC\u4E2D\u5FC3</span>
        <span id="headerStatusBadge" class="header-badge ${t?"badge-on":"badge-off"}">
          ${t?"\u25CF \u4EE3\u7406\u6A21\u5F0F\u5DF2\u5F00\u542F":"\u25CB \u7EAF\u76F4\u8FDE\u6A21\u5F0F"}
        </span>
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
            <input type="number" id="proxyPort" value="${r}" placeholder="7897" min="1" max="65535" />
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
        <span>\u{1F50D} \u7F51\u7EDC\u8FDE\u901A\u6027\u6D4B\u8BD5</span>
        <span style="font-size: 11px; font-weight: normal; opacity: 0.7;">\u5168\u9762\u6D4B\u8BD5 SSH \u96A7\u9053\u4E0E Google AI \u670D\u52A1</span>
      </div>

      <p style="font-size: 12px; opacity: 0.8; margin-bottom: 14px;">
        \u70B9\u51FB\u201C\u8FDE\u63A5\u6D4B\u8BD5\u201D\u6309\u94AE\uFF0C\u5C06\u9488\u5BF9\u5F53\u524D\u8F93\u5165\u7684\u4E3B\u673A\u4E0E\u7AEF\u53E3\uFF0C\u5B9E\u65F6\u68C0\u6D4B SSH \u53CD\u5411\u96A7\u9053\u8FDE\u901A\u6027\u3001Google AI (aicode) \u63A5\u53E3\u4E0E\u9065\u6D4B\u670D\u52A1\u7684 HTTP \u72B6\u6001\u548C\u6BEB\u79D2\u5EF6\u8FDF\u3002
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
</html>`}};function W(n){let t=new O,e=new B(t),r=new T,s=new E(t);i.env.remoteName&&i.workspace.getConfiguration("antigravityRemoteProxy").get("autoSetup",!0)&&!r.isDeployed()&&r.deploy().then(c=>{c&&e.update()}),e.init(n),n.subscriptions.push(i.commands.registerCommand("antigravityRemoteProxy.openSettings",()=>{$.createOrShow(n.extensionUri,t,s)}),i.commands.registerCommand("antigravityRemoteProxy.menu",async()=>{let o=t.isEnabled(),a=t.getProxyHost(),c=t.getProxyPort(),h=[{label:"$(gear) \u6253\u5F00\u4EE3\u7406\u914D\u7F6E\u4E0E\u8FDE\u901A\u6D4B\u8BD5\u9762\u677F (Settings & Test)",description:`\u4FEE\u6539\u4E3B\u673A(${a})\u4E0E\u7AEF\u53E3(${c})\uFF0C\u8FDB\u884C\u7F51\u7EDC\u8FDE\u901A\u6027\u6D4B\u8BD5`,action:"settings"},{label:o?"$(circle-slash) \u5207\u6362\u4E3A\u7EAF\u76F4\u8FDE\u6A21\u5F0F (Disable Proxy)":"$(plug) \u5207\u6362\u4E3A\u4EE3\u7406\u52A0\u901F\u6A21\u5F0F (Enable Proxy)",description:o?"\u5173\u95ED\u4EE3\u7406\uFF0CAI \u6838\u5FC3\u8D70\u8FDC\u7A0B\u670D\u52A1\u5668\u672C\u5730\u76F4\u8FDE":`\u5F00\u542F\u4EE3\u7406\uFF0CAI \u6838\u5FC3\u8D70\u672C\u5730 ${a}:${c} \u96A7\u9053\u52A0\u901F`,action:"toggle"},{label:"$(checklist) \u8FD0\u884C\u7F51\u7EDC\u8FDE\u901A\u6027\u8BCA\u65AD (Run Diagnostics)",description:"\u6D4B\u8BD5 SSH \u53CD\u5411\u96A7\u9053\u4E0E Google AI \u63A5\u53E3\u8BE6\u7EC6\u72B6\u6001",action:"diagnose"}],m=await i.window.showQuickPick(h,{placeHolder:`Antigravity \u4EE3\u7406\u5FEB\u6377\u83DC\u5355 (\u5F53\u524D: ${o?"\u5DF2\u5F00\u542F":"\u7EAF\u76F4\u8FDE"})`});if(m)if(m.action==="settings")$.createOrShow(n.extensionUri,t,s);else if(m.action==="toggle"){let u=await t.toggle();await e.update(),i.window.showInformationMessage(u?"Antigravity \u4EE3\u7406: \u5DF2\u3010\u5F00\u542F (ON)\u3011\uFF0C\u6B63\u5728\u8D70\u672C\u5730\u53CD\u5411\u96A7\u9053\u3002":"Antigravity \u4EE3\u7406: \u5DF2\u3010\u5173\u95ED (OFF)\u3011\uFF0C\u5DF2\u5207\u6362\u4E3A\u7EAF\u76F4\u8FDE\u6A21\u5F0F\u3002")}else m.action==="diagnose"&&await s.run()}),i.commands.registerCommand("antigravityRemoteProxy.toggle",async()=>{let o=await t.toggle();await e.update(),o?i.window.showInformationMessage("Antigravity \u4EE3\u7406: \u5DF2\u3010\u5F00\u542F (ON)\u3011\uFF0C\u6B63\u5728\u8D70\u672C\u5730\u53CD\u5411\u96A7\u9053\u3002"):i.window.showInformationMessage("Antigravity \u4EE3\u7406: \u5DF2\u3010\u5173\u95ED (OFF)\u3011\uFF0C\u5DF2\u5207\u6362\u4E3A\u7EAF\u76F4\u8FDE\u6A21\u5F0F\u3002")}),i.commands.registerCommand("antigravityRemoteProxy.enable",async()=>{await t.enable(),await e.update(),i.window.showInformationMessage("Antigravity \u4EE3\u7406: \u5DF2\u3010\u5F00\u542F (ON)\u3011\u3002")}),i.commands.registerCommand("antigravityRemoteProxy.disable",async()=>{await t.disable(),await e.update(),i.window.showInformationMessage("Antigravity \u4EE3\u7406: \u5DF2\u3010\u5173\u95ED (OFF)\u3011\uFF08\u7EAF\u76F4\u8FDE\uFF09\u3002")}),i.commands.registerCommand("antigravityRemoteProxy.status",async()=>{let o=t.isEnabled(),a=t.getProxyHost(),c=t.getProxyPort(),h=await t.checkPort(c,a),m=o?`\u5F53\u524D\u72B6\u6001: \u3010\u5DF2\u5F00\u542F (ON)\u3011 | \u96A7\u9053\u7AEF\u53E3 ${a}:${c}: ${h?"\u2713 \u8FDE\u901A\u6B63\u5E38":"\u2717 \u672A\u8FDE\u901A"}`:"\u5F53\u524D\u72B6\u6001: \u3010\u5DF2\u5173\u95ED (OFF)\u3011 | \u7EAF\u76F4\u8FDE\u6A21\u5F0F";i.window.showInformationMessage(m),await e.update()}),i.commands.registerCommand("antigravityRemoteProxy.diagnose",async()=>{await s.run()}),i.commands.registerCommand("antigravityRemoteProxy.setupRemote",async()=>{await r.deploy()&&(i.window.showInformationMessage("Antigravity \u8FDC\u7AEF\u4EE3\u7406\u7EC4\u4EF6\u5DF2\u6210\u529F\u90E8\u7F72\uFF01"),await e.update())}))}function V(){}0&&(module.exports={activate,deactivate});
