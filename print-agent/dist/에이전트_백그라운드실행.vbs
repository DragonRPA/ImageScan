Set WshShell = CreateObject("WScript.Shell")
Dim currentDir
currentDir = CreateObject("Scripting.FileSystemObject").GetParentFolderName(WScript.ScriptFullName)
WshShell.CurrentDirectory = currentDir

' 0 = 완전 숨김 모드 (검은 콘솔창 안 뜸), False = 비동기 백그라운드 실행
WshShell.Run "UBUS_DragonRPA_Agent.exe", 0, False
Set WshShell = Nothing
