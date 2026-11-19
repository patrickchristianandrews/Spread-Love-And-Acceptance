"""
FaceLens - a Windows desktop app for the DeepFace face-analysis library.

Features (all run locally, nothing is uploaded):
  * Analyze  - estimate age, gender, emotion and race for every face in a photo
  * Verify   - decide whether two photos show the same person
  * Find     - search a folder of photos for faces that match a query photo
  * Live     - real-time webcam analysis with on-screen labels
  * Embed    - export the numeric face embedding (vector) for a photo

DeepFace: https://github.com/serengil/deepface (MIT licence)
"""

from __future__ import annotations

import importlib
import inspect
import json
import os
import sys
import threading
import time
import traceback
from dataclasses import dataclass, field
from pathlib import Path

import cv2
import numpy as np
from PySide6.QtCore import (
    QObject,
    QSettings,
    QSize,
    Qt,
    QTimer,
    QUrl,
    Signal,
)
from PySide6.QtGui import QAction, QDesktopServices, QFont, QIcon, QImage, QPixmap
from PySide6.QtWidgets import (
    QAbstractItemView,
    QApplication,
    QCheckBox,
    QComboBox,
    QDoubleSpinBox,
    QFileDialog,
    QFormLayout,
    QFrame,
    QGroupBox,
    QHBoxLayout,
    QHeaderView,
    QLabel,
    QLineEdit,
    QListWidget,
    QListWidgetItem,
    QMainWindow,
    QMenu,
    QMessageBox,
    QProgressBar,
    QPushButton,
    QSizePolicy,
    QSpinBox,
    QSplitter,
    QStatusBar,
    QTableWidget,
    QTableWidgetItem,
    QTabWidget,
    QTextEdit,
    QVBoxLayout,
    QWidget,
)

APP_NAME = "FaceLens"
APP_VERSION = "1.1.0"

# (module, class, tab title) for the add-on tabs, each in its own fl_*.py file.
ADDON_TABS = [
    ("fl_people", "PeopleTab", "People"),
    ("fl_investigate", "InvestigateTab", "Investigate"),
    ("fl_video", "VideoTab", "Video"),
    ("fl_bench", "BenchmarkTab", "Benchmark"),
    ("fl_server", "ServerTab", "API server"),
]

INSIGHT_MODEL = "InsightFace buffalo_l (research only)"
MODELS = [
    INSIGHT_MODEL,
    "VGG-Face",
    "Facenet",
    "Facenet512",
    "ArcFace",
    "SFace",
    "GhostFaceNet",
    "OpenFace",
    "DeepFace",
    "DeepID",
    "Dlib",
]
DETECTORS = [
    "opencv",
    "retinaface",
    "mtcnn",
    "ssd",
    "yunet",
    "centerface",
    "yolov8",
    "mediapipe",
    "dlib",
    "skip",
]
METRICS = ["cosine", "euclidean", "euclidean_l2"]
ACTIONS = ["age", "gender", "emotion", "race"]
IMAGE_FILTER = "Images (*.jpg *.jpeg *.png *.bmp *.webp *.tif *.tiff)"
IMAGE_EXTS = {".jpg", ".jpeg", ".png", ".bmp", ".webp", ".tif", ".tiff"}

# Box colours (BGR) for OpenCV drawing.
GREEN = (80, 200, 80)
RED = (60, 60, 230)
BLUE = (230, 160, 40)
WHITE = (255, 255, 255)

# Only one DeepFace call at a time: TensorFlow models are shared between tabs.
DEEPFACE_LOCK = threading.Lock()


# --------------------------------------------------------------------------------------
# DeepFace access
# --------------------------------------------------------------------------------------

_deepface_module = None


def deepface():
    """Import DeepFace lazily: TensorFlow takes several seconds to load."""
    global _deepface_module
    if _deepface_module is None:
        os.environ.setdefault("TF_CPP_MIN_LOG_LEVEL", "2")
        from deepface import DeepFace  # noqa: WPS433 (deliberate lazy import)

        _deepface_module = DeepFace
    return _deepface_module


@dataclass
class Options:
    model_name: str = "VGG-Face"
    detector_backend: str = "opencv"
    distance_metric: str = "cosine"
    enforce_detection: bool = True
    align: bool = True
    expand_percentage: int = 0
    actions: list[str] = field(default_factory=lambda: list(ACTIONS))


def read_image(path: str) -> np.ndarray:
    """Read an image as BGR. np.fromfile handles non-ASCII Windows paths, unlike cv2.imread."""
    data = np.fromfile(path, dtype=np.uint8)
    img = cv2.imdecode(data, cv2.IMREAD_COLOR)
    if img is None:
        raise ValueError(f"Could not read image: {path}")
    return img


def write_image(path: str, img: np.ndarray) -> None:
    ext = Path(path).suffix or ".png"
    ok, buf = cv2.imencode(ext, img)
    if not ok:
        raise ValueError(f"Could not save image as {ext}")
    buf.tofile(path)


def to_qpixmap(img_bgr: np.ndarray) -> QPixmap:
    rgb = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2RGB)
    h, w, ch = rgb.shape
    qimg = QImage(rgb.data, w, h, ch * w, QImage.Format.Format_RGB888)
    return QPixmap.fromImage(qimg.copy())


def draw_label(img: np.ndarray, x: int, y: int, w: int, h: int, lines: list[str], color) -> None:
    """Draw a face box with a stack of text lines above (or inside) it."""
    thickness = max(2, round(min(img.shape[:2]) / 300))
    cv2.rectangle(img, (x, y), (x + w, y + h), color, thickness)
    scale = max(0.45, min(img.shape[:2]) / 900)
    line_h = int(24 * scale) + 6
    top = y - line_h * len(lines) - 4
    if top < 0:
        top = y + 4
    for i, text in enumerate(lines):
        (tw, th), _ = cv2.getTextSize(text, cv2.FONT_HERSHEY_SIMPLEX, scale, 1)
        ty = top + i * line_h
        cv2.rectangle(img, (x, ty), (x + tw + 8, ty + line_h), color, -1)
        cv2.putText(
            img, text, (x + 4, ty + line_h - 6), cv2.FONT_HERSHEY_SIMPLEX, scale, WHITE, 1, cv2.LINE_AA
        )


def region_of(face: dict) -> tuple[int, int, int, int]:
    r = face.get("region") or face.get("facial_area") or {}
    return int(r.get("x", 0)), int(r.get("y", 0)), int(r.get("w", 0)), int(r.get("h", 0))


def summary_lines(face: dict) -> list[str]:
    lines = []
    if "age" in face:
        lines.append(f"Age ~{int(round(face['age']))}")
    if "dominant_gender" in face:
        g = face["dominant_gender"]
        pct = face.get("gender", {}).get(g)
        lines.append(f"{g} {pct:.0f}%" if pct is not None else g)
    if "dominant_emotion" in face:
        e = face["dominant_emotion"]
        lines.append(f"{e} {face.get('emotion', {}).get(e, 0):.0f}%")
    if "dominant_race" in face:
        r = face["dominant_race"]
        lines.append(f"{r} {face.get('race', {}).get(r, 0):.0f}%")
    return lines


def jsonable(obj):
    """Convert numpy types so results can be written as JSON."""
    if isinstance(obj, dict):
        return {str(k): jsonable(v) for k, v in obj.items()}
    if isinstance(obj, (list, tuple)):
        return [jsonable(v) for v in obj]
    if isinstance(obj, np.generic):
        return obj.item()
    if isinstance(obj, np.ndarray):
        return obj.tolist()
    return obj


# --------------------------------------------------------------------------------------
# InsightFace engine (optional, non-commercial research licence)
# --------------------------------------------------------------------------------------

INSIGHT_THRESHOLD = 0.65  # cosine distance; same person below this (= similarity above 0.35)
INSIGHT_INDEX = "facelens_insightface_index.npz"
INSIGHT_LICENCE = (
    "InsightFace's pretrained models (buffalo_l) are licensed for non-commercial research only. "
    "Commercial use needs a licence from InsightFace (insightface.ai). "
    "The first use downloads about 280 MB to %USERPROFILE%\\.insightface\\models."
)


class InsightEngine:
    """Face detection (SCRFD) and recognition (ArcFace ResNet50, 512-number vectors) from InsightFace."""

    _app = None

    @classmethod
    def app(cls):
        if cls._app is None:
            try:
                from insightface.app import FaceAnalysis  # noqa: WPS433 - optional dependency
            except ImportError as exc:
                raise ImportError(
                    "No module named 'insightface' - install it with: pip install --no-deps insightface"
                ) from exc
            fa = FaceAnalysis(
                name="buffalo_l", allowed_modules=["detection", "recognition"], providers=["CPUExecutionProvider"]
            )
            fa.prepare(ctx_id=-1, det_size=(640, 640))
            cls._app = fa
        return cls._app

    @staticmethod
    def _box(face) -> dict:
        x1, y1, x2, y2 = (int(round(v)) for v in face.bbox)
        return {"x": max(0, x1), "y": max(0, y1), "w": x2 - x1, "h": y2 - y1}

    @classmethod
    def faces(cls, img: np.ndarray, require: bool = True) -> list:
        found = cls.app().get(img)
        if not found and require:
            raise ValueError("Face could not be detected in the image.")
        # Largest face first.
        return sorted(found, key=lambda f: -(f.bbox[2] - f.bbox[0]) * (f.bbox[3] - f.bbox[1]))

    @classmethod
    def represent(cls, img: np.ndarray) -> list[dict]:
        return [
            {
                "embedding": f.normed_embedding.astype(float).tolist(),
                "facial_area": cls._box(f),
                "face_confidence": float(f.det_score),
            }
            for f in cls.faces(img)
        ]

    @classmethod
    def verify(cls, a: np.ndarray, b: np.ndarray) -> dict:
        t0 = time.time()
        fa, fb = cls.faces(a)[0], cls.faces(b)[0]
        distance = max(0.0, 1.0 - float(fa.normed_embedding @ fb.normed_embedding))
        return {
            "verified": distance <= INSIGHT_THRESHOLD,
            "distance": distance,
            "threshold": INSIGHT_THRESHOLD,
            "model": "InsightFace buffalo_l",
            "detector_backend": "scrfd",
            "similarity_metric": "cosine",
            "facial_areas": {"img1": cls._box(fa), "img2": cls._box(fb)},
            "time": time.time() - t0,
        }

    @classmethod
    def find(cls, img: np.ndarray, db: str, rebuild: bool = False) -> tuple[list[dict], int]:
        query = cls.faces(img)
        index = FaceIndex(db, Options(model_name=INSIGHT_MODEL)).build(rebuild)
        rows = []
        for q in query:
            for hit in index.search(q.normed_embedding.astype(np.float32), INSIGHT_THRESHOLD):
                rows.append({"identity": hit["path"], "distance": hit["distance"],
                             "threshold": INSIGHT_THRESHOLD, "box": hit["box"]})
        return rows, len(query)


