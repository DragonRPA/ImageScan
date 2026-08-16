# update-agent.ps1
# UBUS DragonRPA Agent 최신 버전 다운로드 및 자동 교체

[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$Host.UI.RawUI.WindowTitle = "DragonRPA 에이전트 최신 버전 업데이트 도구"

Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "  UBUS DragonRPA Agent 최신 버전 다운로드 및 자동 교체" -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host ""

$baseDir = (Get-Location).Path
$tempDir = Join-Path $baseDir "temp"
if (-not (Test-Path $tempDir)) { New-Item -ItemType Directory -Path $tempDir -Force | Out-Null }
$tempExe = Join-Path $tempDir "agent-update.exe"
$targetExe = Join-Path $baseDir "UBUS_DragonRPA_Agent.exe"
$targetZebra = Join-Path $baseDir "zebra-agent.exe"

# 1. 실행 중인 에이전트 종료
Write-Host "[1/5] 실행 중인 에이전트 안전 종료 중..." -ForegroundColor Yellow
Stop-Process -Name "UBUS_DragonRPA_Agent" -Force -ErrorAction SilentlyContinue
Stop-Process -Name "zebra-agent" -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 1

# 2. 최신 파일 다운로드
Write-Host "[2/5] GitHub 최신 배포 바이너리 다운로드 중..." -ForegroundColor Yellow
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
$wc = New-Object System.Net.WebClient
try {
    $wc.DownloadFile("https://dragonrpa.github.io/ImageScan/UBUS_DragonRPA_Agent.exe", $tempExe)
} catch {
    Write-Host " -> 백업 저장소에서 다운로드 재시도..." -ForegroundColor Gray
    $wc.DownloadFile("https://raw.githubusercontent.com/DragonRPA/ImageScan/main/print-agent/dist/UBUS_DragonRPA_Agent.exe", $tempExe)
}

if (-not (Test-Path $tempExe)) {
    Write-Host "❌ 업데이트 다운로드에 실패하였습니다. 인터넷 연결을 확인하세요." -ForegroundColor Red
    Read-Host "계속하려면 Enter 키를 누르십시오..."
    exit 1
}

# 3. 인증서 동기화
Write-Host "[3/5] 사내 보안 인증서 동기화 및 신뢰 등록..." -ForegroundColor Yellow
$cerPath = Join-Path $baseDir "DragonRPA_Root.cer"
try {
    $wc.DownloadFile("https://dragonrpa.github.io/ImageScan/DragonRPA_Root.cer", $cerPath)
    if (Test-Path $cerPath) {
        Import-Certificate -FilePath $cerPath -CertStoreLocation "Cert:\CurrentUser\Root" | Out-Null
        Import-Certificate -FilePath $cerPath -CertStoreLocation "Cert:\CurrentUser\TrustedPublisher" | Out-Null
    }
} catch {}

# 4. 차단 해제
Write-Host "[4/5] Windows 보안 차단 플래그 자동 해제 (Unblock-File)..." -ForegroundColor Yellow
Unblock-File -Path $tempExe -ErrorAction SilentlyContinue

# 5. 파일 교체 및 실행
Write-Host "[5/5] 최신 바이너리 교체 및 자동 재실행..." -ForegroundColor Yellow
Copy-Item -Path $tempExe -Destination $targetExe -Force
Copy-Item -Path $tempExe -Destination $targetZebra -Force
Remove-Item -Path $tempExe -Force -ErrorAction SilentlyContinue
Unblock-File -Path $targetExe -ErrorAction SilentlyContinue

if (Test-Path $targetExe) {
    Start-Process -FilePath $targetExe
} elseif (Test-Path $targetZebra) {
    Start-Process -FilePath $targetZebra
}

Write-Host ""
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "  ✅ 에이전트 최신 버전 업데이트 및 실행이 완료되었습니다!" -ForegroundColor Green
Write-Host "========================================================" -ForegroundColor Cyan
Start-Sleep -Seconds 2
