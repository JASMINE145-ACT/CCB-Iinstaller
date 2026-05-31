; CCB Installer - NSIS Script
Unicode true
!include "MUI2.nsh"

!define APPNAME "CCB"
!define COMPANYNAME "CCB"
!define DESCRIPTION "Claude Code Bundle - AI 编程助手"
!define STARTMENU_FOLDER "CCB (Claude Code Best)"
!define VERSIONMAJOR 1
!define VERSIONMINOR 0
!define VERSIONBUILD 9
!define MUI_ICON "resources\ccb.ico"
!define MUI_UNICON "resources\ccb.ico"

Name "${APPNAME}"
OutFile "CCB-Setup-${VERSIONMAJOR}.${VERSIONMINOR}.${VERSIONBUILD}.exe"
Icon "resources\ccb.ico"
UninstallIcon "resources\ccb.ico"
InstallDir "$LOCALAPPDATA\Programs\CCB"
InstallDirRegKey HKCU "Software\${COMPANYNAME}\${APPNAME}" "InstallDir"
RequestExecutionLevel user

!define MUI_ABORTWARNING

!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_COMPONENTS
!insertmacro MUI_PAGE_INSTFILES
!insertmacro MUI_PAGE_FINISH

!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES

!insertmacro MUI_LANGUAGE "SimpChinese"

; ===== Configuration preservation =====
Section "-Preserve User Configuration"
    ; Keep user configuration outside $INSTDIR. On upgrade, save a recovery
    ; copy before changing any installed application files.
    IfFileExists "$LOCALAPPDATA\CCB\.claude\*.*" backup_existing_config check_default_config
backup_existing_config:
    CreateDirectory "$LOCALAPPDATA\CCB\backup-before-${VERSIONMAJOR}.${VERSIONMINOR}.${VERSIONBUILD}"
    CopyFiles /SILENT "$LOCALAPPDATA\CCB\.claude" "$LOCALAPPDATA\CCB\backup-before-${VERSIONMAJOR}.${VERSIONMINOR}.${VERSIONBUILD}"
check_default_config:
    CreateDirectory "$LOCALAPPDATA\CCB\.claude"
    IfFileExists "$LOCALAPPDATA\CCB\.claude\settings.json" config_done
    SetOutPath "$LOCALAPPDATA\CCB\.claude"
    File "resources\settings\settings.json"
config_done:
    ; Built-in slash commands - always overwrite so users get the latest versions.
    CreateDirectory "$LOCALAPPDATA\CCB\.claude\commands"
    SetOutPath "$LOCALAPPDATA\CCB\.claude\commands"
    File "resources\commands\modo.md"
SectionEnd

; ===== Components =====
Section "Bun 运行时 (必需)" SecBun
    SectionIn RO
    SetOutPath "$INSTDIR\vendor\bun"
    File /r "vendor\bun\*.*"
SectionEnd

Section "ripgrep (必需)" SecRg
    SectionIn RO
    SetOutPath "$INSTDIR\vendor\ripgrep"
    File /r "vendor\ripgrep\*.*"
SectionEnd

Section "Git Bash (必需)" SecGit
    SectionIn RO
    SetOutPath "$INSTDIR\vendor\git"
    File /r "vendor\git\*.*"
SectionEnd

Section "MCP 服务器 (必需)" SecMcp
    SectionIn RO
    SetOutPath "$INSTDIR\vendor\mcp-servers"
    File /r "vendor\mcp-servers\*.*"
SectionEnd

Section "安装 Windows Terminal (推荐)" SecWindowsTerminal
    SetOutPath "$INSTDIR\vendor\windows-terminal"
    File /nonfatal "vendor\windows-terminal\*.*"
    SetOutPath "$INSTDIR\scripts"
    File "scripts\install-windows-terminal.ps1"
    File "scripts\launch-ccb.ps1"
    File "scripts\patch-i18n.ps1"
    File "scripts\normalize-i18n-literals.mjs"
    ExecWait 'powershell.exe -NoProfile -ExecutionPolicy Bypass -File "$INSTDIR\scripts\install-windows-terminal.ps1" -PackageDir "$INSTDIR\vendor\windows-terminal" -AllowWinget'
SectionEnd

Section "创建桌面快捷方式" SecDesk
    SectionIn RO
    SetOutPath "$INSTDIR"
    CreateShortCut "$DESKTOP\${APPNAME}.lnk" "$INSTDIR\ccb.cmd" "" "$INSTDIR\ccb.ico"
SectionEnd