# --------------------------------------------------------------------------------------
# Shared building blocks for every engine (used by Investigate, People, Benchmark, Video, API)
# --------------------------------------------------------------------------------------


@dataclass
class FaceVec:
    """One detected face: its box (x, y, w, h), a unit-length embedding and the detector score."""

    box: tuple[int, int, int, int]
    emb: np.ndarray
    score: float = 0.0
    kps: np.ndarray | None = None  # five facial keypoints (InsightFace only)


def engine_name(opts: Options) -> str:
    return "InsightFace buffalo_l" if opts.model_name == INSIGHT_MODEL else f"{opts.model_name} / {opts.detector_backend}"


def engine_slug(opts: Options) -> str:
    """Short, file-safe engine id, used to keep one saved index per engine."""
    if opts.model_name == INSIGHT_MODEL:
        return "insightface"
    raw = f"{opts.model_name}-{opts.detector_backend}-{'a' if opts.align else 'n'}{opts.expand_percentage}"
    return "".join(c if c.isalnum() else "_" for c in raw).lower()


def match_threshold(opts: Options) -> float:
    """Cosine distance at or below which two faces count as the same person, for this engine."""
    if opts.model_name == INSIGHT_MODEL:
        return INSIGHT_THRESHOLD
    try:
        deepface()
        from deepface.modules.verification import find_threshold  # noqa: WPS433

        return float(find_threshold(opts.model_name, "cosine"))
    except Exception:  # noqa: BLE001
        return 0.40


def embed_faces(img: np.ndarray, opts: Options) -> list[FaceVec]:
    """Every face in img, largest first, with unit-length embeddings from the chosen engine.
    Returns [] when no face is found (never a whole-image stand-in)."""
    if opts.model_name == INSIGHT_MODEL:
        out = []
        for f in InsightEngine.faces(img, require=False):
            b = InsightEngine._box(f)
            out.append(FaceVec((b["x"], b["y"], b["w"], b["h"]), f.normed_embedding.astype(np.float32),
                               float(f.det_score), np.array(f.kps, dtype=np.float32)))
        return out
    try:
        reps = deepface().represent(
            img_path=img,
            model_name=opts.model_name,
            detector_backend=opts.detector_backend,
            enforce_detection=True,
            align=opts.align,
            expand_percentage=opts.expand_percentage,
        )
    except ValueError as exc:
        if "could not be detected" in str(exc).lower():
            return []
        raise
    out = []
    for r in reps:
        emb = np.asarray(r["embedding"], dtype=np.float32)
        n = float(np.linalg.norm(emb)) or 1.0
        x, y, w, h = region_of(r)
        out.append(FaceVec((x, y, w, h), emb / n, float(r.get("face_confidence") or 0)))
    out.sort(key=lambda f: -f.box[2] * f.box[3])
    return out


class FaceIndex:
    """A saved, incrementally updated index of every face in a folder of photos, for one engine.

    Stored as <folder>/facelens_index_<engine>.npz. Unchanged photos (same size and modified time)
    are reused, so only new or edited photos are processed. Searching is one matrix product."""

    def __init__(self, folder: str, opts: Options):
        self.folder = Path(folder)
        self.opts = opts
        slug = engine_slug(opts)
        name = INSIGHT_INDEX if slug == "insightface" else f"facelens_index_{slug}.npz"
        self.path = self.folder / name
        self.files: list[str] = []
        self.face_file = np.zeros(0, dtype=np.int64)
        self.boxes = np.zeros((0, 4), dtype=np.int64)
        self.embs = np.zeros((0, 0), dtype=np.float32)

    def build(self, rebuild: bool = False, progress=None, cancelled=None) -> "FaceIndex":
        old: dict[str, tuple] = {}
        old_faces: dict[int, list] = {}
        if self.path.exists() and not rebuild:
            try:
                with np.load(self.path, allow_pickle=False) as z:
                    for i, rel in enumerate(z["files"]):
                        old[str(rel)] = (float(z["mtimes"][i]), int(z["sizes"][i]), i)
                    for j, owner in enumerate(z["face_file"]):
                        old_faces.setdefault(int(owner), []).append((z["boxes"][j], z["embs"][j]))
            except Exception:  # noqa: BLE001 - a damaged index is simply rebuilt
                old, old_faces = {}, {}
        paths = [p for p in sorted(self.folder.rglob("*")) if p.suffix.lower() in IMAGE_EXTS and p.is_file()]
        files, mtimes, sizes, face_file, boxes, embs = [], [], [], [], [], []
        changed = False
        for n, path in enumerate(paths):
            if cancelled and cancelled():
                raise RuntimeError("Cancelled.")
            rel = path.relative_to(self.folder).as_posix()
            st = path.stat()
            fi = len(files)
            files.append(rel)
            mtimes.append(st.st_mtime)
            sizes.append(st.st_size)
            prev = old.get(rel)
            if prev and prev[:2] == (st.st_mtime, st.st_size):
                for box, emb in old_faces.get(prev[2], []):
                    face_file.append(fi)
                    boxes.append(box)
                    embs.append(emb)
                continue
            changed = True
            if progress:
                progress(n + 1, len(paths), rel)
            try:
                img = read_image(str(path))
            except ValueError:
                continue
            for f in embed_faces(img, self.opts):
                face_file.append(fi)
                boxes.append(list(f.box))
                embs.append(f.emb)
        dim = len(embs[0]) if embs else 0
        self.files = files
        self.face_file = np.array(face_file, dtype=np.int64)
        self.boxes = np.array(boxes, dtype=np.int64).reshape(-1, 4)
        self.embs = np.array(embs, dtype=np.float32).reshape(-1, dim)
        if changed or rebuild or len(files) != len(old) or not self.path.exists():
            tmp = self.path.with_name(self.path.stem + ".tmp.npz")
            np.savez(tmp, files=np.array(files, dtype=str), mtimes=np.array(mtimes, dtype=np.float64),
                     sizes=np.array(sizes, dtype=np.int64), face_file=self.face_file, boxes=self.boxes,
                     embs=self.embs)
            os.replace(tmp, self.path)
        return self

    def search(self, emb: np.ndarray, threshold: float | None = None, top: int | None = None) -> list[dict]:
        """Faces closest to emb, nearest first. Each: path, distance, box, face index."""
        if not len(self.embs):
            return []
        dist = np.clip(1.0 - self.embs @ emb.astype(np.float32), 0.0, 2.0)
        order = np.argsort(dist)
        if threshold is not None:
            order = order[dist[order] <= threshold]
        if top:
            order = order[:top]
        return [
            {
                "path": str(self.folder / self.files[self.face_file[j]]),
                "distance": float(dist[j]),
                "box": tuple(int(v) for v in self.boxes[j]),
                "face": int(j),
            }
            for j in order
        ]


class AuditLog:
    """Append-only, hash-chained JSON-lines log. Each entry stores the SHA-256 of the previous entry,
    so editing or deleting any line breaks the chain from that point on (see verify())."""

    def __init__(self, path: str | Path):
        self.path = Path(path)
        self.path.parent.mkdir(parents=True, exist_ok=True)
        self._lock = threading.Lock()

    def _last_hash(self) -> str:
        last = "0" * 64
        if self.path.exists():
            with open(self.path, encoding="utf-8") as fh:
                for line in fh:
                    if line.strip():
                        last = json.loads(line)["hash"]
        return last

    def append(self, event: str, **fields) -> dict:
        import hashlib
        import getpass

        with self._lock:
            entry = {
                "time": time.strftime("%Y-%m-%dT%H:%M:%S%z"),
                "computer_user": getpass.getuser(),
                "event": event,
                **jsonable(fields),
                "prev": self._last_hash(),
            }
            body = json.dumps(entry, sort_keys=True, ensure_ascii=False)
            entry["hash"] = hashlib.sha256(body.encode("utf-8")).hexdigest()
            with open(self.path, "a", encoding="utf-8") as fh:
                fh.write(json.dumps(entry, sort_keys=True, ensure_ascii=False) + "\n")
            return entry

    def entries(self) -> list[dict]:
        if not self.path.exists():
            return []
        with open(self.path, encoding="utf-8") as fh:
            return [json.loads(line) for line in fh if line.strip()]

    def verify(self) -> tuple[bool, str]:
        import hashlib

        prev = "0" * 64
        for n, entry in enumerate(self.entries(), 1):
            stored = entry.pop("hash", "")
            if entry.get("prev") != prev:
                return False, f"Entry {n} does not follow entry {n - 1}: lines were removed, reordered or edited."
            body = json.dumps(entry, sort_keys=True, ensure_ascii=False)
            if hashlib.sha256(body.encode("utf-8")).hexdigest() != stored:
                return False, f"Entry {n} was changed after it was written."
            prev = stored
        return True, f"All {len(self.entries())} entries are intact."


