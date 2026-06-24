; CCB-Wanding v2 merged installer - reads ONLY from staging\ (see build-wanding.ps1).
Unicode true
!include "MUI2.nsh"
!include "LogicLib.nsh"
!include "FileFunc.nsh"

!ifndef APP_VERSION
  !define APP_VERSION "1.0.0"
!endif

!define APPNAME "CCB-Wanding"
!define COMPANYNAME "CCB-Wanding"
!define DESCRIPTION "CCB-Wanding + AionUI merged WanD desktop"
!define STARTMENU_FOLDER "CCB-Wanding"
!define MUI_ICON "staging\ccb.ico"
!define MUI_UNICON "staging\ccb.ico"

Name "${APPNAME} ${APP_VERSION}"
OutFile "CCB-Wanding-${APP_VERSION}.exe"
Icon "staging\ccb.ico"
UninstallIcon "staging\ccb.ico"
InstallDir "$LOCALAPPDATA\Programs\CCB-Wanding"
InstallDirRegKey HKCU "Software\${COMPANYNAME}\${APPNAME}" "InstallDir"
RequestExecutionLevel user

!define MUI_ABORTWARNING
Var INSTALL_LOG
Var REPAIR_ORPHAN

!macro WriteInstallLog MESSAGE
    ClearErrors
    FileOpen $9 "$INSTALL_LOG" a
    IfErrors +3
    FileWrite $9 "${MESSAGE}$\r$\n"
    FileClose $9
!macroend

!macro CleanOwnedInstallTree ROOT
    Delete "${ROOT}\ccb.ico"
    Delete "${ROOT}\ccb-wanding.cmd"
    Delete "${ROOT}\ccb-diagnose.cmd"
    Delete "${ROOT}\ccb-launch-aionui.cmd"
    Delete "${ROOT}\ccb-wanding-versions.cmd"
    Delete "${ROOT}\ccb-check-install.cmd"
    Delete "${ROOT}\ccb-verify-update.cmd"
    Delete "${ROOT}\install-health-manifest.json"
    Delete "${ROOT}\uninstall.exe"
    Delete "${ROOT}\.ccb-wanding-install-root"
    Delete "${ROOT}\AionUiLauncher.exe"
    RMDir /r "${ROOT}\AionUi"
    RMDir /r "${ROOT}\dist"
    RMDir /r "${ROOT}\vendor"
    RMDir /r "${ROOT}\scripts"
    RMDir /r "${ROOT}\seed"
    RMDir /r "${ROOT}\bin"
!macroend

Function .onInit
    StrCpy $REPAIR_ORPHAN "0"
    ${GetParameters} $R0
    ${GetOptions} $R0 "/REPAIR=1" $R1
    IfErrors +2
      StrCpy $REPAIR_ORPHAN "1"
FunctionEnd

!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_INSTFILES
!insertmacro MUI_PAGE_FINISH
!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES
!insertmacro MUI_LANGUAGE "SimpChinese"

Section "-Preserve User Configuration"
    CreateDirectory "$LOCALAPPDATA\CCB-Wanding\logs"
    StrCpy $INSTALL_LOG "$LOCALAPPDATA\CCB-Wanding\logs\install-v2-${APP_VERSION}.log"
    FileOpen $9 "$INSTALL_LOG" w
    FileWrite $9 "CCB-Wanding v2 installer ${APP_VERSION}$\r$\n"
    FileWrite $9 "InstallDir=$INSTDIR$\r$\n"
    FileClose $9
    !insertmacro WriteInstallLog "Preserve user configuration started."

    IfFileExists "$LOCALAPPDATA\CCB-Wanding\.claude\*.*" backup_config check_default_config
backup_config:
    !insertmacro WriteInstallLog "Backing up existing .claude config."
    CreateDirectory "$LOCALAPPDATA\CCB-Wanding\backup-before-v2-${APP_VERSION}"
    CopyFiles /SILENT "$LOCALAPPDATA\CCB-Wanding\.claude" "$LOCALAPPDATA\CCB-Wanding\backup-before-v2-${APP_VERSION}"
