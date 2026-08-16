# install-cert.ps1
# DragonRPA 사내 보안 인증서 자동 등록 및 스마트스크린 차단 해제 도구

[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$Host.UI.RawUI.WindowTitle = "DragonRPA 사내 보안 인증서 자동 등록 도구"

# 1. 관리자 권한 확인 및 자동 승격 (UAC RunAs)
$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Host "========================================================" -ForegroundColor Cyan
    Write-Host "  관리자 권한으로 자동 승격하여 실행합니다..." -ForegroundColor Yellow
    Write-Host "========================================================" -ForegroundColor Cyan
    
    $scriptPath = $MyInvocation.MyCommand.Definition
    if ($scriptPath) {
        Start-Process powershell -Verb RunAs -ArgumentList "-NoProfile -ExecutionPolicy Bypass -File `"$scriptPath`"" -Wait
    } else {
        Start-Process powershell -Verb RunAs -ArgumentList "-NoProfile -ExecutionPolicy Bypass -Command `"$($MyInvocation.Line)`"" -Wait
    }
    exit
}

Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "  DragonRPA 사내 보안 인증서 및 스마트스크린 차단 해제" -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host ""

$tempDir = Join-Path $env:TEMP "DragonRPA"
if (-not (Test-Path $tempDir)) { New-Item -ItemType Directory -Path $tempDir -Force | Out-Null }
$cerPath = Join-Path $tempDir "DragonRPA_Root.cer"

# 인증서 다운로드
Write-Host "[1/3] 사내 보안 인증서 다운로드 중..." -ForegroundColor Yellow
try {
    [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
    $wc = New-Object System.Net.WebClient
    $wc.DownloadFile("https://dragonrpa.github.io/ImageScan/DragonRPA_Root.cer", $cerPath)
    Write-Host " -> 인증서 다운로드 성공" -ForegroundColor Green
} catch {
    Write-Host " -> 다운로드 실패, 로컬 경로 탐색..." -ForegroundColor Gray
}

$localCer = Join-Path (Get-Location).Path "DragonRPA_Root.cer"
if (-not (Test-Path $cerPath) -and (Test-Path $localCer)) {
    $cerPath = $localCer
}

if (-not (Test-Path $cerPath)) {
    Write-Host "❌ DragonRPA_Root.cer 파일을 찾을 수 없습니다. 인터넷 연결을 확인하세요." -ForegroundColor Red
    Read-Host "Enter 키를 누르십시오..."
    exit 1
}

# 2. 신뢰할 수 있는 루트 및 게시자 저장소 등록
Write-Host "[2/3] Windows 신뢰할 수 있는 루트 인증 기관 및 게시자에 등록 중..." -ForegroundColor Yellow
try {
    Import-Certificate -FilePath $cerPath -CertStoreLocation "Cert:\LocalMachine\Root" | Out-Null
    Import-Certificate -FilePath $cerPath -CertStoreLocation "Cert:\LocalMachine\TrustedPublisher" | Out-Null
    Write-Host " -> ✅ LocalMachine Root 및 TrustedPublisher 등록 완료!" -ForegroundColor Green
} catch {
    Write-Host " -> ⚠️ LocalMachine 등록 실패, CurrentUser 저장소에 등록합니다." -ForegroundColor Yellow
    Import-Certificate -FilePath $cerPath -CertStoreLocation "Cert:\CurrentUser\Root" | Out-Null
    Import-Certificate -FilePath $cerPath -CertStoreLocation "Cert:\CurrentUser\TrustedPublisher" | Out-Null
    Write-Host " -> ✅ CurrentUser 저장소 등록 완료!" -ForegroundColor Green
}

# 3. 에이전트 실행파일 Unblock-File
Write-Host "[3/3] 에이전트 다운로드 보안 차단(Mark-of-the-Web) 해제..." -ForegroundColor Yellow
$currentDir = (Get-Location).Path
$targetFiles = @(
    (Join-Path $currentDir "UBUS_DragonRPA_Agent.exe"),
    (Join-Path $currentDir "zebra-agent.exe")
)
foreach ($f in $targetFiles) {
    if (Test-Path $f) {
        Unblock-File -Path $f -ErrorAction SilentlyContinue
        Write-Host " -> ✅ 차단 해제 완료: $(Split-Path $f -Leaf)" -ForegroundColor Green
    }
}

Write-Host ""
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "  ✅ 보안 인증서 등록이 성공적으로 완료되었습니다!" -ForegroundColor Green
Write-Host "  이제 스마트스크린 경고 없이 에이전트가 안전하게 실행됩니다." -ForegroundColor Green
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host ""
Read-Host "완료되었습니다. 창을 닫으려면 Enter 키를 누르십시오..."
