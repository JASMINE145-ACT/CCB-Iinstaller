; CCB Installer - NSIS Script
!include "MUI2.nsh"

!define APPNAME "CCB"
!define COMPANYNAME "CCB"
!define DESCRIPTION "Claude Code Bundle - AI Coding Assistant"
!define VERSIONMAJOR 1
!define VERSIONMINOR 0
!define VERSIONBUILD 0

Name "${APPNAME}"
OutFile "CCB-Setup-${VERSIONMAJOR}.${VERSIONMINOR}.${VERSIONBUILD}.exe"
InstallDir "$LOCALAPPDATA\Programs\CCB"
InstallDirRegKey HKCU "Software\${COMPANYNAME}\${APPNAME}" "InstallDir"
RequestExecutionLevel user

!define MUI_ABORTWARNING
!insertmacro MUI_LANGUAGE "English"

!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_COMPONENTS
!insertmacro MUI_PAGE_INSTFILES
!insertmacro MUI_PAGE_FINISH

!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES

; ===== 组件定义 =====
Section "Bun Runtime (Required)" SecBun
    SectionIn RO
    SetOutPath "$INSTDIR\bun"
    File /r "resources\bun\*.*"
SectionEnd

Section "ripgrep (Required)" SecRg
    SectionIn RO
    SetOutPath "$INSTDIR\vendor\ripgrep"
    File /r "resources\ripgrep\*.*"
SectionEnd

Section "Python for MCP (Optional)" SecPython
    SetOutPath "$INSTDIR\python"
    File /r "resources\python\*.*"
SectionEnd

Section "Create Desktop Shortcut" SecDesk
    CreateShortCut "$DESKTOP\${APPNAME}.lnk" "$INSTDIR\ccb.cmd"
SectionEnd

Section "Create Start Menu Shortcut" SecStart
    CreateDirectory "$SMPROGRAMS\${APPNAME}"
    CreateShortCut "$SMPROGRAMS\${APPNAME}\${APPNAME}.lnk" "$INSTDIR\ccb.cmd"
    CreateShortCut "$SMPROGRAMS\${APPNAME}\Uninstall.lnk" "$INSTDIR\uninstall.exe"
SectionEnd

Section "Add to Right-Click Menu (Optional)" SecContext
    WriteRegStr HKCR "Directory\shell\CCB" "" "Open with ${APPNAME}"
    WriteRegStr HKCR "Directory\shell\CCB" "Icon" "$INSTDIR\ccb.cmd"
    WriteRegStr HKCR "Directory\shell\CCB\command" "" '"$INSTDIR\ccb.cmd" "%V"'

    WriteRegStr HKCR "*\shell\CCB" "" "Open with ${APPNAME}"
    WriteRegStr HKCR "*\shell\CCB" "Icon" "$INSTDIR\ccb.cmd"
    WriteRegStr HKCR "*\shell\CCB\command" "" '"$INSTDIR\ccb.cmd" "%1"'
SectionEnd

; ===== 安装逻辑 =====
Section "-Main Installation"
    WriteRegStr HKCU "Software\${COMPANYNAME}\${APPNAME}" "InstallDir" "$INSTDIR"
    CreateDirectory "$INSTDIR"
    CreateDirectory "$INSTDIR\bun"
    CreateDirectory "$INSTDIR\vendor\ripgrep"
    SetOutPath "$INSTDIR"
    File /r "dist\*.*"
    File "ccb.cmd"
    WriteUninstaller "$INSTDIR\uninstall.exe"
    WriteRegStr HKCU "Software\${COMPANYNAME}\${APPNAME}" "" "${DESCRIPTION}"
    WriteRegStr HKCU "Software\${COMPANYNAME}\${APPNAME}" "Version" "${VERSIONMAJOR}.${VERSIONMINOR}.${VERSIONBUILD}"
SectionEnd

; ===== 卸载逻辑 =====
Section "Uninstall"
    ; 1. 清理程序目录
    RMDir /r "$INSTDIR"

    ; 2. 清理桌面快捷方式
    Delete "$DESKTOP\${APPNAME}.lnk"

    ; 3. 清理开始菜单
    Delete "$SMPROGRAMS\${APPNAME}\${APPNAME}.lnk"
    Delete "$SMPROGRAMS\${APPNAME}\Uninstall.lnk"
    RMDir "$SMPROGRAMS\${APPNAME}"

    ; 4. 清理右键菜单
    DeleteRegKey HKCR "Directory\shell\CCB"
    DeleteRegKey HKCR "*\shell\CCB"

    ; 5. 清理注册表
    DeleteRegKey HKCU "Software\${COMPANYNAME}\${APPNAME}"

    ; 6. 保留配置目录 (%LOCALAPPDATA%\CCB\.claude)
    ; 不清理，保留用户配置
SectionEnd

; ===== 版本信息 =====
VIProductVersion "${VERSIONMAJOR}.${VERSIONMINOR}.${VERSIONBUILD}.0"
VIAddVersionKey "ProductName" "${APPNAME}"
VIAddVersionKey "CompanyName" "${COMPANYNAME}"
VIAddVersionKey "LegalCopyright" "Copyright (c) ${COMPANYNAME}"
VIAddVersionKey "FileDescription" "${DESCRIPTION}"
VIAddVersionKey "FileVersion" "${VERSIONMAJOR}.${VERSIONMINOR}.${VERSIONBUILD}"
VIAddVersionKey "ProductVersion" "${VERSIONMAJOR}.${VERSIONMINOR}.${VERSIONBUILD}"