check_default_config:
    CreateDirectory "$LOCALAPPDATA\CCB-Wanding\.claude"
    IfFileExists "$LOCALAPPDATA\CCB-Wanding\.claude\settings.json" config_done
    SetOutPath "$LOCALAPPDATA\CCB-Wanding\.claude"
    File "staging\resources\settings\settings.json"
config_done:
    CreateDirectory "$LOCALAPPDATA\CCB-Wanding\.claude\commands"
    SetOutPath "$LOCALAPPDATA\CCB-Wanding\.claude\commands"
    File "staging\resources\commands\modo.md"
    File /nonfatal /r "staging\resources\commands\*.*"
    IfFileExists "$LOCALAPPDATA\CCB-Wanding\.claude\agents\quotation-agent.md" agents_done
    CreateDirectory "$LOCALAPPDATA\CCB-Wanding\.claude\agents"
    SetOutPath "$LOCALAPPDATA\CCB-Wanding\.claude\agents"
    File /r "staging\seed\agents\*.*"
agents_done:
    IfFileExists "$APPDATA\AionUi\aionui\org-server.json" org_done
    CreateDirectory "$APPDATA\AionUi\aionui"
    SetOutPath "$APPDATA\AionUi\aionui"
    File "staging\resources\org-server.json"
org_done:
    !insertmacro WriteInstallLog "Preserve user configuration finished."
SectionEnd

Section "-Main Installation (v2 merged)"
    !insertmacro WriteInstallLog "Main installation started."
    CreateDirectory "$INSTDIR"

    ; Refuse to claim an arbitrary non-empty directory as the install root.
    ; Orphan/partial trees (hot zip without full NSIS) are repairable — see §17.4.
    IfFileExists "$INSTDIR\.ccb-wanding-install-root" install_root_ok check_orphan_or_empty
check_orphan_or_empty:
    IfFileExists "$INSTDIR\dist\cli.js" orphan_candidate
    IfFileExists "$INSTDIR\ccb-launch-aionui.cmd" orphan_candidate
    IfFileExists "$INSTDIR\AionUi\AionUi.exe" orphan_candidate
    IfFileExists "$INSTDIR\vendor\bun\bun.exe" orphan_candidate
    IfFileExists "$INSTDIR\scripts\run-wanding-bootstrap.ps1" orphan_candidate
    Goto install_root_ok  ; No CCB footprint found — directory is clear, proceed
orphan_candidate:
    StrCmp $REPAIR_ORPHAN "1" orphan_auto_clean orphan_prompt
orphan_prompt:
    MessageBox MB_ICONEXCLAMATION|MB_YESNO "检测到不完整的 CCB-Wanding 安装（缺少安装标记）。$\r$\n$\r$\n是否清理残留并继续安装？$\r$\n（%LOCALAPPDATA%\CCB-Wanding\.claude 用户配置不会删除）" IDYES orphan_auto_clean IDNO install_root_blocked
orphan_auto_clean:
    !insertmacro WriteInstallLog "Repairing orphan install tree at $INSTDIR"
    !insertmacro CleanOwnedInstallTree "$INSTDIR"
    Goto install_root_ok
install_root_blocked:
    !insertmacro WriteInstallLog "Blocked install into non-empty unmarked directory: $INSTDIR"
    MessageBox MB_ICONSTOP|MB_OK "目标目录已经存在且不是 CCB-Wanding 安装目录：$\r$\n$INSTDIR$\r$\n$\r$\n请选择空目录，或先卸载旧版 CCB-Wanding。$\r$\n$\r$\n若是半截安装，可运行：$\r$\nccb-installer\scripts\repair-wanding-install-dir.ps1 -InstallDir $\"$INSTDIR$\""
    Abort