Section /o "桌面附加快捷方式（平铺/安全/文本模式）" SecDeskModes
    SetOutPath "$INSTDIR"
    CreateShortCut "$DESKTOP\${APPNAME} 平铺模式.lnk" "$INSTDIR\ccb-flat.cmd" "" "$INSTDIR\ccb.ico"
    CreateShortCut "$DESKTOP\${APPNAME} 安全模式.lnk" "$INSTDIR\ccb-safe.cmd" "" "$INSTDIR\ccb.ico"
    CreateShortCut "$DESKTOP\${APPNAME} 文本模式.lnk" "$INSTDIR\ccb-text.cmd" "" "$INSTDIR\ccb.ico"
SectionEnd

Section "创建开始菜单快捷方式" SecStart
    SectionIn RO
    CreateDirectory "$SMPROGRAMS\${STARTMENU_FOLDER}"
    SetOutPath "$INSTDIR"
    CreateShortCut "$SMPROGRAMS\${STARTMENU_FOLDER}\${APPNAME}.lnk" "$INSTDIR\ccb.cmd" "" "$INSTDIR\ccb.ico"
    CreateShortCut "$SMPROGRAMS\${STARTMENU_FOLDER}\${APPNAME} 平铺模式.lnk" "$INSTDIR\ccb-flat.cmd" "" "$INSTDIR\ccb.ico"
    CreateShortCut "$SMPROGRAMS\${STARTMENU_FOLDER}\${APPNAME} 诊断.lnk" "$INSTDIR\ccb-diagnose.cmd" "" "$INSTDIR\ccb.ico"
    CreateShortCut "$SMPROGRAMS\${STARTMENU_FOLDER}\${APPNAME} 终端修复.lnk" "$INSTDIR\ccb-fix-terminal.cmd" "" "$INSTDIR\ccb.ico"
    CreateShortCut "$SMPROGRAMS\${STARTMENU_FOLDER}\${APPNAME} 安全模式.lnk" "$INSTDIR\ccb-safe.cmd" "" "$INSTDIR\ccb.ico"
    CreateShortCut "$SMPROGRAMS\${STARTMENU_FOLDER}\${APPNAME} 文本模式.lnk" "$INSTDIR\ccb-text.cmd" "" "$INSTDIR\ccb.ico"
    CreateShortCut "$SMPROGRAMS\${STARTMENU_FOLDER}\卸载 ${APPNAME}.lnk" "$INSTDIR\uninstall.exe"
SectionEnd

Section /o "添加右键菜单 (可选)" SecContext
    WriteRegStr HKCU "Software\Classes\Directory\shell\CCB" "" "「用 CCB 打开」"
    WriteRegStr HKCU "Software\Classes\Directory\shell\CCB" "Icon" "$INSTDIR\ccb.ico"
    WriteRegStr HKCU "Software\Classes\Directory\shell\CCB\command" "" '"$INSTDIR\ccb.cmd" "%V"'

    WriteRegStr HKCU "Software\Classes\*\shell\CCB" "" "「用 CCB 打开」"
    WriteRegStr HKCU "Software\Classes\*\shell\CCB" "Icon" "$INSTDIR\ccb.ico"
    WriteRegStr HKCU "Software\Classes\*\shell\CCB\command" "" '"$INSTDIR\ccb.cmd" "%1"'
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
    File "ccb.cmd"
    File "ccb-diagnose.cmd"
    File "ccb-fix-terminal.cmd"
    File "ccb-flat.cmd"
    File "ccb-safe.cmd"
    File "ccb-text.cmd"
    File "resources\ccb.ico"

    SetOutPath "$INSTDIR\scripts"
    File "scripts\ensure-mcp-settings.ps1"
    File "scripts\fix-terminal-launcher.ps1"
    File "scripts\install-wt-fragment.ps1"
    File "scripts\install-windows-terminal.ps1"
    File "scripts\launch-ccb.ps1"
    File "scripts\patch-i18n.ps1"
    File "scripts\normalize-i18n-literals.mjs"
    ExecWait 'powershell.exe -NoProfile -ExecutionPolicy Bypass -File "$INSTDIR\scripts\ensure-mcp-settings.ps1" -InstallDir "$INSTDIR" -ConfigDir "$LOCALAPPDATA\CCB\.claude"'
    ExecWait 'powershell.exe -NoProfile -ExecutionPolicy Bypass -File "$INSTDIR\scripts\install-wt-fragment.ps1"'
    ExecWait 'powershell.exe -NoProfile -ExecutionPolicy Bypass -File "$INSTDIR\scripts\fix-terminal-launcher.ps1" -NoPrompt'

    SetOutPath "$INSTDIR\dist"
    File /r "dist\*.*"

    WriteUninstaller "$INSTDIR\uninstall.exe"
    WriteRegStr HKCU "Software\${COMPANYNAME}\${APPNAME}" "" "${DESCRIPTION}"
    WriteRegStr HKCU "Software\${COMPANYNAME}\${APPNAME}" "Version" "${VERSIONMAJOR}.${VERSIONMINOR}.${VERSIONBUILD}"
SectionEnd

