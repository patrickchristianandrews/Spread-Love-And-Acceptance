# PyInstaller recipe for FaceLens.  Build with:  pyinstaller --noconfirm facelens.spec
# Produces dist\FaceLens\FaceLens.exe (a folder build: it starts much faster than a single-file
# build, because TensorFlow doesn't have to be unpacked to a temp folder on every launch).
from PyInstaller.utils.hooks import collect_all, collect_data_files, collect_submodules

datas, binaries, hiddenimports = [("facelens.ico", ".")], [], []

# DeepFace loads its models and detectors by name at run time, so PyInstaller can't see them.
for pkg in ("deepface", "retinaface", "mtcnn", "tf_keras", "gdown", "onnxruntime", "insightface"):
    try:
        d, b, h = collect_all(pkg)
    except Exception:
        continue
    datas += d
    binaries += b
    hiddenimports += h

# OpenCV's face-detector files (cv2/data/haarcascade_*.xml): without them DeepFace's default
# "opencv" detector tries to download them on every machine.
datas += collect_data_files("cv2", subdir="data", includes=["*.xml"])

hiddenimports += collect_submodules("deepface")
hiddenimports += ["tf_keras", "tensorflow", "pandas", "PySide6.QtSvg"]

a = Analysis(
    ["facelens.py"],
    pathex=[],
    binaries=binaries,
    datas=datas,
    hiddenimports=hiddenimports,
    hookspath=[],
    runtime_hooks=[],
    # Big optional packages DeepFace can use but FaceLens doesn't ship.
    excludes=["torch", "torchvision", "ultralytics", "matplotlib", "IPython", "jupyter", "notebook", "tkinter"],
    noarchive=False,
)
pyz = PYZ(a.pure)

exe = EXE(
    pyz,
    a.scripts,
    [],
    exclude_binaries=True,
    name="FaceLens",
    icon="facelens.ico",
    console=False,
    upx=False,
    version="version_info.txt",
)
coll = COLLECT(exe, a.binaries, a.datas, strip=False, upx=False, name="FaceLens")