def data_dir() -> Path:
    base = Path(os.environ.get("LOCALAPPDATA") or Path.home() / ".local" / "share") / APP_NAME
    base.mkdir(parents=True, exist_ok=True)
    return base


def quality_check(img: np.ndarray, box: tuple[int, int, int, int], kps: np.ndarray | None = None) -> dict:
    """Simple, explainable photo-quality checks for one face. Matching is least reliable on
    small, blurry, badly lit or side-on faces, so these warnings travel with every result."""
    x, y, w, h = box
    crop = img[max(0, y): y + h, max(0, x): x + w]
    warnings = []
    metrics = {"face_pixels": int(min(w, h))}
    if min(w, h) < 80:
        warnings.append(f"small face ({min(w, h)} px; 112+ px is better)")
    if crop.size:
        gray = cv2.cvtColor(crop, cv2.COLOR_BGR2GRAY)
        sharp = float(cv2.Laplacian(cv2.resize(gray, (160, 160)), cv2.CV_64F).var())
        bright = float(gray.mean())
        metrics.update(sharpness=round(sharp, 1), brightness=round(bright, 1))
        if sharp < 60:
            warnings.append("blurry")
        if bright < 55:
            warnings.append("too dark")
        elif bright > 210:
            warnings.append("overexposed")
    if kps is not None and len(kps) >= 3:
        left, right, nose = kps[0], kps[1], kps[2]
        eye_dist = float(np.linalg.norm(right - left)) or 1.0
        yaw = float((nose[0] - (left[0] + right[0]) / 2) / eye_dist)
        roll = float(np.degrees(np.arctan2(right[1] - left[1], right[0] - left[0])))
        metrics.update(yaw=round(yaw, 2), roll_degrees=round(roll, 1))
        if abs(yaw) > 0.35:
            warnings.append("face turned to the side")
        if abs(roll) > 25:
            warnings.append("head tilted")
    metrics["ok"] = not warnings
    return {"warnings": warnings, **metrics}


class Extras:
    """Optional InsightFace extras: 106-point landmarks and the liveness (anti-spoofing) add-on."""

    _landmark_app = None
    _liveness = None

    @classmethod
    def landmarks(cls, img: np.ndarray) -> list[tuple[tuple[int, int, int, int], np.ndarray]]:
        if cls._landmark_app is None:
            InsightEngine.app()  # same install check and error message
            from insightface.app import FaceAnalysis  # noqa: WPS433

            fa = FaceAnalysis(name="buffalo_l", allowed_modules=["detection", "landmark_2d_106"],
                              providers=["CPUExecutionProvider"])
            fa.prepare(ctx_id=-1, det_size=(640, 640))
            cls._landmark_app = fa
        out = []
        for f in cls._landmark_app.get(img):
            b = InsightEngine._box(f)
            pts = getattr(f, "landmark_2d_106", None)
            if pts is not None:
                out.append(((b["x"], b["y"], b["w"], b["h"]), np.asarray(pts)))
        return out

    @classmethod
    def liveness(cls, img: np.ndarray, kps: np.ndarray) -> dict:
        """Probability that the face is a live person rather than a printed photo or screen.
        Only meaningful for photos taken straight from a camera; a re-shot or edited image scores low."""
        if cls._liveness is None:
            InsightEngine.app()
            from insightface.addons import Liveness, ensure_addon  # noqa: WPS433

            model = Liveness(ensure_addon("liveness"), providers=["CPUExecutionProvider"])
            model.prepare(ctx_id=-1)
            cls._liveness = model
        return cls._liveness.predict(img, kps)


def draw_landmarks(img: np.ndarray, pts: np.ndarray, color=(80, 230, 255)) -> None:
    r = max(1, round(min(img.shape[:2]) / 400))
    for px, py in pts.astype(int):
        cv2.circle(img, (int(px), int(py)), r, color, -1, cv2.LINE_AA)


def friendly_error(exc: BaseException) -> str:
    msg = str(exc)
    if "Face could not be detected" in msg or "face could not be detected" in msg.lower():
        return (
            "No face was found in the image.\n\n"
            "Try a clearer, front-facing photo, choose a stronger detector (retinaface or mtcnn), "
            "or untick 'Require a face' in Settings."
        )
    if "No module named" in msg:
        mod = msg.split("'")[1] if "'" in msg else msg
        return (
            f"This option needs an extra Python package that isn't installed: {mod}\n\n"
            f"Install it with:  pip install {mod}\n"
            "or pick a different model / detector in Settings."
        )
    if "urlopen" in msg or "download" in msg.lower() or "HTTP" in msg:
        return (
            "A model file could not be downloaded. The first use of each model downloads its weights "
            "(to %USERPROFILE%\\.deepface\\weights). Check your internet connection and try again.\n\n"
            + msg
        )
    return msg


# --------------------------------------------------------------------------------------
# Background work
# --------------------------------------------------------------------------------------


class WorkerSignals(QObject):
    finished = Signal(object)
    failed = Signal(str, str)  # friendly message, full traceback


class Worker:
    """Runs fn(*args) on a background thread and reports back on the UI thread.

    Uses a plain Python thread rather than Qt's thread pool: TensorFlow running inside
    Qt-created threads can crash the interpreter on recent Python versions.
    """

    # Keep each running worker (and its signals object) alive until it reports back,
    # otherwise the garbage collector can delete it and the result never arrives.
    _active: set["Worker"] = set()

    def __init__(self, fn, *args, **kwargs):
        self.fn, self.args, self.kwargs = fn, args, kwargs
        self.signals = WorkerSignals()
        Worker._active.add(self)
        self.signals.finished.connect(self._release)
        self.signals.failed.connect(self._release)

    def _release(self, *_):
        # Wait one event-loop turn: the other slots connected to this signal are still queued,
        # and deleting the signals object now would silently drop them.
        QTimer.singleShot(0, lambda: Worker._active.discard(self))

    def start(self):
        threading.Thread(target=self.run, daemon=True).start()

    def run(self):
        try:
            with DEEPFACE_LOCK:
                result = self.fn(*self.args, **self.kwargs)
        except Exception as exc:  # noqa: BLE001 - every error is shown to the user
            self.signals.failed.emit(friendly_error(exc), traceback.format_exc())
        else:
            self.signals.finished.emit(result)


# --------------------------------------------------------------------------------------
# Reusable widgets
# --------------------------------------------------------------------------------------


class ImageView(QLabel):
    """Shows an image scaled to fit; accepts drag-and-drop and click-to-open."""

    fileDropped = Signal(str)

    def __init__(self, placeholder: str = "Drop a photo here\nor click to browse", parent=None):
        super().__init__(parent)
        self._pixmap: QPixmap | None = None
        self._placeholder = placeholder
        self.setAlignment(Qt.AlignmentFlag.AlignCenter)
        self.setMinimumSize(260, 220)
        self.setSizePolicy(QSizePolicy.Policy.Expanding, QSizePolicy.Policy.Expanding)
        self.setAcceptDrops(True)
        self.setCursor(Qt.CursorShape.PointingHandCursor)
        self.setObjectName("ImageView")
        self.setText(placeholder)

    def set_image(self, img_bgr: np.ndarray | None):
        if img_bgr is None:
            self._pixmap = None
            self.setText(self._placeholder)
            return
        self._pixmap = to_qpixmap(img_bgr)
        self._rescale()

    def _rescale(self):
        if self._pixmap is not None:
            self.setPixmap(
                self._pixmap.scaled(
                    self.size(), Qt.AspectRatioMode.KeepAspectRatio, Qt.TransformationMode.SmoothTransformation
                )
            )

    def resizeEvent(self, event):  # noqa: N802 (Qt naming)
        super().resizeEvent(event)
        self._rescale()

    def mousePressEvent(self, event):  # noqa: N802
        path, _ = QFileDialog.getOpenFileName(self, "Choose a photo", "", IMAGE_FILTER)
        if path:
            self.fileDropped.emit(path)

    def dragEnterEvent(self, event):  # noqa: N802
        if event.mimeData().hasUrls():
            event.acceptProposedAction()

    def dropEvent(self, event):  # noqa: N802
        urls = event.mimeData().urls()
        if urls:
            self.fileDropped.emit(urls[0].toLocalFile())


class BusyMixin:
    """Gives a tab a run button, a busy bar and a common error dialog."""

    status = None  # set by MainWindow: callable(str)

    def make_busy_bar(self) -> QProgressBar:
        bar = QProgressBar()
        bar.setRange(0, 0)
        bar.setMaximumHeight(6)
        bar.setTextVisible(False)
        bar.hide()
        self.busy_bar = bar
        return bar

    def set_busy(self, busy: bool, message: str = ""):
        self.busy_bar.setVisible(busy)
        for btn in getattr(self, "run_buttons", []):
            btn.setEnabled(not busy)
        if message and self.status:
            self.status(message)

    def show_error(self, message: str, details: str = ""):
        self.set_busy(False, "Something went wrong")
        box = QMessageBox(self)
        box.setIcon(QMessageBox.Icon.Warning)
        box.setWindowTitle(APP_NAME)
        box.setText(message)
        if details:
            box.setDetailedText(details)
        box.exec()


# --------------------------------------------------------------------------------------
# Tabs
# --------------------------------------------------------------------------------------


REVERSE_SEARCH = [
    ("TinEye", "https://tineye.com/"),
    ("Google Lens", "https://lens.google.com/"),
    ("Bing Visual Search", "https://www.bing.com/visualsearch"),
]


