@echo off
chcp 65001 >nul
echo [안내] 실행 중인 UBUS DragonRPA 에이전트 프로세스를 종료합니다...
taskkill /F /IM UBUS_DragonRPA_Agent.exe /T 2>nul
taskkill /F /IM zebra-agent.exe /T 2>nul
taskkill /F /IM node.exe /FI "WINDOWTITLE eq UBUS_DragonRPA*" 2>nul
echo [완료] 에이전트가 정상 종료되었습니다.
timeout /t 2 >nul
