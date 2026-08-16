# stop-agent.ps1
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
Write-Host "DragonRPA 에이전트 프로세스 종료 중..." -ForegroundColor Yellow
Stop-Process -Name "UBUS_DragonRPA_Agent" -Force -ErrorAction SilentlyContinue
Stop-Process -Name "zebra-agent" -Force -ErrorAction SilentlyContinue
Write-Host "✅ 에이전트가 안전하게 종료되었습니다." -ForegroundColor Green
Start-Sleep -Seconds 1
