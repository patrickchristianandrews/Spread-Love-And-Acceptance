# FaceLens: a Windows app for DeepFace

FaceLens is a desktop app for Windows built on [DeepFace](https://github.com/serengil/deepface), the open-source Python face recognition and facial attribute analysis library ([overview](https://viso.ai/computer-vision/deepface/)). Everything runs on your own PC. No photo is uploaded anywhere.

| Tab | What it does | DeepFace call |
|---|---|---|
| **Analyze** | Finds every face in a photo and estimates age, gender, emotion and race, with a labelled image and every score | `DeepFace.analyze` |
| **Verify** | Decides whether two photos show the same person, and shows the distance and threshold | `DeepFace.verify` |
| **Find** | Searches a folder of photos (sub-folders included) for the person in a query photo | `DeepFace.find` |
| **Live camera** | Labels faces from your webcam in real time, with snapshots | `DeepFace.analyze` on frames |
| **Embeddings** | Exports the face vector (128–4096 numbers, depending on the model) as JSON | `DeepFace.represent` |

The **Settings** panel picks the recognition model (VGG-Face, Facenet, Facenet512, ArcFace, SFace, GhostFaceNet, OpenFace, DeepFace, DeepID, Dlib), the face detector (opencv, retinaface, mtcnn, ssd, yunet, centerface, yolov8, mediapipe, dlib, skip), the distance metric (cosine, euclidean, euclidean_l2), face alignment and box expansion. FaceLens remembers your choices.

Drag and drop photos onto any image area, or click one to browse. Results export as labelled images or JSON.

## Get the app

**Easiest: download the build.** The GitHub Actions workflow `FaceLens Windows app` builds the app on Windows whenever this folder changes. Open the repository's **Actions** tab, choose the latest run, and download:

- `FaceLens-Setup-<version>` for the installer (Start menu shortcut, optional desktop icon, uninstaller), or
- `FaceLens-portable-<version>` for a zip you unzip and run (`FaceLens\FaceLens.exe`).

Pushing a tag such as `facelens-v1.0.0` also publishes both files as a GitHub release.

Windows may show a SmartScreen warning because the app isn't code-signed. Choose **More info → Run anyway**.

**Run from source.** Install 64-bit [Python 3.10–3.12](https://www.python.org/downloads/windows/) and tick "Add python.exe to PATH". Then double-click `run.bat`. The first run sets up a private environment (`.venv`) and installs DeepFace, TensorFlow and Qt, which takes a few minutes and about 1.5 GB.

**Build it yourself.** Double-click `build.bat`. It makes `dist\FaceLens\FaceLens.exe`. If [Inno Setup 6](https://jrsoftware.org/isdl.php) is installed, it also makes `dist\FaceLens-Setup.exe`.

## First use

Each model downloads its weights the first time you use it, to `%USERPROFILE%\.deepface\weights` (**Help → Open model folder**). The age and gender models are about 540 MB each, Facenet512 about 95 MB, and the others are smaller. After that, everything works offline.

## Tips

- **Accuracy:** Facenet512 (the default) and ArcFace are the most accurate recognition models. For hard photos (small, tilted or partly hidden faces), switch the detector to `retinaface` or `mtcnn`.
- **Speed:** `opencv` and `yunet` are the fastest detectors, which helps for the live camera. Raise "Re-analyze every" if the webcam view feels slow.
- **Find:** the first search of a folder indexes every photo and saves an index file (`ds_model_…`) in that folder, so later searches are quick. The index updates itself when photos are added or removed. Tick **Rebuild index** to start over.
- **No face found?** Untick **Require a face** to process the whole photo anyway.
- **mediapipe, yolov8 and dlib** need extra packages (`pip install mediapipe`, `ultralytics` or `dlib`) and aren't included in the built app.
- Logs go to `%LOCALAPPDATA%\FaceLens\facelens.log`.

## Please use it kindly

Age, gender, emotion and race are statistical guesses from a photo. They are often wrong and say nothing certain about who a person is. Ask before analyzing someone's face, and don't use the results to judge or sort people.

## Files

| File | Purpose |
|---|---|
| `facelens.py` | The whole app (PySide6 / Qt user interface plus DeepFace) |
| `requirements.txt` | Python packages |
| `run.bat` | Run from source |
| `build.bat`, `facelens.spec`, `version_info.txt` | Build `FaceLens.exe` with PyInstaller |
| `installer.iss`, `facelens.ico` | Inno Setup installer and app icon |
| `../../.github/workflows/facelens-windows.yml` | Builds, self-tests and publishes the Windows app |

`python facelens.py --self-test photoA.jpg photoB.jpg` runs a headless check (analyze and verify) and prints the result as JSON. The build pipeline uses it to test both the source and the finished `.exe`.

DeepFace is MIT-licensed, by Sefik Ilkin Serengil.