install_root_ok:
    WriteRegStr HKCU "Software\${COMPANYNAME}\${APPNAME}" "InstallDir" "$INSTDIR"
    FileOpen $9 "$INSTDIR\.ccb-wanding-install-root" w
    FileWrite $9 "${APPNAME} ${APP_VERSION}$\r$\n"
    FileClose $9

    ; Clear owned component directories before copying new payload.
    ; User config under $LOCALAPPDATA\CCB-Wanding\.claude is preserved above.
    RMDir /r "$INSTDIR\AionUi"
    RMDir /r "$INSTDIR\dist"
    RMDir /r "$INSTDIR\vendor"
    RMDir /r "$INSTDIR\scripts"
    RMDir /r "$INSTDIR\seed"

    SetOutPath "$INSTDIR"
    File "staging\ccb.ico"
    File "staging\ccb-wanding.cmd"
    File "staging\ccb-diagnose.cmd"
    File "staging\ccb-launch-aionui.cmd"
    File "staging\ccb-wanding-versions.cmd"
    File "staging\ccb-check-install.cmd"
    File "staging\ccb-verify-update.cmd"
    File "staging\install-health-manifest.json"
    File "staging\AionUiLauncher.exe"

    SetOutPath "$INSTDIR\AionUi"
    File /r /x "*.map" /x "*.d.ts" /x "examples" "staging\AionUi\*.*"

    SetOutPath "$INSTDIR\dist"
    File /r "staging\dist\*.*"

    SetOutPath "$INSTDIR\vendor"
    File /r "staging\vendor\*.*"

    SetOutPath "$INSTDIR\bin"
    File "staging\bin\*.*"

    SetOutPath "$INSTDIR\scripts"
    File /r "staging\scripts\*.*"

    SetOutPath "$INSTDIR\seed\agents"
    File /r "staging\seed\agents\*.*"

    SetOutPath "$INSTDIR\seed"
    File "staging\seed\config-ship-manifest.json"

    SetOutPath "$INSTDIR\seed\skills\ccb-subagent-gate"
    File /r /x "tests" "staging\seed\skills\ccb-subagent-gate\*.*"

    !insertmacro WriteInstallLog "Files copied from staging."

    !insertmacro WriteInstallLog "Running run-wanding-bootstrap.ps1 (Full)."
    nsExec::ExecToLog '"$SYSDIR\WindowsPowerShell\v1.0\powershell.exe" -NoProfile -ExecutionPolicy Bypass -File "$INSTDIR\scripts\run-wanding-bootstrap.ps1" -InstallDir "$INSTDIR" -Mode Full -LogFile "$LOCALAPPDATA\CCB-Wanding\logs\install-bootstrap-${APP_VERSION}.log"'
    Pop $0
    !insertmacro WriteInstallLog "run-wanding-bootstrap exit: $0"
    StrCmp $0 "0" bootstrap_ok
      MessageBox MB_ICONEXCLAMATION|MB_OK "CCB-Wanding setup completed copying files, but bootstrap returned exit code $0. Run Start Menu > CCB-Wanding > Check Install before launching."
    bootstrap_ok:

    IfFileExists "$INSTDIR\vendor\windows-terminal\*.*" run_wt skip_wt
run_wt:
    !insertmacro WriteInstallLog "Running install-windows-terminal.ps1 (nonfatal)."
    nsExec::ExecToLog '"$SYSDIR\WindowsPowerShell\v1.0\powershell.exe" -NoProfile -ExecutionPolicy Bypass -File "$INSTDIR\scripts\install-windows-terminal.ps1" -PackageDir "$INSTDIR\vendor\windows-terminal" -LogFile "$LOCALAPPDATA\CCB-Wanding\logs\install-windows-terminal-v2-${APP_VERSION}.log" -AllowWinget'
    Pop $0
    !insertmacro WriteInstallLog "install-windows-terminal exit: $0"
