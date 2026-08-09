Name "Zora - Assistente Pessoal de Pesquisa"
OutFile "zora-installer.exe"
InstallDir "$LOCALAPPDATA\Zora"
RequestExecutionLevel user

!include "MUI2.nsh"
!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_INSTFILES
!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES
!insertmacro MUI_LANGUAGE "PortugueseBR"

Section "Instalar"
  SetOutPath "$INSTDIR"
  File "dist\zora.exe"

  WriteUninstaller "$INSTDIR\uninstall.exe"

  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\Zora" "DisplayName" "Zora - Assistente Pessoal de Pesquisa"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\Zora" "UninstallString" '"$INSTDIR\uninstall.exe"'
  WriteRegDWORD HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\Zora" "NoModify" 1
  WriteRegDWORD HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\Zora" "NoRepair" 1

  DetailPrint "Adicionando $INSTDIR ao PATH..."
  ReadRegStr $0 HKCU "Environment" "Path"
  StrCpy $0 "$INSTDIR;$0"
  WriteRegExpandStr HKCU "Environment" "Path" "$0"

  DetailPrint "Definindo variaveis de ambiente..."
  WriteRegExpandStr HKCU "Environment" "ZORA_BIN" "$INSTDIR\zora.exe"
  WriteRegDWORD HKCU "Environment" "ZORA_INSTALLED" 1

  SendMessage ${HWND_BROADCAST} ${WM_WININICHANGE} 0 "STR:Environment" /TIMEOUT=5000
SectionEnd

Section "Uninstall"
  Delete "$INSTDIR\zora.exe"
  Delete "$INSTDIR\uninstall.exe"
  RMDir "$INSTDIR"
  DeleteRegKey HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\Zora"
  DeleteRegValue HKCU "Environment" "ZORA_BIN"
  DeleteRegValue HKCU "Environment" "ZORA_INSTALLED"
SectionEnd