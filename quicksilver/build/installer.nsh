; Quicksilver Liquid Edition is too big to fit inside a Windows installer, so its models ship in the
; "Quicksilver models" folder next to it: the chat models (.gguf), Lustify (.safetensors) and
; Wan 2.2. When that folder is there, everything in it is copied in during installation;
; otherwise Quicksilver downloads the Liquid Edition the first time it opens.
!macro customInstall
  IfFileExists "$EXEDIR\Quicksilver models\*.gguf" 0 qsNoModels
    DetailPrint "Adding Quicksilver Liquid Edition: chat, Lustify (pictures) and Wan 2.2 (video). This can take a few minutes..."
    CreateDirectory "$INSTDIR\resources\starter"
    CopyFiles /SILENT "$EXEDIR\Quicksilver models\*.*" "$INSTDIR\resources\starter"
  qsNoModels:
!macroend
