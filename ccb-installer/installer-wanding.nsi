; CCB-Wanding Installer - NSIS Script
Unicode true
!include "MUI2.nsh"

!define APPNAME "CCB-Wanding"
!define COMPANYNAME "CCB-Wanding"
!define DESCRIPTION "Claude Code Bundle - Wanding quotation assistant"
!define STARTMENU_FOLDER "CCB-Wanding"
!define VERSIONMAJOR 1
!define VERSIONMINOR 0
!define VERSIONBUILD 4
!define MUI_ICON "resources\ccb.ico"
!define MUI_UNICON "resources\ccb.ico"

Name "${APPNAME}"
OutFile "CCB-Wanding-${VERSIONMAJOR}.${VERSIONMINOR}.${VERSIONBUILD}.exe"
Icon "resources\ccb.ico"
UninstallIcon "resources\ccb.ico"
InstallDir "$LOCALAPPDATA\Programs\CCB-Wanding"
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
    IfFileExists "$LOCALAPPDATA\CCB-Wanding\.claude\*.*" backup_existing_config check_default_config
backup_existing_config:
    CreateDirectory "$LOCALAPPDATA\CCB-Wanding\backup-before-${VERSIONMAJOR}.${VERSIONMINOR}.${VERSIONBUILD}"
    CopyFiles /SILENT "$LOCALAPPDATA\CCB-Wanding\.claude" "$LOCALAPPDATA\CCB-Wanding\backup-before-${VERSIONMAJOR}.${VERSIONMINOR}.${VERSIONBUILD}"
check_default_config:
    CreateDirectory "$LOCALAPPDATA\CCB-Wanding\.claude"
    IfFileExists "$LOCALAPPDATA\CCB-Wanding\.claude\settings.json" config_done
    SetOutPath "$LOCALAPPDATA\CCB-Wanding\.claude"
    File "resources\settings\settings.json"
config_done:
    ; Built-in slash commands - always overwrite so users get the latest versions.
    CreateDirectory "$LOCALAPPDATA\CCB-Wanding\.claude\commands"
    SetOutPath "$LOCALAPPDATA\CCB-Wanding\.claude\commands"
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

Section "Wanding Python runtime (required)" SecWandingPython
    SectionIn RO
    SetOutPath "$INSTDIR\vendor\python-wanding"
    File /r "vendor\python-wanding\*.*"
SectionEnd

Section "MCP 服务器 (必需)" SecMcp
    SectionIn RO
    SetOutPath "$INSTDIR\vendor\mcp-servers"
    File /r "vendor\mcp-servers\*.*"
SectionEnd

Section "Accurate Online MCP (required)" SecAccurate
    SectionIn RO
    SetOutPath "$INSTDIR\vendor\mcp-servers\accurate-mcp"
    File "vendor\mcp-servers\accurate-mcp\server.py"
SectionEnd

Section "Wanding quotation MCP and knowledge base (required)" SecWanding
    SectionIn RO
    SetOutPath "$INSTDIR\vendor\mcp-servers\quotation-server"
    File /r "..\mcp_servers\quotation-server\*.*"
    SetOutPath "$INSTDIR\vendor\wanding\python"
    File /r /x ".pytest_cache" /x "__pycache__" "..\python\*.*"
    SetOutPath "$INSTDIR\vendor\wanding\data"
    File "..\data\wanding_price_lib.xlsx"
    File "..\data\wanding_business_knowledge.md"
    File /nonfatal "..\data\mapping_table.xlsx"
    File "..\data\空白标准报价单.xlsx"
    File /nonfatal "..\data\已填标准报价单.xlsx"
SectionEnd

Section "安装 Windows Terminal (推荐)" SecWindowsTerminal
    SetOutPath "$INSTDIR\vendor\windows-terminal"
    File /nonfatal "vendor\windows-terminal\*.*"
    SetOutPath "$INSTDIR\scripts"
    File "scripts\install-windows-terminal.ps1"
    File "scripts\launch-ccb.ps1"
    File "scripts\patch-i18n.ps1"
    File "scripts\normalize-i18n-literals.mjs"
    nsExec::ExecToLog '"$SYSDIR\WindowsPowerShell\v1.0\powershell.exe" -NoProfile -ExecutionPolicy Bypass -File "$INSTDIR\scripts\install-windows-terminal.ps1" -PackageDir "$INSTDIR\vendor\windows-terminal" -AllowWinget'
    Pop $0
