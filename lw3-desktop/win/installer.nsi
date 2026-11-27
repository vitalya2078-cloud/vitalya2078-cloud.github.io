; Установщик «Физпрактикума» для Windows 7 и новее (32- и 64-битной): одна 32-битная программа подходит обеим.
; Ставит для текущего пользователя, права администратора не нужны. Обновляет и прежние версии (та же папка и запись).
; makensis -DVERSION=2.4.0 -DSRC=<папка с Fizpraktikum.exe и WebView2Runtime> -DOUT=<setup.exe> installer.nsi
Unicode true
ManifestSupportedOS all
RequestExecutionLevel user
SetCompressor /SOLID lzma
!include "MUI2.nsh"
!include "FileFunc.nsh"

!define NAME "Физпрактикум"
!define PUBLISHER "ЧВВМУ им. П.С. Нахимова, кафедра физики и общетехнических дисциплин"
!define UNKEY "Software\Microsoft\Windows\CurrentVersion\Uninstall\${NAME}"
Name "${NAME}"
OutFile "${OUT}"
InstallDir "$LOCALAPPDATA\${NAME}"
InstallDirRegKey HKCU "Software\${NAME}" ""
BrandingText "${NAME} ${VERSION}"
VIProductVersion "${VERSION}.0"
VIAddVersionKey /LANG=1049 "ProductName" "${NAME}"
VIAddVersionKey /LANG=1049 "FileDescription" "Установка программы «${NAME}»"
VIAddVersionKey /LANG=1049 "CompanyName" "${PUBLISHER}"
VIAddVersionKey /LANG=1049 "LegalCopyright" "© 2026 ${PUBLISHER}"
VIAddVersionKey /LANG=1049 "FileVersion" "${VERSION}"
VIAddVersionKey /LANG=1049 "ProductVersion" "${VERSION}"

!define MUI_ICON "..\src-tauri\icons\icon.ico"
!define MUI_UNICON "..\src-tauri\icons\icon.ico"
!define MUI_WELCOMEFINISHPAGE_BITMAP "..\src-tauri\installer\sidebar.bmp"
!define MUI_UNWELCOMEFINISHPAGE_BITMAP "..\src-tauri\installer\sidebar.bmp"
!define MUI_ABORTWARNING
!define MUI_FINISHPAGE_RUN "$INSTDIR\Fizpraktikum.exe"
!define MUI_FINISHPAGE_RUN_TEXT "Запустить «${NAME}»"
!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_LICENSE "..\src-tauri\license.txt"
!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_INSTFILES
!insertmacro MUI_PAGE_FINISH
!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES
!insertmacro MUI_LANGUAGE "Russian"

Function .onInit
  ; программа запущена — закрыть перед обновлением
  FindWindow $0 "Fizpraktikum"
  StrCmp $0 0 done
    MessageBox MB_OKCANCEL|MB_ICONINFORMATION "Программа «${NAME}» открыта. Закройте её и нажмите «ОК»." IDOK +2
    Abort
  done:
FunctionEnd

; версии 2.4.0–2.5.0 собирались без метки кодировки, и русское название превратилось в «Ð¤Ð¸Ð·…».
; Такую установку убираем (файлы, ярлыки, запись в «Программах»); данные пользователей лежат отдельно и остаются.
!define OLDNAME "Ð¤Ð¸Ð·Ð¿Ñ€Ð°ÐºÑ‚Ð¸ÐºÑƒÐ¼"
!define OLDKEY "Software\Microsoft\Windows\CurrentVersion\Uninstall\${OLDNAME}"
Function RemoveGarbled
  ReadRegStr $0 HKCU "${OLDKEY}" "InstallLocation"
  StrCmp $0 "" +5
    Delete "$0\Fizpraktikum.exe"
    RMDir /r "$0\WebView2Runtime"
    Delete "$0\Uninstall.exe"
    RMDir "$0"
  Delete "$SMPROGRAMS\${OLDNAME}\${OLDNAME}.lnk"
  RMDir "$SMPROGRAMS\${OLDNAME}"
  Delete "$SMPROGRAMS\${OLDNAME}.lnk"
  Delete "$DESKTOP\${OLDNAME}.lnk"
  DeleteRegKey HKCU "${OLDKEY}"
  DeleteRegKey HKCU "Software\${OLDNAME}"
FunctionEnd

Section "Программа" main
  Call RemoveGarbled
  SetOutPath "$INSTDIR"
  ; движок прежней версии другой: убираем целиком, чтобы файлы версий не смешались
  RMDir /r "$INSTDIR\WebView2Runtime"
  Delete "$INSTDIR\uninstall.exe"
  File "${SRC}\Fizpraktikum.exe"
  File /r "${SRC}\WebView2Runtime"
  WriteUninstaller "$INSTDIR\Uninstall.exe"
  CreateDirectory "$SMPROGRAMS\${NAME}"
  CreateShortCut "$SMPROGRAMS\${NAME}\${NAME}.lnk" "$INSTDIR\Fizpraktikum.exe"
  CreateShortCut "$SMPROGRAMS\${NAME}.lnk" "$INSTDIR\Fizpraktikum.exe"
  CreateShortCut "$DESKTOP\${NAME}.lnk" "$INSTDIR\Fizpraktikum.exe"
  WriteRegStr HKCU "Software\${NAME}" "" "$INSTDIR"
  WriteRegStr HKCU "${UNKEY}" "DisplayName" "${NAME}"
  WriteRegStr HKCU "${UNKEY}" "DisplayVersion" "${VERSION}"
  WriteRegStr HKCU "${UNKEY}" "Publisher" "${PUBLISHER}"
  WriteRegStr HKCU "${UNKEY}" "DisplayIcon" "$INSTDIR\Fizpraktikum.exe"
  WriteRegStr HKCU "${UNKEY}" "InstallLocation" "$INSTDIR"
  WriteRegStr HKCU "${UNKEY}" "UninstallString" '"$INSTDIR\Uninstall.exe"'
  WriteRegDWORD HKCU "${UNKEY}" "NoModify" 1
  WriteRegDWORD HKCU "${UNKEY}" "NoRepair" 1
  ${GetSize} "$INSTDIR" "/S=0K" $0 $1 $2
  WriteRegDWORD HKCU "${UNKEY}" "EstimatedSize" $0
SectionEnd

Section "Uninstall"
  Delete "$INSTDIR\Fizpraktikum.exe"
  RMDir /r "$INSTDIR\WebView2Runtime"
  Delete "$INSTDIR\Uninstall.exe"
  Delete "$INSTDIR\uninstall.exe"
  RMDir "$INSTDIR"
  Delete "$SMPROGRAMS\${NAME}\${NAME}.lnk"
  RMDir "$SMPROGRAMS\${NAME}"
  Delete "$SMPROGRAMS\${NAME}.lnk"
  Delete "$DESKTOP\${NAME}.lnk"
  DeleteRegKey HKCU "${UNKEY}"
  DeleteRegKey HKCU "Software\${NAME}"
  ; учётные записи, результаты и ключ лицензии (%LOCALAPPDATA%\Fizpraktikum) не удаляем: они нужны после переустановки
SectionEnd
