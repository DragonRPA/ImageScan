@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo.
echo  ================================================
echo   UBUS DragonRPA Agent 시작 중...
echo   브라우저 UI: http://127.0.0.1:9988
echo  ================================================
echo.
UBUS_DragonRPA_Agent.exe
echo.
echo ================================================
echo  에이전트가 종료되었습니다.
if exist agent-crash.log (
    echo  오류 로그가 생성되었습니다: agent-crash.log
    echo  내용:
    echo ------------------------------------------------
    type agent-crash.log
    echo ------------------------------------------------
)
echo  계속하려면 아무 키나 누르세요...
pause >nul