SectionEnd

Section "创建桌面快捷方式" SecDesk
    SetOutPath "$INSTDIR"
    CreateShortCut "$DESKTOP\${APPNAME}.lnk" "$INSTDIR\ccb-wanding.cmd" "" "$INSTDIR\ccb.ico"
    CreateShortCut "$DESKTOP\${APPNAME} 最近对话.lnk" "$INSTDIR\ccb-wanding-recent.cmd" "" "$INSTDIR\ccb.ico"
SectionEnd

Section /o "桌面附加快捷方式（平铺/安全/文本模式）" SecDeskModes
    SetOutPath "$INSTDIR"
    CreateShortCut "$DESKTOP\${APPNAME} 平铺模式.lnk" "$INSTDIR\ccb-flat.cmd" "" "$INSTDIR\ccb.ico"
    CreateShortCut "$DESKTOP\${APPNAME} 安全模式.lnk" "$INSTDIR\ccb-safe.cmd" "" "$INSTDIR\ccb.ico"
    CreateShortCut "$DESKTOP\${APPNAME} 文本模式.lnk" "$INSTDIR\ccb-text.cmd" "" "$INSTDIR\ccb.ico"
SectionEnd

Section "创建开始菜单快捷方式" SecStart
    CreateDirectory "$SMPROGRAMS\${STARTMENU_FOLDER}"
    SetOutPath "$INSTDIR"
    CreateShortCut "$SMPROGRAMS\${STARTMENU_FOLDER}\${APPNAME}.lnk" "$INSTDIR\ccb-wanding.cmd" "" "$INSTDIR\ccb.ico"
    CreateShortCut "$SMPROGRAMS\${STARTMENU_FOLDER}\${APPNAME} 最近对话.lnk" "$INSTDIR\ccb-wanding-recent.cmd" "" "$INSTDIR\ccb.ico"
    CreateShortCut "$SMPROGRAMS\${STARTMENU_FOLDER}\卸载 ${APPNAME}.lnk" "$INSTDIR\uninstall.exe"
SectionEnd

Section /o "开始菜单附加快捷方式（平铺/安全/诊断/文本模式）" SecStartModes
    CreateDirectory "$SMPROGRAMS\${STARTMENU_FOLDER}"
    SetOutPath "$INSTDIR"
    CreateShortCut "$SMPROGRAMS\${STARTMENU_FOLDER}\${APPNAME} 平铺模式.lnk" "$INSTDIR\ccb-flat.cmd" "" "$INSTDIR\ccb.ico"
    CreateShortCut "$SMPROGRAMS\${STARTMENU_FOLDER}\${APPNAME} 安全模式.lnk" "$INSTDIR\ccb-safe.cmd" "" "$INSTDIR\ccb.ico"
    CreateShortCut "$SMPROGRAMS\${STARTMENU_FOLDER}\${APPNAME} 文本模式.lnk" "$INSTDIR\ccb-text.cmd" "" "$INSTDIR\ccb.ico"
    CreateShortCut "$SMPROGRAMS\${STARTMENU_FOLDER}\${APPNAME} 诊断.lnk" "$INSTDIR\ccb-diagnose.cmd" "" "$INSTDIR\ccb.ico"
    CreateShortCut "$SMPROGRAMS\${STARTMENU_FOLDER}\${APPNAME} 终端修复.lnk" "$INSTDIR\ccb-fix-terminal.cmd" "" "$INSTDIR\ccb.ico"
SectionEnd

