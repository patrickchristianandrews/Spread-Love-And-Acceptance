# FaceLens: a Windows app for DeepFace

FaceLens is a desktop app for Windows built on [DeepFace](https://github.com/serengil/deepface), the open-source Python face recognition and facial attribute analysis library ([overview](https://viso.ai/computer-vision/deepface/)). Everything runs on your own PC. No photo is uploaded anywhere.

| Tab | What it does | DeepFace call |
|---|---|---|
| **Analyze** | Finds every face in a photo and estimates age, gender, emotion and race, with a labelled image and every score. Optional 106-point landmarks, a photo-quality check (size, sharpness, lighting, angle) and a liveness score. **Search this photo online** sends the picture to TinEye, Google Lens or Bing to find copies of it | `DeepFace.analyze` |
| **Verify** | Decides whether two photos show the same person, and shows the distance and threshold | `DeepFace.verify` |
| **Find** | Searches a folder of photos (sub-folders included) for the person in a query photo | `DeepFace.find` |
| **People** | Sorts a photo library into the people in it, lets you name each group, and exports a list or one folder per person. **Import Facebook download** copies the photos out of your own Facebook data export | FaceLens index + grouping |
| **Investigate** | Research case mode: searches a gallery you're authorised to use, with a required case number, examiner and purpose, human review of every candidate, a tamper-evident audit log and an HTML case report | FaceLens index |
| **Live camera** | Labels faces from your webcam in real time, with snapshots | `DeepFace.analyze` on frames |
| **Video** | Finds when a person appears in your own video files, and blurs faces in photos or videos (everyone, everyone except one person, or only one person) | FaceLens engines |
| **Embeddings** | Exports the face vector (128–4096 numbers, depending on the model) as JSON | `DeepFace.represent` |
| **Benchmark** | Measures each engine's accuracy on a labelled set of photos, including on blurred, low-resolution, covered or altered (for example Fawkes-cloaked) copies | FaceLens engines |
| **API server** | Shares one gallery with other tools and researchers over a local REST API with an API key and an audit log | FaceLens engines |

The **Settings** panel picks the recognition model (VGG-Face, Facenet, Facenet512, ArcFace, SFace, GhostFaceNet, OpenFace, DeepFace, DeepID, Dlib), the face detector (opencv, retinaface, mtcnn, ssd, yunet, centerface, yolov8, mediapipe, dlib, skip), the distance metric (cosine, euclidean, euclidean_l2), face alignment and box expansion. FaceLens remembers your choices.

Drag and drop photos onto any image area, or click one to browse. Results export as labelled images or JSON.

### Optional engine: InsightFace (research use only)

The first entry in **Recognition model** is **InsightFace buffalo_l**, from [deepinsight/insightface](https://github.com/deepinsight/insightface). It uses InsightFace's own face detector (SCRFD) and ArcFace recognition model, and it is the most accurate option in FaceLens. On DeepFace's test photos it kept same-person distances between 0.28 and 0.32 and put a different person at 1.01. It also matched two photos that Facenet512 missed.

- It powers **Verify**, **Find** and **Embeddings**. Analyze and Live camera still use DeepFace.
- Two people count as the same when the cosine distance is 0.65 or less (similarity 0.35 or more).
- **Find** saves an index (`facelens_insightface_index.npz`) in the searched folder. Only new or changed photos are processed on later searches, and a search is a single matrix product, so it stays quick on large folders.
- The first use downloads the models (about 280 MB) to `%USERPROFILE%\.insightface\models`.
- **Licence:** InsightFace's code is MIT, but **its pretrained models are for non-commercial research only**. Commercial or operational use needs a licence from InsightFace. FaceLens shows this notice the first time you pick the engine.
- Install it with `--no-deps` (`run.bat`, `build.bat` and the build workflow already do). Its package asks for `opencv-python`, which would replace the OpenCV build DeepFace needs and break DeepFace's `opencv` detector.

## The research and case tools

**Investigate (case mode).** Every search needs a case number, an examiner and a purpose or authority (for example a study approval number). Results are a ranked list of candidates for a person to check, never an identification. Each candidate is shown side by side with the probe photo and has to be marked *Possible match*, *Not a match* or *Inconclusive*; a possible match needs a written reason. Photo-quality warnings travel with every result.

- **Gallery:** any folder of photos you're entitled to search. **Import records CSV** copies a records export (a CSV listing photo files, record numbers and names; column names are matched loosely) into the gallery and keeps the record numbers in `gallery_manifest.csv`.
- **Audit log:** every case writes `%LOCALAPPDATA%\FaceLens\audit\case-<number>.jsonl`. Each line stores the SHA-256 of the line before it, so **Verify audit log** reports any line that was edited, removed or reordered later.
- **Report:** **Export case report** writes one self-contained HTML file with the case details, the probe and its SHA-256, the engine and threshold, every candidate with its face, distance and review decision, and the log's integrity check.

**People.** Groups faces by person with the current engine. **Strict** (on by default) uses a tighter match so different people rarely share a group, at the cost of sometimes splitting one person. Names are saved in `facelens_people.json` in the library folder and carried over when you group again after adding photos. Facebook's export (Settings → Your information → Download your information) contains your own photos and the ones you're tagged in.

**Video.** Find checks one frame every N seconds (1 s by default) and groups the hits into appearances you can click through, export as CSV or save as frames. Redact covers each face with blur, pixelation or a solid box, slightly larger than the face. Output videos are MP4 without sound. Review a redacted file before sharing it: a face the detector misses (very small or turned away) isn't covered.

**Benchmark and robustness.** Point it at a folder with one sub-folder per person (or a CSV of file and identity). It compares every pair of photos and reports, for each engine, accuracy at the engine's threshold, how often different people are wrongly matched (FMR), how often the same person is missed (FNMR), the equal error rate, and the match rate at 1% and 0.1% false matches. The **robustness** options repeat the test with blurred, noisy, heavily compressed, low-resolution, covered or darkened copies, or with your own altered copies (for example Fawkes output, `<name>_cloaked.png`) from a mirror folder.

**API server.** Starts a local REST server (`/health`, `/detect`, `/verify`, `/embed`, `/search`, `/gallery/enroll`, `/gallery/refresh`) that answers in JSON, with images sent as base64. Every call except `/health` needs the `X-Api-Key` header. A new key is made each session and never saved. Each call is written to `%LOCALAPPDATA%\FaceLens\audit\api.jsonl` with an optional `X-Case-Id` and `X-User` (never the images). It listens on 127.0.0.1 only unless you choose otherwise, and the traffic isn't encrypted, so keep it on a trusted network. You can run it without the window: `FaceLens.exe --serve --gallery D:\gallery --port 8765`. The key is written to `facelens.log`.

**Dlib.** The DeepFace "Dlib" model and detector work out of the box. The `dlib-bin` package is a prebuilt dlib, so no compiler is needed.

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
| `facelens.py` | The main app: user interface, engines, shared index, audit log, quality and liveness checks |
| `fl_people.py`, `fl_investigate.py`, `fl_video.py`, `fl_bench.py`, `fl_server.py` | The People, Investigate, Video, Benchmark and API server tabs |
| `requirements.txt` | Python packages |
| `requirements-insightface.txt` | Packages for the optional InsightFace engine (then `pip install --no-deps insightface==2.1`) |
| `run.bat` | Run from source |
| `build.bat`, `facelens.spec`, `version_info.txt` | Build `FaceLens.exe` with PyInstaller |
| `installer.iss`, `facelens.ico` | Inno Setup installer and app icon |
| `../../.github/workflows/facelens-windows.yml` | Builds, self-tests and publishes the Windows app |

`python facelens.py --self-test photoA.jpg photoB.jpg` runs a headless check (analyze and verify with DeepFace, plus verify with InsightFace) and prints the result as JSON. The build pipeline uses it to test both the source and the finished `.exe`.

DeepFace is MIT-licensed, by Sefik Ilkin Serengil.
