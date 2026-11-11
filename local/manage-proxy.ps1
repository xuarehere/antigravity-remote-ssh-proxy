# manage-proxy.ps1: Local control script for Antigravity remote proxy
param(
    [string]$HostName = "10.192.41.183-zbz-3090",
    [ValidateSet("on", "off", "status", "toggle", "enable", "disable")]
    [string]$Action = "status"
)

Write-Host "=============================================" -ForegroundColor Cyan
Write-Host " [Antigravity Proxy 控制器] 目标主机: $HostName" -ForegroundColor Cyan
Write-Host " 操作: $Action" -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan

ssh -n -o BatchMode=yes -o ConnectTimeout=5 $HostName "~/.antigravity-ide-server/bin/agy-proxy $Action"
