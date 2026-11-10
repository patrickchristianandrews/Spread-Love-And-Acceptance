; Quicksilver's full model is too big to fit inside a Windows installer, so it ships in the
; "Quicksilver models" folder next to it. When that folder is there, it is copied in during
; installation; otherwise Quicksilver downloads the model the first time it runs.
!macro customInstall
  IfFileExists "$EXEDIR\Quicksilver models\*.gguf" 0 qsNoModels
    DetailPrint "Adding the Quicksilver model (this can take a minute)..."
    CreateDirectory "$INSTDIR\resources\starter"
    CopyFiles /SILENT "$EXEDIR\Quicksilver models\*.gguf" "$INSTDIR\resources\starter"
  qsNoModels:
!macroend
