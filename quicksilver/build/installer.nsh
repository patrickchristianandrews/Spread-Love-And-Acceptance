; Quicksilver's full model is too big to fit inside a Windows installer, so it ships in the
; "Quicksilver models" folder next to it. When that folder is there, it is copied in during
; installation; otherwise Quicksilver downloads the model the first time it runs.
!macro customInstall
  IfFileExists "$EXEDIR\Quicksilver models\*.gguf" 0 qsNoModels
    DetailPrint "Adding the Quicksilver model (this can take a minute)..."
    CreateDirectory "$INSTDIR\resources\starter"
    CopyFiles /SILENT "$EXEDIR\Quicksilver models\*.gguf" "$INSTDIR\resources\starter"
    ; The Liquid Edition's picture and video makers (Lustify, Wan 2.2), when they're in the folder.
    IfFileExists "$EXEDIR\Quicksilver models\*.safetensors" 0 qsNoMedia
      DetailPrint "Adding Lustify (pictures) and Wan 2.2 (video)..."
      CopyFiles /SILENT "$EXEDIR\Quicksilver models\*.safetensors" "$INSTDIR\resources\starter"
    qsNoMedia:
  qsNoModels:
!macroend
