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
