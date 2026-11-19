; Inno Setup script for FaceLens. Run build.bat first (it calls this automatically when Inno Setup 6 is installed).
#define AppVersion GetEnv("FACELENS_VERSION")
#if AppVersion == ""
  #define AppVersion "1.1.0"
#endif

[Setup]
AppId={{6B1F3D52-7A3C-4E0B-9C61-FA5E1E0D2C11}
AppName=FaceLens
AppVersion={#AppVersion}
AppPublisher=Spread Love & Acceptance
DefaultDirName={autopf}\FaceLens
DefaultGroupName=FaceLens
UninstallDisplayIcon={app}\FaceLens.exe
SetupIconFile=facelens.ico
OutputDir=dist
OutputBaseFilename=FaceLens-Setup
Compression=lzma2/ultra64
SolidCompression=yes
ArchitecturesAllowed=x64compatible
ArchitecturesInstallIn64BitMode=x64compatible
PrivilegesRequiredOverridesAllowed=dialog
WizardStyle=modern

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"

[Files]
Source: "dist\FaceLens\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs

[Icons]
Name: "{group}\FaceLens"; Filename: "{app}\FaceLens.exe"
Name: "{group}\Uninstall FaceLens"; Filename: "{uninstallexe}"
Name: "{autodesktop}\FaceLens"; Filename: "{app}\FaceLens.exe"; Tasks: desktopicon

[Run]
Filename: "{app}\FaceLens.exe"; Description: "{cm:LaunchProgram,FaceLens}"; Flags: nowait postinstall skipifsilent