Section /o "添加右键菜单 (可选)" SecContext
        WriteRegStr HKCU "Software\Classes\Directory\shell\CCB-Wanding" "" "Open with CCB-Wanding"
    WriteRegStr HKCU "Software\Classes\Directory\shell\CCB-Wanding" "Icon" "$INSTDIR\ccb.ico"
    WriteRegStr HKCU "Software\Classes\Directory\shell\CCB-Wanding\command" "" '"$INSTDIR\ccb-wanding.cmd" "%V"'

        WriteRegStr HKCU "Software\Classes\*\shell\CCB-Wanding" "" "Open with CCB-Wanding"
    WriteRegStr HKCU "Software\Classes\*\shell\CCB-Wanding" "Icon" "$INSTDIR\ccb.ico"
    WriteRegStr HKCU "Software\Classes\*\shell\CCB-Wanding\command" "" '"$INSTDIR\ccb-wanding.cmd" "%1"'
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
    File "ccb-wanding.cmd"
    File "ccb-wanding-recent.cmd"
    File "ccb-diagnose.cmd"
    File "ccb-fix-terminal.cmd"
    File "ccb-flat.cmd"
    File "ccb-safe.cmd"
    File "ccb-text.cmd"
    File "resources\ccb.ico"

    SetOutPath "$INSTDIR\scripts"
    File "scripts\ensure-wanding-settings.ps1"
    File "scripts\fix-terminal-launcher.ps1"
    File "scripts\install-wt-fragment.ps1"
    File "scripts\install-windows-terminal.ps1"
    File "scripts\launch-ccb.ps1"
    File "scripts\patch-i18n.ps1"
    File "scripts\normalize-i18n-literals.mjs"
    File "scripts\ccb-recent.ps1"
    File "scripts\ccb-diagnose.ps1"
    File "scripts\ccb-update-info.ps1"
    File "scripts\smoke-wanding-e2e.ps1"
    nsExec::ExecToLog '"$SYSDIR\WindowsPowerShell\v1.0\powershell.exe" -NoProfile -ExecutionPolicy Bypass -File "$INSTDIR\scripts\ensure-wanding-settings.ps1" -InstallDir "$INSTDIR" -ConfigDir "$LOCALAPPDATA\CCB-Wanding\.claude"'
    Pop $0
    nsExec::ExecToLog '"$SYSDIR\WindowsPowerShell\v1.0\powershell.exe" -NoProfile -ExecutionPolicy Bypass -File "$INSTDIR\scripts\install-wt-fragment.ps1"'
    Pop $0
    nsExec::ExecToLog '"$SYSDIR\WindowsPowerShell\v1.0\powershell.exe" -NoProfile -ExecutionPolicy Bypass -File "$INSTDIR\scripts\fix-terminal-launcher.ps1" -NoPrompt'
    Pop $0

    SetOutPath "$INSTDIR\dist"
    File /r /x "loadAgentsDir-head-test.js" /x "loadAgentsDir-test108.js" "dist\*.*"

    WriteUninstaller "$INSTDIR\uninstall.exe"
    WriteRegStr HKCU "Software\${COMPANYNAME}\${APPNAME}" "" "${DESCRIPTION}"
    WriteRegStr HKCU "Software\${COMPANYNAME}\${APPNAME}" "Version" "${VERSIONMAJOR}.${VERSIONMINOR}.${VERSIONBUILD}"
SectionEnd

; ===== Component Descriptions =====
!insertmacro MUI_FUNCTION_DESCRIPTION_BEGIN
    !insertmacro MUI_DESCRIPTION_TEXT ${SecBun} "启动 CCB 所必需的 Bun JavaScript 运行时。"
    !insertmacro MUI_DESCRIPTION_TEXT ${SecRg} "CCB 使用的快速文件搜索工具 ripgrep。"
    !insertmacro MUI_DESCRIPTION_TEXT ${SecGit} "内置 Git Bash，用于执行 Shell 命令。"
    !insertmacro MUI_DESCRIPTION_TEXT ${SecWandingPython} "内置自包含 Python runtime 及报价/查库存/Accurate MCP 所需依赖（pandas/openpyxl/numpy/requests/mcp 等），无需目标机器预装 Python。"
    !insertmacro MUI_DESCRIPTION_TEXT ${SecAccurate} "Accurate Online 只读 MCP：库存搜索、任意表按日期抓取、单据详情查询。凭证已内置，安装即用。"
    !insertmacro MUI_DESCRIPTION_TEXT ${SecMcp} "内置 MCP 服务器：Exa 配置和 ExcelMcp 可执行文件。"
    !insertmacro MUI_DESCRIPTION_TEXT ${SecWanding} "Bundled Wanding quotation + inventory MCP, price library, business knowledge, and Python logic (报价 + 查库存)."
    !insertmacro MUI_DESCRIPTION_TEXT ${SecWindowsTerminal} "在未安装时安装 Windows Terminal。优先使用内置离线 MSIXBundle，可用时回退到 winget。若被策略阻止，CCB 主体仍正常安装。"
    !insertmacro MUI_DESCRIPTION_TEXT ${SecDesk} "在桌面创建 CCB 主启动器快捷方式。"
    !insertmacro MUI_DESCRIPTION_TEXT ${SecDeskModes} "在桌面额外创建平铺模式、安全模式、文本模式三个快捷方式（高级用户可选）。"
    !insertmacro MUI_DESCRIPTION_TEXT ${SecStart} "在开始菜单创建 CCB 主快捷方式和卸载入口。"
    !insertmacro MUI_DESCRIPTION_TEXT ${SecStartModes} "在开始菜单额外创建平铺模式、安全模式、文本模式、诊断和终端修复快捷方式（高级用户可选）。"
    !insertmacro MUI_DESCRIPTION_TEXT ${SecContext} "添加「用 CCB 打开」右键菜单项。"