EXPOSING_AI = "https://exposing.ai/"
DATASET_SOURCES_HTML = (
    "<p>Many well-known face datasets were built from photos collected online without asking the people "
    "in them. <a href='https://exposing.ai/'>exposing.ai</a> documents these datasets and lets you check "
    "whether your own Flickr photos were used.</p>"
    "<p><b>Collected without consent (examples):</b> MegaFace and FairFace (Flickr photos), MS-Celeb-1M "
    "(web photos of public figures; withdrawn by Microsoft in 2019), VGGFace2 and WebFace (web image search), "
    "LFW (news photos). Some of the models in FaceLens were trained on datasets like these.</p>"
    "<p><b>Made with consent or without real people:</b> Meta's "
    "<a href='https://ai.meta.com/datasets/casual-conversations-dataset/'>Casual Conversations</a> (paid, "
    "consenting participants, with age, gender and skin-tone labels for checking bias) and Microsoft's "
    "<a href='https://github.com/microsoft/DigiFace1M'>DigiFace-1M</a> (computer-generated faces). The "
    "Benchmark tab can test the engines on both. Check each dataset's licence before use.</p>"
)


def best_overlap(box, insight_faces):
    """The InsightFace face that overlaps a DeepFace box the most (to borrow its keypoints)."""
    x, y, w, h = box
    best, best_iou = None, 0.2
    for f in insight_faces:
        bx1, by1, bx2, by2 = f.bbox
        ix = max(0.0, min(x + w, bx2) - max(x, bx1))
        iy = max(0.0, min(y + h, by2) - max(y, by1))
        inter = ix * iy
        union = w * h + (bx2 - bx1) * (by2 - by1) - inter
        iou = inter / union if union else 0.0
        if iou > best_iou:
            best, best_iou = f, iou
    return best


def liveness_text(live) -> str:
    if not live:
        return "–"
    if live.get("status") != "ok":
        return "not checked" if live.get("status") == "input_rejected" else "error"
    return f"{'live' if live['is_live'] else 'possible spoof'} ({live['live_score'] * 100:.0f}%)"


class AnalyzeTab(QWidget, BusyMixin):
    def __init__(self, get_options):
        super().__init__()
        self.get_options = get_options
        self.path: str | None = None
        self.image: np.ndarray | None = None
        self.annotated: np.ndarray | None = None
        self.results: list[dict] = []

        self.view = ImageView()
        self.view.fileDropped.connect(self.load)

        self.checks = {}
        actions_row = QHBoxLayout()
        actions_row.addWidget(QLabel("Estimate:"))
        for a in ACTIONS:
            cb = QCheckBox(a.capitalize())
            cb.setChecked(True)
            self.checks[a] = cb
            actions_row.addWidget(cb)
        actions_row.addSpacing(16)
        self.landmarks_cb = QCheckBox("Landmarks")
        self.landmarks_cb.setToolTip("Draw 106 facial landmark points (eyes, brows, nose, lips, jaw). Needs InsightFace.")
        self.quality_cb = QCheckBox("Quality && liveness")
        self.quality_cb.setToolTip(
            "Check each face's size, sharpness, lighting and angle, and estimate whether it is a live person "
            "rather than a photo of a photo or screen (InsightFace liveness add-on, ~1.5 MB download)."
        )
        self.quality_cb.setChecked(True)
        actions_row.addWidget(self.landmarks_cb)
        actions_row.addWidget(self.quality_cb)
        actions_row.addStretch()

        open_btn = QPushButton("Open photo…")
        open_btn.clicked.connect(lambda: self.view.mousePressEvent(None))
        self.run_btn = QPushButton("Analyze faces")
        self.run_btn.setObjectName("Primary")
        self.run_btn.clicked.connect(self.run)
        self.save_img_btn = QPushButton("Save labelled image…")
        self.save_img_btn.clicked.connect(self.save_image)
        self.save_json_btn = QPushButton("Export JSON…")
        self.save_json_btn.clicked.connect(self.save_json)
        self.run_buttons = [self.run_btn]
        self.online_btn = QPushButton("Search this photo online")
        self.online_btn.setToolTip(
            "Find where this exact picture appears on the web (e.g. a fake profile reusing your photos). "
            "These services match the image, not the person's face."
        )
        menu = QMenu(self.online_btn)
        for label, url in REVERSE_SEARCH:
            act = menu.addAction(label)
            act.triggered.connect(lambda _=False, u=url, n=label: self.search_online(n, u))
        self.online_btn.setMenu(menu)

        btns = QHBoxLayout()
        for b in (open_btn, self.run_btn, self.save_img_btn, self.save_json_btn, self.online_btn):
            btns.addWidget(b)
        btns.addStretch()

        self.table = QTableWidget(0, 8)
        self.table.setHorizontalHeaderLabels(["Face", "Age", "Gender", "Emotion", "Race", "Detection", "Quality",
                                              "Liveness"])
        header = self.table.horizontalHeader()
        header.setSectionResizeMode(QHeaderView.ResizeMode.ResizeToContents)
        header.setStretchLastSection(True)
        self.table.verticalHeader().hide()
        self.table.setEditTriggers(QAbstractItemView.EditTrigger.NoEditTriggers)
        self.table.setSelectionBehavior(QAbstractItemView.SelectionBehavior.SelectRows)
        self.table.itemSelectionChanged.connect(self.show_detail)

        self.detail = QTextEdit()
        self.detail.setReadOnly(True)
        self.detail.setPlaceholderText("Select a face to see every score.")

        right = QWidget()
        rl = QVBoxLayout(right)
        rl.setContentsMargins(0, 0, 0, 0)
        rl.addWidget(QLabel("<b>Faces found</b>"))
        rl.addWidget(self.table, 2)
        rl.addWidget(QLabel("<b>All scores</b>"))
        rl.addWidget(self.detail, 3)

        split = QSplitter()
        split.addWidget(self.view)
        split.addWidget(right)
        split.setSizes([520, 600])

        layout = QVBoxLayout(self)
        layout.addLayout(actions_row)
        layout.addLayout(btns)
        layout.addWidget(self.make_busy_bar())
        layout.addWidget(split, 1)
        note = QLabel(
            "Estimates come from statistical models and can be wrong, especially for gender and race. "
            "Treat them as guesses, not facts about a person."
        )
        note.setObjectName("Note")
        note.setWordWrap(True)
        layout.addWidget(note)

    def load(self, path: str):
        try:
            self.image = read_image(path)
        except ValueError as exc:
            self.show_error(str(exc))
            return
        self.path = path
        self.annotated = None
        self.results = []
        self.table.setRowCount(0)
        self.detail.clear()
        self.view.set_image(self.image)
        self.status(f"Loaded {Path(path).name}")

    def run(self):
        if self.image is None:
            self.view.mousePressEvent(None)
            if self.image is None:
                return
        actions = [a for a, cb in self.checks.items() if cb.isChecked()]
        if not actions:
            self.show_error("Choose at least one thing to estimate.")
            return
        opts = self.get_options()
        img = self.image.copy()
        want_landmarks = self.landmarks_cb.isChecked()
        want_quality = self.quality_cb.isChecked()

        def job():
            results = deepface().analyze(
                img_path=img,
                actions=actions,
                detector_backend=opts.detector_backend,
                enforce_detection=opts.enforce_detection,
                align=opts.align,
                expand_percentage=opts.expand_percentage,
                silent=True,
            )
            results = results if isinstance(results, list) else [results]
            extras = {"landmarks": [], "notes": []}
            insight_faces = []
            if want_quality or want_landmarks:
                try:
                    insight_faces = InsightEngine.faces(img, require=False)
                except ImportError:
                    extras["notes"].append("Install InsightFace for landmarks, face angle and liveness.")
            for face in results:
                box = region_of(face)
                match = best_overlap(box, insight_faces)
                kps = np.array(match.kps, dtype=np.float32) if match is not None else None
                if want_quality:
                    face["quality"] = quality_check(img, box, kps)
                    if kps is not None:
                        try:
                            face["liveness"] = Extras.liveness(img, kps)
                        except Exception as exc:  # noqa: BLE001 - liveness is optional
                            face["liveness"] = {"status": "error", "reason": str(exc)[:200]}
            if want_landmarks and insight_faces:
                extras["landmarks"] = [pts for _, pts in Extras.landmarks(img)]
            return results, extras

        worker = Worker(job)
        worker.signals.finished.connect(self.done)
        worker.signals.failed.connect(self.show_error)
        self.set_busy(True, "Analyzing… (the first run downloads models and can take a minute)")
        worker.start()

    def done(self, out):
        results, extras = out
        self.set_busy(False, f"Found {len(results)} face(s)" + ("  ·  " + " ".join(extras["notes"]) if extras["notes"] else ""))
        self.results = results
        self.annotated = self.image.copy()
        for pts in extras["landmarks"]:
            draw_landmarks(self.annotated, pts)
        self.table.setRowCount(len(self.results))
        for i, face in enumerate(self.results):
            x, y, w, h = region_of(face)
            draw_label(self.annotated, x, y, w, h, [f"#{i + 1}"] + summary_lines(face), BLUE)
            g = face.get("dominant_gender", "–")
            e = face.get("dominant_emotion", "–")
            r = face.get("dominant_race", "–")
            cells = [
                f"#{i + 1}",
                str(int(round(face["age"]))) if "age" in face else "–",
                f"{g} ({face['gender'][g]:.0f}%)" if "gender" in face else "–",
                f"{e} ({face['emotion'][e]:.0f}%)" if "emotion" in face else "–",
                f"{r} ({face['race'][r]:.0f}%)" if "race" in face else "–",
                f"{face.get('face_confidence', 0) * 100:.0f}%" if face.get("face_confidence") else "–",
                ("OK" if face["quality"]["ok"] else "⚠ " + ", ".join(face["quality"]["warnings"])) if "quality" in face else "–",
                liveness_text(face.get("liveness")),
            ]
            for c, text in enumerate(cells):
                self.table.setItem(i, c, QTableWidgetItem(text))
        self.view.set_image(self.annotated)
        if self.results:
            self.table.selectRow(0)

    def show_detail(self):
        rows = {i.row() for i in self.table.selectedItems()}
        if not rows:
            return
        face = self.results[min(rows)]
        parts = [f"<h3>Face #{min(rows) + 1}</h3>"]
        if "age" in face:
            parts.append(f"<p><b>Apparent age:</b> {face['age']}</p>")
        for key, title in (("gender", "Gender"), ("emotion", "Emotion"), ("race", "Race")):
            if key in face:
                parts.append(f"<p><b>{title}</b></p>{self._bars(face[key])}")
        if "quality" in face:
            q = face["quality"]
            metrics = ", ".join(f"{k.replace('_', ' ')} {v}" for k, v in q.items() if k not in ("warnings", "ok"))
            parts.append(f"<p><b>Photo quality:</b> {'OK' if q['ok'] else '; '.join(q['warnings'])}<br>"
                         f"<span style='color:gray'>{metrics}</span></p>")
        if face.get("liveness"):
            parts.append(f"<p><b>Liveness:</b> {liveness_text(face['liveness'])}<br><span style='color:gray'>"
                         "Only meaningful for a photo taken straight from a camera; a photo of a printout or "
                         "screen, or a heavily edited image, scores low.</span></p>")
        x, y, w, h = region_of(face)
        parts.append(f"<p style='color:gray'>Box: x={x}, y={y}, w={w}, h={h}</p>")
        self.detail.setHtml("".join(parts))

    @staticmethod
    def _bars(scores: dict) -> str:
        rows = []
        for k, v in sorted(scores.items(), key=lambda kv: -kv[1]):
            width = max(1, int(v * 2))
            rows.append(
                f"<tr><td width='110'>{k}</td>"
                f"<td><span style='background:#5b8def'>{'&nbsp;' * (width // 4 or 1)}</span>"
                f"&nbsp;{v:.1f}%</td></tr>"
            )
        return f"<table cellspacing='2'>{''.join(rows)}</table>"

    def search_online(self, name: str, url: str):
        if self.image is None:
            self.show_error("Open a photo first.")
            return
        QApplication.clipboard().setImage(to_qpixmap(self.image).toImage())
        QDesktopServices.openUrl(QUrl(url))
        QMessageBox.information(
            self, APP_NAME,
            f"The photo is copied. In the {name} page that just opened, press Ctrl+V (or use its upload button).\n\n"
            "This sends the photo to that service. It finds copies of this picture online; it does not "
            "recognise the person in other photos.",
        )

    def save_image(self):
        if self.annotated is None:
            self.show_error("Analyze a photo first.")
            return
        stem = Path(self.path).stem if self.path else "faces"
        path, _ = QFileDialog.getSaveFileName(self, "Save labelled image", f"{stem}-labelled.png", IMAGE_FILTER)
        if path:
            write_image(path, self.annotated)
            self.status(f"Saved {path}")

    def save_json(self):
        if not self.results:
            self.show_error("Analyze a photo first.")
            return
        stem = Path(self.path).stem if self.path else "faces"
        path, _ = QFileDialog.getSaveFileName(self, "Export results", f"{stem}-analysis.json", "JSON (*.json)")
        if path:
            Path(path).write_text(json.dumps(jsonable(self.results), indent=2), encoding="utf-8")
            self.status(f"Saved {path}")