skip_wt:

    WriteUninstaller "$INSTDIR\uninstall.exe"
    WriteRegStr HKCU "Software\${COMPANYNAME}\${APPNAME}" "" "${DESCRIPTION}"
    WriteRegStr HKCU "Software\${COMPANYNAME}\${APPNAME}" "Version" "${APP_VERSION}"

    ; Desktop + start menu -> AionUiLauncher.exe (no terminal flash; wraps ccb-launch-aionui.cmd)
    SetOutPath "$INSTDIR"
    CreateShortCut "$DESKTOP\${APPNAME}.lnk" "$INSTDIR\AionUiLauncher.exe" "" "$INSTDIR\ccb.ico"
    !insertmacro WriteInstallLog "Desktop shortcut created: $DESKTOP\${APPNAME}.lnk -> $INSTDIR\AionUiLauncher.exe"
    CreateDirectory "$SMPROGRAMS\${STARTMENU_FOLDER}"
    CreateShortCut "$SMPROGRAMS\${STARTMENU_FOLDER}\${APPNAME}.lnk" "$INSTDIR\AionUiLauncher.exe" "" "$INSTDIR\ccb.ico"
    CreateShortCut "$SMPROGRAMS\${STARTMENU_FOLDER}\Check Install.lnk" "$INSTDIR\ccb-check-install.cmd" "" "$INSTDIR\ccb.ico"
    CreateShortCut "$SMPROGRAMS\${STARTMENU_FOLDER}\检查更新 / 版本选择.lnk" "$INSTDIR\ccb-wanding-versions.cmd" "" "$INSTDIR\ccb.ico"
    CreateShortCut "$SMPROGRAMS\${STARTMENU_FOLDER}\CCB Diagnose.lnk" "$INSTDIR\ccb-diagnose.cmd" "" "$INSTDIR\ccb.ico"
    CreateShortCut "$SMPROGRAMS\${STARTMENU_FOLDER}\Uninstall ${APPNAME}.lnk" "$INSTDIR\uninstall.exe"

    !insertmacro WriteInstallLog "Main installation finished."

    ; Silent install (triggered from About-page one-click): auto-relaunch AionUI when done.
    ; Interactive install shows the normal Finish page instead.
    IfSilent 0 finish_interactive
    !insertmacro WriteInstallLog "Silent install: launching AionUiLauncher.exe"
    Exec '"$INSTDIR\AionUiLauncher.exe"'
finish_interactive:
SectionEnd

Section "Uninstall"
    IfFileExists "$INSTDIR\.ccb-wanding-install-root" uninstall_owned uninstall_known
uninstall_owned:
    RMDir /r "$INSTDIR"
    Goto uninstall_shortcuts
uninstall_known:
    !insertmacro CleanOwnedInstallTree "$INSTDIR"
    RMDir "$INSTDIR"
uninstall_shortcuts:
    Delete "$DESKTOP\${APPNAME}.lnk"
    Delete "$SMPROGRAMS\${STARTMENU_FOLDER}\${APPNAME}.lnk"
    Delete "$SMPROGRAMS\${STARTMENU_FOLDER}\Check Install.lnk"
    Delete "$SMPROGRAMS\${STARTMENU_FOLDER}\检查更新 / 版本选择.lnk"
    Delete "$SMPROGRAMS\${STARTMENU_FOLDER}\CCB Diagnose.lnk"
    Delete "$SMPROGRAMS\${STARTMENU_FOLDER}\Uninstall ${APPNAME}.lnk"
    RMDir "$SMPROGRAMS\${STARTMENU_FOLDER}"
    DeleteRegKey HKCU "Software\${COMPANYNAME}\${APPNAME}"
SectionEnd

VIProductVersion "${APP_VERSION}.0"
VIAddVersionKey "ProductName" "${APPNAME}"
VIAddVersionKey "CompanyName" "${COMPANYNAME}"
VIAddVersionKey "FileDescription" "${DESCRIPTION}"
VIAddVersionKey "FileVersion" "${APP_VERSION}"
VIAddVersionKey "ProductVersion" "${APP_VERSION}"