!insertmacro MUI_FUNCTION_DESCRIPTION_END

; ===== Uninstall =====
Section "Uninstall"
    ; Keep the shared CCB WT Fragment because regular CCB may use it too.
    Goto wt_frag_done
    ; Clean up WT Fragment before $INSTDIR is removed (script still accessible here)
    IfFileExists "$INSTDIR\scripts\install-wt-fragment.ps1" wt_frag_ok wt_frag_skip
wt_frag_ok:
    nsExec::ExecToLog '"$SYSDIR\WindowsPowerShell\v1.0\powershell.exe" -NoProfile -ExecutionPolicy Bypass -File "$INSTDIR\scripts\install-wt-fragment.ps1" -Remove'
    Pop $0
    Goto wt_frag_done
wt_frag_skip:
    Delete "$LOCALAPPDATA\Microsoft\Windows Terminal\Fragments\CCB\ccb.json"
    RMDir  "$LOCALAPPDATA\Microsoft\Windows Terminal\Fragments\CCB"
wt_frag_done:
    RMDir /r "$INSTDIR"
    Delete "$DESKTOP\${APPNAME}.lnk"
    Delete "$DESKTOP\${APPNAME} 最近对话.lnk"
    Delete "$DESKTOP\${APPNAME} 平铺模式.lnk"
    Delete "$DESKTOP\${APPNAME} 安全模式.lnk"
    Delete "$DESKTOP\${APPNAME} 文本模式.lnk"
    Delete "$SMPROGRAMS\${STARTMENU_FOLDER}\${APPNAME}.lnk"
    Delete "$SMPROGRAMS\${STARTMENU_FOLDER}\${APPNAME} 最近对话.lnk"
    Delete "$SMPROGRAMS\${STARTMENU_FOLDER}\卸载 ${APPNAME}.lnk"
    Delete "$SMPROGRAMS\${STARTMENU_FOLDER}\${APPNAME} 平铺模式.lnk"
    Delete "$SMPROGRAMS\${STARTMENU_FOLDER}\${APPNAME} 安全模式.lnk"
    Delete "$SMPROGRAMS\${STARTMENU_FOLDER}\${APPNAME} 文本模式.lnk"
    Delete "$SMPROGRAMS\${STARTMENU_FOLDER}\${APPNAME} 诊断.lnk"
    Delete "$SMPROGRAMS\${STARTMENU_FOLDER}\${APPNAME} 终端修复.lnk"
    RMDir "$SMPROGRAMS\${STARTMENU_FOLDER}"
    DeleteRegKey HKCU "Software\Classes\Directory\shell\CCB-Wanding"
    DeleteRegKey HKCU "Software\Classes\*\shell\CCB-Wanding"
    DeleteRegKey HKCU "Software\${COMPANYNAME}\${APPNAME}"
    ; Preserve "$LOCALAPPDATA\CCB-Wanding\.claude" user settings and backups on uninstall.
SectionEnd

; ===== Version Info =====
VIProductVersion "${VERSIONMAJOR}.${VERSIONMINOR}.${VERSIONBUILD}.0"
VIAddVersionKey "ProductName" "${APPNAME}"
VIAddVersionKey "CompanyName" "${COMPANYNAME}"
VIAddVersionKey "LegalCopyright" "Copyright (c) ${COMPANYNAME}"
VIAddVersionKey "FileDescription" "${DESCRIPTION}"
VIAddVersionKey "FileVersion" "${VERSIONMAJOR}.${VERSIONMINOR}.${VERSIONBUILD}"
VIAddVersionKey "ProductVersion" "${VERSIONMAJOR}.${VERSIONMINOR}.${VERSIONBUILD}"