class VerifyTab(QWidget, BusyMixin):
    def __init__(self, get_options):
        super().__init__()
        self.get_options = get_options
        self.images: list[np.ndarray | None] = [None, None]
        self.views = [ImageView("Photo A\nDrop or click"), ImageView("Photo B\nDrop or click")]
        for i, v in enumerate(self.views):
            v.fileDropped.connect(lambda p, i=i: self.load(i, p))

        self.run_btn = QPushButton("Are these the same person?")
        self.run_btn.setObjectName("Primary")
        self.run_btn.clicked.connect(self.run)
        swap_btn = QPushButton("Swap")
        swap_btn.clicked.connect(self.swap)
        self.run_buttons = [self.run_btn]

        self.verdict = QLabel("Choose two photos, then press the button.")
        self.verdict.setObjectName("Verdict")
        self.verdict.setAlignment(Qt.AlignmentFlag.AlignCenter)
        self.details = QLabel("")
        self.details.setAlignment(Qt.AlignmentFlag.AlignCenter)
        self.details.setObjectName("Note")

        pics = QHBoxLayout()
        pics.addWidget(self.views[0])
        pics.addWidget(self.views[1])
        btns = QHBoxLayout()
        btns.addStretch()
        btns.addWidget(swap_btn)
        btns.addWidget(self.run_btn)
        btns.addStretch()

        layout = QVBoxLayout(self)
        layout.addLayout(pics, 1)
        layout.addWidget(self.make_busy_bar())
        layout.addLayout(btns)
        layout.addWidget(self.verdict)
        layout.addWidget(self.details)

    def load(self, i: int, path: str):
        try:
            self.images[i] = read_image(path)
        except ValueError as exc:
            self.show_error(str(exc))
            return
        self.views[i].set_image(self.images[i])
        self.verdict.setText("Choose two photos, then press the button.")
        self.verdict.setProperty("state", "")
        self._restyle()
        self.details.clear()

    def swap(self):
        self.images.reverse()
        for v, img in zip(self.views, self.images):
            v.set_image(img)

    def run(self):
        if any(img is None for img in self.images):
            self.show_error("Choose both photos first.")
            return
        opts = self.get_options()
        a, b = (img.copy() for img in self.images)

        def job():
            if opts.model_name == INSIGHT_MODEL:
                return InsightEngine.verify(a, b)
            return deepface().verify(
                img1_path=a,
                img2_path=b,
                model_name=opts.model_name,
                detector_backend=opts.detector_backend,
                distance_metric=opts.distance_metric,
                enforce_detection=opts.enforce_detection,
                align=opts.align,
                expand_percentage=opts.expand_percentage,
                silent=True,
            )

        worker = Worker(job)
        worker.signals.finished.connect(self.done)
        worker.signals.failed.connect(self.show_error)
        self.set_busy(True, f"Comparing with {opts.model_name}…")
        worker.start()

    def done(self, res: dict):
        same = bool(res.get("verified"))
        dist, thr = float(res.get("distance", 0)), float(res.get("threshold", 0))
        self.set_busy(False, "Done")
        color = GREEN if same else RED
        areas = res.get("facial_areas", {})
        for i, key in enumerate(("img1", "img2")):
            img = self.images[i].copy()
            r = areas.get(key) or {}
            if r.get("w"):
                draw_label(img, r["x"], r["y"], r["w"], r["h"], ["Match" if same else "No match"], color)
            self.views[i].set_image(img)
        # Closeness: 100% at distance 0, 50% right at the threshold.
        closeness = max(0.0, min(1.0, 1 - dist / (2 * thr))) * 100 if thr else 0
        self.verdict.setText("✔  Same person" if same else "✘  Different people")
        self.verdict.setProperty("state", "yes" if same else "no")
        self._restyle()
        self.details.setText(
            f"Distance {dist:.4f}  ·  threshold {thr:.4f}  ·  similarity score {closeness:.0f}%  ·  "
            f"{res.get('model')} / {res.get('detector_backend')} / {res.get('similarity_metric')}  ·  "
            f"{res.get('time', 0):.2f}s"
        )

    def _restyle(self):
        self.verdict.style().unpolish(self.verdict)
        self.verdict.style().polish(self.verdict)


