"use strict";var E=Object.create;var p=Object.defineProperty;var F=Object.getOwnPropertyDescriptor;var k=Object.getOwnPropertyNames;var O=Object.getPrototypeOf,L=Object.prototype.hasOwnProperty;var _=(o,t)=>{for(var e in t)p(o,e,{get:t[e],enumerable:!0})},b=(o,t,e,a)=>{if(t&&typeof t=="object"||typeof t=="function")for(let n of k(t))!L.call(o,n)&&n!==e&&p(o,n,{get:()=>t[n],enumerable:!(a=F(t,n))||a.enumerable});return o};var c=(o,t,e)=>(e=o!=null?E(O(o)):{},b(t||!o||!o.__esModule?p(e,"default",{value:o,enumerable:!0}):e,o)),T=o=>b(p({},"__esModule",{value:!0}),o);var H={};_(H,{activate:()=>M,deactivate:()=>N});module.exports=T(H);var r=c(require("vscode"));var l=c(require("fs")),P=c(require("path")),S=c(require("os")),D=c(require("net")),A=require("child_process"),w=c(require("vscode")),m=class{serverDir;disabledFlagPath;constructor(){this.serverDir=P.join(S.homedir(),".antigravity-ide-server"),this.disabledFlagPath=P.join(this.serverDir,"proxy.disabled")}isEnabled(){try{return!l.existsSync(this.disabledFlagPath)}catch{return!0}}async enable(){try{l.existsSync(this.disabledFlagPath)&&l.unlinkSync(this.disabledFlagPath),await this.restartAgy()}catch(t){w.window.showErrorMessage(`\u5F00\u542F\u4EE3\u7406\u5931\u8D25: ${t.message}`)}}async disable(){try{l.existsSync(this.serverDir)||l.mkdirSync(this.serverDir,{recursive:!0}),l.writeFileSync(this.disabledFlagPath,""),await this.restartAgy()}catch(t){w.window.showErrorMessage(`\u5173\u95ED\u4EE3\u7406\u5931\u8D25: ${t.message}`)}}async toggle(){return this.isEnabled()?(await this.disable(),!1):(await this.enable(),!0)}async restartAgy(){return new Promise(t=>{(0,A.exec)('for p in $(pidof agy agy.real 2>/dev/null); do kill -9 "$p" 2>/dev/null || true; done',()=>{t()})})}checkPort(t,e="127.0.0.1",a=1500){return new Promise(n=>{let i=new D.Socket;i.setTimeout(a),i.on("connect",()=>{i.destroy(),n(!0)}),i.on("timeout",()=>{i.destroy(),n(!1)}),i.on("error",()=>{i.destroy(),n(!1)}),i.connect(t,e)})}};var h=c(require("vscode")),y=class{statusBarItem;controller;updateTimer=null;constructor(t){this.controller=t,this.statusBarItem=h.window.createStatusBarItem(h.StatusBarAlignment.Right,100),this.statusBarItem.command="antigravityRemoteProxy.toggle"}init(t){t.subscriptions.push(this.statusBarItem),this.update(),this.statusBarItem.show(),this.updateTimer=setInterval(()=>{this.update()},5e3),t.subscriptions.push({dispose:()=>{this.updateTimer&&clearInterval(this.updateTimer)}})}async update(){let e=h.workspace.getConfiguration("antigravityRemoteProxy").get("proxyPort",7897);if(!this.controller.isEnabled()){this.statusBarItem.text="$(circle-slash) AI\u4EE3\u7406: \u7EAF\u76F4\u8FDE",this.statusBarItem.tooltip=`Antigravity \u4EE3\u7406: \u5DF2\u5173\u95ED (\u7EAF\u76F4\u8FDE\u6A21\u5F0F)
\u70B9\u51FB\u5F00\u542F\u672C\u5730 127.0.0.1:${e} \u4EE3\u7406\u52A0\u901F`,this.statusBarItem.backgroundColor=void 0;return}await this.controller.checkPort(e)?(this.statusBarItem.text=`$(plug) AI\u4EE3\u7406: \u5F00\u542F (${e})`,this.statusBarItem.tooltip=`Antigravity \u4EE3\u7406: \u5DF2\u5F00\u542F (\u8D70\u672C\u5730 ${e} \u53CD\u5411\u96A7\u9053)
\u96A7\u9053\u72B6\u6001: \u6B63\u5E38\u8FDE\u901A
\u70B9\u51FB\u5207\u6362\u4E3A\u7EAF\u76F4\u8FDE\u6A21\u5F0F`,this.statusBarItem.backgroundColor=void 0):(this.statusBarItem.text="$(warning) AI\u4EE3\u7406: \u96A7\u9053\u672A\u901A",this.statusBarItem.tooltip=`Antigravity \u4EE3\u7406: \u5DF2\u5F00\u542F\uFF0C\u4F46 127.0.0.1:${e} \u672A\u8FDE\u901A\uFF01
\u8BF7\u68C0\u67E5\u672C\u5730 SSH \u914D\u7F6E\u662F\u5426\u5305\u542B RemoteForward ${e} 127.0.0.1:${e}`,this.statusBarItem.backgroundColor=new h.ThemeColor("statusBarItem.warningBackground"))}};var s=c(require("fs")),d=c(require("path")),I=c(require("os")),$=c(require("vscode")),u=class{homeDir;serverBinDir;agyProxyPath;geminiBinDir;agyPath;agyRealPath;constructor(){this.homeDir=I.homedir(),this.serverBinDir=d.join(this.homeDir,".antigravity-ide-server","bin"),this.agyProxyPath=d.join(this.serverBinDir,"agy-proxy"),this.geminiBinDir=d.join(this.homeDir,".gemini","bin"),this.agyPath=d.join(this.geminiBinDir,"agy"),this.agyRealPath=d.join(this.geminiBinDir,"agy.real")}isDeployed(){try{let t=s.existsSync(this.agyProxyPath),e=s.existsSync(this.agyRealPath);return t&&e}catch{return!1}}async deploy(){try{s.existsSync(this.serverBinDir)||s.mkdirSync(this.serverBinDir,{recursive:!0}),s.writeFileSync(this.agyProxyPath,`#!/bin/bash
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
`,{mode:493});let e=d.join(this.homeDir,".local","bin");try{s.existsSync(e)||s.mkdirSync(e,{recursive:!0});let a=d.join(e,"agy-proxy");s.existsSync(a)||s.symlinkSync(this.agyProxyPath,a)}catch{}return s.existsSync(this.agyPath)&&!s.existsSync(this.agyRealPath)&&(s.renameSync(this.agyPath,this.agyRealPath),s.writeFileSync(this.agyPath,`#!/bin/bash
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
`,{mode:493}),s.chmodSync(this.agyRealPath,493)),!0}catch(t){return $.window.showErrorMessage(`\u914D\u7F6E\u8FDC\u7AEF\u4EE3\u7406\u7EC4\u4EF6\u5931\u8D25: ${t.message}`),!1}}};var f=c(require("vscode")),B=require("child_process"),v=class{controller;outputChannel;constructor(t){this.controller=t,this.outputChannel=f.window.createOutputChannel("Antigravity Proxy Diagnostics")}async run(){this.outputChannel.clear(),this.outputChannel.show(!0);let e=f.workspace.getConfiguration("antigravityRemoteProxy").get("proxyPort",7897),a=this.controller.isEnabled();this.log("===================================================="),this.log(" Antigravity Remote Proxy - \u7F51\u7EDC\u8FDE\u901A\u6027\u8BCA\u65AD\u62A5\u544A"),this.log(` \u65F6\u95F4: ${new Date().toLocaleString()}`),this.log(`====================================================
`),this.log(`[1] \u4EE3\u7406\u5F00\u5173\u72B6\u6001: ${a?"\u3010\u5DF2\u5F00\u542F (ON)\u3011":"\u3010\u5DF2\u5173\u95ED (OFF - \u7EAF\u76F4\u8FDE)\u3011"}`),this.log(`[2] \u68C0\u67E5\u672C\u5730 SSH \u53CD\u5411\u96A7\u9053\u7AEF\u53E3 (127.0.0.1:${e})...`);let n=await this.controller.checkPort(e);n?this.log(`    \u2713 \u7AEF\u53E3 127.0.0.1:${e} \u6B63\u5E38\u76D1\u542C\u5E76\u53EF\u8FDE\u901A\uFF01`):(this.log(`    \u2717 \u7AEF\u53E3 127.0.0.1:${e} \u65E0\u6CD5\u8FDE\u63A5\uFF01`),this.log(`      \u539F\u56E0\u5206\u6790: \u672C\u5730 SSH \u672A\u914D\u7F6E RemoteForward ${e} 127.0.0.1:${e}\uFF0C\u6216\u672C\u5730\u4EE3\u7406\u672A\u5F00\u542F\u3002`)),this.log(`
[3] \u6D4B\u8BD5 Google AI API \u6838\u5FC3\u63A5\u53E3\u54CD\u5E94...`);let i=a&&n?`-x http://127.0.0.1:${e}`:"";await this.testEndpoint("https://aicode.googleapis.com",i),await this.testEndpoint("https://play.googleapis.com/log",i),this.log(`
====================================================`),this.log(" \u8BCA\u65AD\u5B8C\u6210\uFF01"),this.log("====================================================")}testEndpoint(t,e){return new Promise(a=>{let n=`curl -sI -m 6 ${e} "${t}" | head -n 5`;this.log(`    \u53D1\u8D77\u8BF7\u6C42 -> ${t} ${e?`(\u901A\u8FC7\u4EE3\u7406 ${e})`:"(\u76F4\u8FDE)"}`),(0,B.exec)(n,(i,x)=>{if(i)this.log(`    \u2717 \u8BF7\u6C42\u5931\u8D25: ${i.message.trim()}`);else{let g=x.split(`
`)[0]||"";this.log(`    \u2713 \u54CD\u5E94\u6210\u529F: ${g.trim()}`)}a()})})}log(t){this.outputChannel.appendLine(t)}};function M(o){let t=new m,e=new y(t),a=new u,n=new v(t);r.env.remoteName&&r.workspace.getConfiguration("antigravityRemoteProxy").get("autoSetup",!0)&&!a.isDeployed()&&a.deploy().then(g=>{g&&e.update()}),e.init(o),o.subscriptions.push(r.commands.registerCommand("antigravityRemoteProxy.toggle",async()=>{let i=await t.toggle();await e.update(),i?r.window.showInformationMessage("Antigravity \u4EE3\u7406: \u5DF2\u3010\u5F00\u542F (ON)\u3011\uFF0C\u6B63\u5728\u8D70\u672C\u5730\u53CD\u5411\u96A7\u9053\u3002"):r.window.showInformationMessage("Antigravity \u4EE3\u7406: \u5DF2\u3010\u5173\u95ED (OFF)\u3011\uFF0C\u5DF2\u5207\u6362\u4E3A\u7EAF\u76F4\u8FDE\u6A21\u5F0F\u3002")}),r.commands.registerCommand("antigravityRemoteProxy.enable",async()=>{await t.enable(),await e.update(),r.window.showInformationMessage("Antigravity \u4EE3\u7406: \u5DF2\u3010\u5F00\u542F (ON)\u3011\u3002")}),r.commands.registerCommand("antigravityRemoteProxy.disable",async()=>{await t.disable(),await e.update(),r.window.showInformationMessage("Antigravity \u4EE3\u7406: \u5DF2\u3010\u5173\u95ED (OFF)\u3011\uFF08\u7EAF\u76F4\u8FDE\uFF09\u3002")}),r.commands.registerCommand("antigravityRemoteProxy.status",async()=>{let i=t.isEnabled(),g=r.workspace.getConfiguration("antigravityRemoteProxy").get("proxyPort",7897),R=await t.checkPort(g),C=i?`\u5F53\u524D\u72B6\u6001: \u3010\u5DF2\u5F00\u542F (ON)\u3011 | \u96A7\u9053\u7AEF\u53E3 127.0.0.1:${g}: ${R?"\u2713 \u8FDE\u901A\u6B63\u5E38":"\u2717 \u672A\u8FDE\u901A"}`:"\u5F53\u524D\u72B6\u6001: \u3010\u5DF2\u5173\u95ED (OFF)\u3011 | \u7EAF\u76F4\u8FDE\u6A21\u5F0F";r.window.showInformationMessage(C),await e.update()}),r.commands.registerCommand("antigravityRemoteProxy.diagnose",async()=>{await n.run()}),r.commands.registerCommand("antigravityRemoteProxy.setupRemote",async()=>{await a.deploy()&&(r.window.showInformationMessage("Antigravity \u8FDC\u7AEF\u4EE3\u7406\u7EC4\u4EF6\u5DF2\u6210\u529F\u90E8\u7F72\uFF01"),await e.update())}))}function N(){}0&&(module.exports={activate,deactivate});
