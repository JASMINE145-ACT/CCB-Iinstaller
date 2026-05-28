; CCB Installer - NSIS Script
; Keep this file ASCII-compatible for ANSI NSIS installations on Windows.
!include "MUI2.nsh"

!define APPNAME "CCB"
!define COMPANYNAME "CCB"
!define DESCRIPTION "Claude Code Bundle - AI Coding Assistant"
!define STARTMENU_FOLDER "CCB (Claude Code Best)"
!define VERSIONMAJOR 1
!define VERSIONMINOR 0
!define VERSIONBUILD 6
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
SectionEnd

; ===== Components =====
Section "Bun Runtime (required)" SecBun
    SectionIn RO
    SetOutPath "$INSTDIR\vendor\bun"
    File /r "vendor\bun\*.*"
SectionEnd

Section "ripgrep (required)" SecRg
    SectionIn RO
    SetOutPath "$INSTDIR\vendor\ripgrep"
    File /r "vendor\ripgrep\*.*"
SectionEnd

Section "Git Bash (required)" SecGit
    SectionIn RO
    SetOutPath "$INSTDIR\vendor\git"
    File /r "vendor\git\*.*"
SectionEnd

Section "MCP Servers (required)" SecMcp
    SectionIn RO
    SetOutPath "$INSTDIR\vendor\mcp-servers"
    File /r "vendor\mcp-servers\*.*"
SectionEnd

Section "Install Windows Terminal if missing (recommended)" SecWindowsTerminal
    SetOutPath "$INSTDIR\vendor\windows-terminal"
    File /nonfatal "vendor\windows-terminal\*.*"
    SetOutPath "$INSTDIR\scripts"
    File "scripts\install-windows-terminal.ps1"
    ExecWait 'powershell.exe -NoProfile -ExecutionPolicy Bypass -File "$INSTDIR\scripts\install-windows-terminal.ps1" -PackageDir "$INSTDIR\vendor\windows-terminal" -AllowWinget'
SectionEnd

Section "Create desktop shortcut" SecDesk
    SectionIn RO
    SetOutPath "$INSTDIR"
    CreateShortCut "$DESKTOP\${APPNAME}.lnk" "$INSTDIR\ccb.cmd" "" "$INSTDIR\ccb.ico"
SectionEnd

Section "Create Start Menu shortcuts" SecStart
    SectionIn RO
    CreateDirectory "$SMPROGRAMS\${STARTMENU_FOLDER}"
    SetOutPath "$INSTDIR"
    CreateShortCut "$SMPROGRAMS\${STARTMENU_FOLDER}\${APPNAME}.lnk" "$INSTDIR\ccb.cmd" "" "$INSTDIR\ccb.ico"
    CreateShortCut "$SMPROGRAMS\${STARTMENU_FOLDER}\${APPNAME} Diagnostics.lnk" "$INSTDIR\ccb-diagnose.cmd" "" "$INSTDIR\ccb.ico"
    CreateShortCut "$SMPROGRAMS\${STARTMENU_FOLDER}\${APPNAME} Terminal Fix.lnk" "$INSTDIR\ccb-fix-terminal.cmd" "" "$INSTDIR\ccb.ico"
    CreateShortCut "$SMPROGRAMS\${STARTMENU_FOLDER}\Uninstall ${APPNAME}.lnk" "$INSTDIR\uninstall.exe"
SectionEnd

Section /o "Add context menu shortcuts (optional)" SecContext
    WriteRegStr HKCU "Software\Classes\Directory\shell\CCB" "" "Open with CCB"
    WriteRegStr HKCU "Software\Classes\Directory\shell\CCB" "Icon" "$INSTDIR\ccb.ico"
    WriteRegStr HKCU "Software\Classes\Directory\shell\CCB\command" "" '"$INSTDIR\ccb.cmd" "%V"'

    WriteRegStr HKCU "Software\Classes\*\shell\CCB" "" "Open with CCB"
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
    File "resources\ccb.ico"

    SetOutPath "$INSTDIR\scripts"
    File "scripts\ensure-mcp-settings.ps1"
    File "scripts\fix-terminal-launcher.ps1"
    File "scripts\install-windows-terminal.ps1"
    ExecWait 'powershell.exe -NoProfile -ExecutionPolicy Bypass -File "$INSTDIR\scripts\ensure-mcp-settings.ps1" -InstallDir "$INSTDIR" -ConfigDir "$LOCALAPPDATA\CCB\.claude"'
    ExecWait 'powershell.exe -NoProfile -ExecutionPolicy Bypass -File "$INSTDIR\scripts\fix-terminal-launcher.ps1" -NoPrompt'

    SetOutPath "$INSTDIR\dist"
    File /r "dist\*.*"

    WriteUninstaller "$INSTDIR\uninstall.exe"
    WriteRegStr HKCU "Software\${COMPANYNAME}\${APPNAME}" "" "${DESCRIPTION}"
    WriteRegStr HKCU "Software\${COMPANYNAME}\${APPNAME}" "Version" "${VERSIONMAJOR}.${VERSIONMINOR}.${VERSIONBUILD}"
SectionEnd

; ===== Component Descriptions =====
!insertmacro MUI_FUNCTION_DESCRIPTION_BEGIN
    !insertmacro MUI_DESCRIPTION_TEXT ${SecBun} "Bun JavaScript runtime required to start CCB."
    !insertmacro MUI_DESCRIPTION_TEXT ${SecRg} "Fast file search utility used by CCB."
    !insertmacro MUI_DESCRIPTION_TEXT ${SecGit} "Bundled Git Bash used to execute shell commands."
    !insertmacro MUI_DESCRIPTION_TEXT ${SecMcp} "Bundled MCP servers: Exa configuration and ExcelMcp executable."
    !insertmacro MUI_DESCRIPTION_TEXT ${SecWindowsTerminal} "Install Microsoft Windows Terminal when missing. Uses bundled offline MSIXBundle first, then winget fallback if available. If blocked, CCB still installs normally."
    !insertmacro MUI_DESCRIPTION_TEXT ${SecDesk} "Create a CCB launcher on the desktop."
    !insertmacro MUI_DESCRIPTION_TEXT ${SecStart} "Create launch and uninstall shortcuts in the Start Menu."
    !insertmacro MUI_DESCRIPTION_TEXT ${SecContext} "Add an Open with CCB context menu item."
!insertmacro MUI_FUNCTION_DESCRIPTION_END

; ===== Uninstall =====
Section "Uninstall"
    RMDir /r "$INSTDIR"
    Delete "$DESKTOP\${APPNAME}.lnk"
    Delete "$DESKTOP\${APPNAME} Flat Mode.lnk"
    Delete "$SMPROGRAMS\${STARTMENU_FOLDER}\${APPNAME}.lnk"
    Delete "$SMPROGRAMS\${STARTMENU_FOLDER}\${APPNAME} Diagnostics.lnk"
    Delete "$SMPROGRAMS\${STARTMENU_FOLDER}\${APPNAME} Terminal Fix.lnk"
    Delete "$SMPROGRAMS\${STARTMENU_FOLDER}\${APPNAME} Flat Mode.lnk"
    Delete "$SMPROGRAMS\${STARTMENU_FOLDER}\Uninstall ${APPNAME}.lnk"
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
