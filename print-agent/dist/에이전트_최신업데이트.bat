@echo off
chcp 65001 > nul
title UBUS DragonRPA 에이전트 원클릭 업데이트 도구

echo ========================================================
echo   UBUS DragonRPA Agent 최신 버전 다운로드 및 교체 중...
echo ========================================================
echo.

:: 1. 기존 실행 중인 에이전트 안전 종료
echo [1/4] 실행 중인 에이전트 종료 중...
taskkill /f /im UBUS_DragonRPA_Agent.exe /im zebra-agent.exe > nul 2>&1
timeout /t 1 /nobreak > nul

:: 2. 임시 폴더 생성
if not exist "%~dp0temp" mkdir "%~dp0temp"

:: 3. GitHub에서 최신 바이너리 및 사내 보안 인증서 안전 다운로드
echo [2/5] GitHub 최신 배포 바이너리 다운로드 중...
powershell -NoProfile -ExecutionPolicy Bypass -Command "[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; (New-Object System.Net.WebClient).DownloadFile('https://dragonrpa.github.io/ImageScan/UBUS_DragonRPA_Agent.exe', '%~dp0temp\agent-update.exe')"

if not exist "%~dp0temp\agent-update.exe" (
  echo ⚠️ 다운로드 실패! 백업 링크로 재시도합니다...
  powershell -NoProfile -ExecutionPolicy Bypass -Command "[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; (New-Object System.Net.WebClient).DownloadFile('https://raw.githubusercontent.com/DragonRPA/ImageScan/main/print-agent/dist/UBUS_DragonRPA_Agent.exe', '%~dp0temp\agent-update.exe')"
)

if not exist "%~dp0temp\agent-update.exe" (
  echo ❌ 업데이트 다운로드에 실패하였습니다. 인터넷 연결을 확인하세요.
  pause
  exit /b 1
)

:: 4. 사내 코드 서명 인증서 동기화 및 신뢰 등록
echo [3/5] 사내 보안 인증서(DragonRPA_Root.cer) 동기화 및 신뢰 등록...
powershell -NoProfile -ExecutionPolicy Bypass -Command "[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; (New-Object System.Net.WebClient).DownloadFile('https://dragonrpa.github.io/ImageScan/DragonRPA_Root.cer', '%~dp0DragonRPA_Root.cer')" > nul 2>&1
if exist "%~dp0DragonRPA_Root.cer" (
  certutil -addstore -f "Root" "%~dp0DragonRPA_Root.cer" > nul 2>&1
  certutil -addstore -f "TrustedPublisher" "%~dp0DragonRPA_Root.cer" > nul 2>&1
)

:: 5. Windows Defender / SmartScreen 보안 차단 해제 (Unblock-File)
echo [4/5] Windows 보안 차단 플래그 자동 해제 (Unblock-File)...
powershell -NoProfile -Command "Unblock-File -Path '%~dp0temp\agent-update.exe' -ErrorAction SilentlyContinue"

:: 6. 파일 교체 및 실행
echo [5/5] 최신 바이너리 교체 및 자동 재실행...
copy /y "%~dp0temp\agent-update.exe" "%~dp0UBUS_DragonRPA_Agent.exe" > nul
copy /y "%~dp0temp\agent-update.exe" "%~dp0zebra-agent.exe" > nul
del /f /q "%~dp0temp\agent-update.exe" > nul
powershell -NoProfile -Command "Unblock-File -Path '%~dp0UBUS_DragonRPA_Agent.exe' -ErrorAction SilentlyContinue"

:: 6. 에이전트 실행
start "" "%~dp0UBUS_DragonRPA_Agent.exe"

echo.
echo ========================================================
echo  ✅ 에이전트 최신 버전 업데이트 및 실행이 완료되었습니다!
echo ========================================================
timeout /t 2 > nul
