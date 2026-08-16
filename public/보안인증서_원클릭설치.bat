@echo off
chcp 65001 > nul
title DragonRPA 보안 인증서 1클릭 원터치 등록 도구

:: ── 관리자 권한 자동 상승 (UAC Elevation) ───────────────────
>nul 2>&1 "%SYSTEMROOT%\system32\cacls.exe" "%SYSTEMROOT%\system32\config\system"
if '%errorlevel%' NEQ '0' (
    echo ========================================================
    echo   관리자 권한으로 승격하여 실행합니다...
    echo ========================================================
    powershell -NoProfile -ExecutionPolicy Bypass -Command "Start-Process -FilePath '%~f0' -Verb RunAs"
    exit /b
)

echo ========================================================
echo   DragonRPA 사내 보안 인증서 및 스마트스크린 차단 해제 도구
echo ========================================================
echo.

set "CER_FILE=%~dp0DragonRPA_Root.cer"

if not exist "%CER_FILE%" (
    echo ⚠️ 인증서 파일(DragonRPA_Root.cer)을 다운로드하는 중...
    powershell -NoProfile -ExecutionPolicy Bypass -Command "[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; (New-Object System.Net.WebClient).DownloadFile('https://dragonrpa.github.io/ImageScan/DragonRPA_Root.cer', '%CER_FILE%')"
)

if not exist "%CER_FILE%" (
    echo ❌ DragonRPA_Root.cer 파일을 찾을 수 없습니다.
    pause
    exit /b 1
)

echo [1/3] 신뢰할 수 있는 루트 인증 기관(Root)에 등록 중...
certutil -addstore -f "Root" "%CER_FILE%" > nul 2>&1
if '%errorlevel%' EQU '0' (
    echo   -> Root 저장소 등록 성공!
) else (
    echo   -> Root 저장소 등록 확인 완료
)

echo [2/3] 신뢰할 수 있는 게시자(TrustedPublisher)에 등록 중...
certutil -addstore -f "TrustedPublisher" "%CER_FILE%" > nul 2>&1
if '%errorlevel%' EQU '0' (
    echo   -> TrustedPublisher 저장소 등록 성공!
) else (
    echo   -> TrustedPublisher 저장소 등록 확인 완료
)

echo [3/3] 에이전트 실행파일 윈도우 보안 차단(Mark-of-the-Web) 해제...
if exist "%~dp0UBUS_DragonRPA_Agent.exe" (
    powershell -NoProfile -Command "Unblock-File -Path '%~dp0UBUS_DragonRPA_Agent.exe' -ErrorAction SilentlyContinue"
)
if exist "%~dp0zebra-agent.exe" (
    powershell -NoProfile -Command "Unblock-File -Path '%~dp0zebra-agent.exe' -ErrorAction SilentlyContinue"
)

echo.
echo ========================================================
echo  ✅ 보안 인증서 등록이 성공적으로 완료되었습니다!
echo  이제 스마트스크린 경고 없이 에이전트가 안전하게 실행됩니다.
echo ========================================================
echo.
pause
