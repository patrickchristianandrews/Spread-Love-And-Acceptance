; Quicksilver Liquid Edition is too big to fit inside a Windows installer, so its models ship in the
; "Quicksilver models" folder next to it: the chat models (.gguf), Lustify (.safetensors) and
; Wan 2.2. When that folder is there, everything in it is copied in during installation;
; otherwise Quicksilver downloads the Liquid Edition the first time it opens.
!macro customInstall
  IfFileExists "$EXEDIR\Quicksilver models\*.gguf" 0 qsNoModels
    DetailPrint "Adding Quicksilver Liquid Edition: chat, Lustify (pictures) and Wan 2.2 (video). This can take a few minutes..."
    CreateDirectory "$INSTDIR\resources\starter"
    CopyFiles /SILENT "$EXEDIR\Quicksilver models\*.*" "$INSTDIR\resources\starter"
    ; Windows copies nothing at all when the drive is short of room, and says nothing. Check that
    ; the biggest files arrived, and say so if they didn't (silent installs carry on).
    IfFileExists "$EXEDIR\Quicksilver models\qwen3.5-9b.gguf" 0 qsCheckLustify
      IfFileExists "$INSTDIR\resources\starter\qwen3.5-9b.gguf" 0 qsNotCopied
    qsCheckLustify:
    IfFileExists "$EXEDIR\Quicksilver models\lustify.safetensors" 0 qsNoModels
      IfFileExists "$INSTDIR\resources\starter\lustify.safetensors" qsNoModels 0
    qsNotCopied:
      MessageBox MB_OK|MB_ICONEXCLAMATION "Quicksilver was installed, but its models could not be copied in. This drive probably has too little free space: the Liquid Edition needs about 40 GB.$\r$\n$\r$\nFree some space and run the installer again, or open Quicksilver and it will download the models itself." /SD IDOK
  qsNoModels:
!macroend

; Uninstalling: your chats, settings and downloaded models live in your user folder, not in the
; app's folder, so they survive updates and reinstalls. On a real uninstall (not when a newer
; version replaces this one) Quicksilver asks whether to remove them too. Silent uninstalls keep them.
!macro customUnInstall
  ${ifNot} ${isUpdated}
    MessageBox MB_YESNO|MB_ICONQUESTION|MB_DEFBUTTON2 "Remove your Quicksilver data as well?$\r$\n$\r$\nYes: deletes your chats, settings and every downloaded model. This frees the most space (the Liquid Edition's models are about 30 GB).$\r$\n$\r$\nNo: keeps them, so a future install picks up where you left off." /SD IDNO IDNO qsKeepData
      SetShellVarContext current
      RMDir /r "$APPDATA\${APP_FILENAME}"
      !ifdef APP_PRODUCT_FILENAME
        RMDir /r "$APPDATA\${APP_PRODUCT_FILENAME}"
      !endif
    qsKeepData:
  ${endIf}
!macroend
