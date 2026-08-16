# sign-agent.ps1
# 에이전트 바이너리에 디지털 서명 날인

param(
    [string]$targetFile = ""
)

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
if (-not $scriptDir) { $scriptDir = (Get-Location).Path }
$pfxPath = Join-Path $scriptDir "certs\DragonRPA_CodeSign.pfx"
$pfxPass = "DragonRPA@2026"

if (-not (Test-Path $pfxPath)) {
    Write-Host "⚠️ PFX 인증서가 없습니다. 먼저 certs\create-codesign-cert.ps1을 실행합니다." -ForegroundColor Yellow
    & (Join-Path $scriptDir "certs\create-codesign-cert.ps1")
}

$filesToSign = @()
if ($targetFile -and (Test-Path $targetFile)) {
    $filesToSign += $targetFile
} else {
    $distExe = Join-Path $scriptDir "dist\UBUS_DragonRPA_Agent.exe"
    $rootExe = Join-Path (Split-Path -Parent $scriptDir) "public\UBUS_DragonRPA_Agent.exe"
    if (Test-Path $distExe) { $filesToSign += $distExe }
    if (Test-Path $rootExe) { $filesToSign += $rootExe }
}

if ($filesToSign.Count -eq 0) {
    Write-Host "❌ 서명할 .exe 파일을 찾을 수 없습니다." -ForegroundColor Red
    exit 1
}

# .NET X509Certificate2 로드 (비밀번호 지정 및 Exportable 플래그)
$cert = New-Object System.Security.Cryptography.X509Certificates.X509Certificate2($pfxPath, $pfxPass, [System.Security.Cryptography.X509Certificates.X509KeyStorageFlags]::Exportable)

Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "  DragonRPA 에이전트 바이너리 디지털 서명 날인" -ForegroundColor Cyan
Write-Host ("  인증서: " + $cert.Subject + " (" + $cert.Thumbprint + ")") -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan

$timestampServers = @(
    "http://timestamp.digicert.com",
    "http://timestamp.sectigo.com",
    "http://tsa.starfieldtech.com"
)

foreach ($file in $filesToSign) {
    Write-Host ("🔏 서명 진행: " + $file) -ForegroundColor Yellow
    $signed = $false
    
    foreach ($ts in $timestampServers) {
        try {
            $sig = Set-AuthenticodeSignature -FilePath $file -Certificate $cert -TimestampServer $ts -HashAlgorithm SHA256 -ErrorAction Stop
            if ($sig.Status -eq "Valid" -or $sig.Status -eq "UnknownError") {
                Write-Host (" -> ✅ 서명 성공! (타임스탬프: " + $ts + ", 상태: " + $sig.Status + ")") -ForegroundColor Green
                $signed = $true
                break
            }
        } catch {
            Write-Host (" -> 타임스탬프 서버 " + $ts + " 연결 실패, 다음 서버 시도...") -ForegroundColor Gray
        }
    }
    
    if (-not $signed) {
        # 오프라인 타임스탬프 없이 기본 서명
        $sig = Set-AuthenticodeSignature -FilePath $file -Certificate $cert -HashAlgorithm SHA256
        Write-Host (" -> ⚠️ 타임스탬프 없이 로컬 서명 완료 (상태: " + $sig.Status + ")") -ForegroundColor Yellow
    }
}

Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "  ✅ 모든 실행 파일 디지털 서명 날인 완료!" -ForegroundColor Green
Write-Host "========================================================" -ForegroundColor Cyan