class FindTab(QWidget, BusyMixin):
    def __init__(self, get_options, settings: QSettings):
        super().__init__()
        self.get_options, self.settings = get_options, settings
        self.image: np.ndarray | None = None

        self.view = ImageView("Photo of the person to look for\nDrop or click")
        self.view.setMaximumWidth(420)
        self.view.fileDropped.connect(self.load)

        self.db_edit = QLineEdit(self.settings.value("find/db", ""))
        self.db_edit.setPlaceholderText("Folder of photos to search (sub-folders included)")
        browse = QPushButton("Browse…")
        browse.clicked.connect(self.browse)
        self.rebuild = QCheckBox("Rebuild index")
        self.rebuild.setToolTip(
            "DeepFace saves an index file (ds_model_…) in the folder so later searches are fast. "
            "It updates itself when photos are added or removed; tick this to force a full rebuild."
        )
        self.run_btn = QPushButton("Search folder")
        self.run_btn.setObjectName("Primary")
        self.run_btn.clicked.connect(self.run)
        self.run_buttons = [self.run_btn]

        db_row = QHBoxLayout()
        db_row.addWidget(QLabel("Search in:"))
        db_row.addWidget(self.db_edit, 1)
        db_row.addWidget(browse)
        db_row.addWidget(self.rebuild)
        db_row.addWidget(self.run_btn)

        self.results = QListWidget()
        self.results.setViewMode(QListWidget.ViewMode.IconMode)
        self.results.setIconSize(QSize(150, 150))
        self.results.setResizeMode(QListWidget.ResizeMode.Adjust)
        self.results.setSpacing(10)
        self.results.setWordWrap(True)
        self.results.itemDoubleClicked.connect(lambda it: os.startfile(it.data(Qt.ItemDataRole.UserRole)) if hasattr(os, "startfile") else None)  # noqa: E501

        self.summary = QLabel("")
        self.summary.setObjectName("Note")

        right = QWidget()
        rl = QVBoxLayout(right)
        rl.setContentsMargins(0, 0, 0, 0)
        rl.addWidget(QLabel("<b>Matches</b> (closest first, double-click to open)"))
        rl.addWidget(self.results, 1)
        rl.addWidget(self.summary)

        split = QSplitter()
        split.addWidget(self.view)
        split.addWidget(right)
        split.setSizes([380, 660])

        layout = QVBoxLayout(self)
        layout.addLayout(db_row)
        layout.addWidget(self.make_busy_bar())
        layout.addWidget(split, 1)

    def browse(self):
        folder = QFileDialog.getExistingDirectory(self, "Folder of photos", self.db_edit.text())
        if folder:
            self.db_edit.setText(folder)

    def load(self, path: str):
        try:
            self.image = read_image(path)
        except ValueError as exc:
            self.show_error(str(exc))
            return
        self.view.set_image(self.image)

    def run(self):
        db = self.db_edit.text().strip()
        if self.image is None:
            self.show_error("Choose the photo of the person to look for.")
            return
        if not db or not Path(db).is_dir():
            self.show_error("Choose a folder of photos to search.")
            return
        self.settings.setValue("find/db", db)
        opts = self.get_options()
        img = self.image.copy()
        rebuild = self.rebuild.isChecked()

        def job():
            if opts.model_name == INSIGHT_MODEL:
                t0 = time.time()
                rows, n_faces = InsightEngine.find(img, db, rebuild)
                rows.sort(key=lambda r: r["distance"])
                return {"rows": rows, "faces": n_faces, "seconds": time.time() - t0}
            if rebuild:
                for index in list(Path(db).glob("ds_model_*.pkl")) + list(Path(db).glob("ds_model_*.npz")):
                    index.unlink()
            t0 = time.time()
            kwargs = dict(
                img_path=img,
                db_path=db,
                model_name=opts.model_name,
                distance_metric=opts.distance_metric,
                detector_backend=opts.detector_backend,
                enforce_detection=opts.enforce_detection,
                align=opts.align,
                expand_percentage=opts.expand_percentage,
                silent=True,
            )
            # Newer DeepFace versions can return plain dicts (no pandas needed); older ones only DataFrames.
            if "return_type" in inspect.signature(deepface().find).parameters:
                kwargs["return_type"] = "dict"
            frames = deepface().find(**kwargs)
            rows = []
            for frame in frames:
                if frame is None or len(frame) == 0:
                    continue
                records = frame.to_dict("records") if hasattr(frame, "to_dict") else frame
                for rec in records:
                    dist_key = "distance" if "distance" in rec else next(
                        (k for k in rec if str(k).endswith(opts.distance_metric)), None
                    )
                    rows.append(
                        {
                            "identity": str(rec["identity"]),
                            "distance": max(0.0, float(rec[dist_key])) if dist_key else float("nan"),
                            "threshold": float(rec["threshold"]) if "threshold" in rec else None,
                            "box": tuple(int(rec.get(f"target_{k}", 0)) for k in "xywh"),
                        }
                    )
            rows.sort(key=lambda r: r["distance"])
            return {"rows": rows, "faces": len(frames), "seconds": time.time() - t0}

        worker = Worker(job)
        worker.signals.finished.connect(self.done)
        worker.signals.failed.connect(self.show_error)
        self.results.clear()
        self.summary.clear()
        self.set_busy(True, "Searching… (indexing a new folder can take a while)")
        worker.start()

    def done(self, out: dict):
        rows = out["rows"]
        self.set_busy(False, f"{len(rows)} match(es)")
        seen = set()
        for r in rows:
            if r["identity"] in seen:
                continue
            seen.add(r["identity"])
            try:
                img = read_image(r["identity"])
                x, y, w, h = r["box"]
                if w:
                    draw_label(img, x, y, w, h, [f"{r['distance']:.3f}"], GREEN)
                icon = QIcon(to_qpixmap(img).scaled(300, 300, Qt.AspectRatioMode.KeepAspectRatio))
            except Exception:  # noqa: BLE001
                icon = QIcon()
            item = QListWidgetItem(icon, f"{Path(r['identity']).name}\ndistance {r['distance']:.3f}")
            item.setData(Qt.ItemDataRole.UserRole, r["identity"])
            item.setToolTip(r["identity"])
            self.results.addItem(item)
        thr = next((r["threshold"] for r in rows if r["threshold"]), None)
        self.summary.setText(
            f"{len(seen)} matching photo(s) from {out['faces']} face(s) in the query photo, "
            f"in {out['seconds']:.1f}s." + (f"  Match threshold: {thr:.3f}." if thr else "")
            + ("" if rows else "  No matches below the threshold.")
        )


class CameraWorker(QObject):
    """Reads the webcam on one background thread and analyzes faces on another,
    so the video stays smooth while the (slower) analysis catches up."""

    frameReady = Signal(QImage)
    failed = Signal(str)
    stopped = Signal()

    def __init__(self, camera_index: int, opts: Options, interval: float, actions: list[str]):
        super().__init__()
        self.camera_index, self.opts = camera_index, opts
        self.interval, self.actions = interval, actions
        self.running = False
        self.faces: list[dict] = []
        self.analyzing = False
        self.last_annotated: np.ndarray | None = None
        self._thread: threading.Thread | None = None

    def start(self):
        self.running = True
        self._thread = threading.Thread(target=self._loop, daemon=True)
        self._thread.start()

    def is_running(self) -> bool:
        return bool(self._thread and self._thread.is_alive())

    def stop(self):
        self.running = False
        if self._thread:
            self._thread.join(3)

    def _analyze(self, frame: np.ndarray):
        try:
            with DEEPFACE_LOCK:
                found = deepface().analyze(
                    img_path=frame,
                    actions=self.actions,
                    detector_backend=self.opts.detector_backend,
                    enforce_detection=False,
                    align=self.opts.align,
                    silent=True,
                )
            # With enforce_detection off, a frame with no face comes back as one whole-frame "face".
            h_img, w_img = frame.shape[:2]
            self.faces = [
                f for f in found if not (region_of(f)[2] >= w_img - 2 and region_of(f)[3] >= h_img - 2)
            ]
        except Exception as exc:  # noqa: BLE001
            self.running = False
            self.failed.emit(friendly_error(exc))
        finally:
            self.analyzing = False

    def _loop(self):
        backend = cv2.CAP_DSHOW if sys.platform == "win32" else cv2.CAP_ANY
        cap = cv2.VideoCapture(self.camera_index, backend)
        try:
            if not cap.isOpened():
                self.failed.emit(f"Could not open camera {self.camera_index}. Is another app using it?")
                return
            last_analysis = 0.0
            while self.running:
                ok, frame = cap.read()
                if not ok:
                    self.failed.emit("The camera stopped sending frames.")
                    break
                frame = cv2.flip(frame, 1)
                now = time.time()
                if self.actions and not self.analyzing and now - last_analysis >= self.interval:
                    self.analyzing = True
                    last_analysis = now
                    threading.Thread(target=self._analyze, args=(frame.copy(),), daemon=True).start()
                annotated = frame.copy()
                for f in self.faces:
                    x, y, w, h = region_of(f)
                    draw_label(annotated, x, y, w, h, summary_lines(f), BLUE)
                self.last_annotated = annotated
                rgb = cv2.cvtColor(annotated, cv2.COLOR_BGR2RGB)
                h, w, ch = rgb.shape
                self.frameReady.emit(QImage(rgb.data, w, h, ch * w, QImage.Format.Format_RGB888).copy())
        finally:
            cap.release()
            self.stopped.emit()


class LiveTab(QWidget):
    status = None

    def __init__(self, get_options):
        super().__init__()
        self.get_options = get_options
        self.camera: CameraWorker | None = None

        self.video = QLabel("Camera is off")
        self.video.setAlignment(Qt.AlignmentFlag.AlignCenter)
        self.video.setObjectName("ImageView")
        self.video.setMinimumSize(480, 360)
        self.video.setSizePolicy(QSizePolicy.Policy.Expanding, QSizePolicy.Policy.Expanding)

        self.cam = QSpinBox()
        self.cam.setRange(0, 9)
        self.cam.setToolTip("0 is usually the built-in webcam")
        self.interval = QDoubleSpinBox()
        self.interval.setRange(0.2, 10)
        self.interval.setSingleStep(0.2)
        self.interval.setValue(1.0)
        self.interval.setSuffix(" s")
        self.interval.setToolTip("How often faces are re-analyzed. Lower is smoother but uses more CPU.")
        self.checks = {}
        for a in ACTIONS:
            cb = QCheckBox(a.capitalize())
            cb.setChecked(a in ("age", "gender", "emotion"))
            self.checks[a] = cb

        self.start_btn = QPushButton("Start camera")
        self.start_btn.setObjectName("Primary")
        self.start_btn.clicked.connect(self.toggle)
        self.snap_btn = QPushButton("Save snapshot…")
        self.snap_btn.clicked.connect(self.snapshot)

        bar = QHBoxLayout()
        bar.addWidget(QLabel("Camera"))
        bar.addWidget(self.cam)
        bar.addWidget(QLabel("Re-analyze every"))
        bar.addWidget(self.interval)
        for cb in self.checks.values():
            bar.addWidget(cb)
        bar.addStretch()
        bar.addWidget(self.start_btn)
        bar.addWidget(self.snap_btn)

        layout = QVBoxLayout(self)
        layout.addLayout(bar)
        layout.addWidget(self.video, 1)
        note = QLabel("Video stays on this computer. Tip: 'opencv' or 'yunet' detectors are fastest for live use.")
        note.setObjectName("Note")
        layout.addWidget(note)

    def toggle(self):
        if self.camera and self.camera.is_running():
            self.stop()
            return
        actions = [a for a, cb in self.checks.items() if cb.isChecked()]
        self.camera = CameraWorker(self.cam.value(), self.get_options(), self.interval.value(), actions)
        self.camera.frameReady.connect(self.show_frame)
        self.camera.failed.connect(self.on_fail)
        self.camera.stopped.connect(self.on_stopped)
        self.camera.start()
        self.start_btn.setText("Stop camera")
        if self.status:
            self.status("Camera on – loading models for the first frame…")

    def stop(self):
        if self.camera:
            self.camera.stop()

    def on_stopped(self):
        self.start_btn.setText("Start camera")
        if self.status:
            self.status("Camera off")

    def on_fail(self, msg: str):
        QMessageBox.warning(self, APP_NAME, msg)

    def show_frame(self, img: QImage):
        self.video.setPixmap(
            QPixmap.fromImage(img).scaled(
                self.video.size(), Qt.AspectRatioMode.KeepAspectRatio, Qt.TransformationMode.SmoothTransformation
            )
        )

    def snapshot(self):
        if not self.camera or self.camera.last_annotated is None:
            QMessageBox.information(self, APP_NAME, "Start the camera first.")
            return
        img = self.camera.last_annotated.copy()
        path, _ = QFileDialog.getSaveFileName(self, "Save snapshot", "snapshot.png", IMAGE_FILTER)
        if path:
            write_image(path, img)


