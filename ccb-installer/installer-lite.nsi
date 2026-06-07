; CCB Lite Installer - NSIS Script
Unicode true
!include "MUI2.nsh"

!define APPNAME "CCB Lite"
!define COMPANYNAME "CCB"
!define DESCRIPTION "CCB Lite - 办公 AI 助手"
!define STARTMENU_FOLDER "CCB Lite"
!define VERSIONMAJOR 1
!define VERSIONMINOR 0
!define VERSIONBUILD 9
!define MUI_ICON "resources\ccb.ico"
!define MUI_UNICON "resources\ccb.ico"

Name "${APPNAME}"
OutFile "ccb-lite${VERSIONMAJOR}.${VERSIONMINOR}.${VERSIONBUILD}.exe"
Icon "resources\ccb.ico"
UninstallIcon "resources\ccb.ico"
InstallDir "$LOCALAPPDATA\Programs\CCB-Lite"
InstallDirRegKey HKCU "Software\${COMPANYNAME}\${APPNAME}" "InstallDir"
RequestExecutionLevel user

!define MUI_ABORTWARNING

!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_INSTFILES
!insertmacro MUI_PAGE_FINISH

!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES

!insertmacro MUI_LANGUAGE "SimpChinese"

; ===== Configuration preservation =====
Section "-Preserve User Configuration"
    ; Lite keeps a separate user configuration so it can be tested next to full CCB.
    IfFileExists "$LOCALAPPDATA\CCB-Lite\.claude\*.*" backup_existing_config check_default_config
backup_existing_config:
    CreateDirectory "$LOCALAPPDATA\CCB-Lite\backup-before-${VERSIONMAJOR}.${VERSIONMINOR}.${VERSIONBUILD}"
    CopyFiles /SILENT "$LOCALAPPDATA\CCB-Lite\.claude" "$LOCALAPPDATA\CCB-Lite\backup-before-${VERSIONMAJOR}.${VERSIONMINOR}.${VERSIONBUILD}"
check_default_config:
    CreateDirectory "$LOCALAPPDATA\CCB-Lite\.claude"
    IfFileExists "$LOCALAPPDATA\CCB-Lite\.claude\settings.json" config_done
    SetOutPath "$LOCALAPPDATA\CCB-Lite\.claude"
    File "resources\settings\settings.json"
config_done:
    ; Office command suite only. Lite focuses on personal/office use, so the
    ; developer-oriented /modo (TUI mode selector) is intentionally excluded.
    ; Always overwrite so users get the latest versions.
    CreateDirectory "$LOCALAPPDATA\CCB-Lite\.claude\commands"
    ; Drop the dev command if a previous Lite build had installed it.
    Delete "$LOCALAPPDATA\CCB-Lite\.claude\commands\modo.md"
    SetOutPath "$LOCALAPPDATA\CCB-Lite\.claude\commands"
    File /x "modo.md" "resources\commands\*.md"
SectionEnd

; ===== Runtime components =====
Section "Bun 运行时 (必需)" SecBun
    SectionIn RO
    SetOutPath "$INSTDIR\vendor\bun"
    File /r "vendor\bun\*.*"
SectionEnd

Section "ripgrep 文件搜索 (隐藏依赖)" SecRg
    SectionIn RO
    SetOutPath "$INSTDIR\vendor\ripgrep"
    File /r "vendor\ripgrep\*.*"
SectionEnd

Section "Git Bash (隐藏依赖)" SecGit
    SectionIn RO
    SetOutPath "$INSTDIR\vendor\git"
    File /r "vendor\git\*.*"
SectionEnd

Section "MCP / 办公工具服务器 (必需)" SecMcp
    SectionIn RO
    SetOutPath "$INSTDIR\vendor\mcp-servers"
    File /r "vendor\mcp-servers\*.*"
SectionEnd

; Install Windows Terminal so Lite gets the same dark "CCB" profile as full CCB.
; Without WT, fix-terminal-launcher.ps1 falls back to a plain (often light) console,
; which would make Lite look white while full CCB looks dark on the same machine.
Section "安装 Windows Terminal (推荐)" SecWindowsTerminal
    SetOutPath "$INSTDIR\vendor\windows-terminal"
    File /nonfatal "vendor\windows-terminal\*.*"
    SetOutPath "$INSTDIR\scripts"
    File "scripts\install-windows-terminal.ps1"
    nsExec::ExecToLog '"$SYSDIR\WindowsPowerShell\v1.0\powershell.exe" -NoProfile -ExecutionPolicy Bypass -File "$INSTDIR\scripts\install-windows-terminal.ps1" -PackageDir "$INSTDIR\vendor\windows-terminal" -AllowWinget'
    Pop $0
SectionEnd

Section "创建桌面快捷方式" SecDesk
    SetOutPath "$INSTDIR"
    CreateShortCut "$DESKTOP\${APPNAME}.lnk" "$INSTDIR\ccb-lite.cmd" "" "$INSTDIR\ccb.ico"