; ===== Component Descriptions =====
!insertmacro MUI_FUNCTION_DESCRIPTION_BEGIN
    !insertmacro MUI_DESCRIPTION_TEXT ${SecBun} "启动 CCB 所必需的 Bun JavaScript 运行时。"
    !insertmacro MUI_DESCRIPTION_TEXT ${SecRg} "CCB 使用的快速文件搜索工具 ripgrep。"
    !insertmacro MUI_DESCRIPTION_TEXT ${SecGit} "内置 Git Bash，用于执行 Shell 命令。"
    !insertmacro MUI_DESCRIPTION_TEXT ${SecMcp} "内置 MCP 服务器：Exa 配置和 ExcelMcp 可执行文件。"
    !insertmacro MUI_DESCRIPTION_TEXT ${SecWindowsTerminal} "在未安装时安装 Windows Terminal。优先使用内置离线 MSIXBundle，可用时回退到 winget。若被策略阻止，CCB 主体仍正常安装。"
    !insertmacro MUI_DESCRIPTION_TEXT ${SecDesk} "在桌面创建 CCB 主启动器快捷方式。"
    !insertmacro MUI_DESCRIPTION_TEXT ${SecDeskModes} "在桌面额外创建平铺模式、安全模式、文本模式三个快捷方式（高级用户可选）。"
    !insertmacro MUI_DESCRIPTION_TEXT ${SecStart} "在开始菜单创建启动和卸载快捷方式。"
    !insertmacro MUI_DESCRIPTION_TEXT ${SecContext} "添加「用 CCB 打开」右键菜单项。"
!insertmacro MUI_FUNCTION_DESCRIPTION_END

; ===== Uninstall =====
Section "Uninstall"
    ; Clean up WT Fragment before $INSTDIR is removed (script still accessible here)
    IfFileExists "$INSTDIR\scripts\install-wt-fragment.ps1" wt_frag_ok wt_frag_skip
wt_frag_ok:
    ExecWait 'powershell.exe -NoProfile -ExecutionPolicy Bypass -File "$INSTDIR\scripts\install-wt-fragment.ps1" -Remove'
    Goto wt_frag_done
wt_frag_skip:
    Delete "$LOCALAPPDATA\Microsoft\Windows Terminal\Fragments\CCB\ccb.json"
    RMDir  "$LOCALAPPDATA\Microsoft\Windows Terminal\Fragments\CCB"
wt_frag_done:
    RMDir /r "$INSTDIR"
    Delete "$DESKTOP\${APPNAME}.lnk"
    Delete "$DESKTOP\${APPNAME} 平铺模式.lnk"
    Delete "$DESKTOP\${APPNAME} 安全模式.lnk"
    Delete "$DESKTOP\${APPNAME} 文本模式.lnk"
    Delete "$SMPROGRAMS\${STARTMENU_FOLDER}\${APPNAME}.lnk"
    Delete "$SMPROGRAMS\${STARTMENU_FOLDER}\${APPNAME} 平铺模式.lnk"
    Delete "$SMPROGRAMS\${STARTMENU_FOLDER}\${APPNAME} 诊断.lnk"
    Delete "$SMPROGRAMS\${STARTMENU_FOLDER}\${APPNAME} 终端修复.lnk"
    Delete "$SMPROGRAMS\${STARTMENU_FOLDER}\${APPNAME} 安全模式.lnk"
    Delete "$SMPROGRAMS\${STARTMENU_FOLDER}\${APPNAME} 文本模式.lnk"
    Delete "$SMPROGRAMS\${STARTMENU_FOLDER}\卸载 ${APPNAME}.lnk"
    RMDir "$SMPROGRAMS\${STARTMENU_FOLDER}"
    DeleteRegKey HKCU "Software\Classes\Directory\shell\CCB"
    DeleteRegKey HKCU "Software\Classes\*\shell\CCB"
    DeleteRegKey HKCU "Software\${COMPANYNAME}\${APPNAME}"
    ; Preserve "$LOCALAPPDATA\CCB\.claude" user settings and backups on uninstall.
SectionEnd

; ===== Version Info =====
VIProductVersion "${VERSIONMAJOR}.${VERSIONMINOR}.${VERSIONBUILD}.0"
VIAddVersionKey "ProductName" "${APPNAME}"
VIAddVersionKey "CompanyName" "${COMPANYNAME}"
VIAddVersionKey "LegalCopyright" "Copyright (c) ${COMPANYNAME}"
VIAddVersionKey "FileDescription" "${DESCRIPTION}"
VIAddVersionKey "FileVersion" "${VERSIONMAJOR}.${VERSIONMINOR}.${VERSIONBUILD}"
VIAddVersionKey "ProductVersion" "${VERSIONMAJOR}.${VERSIONMINOR}.${VERSIONBUILD}"