class EmbedTab(QWidget, BusyMixin):
    def __init__(self, get_options):
        super().__init__()
        self.get_options = get_options
        self.image: np.ndarray | None = None
        self.path: str | None = None
        self.result = None

        self.view = ImageView()
        self.view.setMaximumWidth(420)
        self.view.fileDropped.connect(self.load)
        self.run_btn = QPushButton("Get face embedding")
        self.run_btn.setObjectName("Primary")
        self.run_btn.clicked.connect(self.run)
        save = QPushButton("Export JSON…")
        save.clicked.connect(self.save)
        self.run_buttons = [self.run_btn]
        self.out = QTextEdit()
        self.out.setReadOnly(True)
        self.out.setFont(QFont("Consolas", 9))
        self.out.setPlaceholderText(
            "An embedding is the list of numbers a recognition model uses to describe a face. "
            "Faces of the same person have embeddings that are close together. "
            "Export them to build your own search or clustering tools."
        )
        btns = QHBoxLayout()
        btns.addWidget(self.run_btn)
        btns.addWidget(save)
        btns.addStretch()
        right = QWidget()
        rl = QVBoxLayout(right)
        rl.setContentsMargins(0, 0, 0, 0)
        rl.addLayout(btns)
        rl.addWidget(self.make_busy_bar())
        rl.addWidget(self.out, 1)
        layout = QHBoxLayout(self)
        layout.addWidget(self.view)
        layout.addWidget(right, 1)

    def load(self, path: str):
        try:
            self.image = read_image(path)
        except ValueError as exc:
            self.show_error(str(exc))
            return
        self.path = path
        self.view.set_image(self.image)

    def run(self):
        if self.image is None:
            self.show_error("Choose a photo first.")
            return
        opts = self.get_options()
        img = self.image.copy()

        def job():
            if opts.model_name == INSIGHT_MODEL:
                return InsightEngine.represent(img)
            return deepface().represent(
                img_path=img,
                model_name=opts.model_name,
                detector_backend=opts.detector_backend,
                enforce_detection=opts.enforce_detection,
                align=opts.align,
                expand_percentage=opts.expand_percentage,
            )

        worker = Worker(job)
        worker.signals.finished.connect(self.done)
        worker.signals.failed.connect(self.show_error)
        self.set_busy(True, f"Computing {opts.model_name} embedding…")
        worker.start()

    def done(self, res):
        self.set_busy(False, f"{len(res)} face(s) embedded")
        self.result = res
        img = self.image.copy()
        lines = []
        for i, face in enumerate(res):
            emb = face["embedding"]
            x, y, w, h = region_of(face)
            if w:
                draw_label(img, x, y, w, h, [f"#{i + 1}"], BLUE)
            preview = ", ".join(f"{v:.4f}" for v in emb[:12])
            lines.append(f"Face #{i + 1}: {len(emb)} numbers\n[{preview}, …]\n")
        self.view.set_image(img)
        self.out.setPlainText("\n".join(lines))

    def save(self):
        if not self.result:
            self.show_error("Compute an embedding first.")
            return
        stem = Path(self.path).stem if self.path else "face"
        path, _ = QFileDialog.getSaveFileName(self, "Export embedding", f"{stem}-embedding.json", "JSON (*.json)")
        if path:
            Path(path).write_text(json.dumps(jsonable(self.result)), encoding="utf-8")
            self.status(f"Saved {path}")


# --------------------------------------------------------------------------------------
# Main window
# --------------------------------------------------------------------------------------


class SettingsPanel(QGroupBox):
    def __init__(self, settings: QSettings):
        super().__init__("Settings")
        self.settings = settings
        self.model_box = QComboBox()
        self.model_box.addItems(MODELS)
        # Don't let the long InsightFace name widen the box and squeeze the labels.
        self.model_box.setSizeAdjustPolicy(QComboBox.SizeAdjustPolicy.AdjustToMinimumContentsLengthWithIcon)
        self.model_box.setMinimumContentsLength(12)
        self.model_box.setToolTip("Recognition model used by Verify, Find and Embed. ArcFace and Facenet512 are the most accurate.")
        self.detector_box = QComboBox()
        self.detector_box.addItems(DETECTORS)
        self.detector_box.setToolTip(
            "Face detector. opencv is fastest; retinaface and mtcnn find more faces (slower). "
            "mediapipe, yolov8 and dlib need extra packages."
        )
        self.metric_box = QComboBox()
        self.metric_box.addItems(METRICS)
        self.enforce = QCheckBox("Require a face")
        self.enforce.setToolTip("When off, a photo with no detected face is processed as a whole instead of failing.")
        self.align = QCheckBox("Align faces")
        self.expand = QSpinBox()
        self.expand.setRange(0, 100)
        self.expand.setSuffix(" %")
        self.expand.setToolTip("Grow each detected face box by this much before analysis.")

        self.model_box.setCurrentText(settings.value("opt/model", "Facenet512"))
        self.detector_box.setCurrentText(settings.value("opt/detector", "opencv"))
        self.metric_box.setCurrentText(settings.value("opt/metric", "cosine"))
        self.enforce.setChecked(settings.value("opt/enforce", "true") == "true")
        self.align.setChecked(settings.value("opt/align", "true") == "true")
        self.expand.setValue(int(settings.value("opt/expand", 0)))

        form = QFormLayout(self)
        form.addRow("Recognition model", self.model_box)
        form.addRow("Face detector", self.detector_box)
        form.addRow("Distance metric", self.metric_box)
        form.addRow("Expand face box", self.expand)
        form.addRow(self.enforce)
        form.addRow(self.align)

        self.weights_label = QLabel(
            f"Models are downloaded once to<br><code>{Path.home() / '.deepface' / 'weights'}</code>"
        )
        self.weights_label.setObjectName("Note")
        self.weights_label.setWordWrap(True)
        self.insight_note = QLabel(
            "<b>InsightFace</b> uses its own detector (SCRFD) and cosine distance, so those settings "
            "are greyed out. It powers Verify, Find and Embeddings; Analyze and Live camera still use DeepFace. "
            "<b>Non-commercial research use only.</b>"
        )
        self.insight_note.setObjectName("Note")
        self.insight_note.setWordWrap(True)
        form.addRow(self.insight_note)
        form.addRow(self.weights_label)

        self.model_box.currentTextChanged.connect(self._model_changed)
        self._model_changed(self.model_box.currentText(), announce=False)

    def _model_changed(self, name: str, announce: bool = True):
        insight = name == INSIGHT_MODEL
        self.detector_box.setEnabled(not insight)
        self.metric_box.setEnabled(not insight)
        self.align.setEnabled(not insight)
        self.expand.setEnabled(not insight)
        self.insight_note.setVisible(insight)
        if insight and announce and self.settings.value("insight/licence_seen", "false") != "true":
            QMessageBox.information(self, "InsightFace licence", INSIGHT_LICENCE)
            self.settings.setValue("insight/licence_seen", "true")

    def options(self) -> Options:
        opts = Options(
            model_name=self.model_box.currentText(),
            detector_backend=self.detector_box.currentText(),
            distance_metric=self.metric_box.currentText(),
            enforce_detection=self.enforce.isChecked(),
            align=self.align.isChecked(),
            expand_percentage=self.expand.value(),
        )
        self.settings.setValue("opt/model", opts.model_name)
        self.settings.setValue("opt/detector", opts.detector_backend)
        self.settings.setValue("opt/metric", opts.distance_metric)
        self.settings.setValue("opt/enforce", "true" if opts.enforce_detection else "false")
        self.settings.setValue("opt/align", "true" if opts.align else "false")
        self.settings.setValue("opt/expand", opts.expand_percentage)
        return opts