SectionEnd

Section "创建开始菜单快捷方式" SecStart
    CreateDirectory "$SMPROGRAMS\${STARTMENU_FOLDER}"
    SetOutPath "$INSTDIR"
    CreateShortCut "$SMPROGRAMS\${STARTMENU_FOLDER}\${APPNAME}.lnk" "$INSTDIR\ccb-lite.cmd" "" "$INSTDIR\ccb.ico"
    CreateShortCut "$SMPROGRAMS\${STARTMENU_FOLDER}\卸载 ${APPNAME}.lnk" "$INSTDIR\uninstall.exe"
SectionEnd

; ===== Installation =====
Section "-Main Installation"
    WriteRegStr HKCU "Software\${COMPANYNAME}\${APPNAME}" "InstallDir" "$INSTDIR"
    CreateDirectory "$INSTDIR"
    CreateDirectory "$INSTDIR\dist"
    CreateDirectory "$INSTDIR\vendor"
    CreateDirectory "$INSTDIR\vendor\bun"
    CreateDirectory "$INSTDIR\vendor\ripgrep\x64-win32"
    CreateDirectory "$INSTDIR\vendor\git\bin"
    CreateDirectory "$INSTDIR\vendor\git\mingw64\bin"
    CreateDirectory "$INSTDIR\vendor\git\usr\bin"

    SetOutPath "$INSTDIR"
    File "ccb-lite.cmd"
    File "resources\ccb.ico"

    SetOutPath "$INSTDIR\scripts"
    File "scripts\ensure-mcp-settings.ps1"
    File "scripts\fix-terminal-launcher.ps1"
    File "scripts\install-wt-fragment.ps1"
    File "scripts\install-windows-terminal.ps1"
    File "scripts\launch-ccb.ps1"
    File "scripts\patch-i18n.ps1"
    File "scripts\normalize-i18n-literals.mjs"
    File "scripts\ccb-recent.ps1"
    File "scripts\ccb-diagnose.ps1"
    File "scripts\ccb-update-info.ps1"
    nsExec::ExecToLog '"$SYSDIR\WindowsPowerShell\v1.0\powershell.exe" -NoProfile -ExecutionPolicy Bypass -File "$INSTDIR\scripts\ensure-mcp-settings.ps1" -InstallDir "$INSTDIR" -ConfigDir "$LOCALAPPDATA\CCB-Lite\.claude"'
    Pop $0
    nsExec::ExecToLog '"$SYSDIR\WindowsPowerShell\v1.0\powershell.exe" -NoProfile -ExecutionPolicy Bypass -File "$INSTDIR\scripts\install-wt-fragment.ps1"'
    Pop $0
    nsExec::ExecToLog '"$SYSDIR\WindowsPowerShell\v1.0\powershell.exe" -NoProfile -ExecutionPolicy Bypass -File "$INSTDIR\scripts\fix-terminal-launcher.ps1" -Variant Lite -NoPrompt'
    Pop $0

    SetOutPath "$INSTDIR\dist"
    File /r /x "loadAgentsDir-head-test.js" /x "loadAgentsDir-test108.js" "dist\*.*"

    WriteUninstaller "$INSTDIR\uninstall.exe"
    WriteRegStr HKCU "Software\${COMPANYNAME}\${APPNAME}" "" "${DESCRIPTION}"
    WriteRegStr HKCU "Software\${COMPANYNAME}\${APPNAME}" "Version" "${VERSIONMAJOR}.${VERSIONMINOR}.${VERSIONBUILD}"
SectionEnd

; ===== Uninstall =====
Section "Uninstall"
    RMDir /r "$INSTDIR"
    Delete "$DESKTOP\${APPNAME}.lnk"
    Delete "$SMPROGRAMS\${STARTMENU_FOLDER}\${APPNAME}.lnk"
    Delete "$SMPROGRAMS\${STARTMENU_FOLDER}\卸载 ${APPNAME}.lnk"
    RMDir "$SMPROGRAMS\${STARTMENU_FOLDER}"
    DeleteRegKey HKCU "Software\${COMPANYNAME}\${APPNAME}"
    ; Preserve "$LOCALAPPDATA\CCB-Lite\.claude" user settings and backups on uninstall.
SectionEnd

; ===== Version Info =====
VIProductVersion "${VERSIONMAJOR}.${VERSIONMINOR}.${VERSIONBUILD}.0"
VIAddVersionKey "ProductName" "${APPNAME}"
VIAddVersionKey "CompanyName" "${COMPANYNAME}"
VIAddVersionKey "LegalCopyright" "Copyright (c) ${COMPANYNAME}"
VIAddVersionKey "FileDescription" "${DESCRIPTION}"
VIAddVersionKey "FileVersion" "${VERSIONMAJOR}.${VERSIONMINOR}.${VERSIONBUILD}"
VIAddVersionKey "ProductVersion" "${VERSIONMAJOR}.${VERSIONMINOR}.${VERSIONBUILD}"
