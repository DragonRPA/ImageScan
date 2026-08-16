# start-agent.ps1
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$Host.UI.RawUI.WindowTitle = "DragonRPA Local Print Agent Runner"

$baseDir = (Get-Location).Path
$exe1 = Join-Path $baseDir "UBUS_DragonRPA_Agent.exe"
$exe2 = Join-Path $baseDir "zebra-agent.exe"

Unblock-File -Path $exe1 -ErrorAction SilentlyContinue
Unblock-File -Path $exe2 -ErrorAction SilentlyContinue

if (Test-Path $exe1) {
    & $exe1
} elseif (Test-Path $exe2) {
    & $exe2
} else {
    Write-Host "❌ 에이전트 실행파일(UBUS_DragonRPA_Agent.exe)을 찾을 수 없습니다." -ForegroundColor Red
    Read-Host "Enter 키를 누르십시오..."
}