class MainWindow(QMainWindow):
    def __init__(self):
        super().__init__()
        self.setWindowTitle(f"{APP_NAME} – face analysis powered by DeepFace")
        self.resize(1280, 820)
        self.qsettings = QSettings(APP_NAME, APP_NAME)

        self.settings_panel = SettingsPanel(self.qsettings)
        self.settings_panel.setMaximumWidth(300)
        get_opts = self.settings_panel.options

        self.analyze = AnalyzeTab(get_opts)
        self.verify = VerifyTab(get_opts)
        self.find = FindTab(get_opts, self.qsettings)
        self.live = LiveTab(get_opts)
        self.embed = EmbedTab(get_opts)
        for tab in (self.analyze, self.verify, self.find, self.live, self.embed):
            tab.status = self.set_status

        # Add-on tabs live in their own modules; one failing to load never stops the app.
        self.addons: dict[str, QWidget] = {}
        for module, cls, _title in ADDON_TABS:
            try:
                tab = getattr(importlib.import_module(module), cls)(get_opts)
            except Exception:  # noqa: BLE001
                print(f"Could not load {module}:\n{traceback.format_exc()}", file=sys.stderr)
                continue
            tab.status = self.set_status
            self.addons[module] = tab

        self.tabs = QTabWidget()
        self.tabs.setUsesScrollButtons(True)
        order = [("Analyze", self.analyze), ("Verify", self.verify), ("Find", self.find),
                 ("People", self.addons.get("fl_people")), ("Investigate", self.addons.get("fl_investigate")),
                 ("Live camera", self.live), ("Video", self.addons.get("fl_video")),
                 ("Embeddings", self.embed), ("Benchmark", self.addons.get("fl_bench")),
                 ("API server", self.addons.get("fl_server"))]
        for title, tab in order:
            if tab is not None:
                self.tabs.addTab(tab, title)

        side = QWidget()
        sl = QVBoxLayout(side)
        title = QLabel(f"<span style='font-size:20pt;font-weight:600'>{APP_NAME}</span>")
        sub = QLabel("Face analysis on your own computer.\nNo photos leave this PC.")
        sub.setObjectName("Note")
        sl.addWidget(title)
        sl.addWidget(sub)
        sl.addSpacing(8)
        sl.addWidget(self.settings_panel)
        sl.addStretch()
        self.engine_label = QLabel("● Loading engine…")
        self.engine_label.setObjectName("Note")
        sl.addWidget(self.engine_label)

        central = QWidget()
        cl = QHBoxLayout(central)
        cl.addWidget(side)
        line = QFrame()
        line.setFrameShape(QFrame.Shape.VLine)
        cl.addWidget(line)
        cl.addWidget(self.tabs, 1)
        self.setCentralWidget(central)

        self.setStatusBar(QStatusBar())
        self._build_menu()
        self._warm_up()

    def _build_menu(self):
        m = self.menuBar().addMenu("&Help")
        about = QAction("About FaceLens", self)
        about.triggered.connect(self.about)
        m.addAction(about)
        weights = QAction("Open model folder", self)
        weights.triggered.connect(self.open_weights)
        m.addAction(weights)
        m.addSeparator()
        check = QAction("Check if your photos are in face datasets (exposing.ai)…", self)
        check.triggered.connect(lambda: QDesktopServices.openUrl(QUrl(EXPOSING_AI)))
        m.addAction(check)
        sources = QAction("Where face datasets come from…", self)
        sources.triggered.connect(self.dataset_sources)
        m.addAction(sources)

    def _warm_up(self):
        """Import TensorFlow/DeepFace in the background so the first click is quick."""

        def job():
            df = deepface()
            import deepface as pkg  # noqa: WPS433

            return getattr(pkg, "__version__", "?"), df

        worker = Worker(job)
        worker.signals.finished.connect(lambda r: self.engine_label.setText(f"● DeepFace {r[0]} ready"))
        worker.signals.failed.connect(
            lambda msg, tb: (
                self.engine_label.setText("● Engine failed to load"),
                QMessageBox.critical(self, APP_NAME, f"DeepFace could not be loaded:\n\n{msg}"),
            )
        )
        worker.start()

    def set_status(self, text: str):
        self.statusBar().showMessage(text, 15000)

    def open_weights(self):
        folder = Path.home() / ".deepface" / "weights"
        folder.mkdir(parents=True, exist_ok=True)
        if hasattr(os, "startfile"):
            os.startfile(folder)  # noqa: S606
        else:
            QMessageBox.information(self, APP_NAME, str(folder))

    def dataset_sources(self):
        box = QMessageBox(self)
        box.setWindowTitle("Where face datasets come from")
        box.setTextFormat(Qt.TextFormat.RichText)
        box.setText(DATASET_SOURCES_HTML)
        box.setTextInteractionFlags(Qt.TextInteractionFlag.TextBrowserInteraction)
        box.setStandardButtons(QMessageBox.StandardButton.Ok)
        box.exec()

    def about(self):
        QMessageBox.about(
            self,
            f"About {APP_NAME}",
            f"<h3>{APP_NAME} {APP_VERSION}</h3>"
            "<p>A desktop front end for <a href='https://github.com/serengil/deepface'>DeepFace</a>, "
            "the open-source face recognition and facial attribute analysis library for Python "
            "(MIT licence, by Sefik Ilkin Serengil).</p>"
            "<p>The optional InsightFace engine (<a href='https://github.com/deepinsight/insightface'>"
            "deepinsight/insightface</a>) is MIT-licensed code, but its pretrained models are for "
            "non-commercial research only.</p>"
            "<p>Everything runs locally. Age, gender, emotion and race are statistical estimates and "
            "can be wrong; please use them kindly and with consent.</p>",
        )

    def closeEvent(self, event):  # noqa: N802
        self.live.stop()
        for tab in self.addons.values():
            for method in ("stop", "shutdown"):
                if hasattr(tab, method):
                    try:
                        getattr(tab, method)()
                    except Exception:  # noqa: BLE001
                        pass
        super().closeEvent(event)


STYLE = """
QWidget { font-family: 'Segoe UI', sans-serif; font-size: 10pt; }
QLabel#ImageView { background: #1f2430; color: #9aa3b5; border: 2px dashed #3a4256; border-radius: 10px; }
QLabel#Note { color: #6b7280; font-size: 9pt; }
QLabel#Verdict { font-size: 20pt; font-weight: 600; padding: 8px; }
QLabel#Verdict[state="yes"] { color: #15803d; }
QLabel#Verdict[state="no"] { color: #b91c1c; }
QPushButton { padding: 6px 14px; border-radius: 6px; border: 1px solid #c7ccd6; background: #f7f8fa; }
QPushButton:hover { background: #eef1f6; }
QPushButton#Primary { background: #3b6fe0; color: white; border: none; font-weight: 600; }
QPushButton#Primary:hover { background: #2f5bc0; }
QPushButton#Primary:disabled { background: #9fb4e6; }
QGroupBox { font-weight: 600; border: 1px solid #d8dce4; border-radius: 8px; margin-top: 10px; padding-top: 8px; }
QGroupBox::title { subcontrol-origin: margin; left: 10px; padding: 0 4px; }
QTabBar::tab { padding: 8px 18px; }
QProgressBar { border: none; background: #e5e9f2; }
QProgressBar::chunk { background: #3b6fe0; }
"""


def resource_path(name: str) -> Path:
    base = Path(getattr(sys, "_MEIPASS", Path(__file__).parent))
    return base / name


def setup_logging() -> Path:
    """A windowed .exe has no console, so sys.stdout/stderr are None and any library that prints
    (TensorFlow, model-download progress bars) would crash. Send that output to a log file."""
    base = Path(os.environ.get("LOCALAPPDATA") or Path.home() / ".local" / "share") / APP_NAME
    base.mkdir(parents=True, exist_ok=True)
    log_path = base / "facelens.log"
    if sys.stdout is None or sys.stderr is None:
        log = open(log_path, "a", encoding="utf-8", buffering=1)  # noqa: SIM115 - kept open for the app's life
        sys.stdout = sys.stdout or log
        sys.stderr = sys.stderr or log
    return log_path


def self_test(image_a: str, image_b: str) -> int:
    """Headless check used by the build pipeline: load DeepFace, analyze and verify, print JSON."""
    df = deepface()
    analysis = df.analyze(img_path=read_image(image_a), actions=["age", "gender", "emotion"], silent=True)
    verdict = df.verify(img1_path=read_image(image_a), img2_path=read_image(image_b), model_name="Facenet512")
    out = {
        "faces": len(analysis),
        "first_face": summary_lines(analysis[0]),
        "verified": bool(verdict["verified"]),
        "distance": float(verdict["distance"]),
    }
    try:
        insight = InsightEngine.verify(read_image(image_a), read_image(image_b))
        out["insight_verified"] = bool(insight["verified"])
        out["insight_distance"] = round(float(insight["distance"]), 4)
    except ImportError:
        out["insight_verified"] = "not installed"
    print(json.dumps(out), flush=True)
    return 0 if out["faces"] >= 1 else 1


def main():
    setup_logging()
    if len(sys.argv) >= 4 and sys.argv[1] == "--self-test":
        sys.exit(self_test(sys.argv[2], sys.argv[3]))
    if "--serve" in sys.argv:
        import fl_server  # noqa: WPS433

        sys.exit(fl_server.serve_cli(sys.argv[1:]))
    if sys.platform == "win32":
        # Own taskbar icon/group instead of python.exe's.
        try:
            import ctypes

            ctypes.windll.shell32.SetCurrentProcessExplicitAppUserModelID("FaceLens.App.1")
        except Exception:  # noqa: BLE001
            pass
    app = QApplication(sys.argv)
    app.setApplicationName(APP_NAME)
    app.setStyle("Fusion")
    app.setStyleSheet(STYLE)
    icon = resource_path("facelens.ico")
    if icon.exists():
        app.setWindowIcon(QIcon(str(icon)))
    win = MainWindow()
    win.show()
    sys.exit(app.exec())


if __name__ == "__main__":
    # Add-on modules do "import facelens"; point that at this running script so they share its
    # state (loaded models, locks) instead of loading a second copy.
    sys.modules.setdefault("facelens", sys.modules["__main__"])
    main()
