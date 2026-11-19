"""
FaceLens Benchmark tab: measure how accurate each recognition engine is on a labelled photo set,
and how much that accuracy drops when the probe photo is degraded (blur, noise, low resolution,
occlusion, darkness, heavy JPEG) or altered by a tool such as Fawkes.

Protocol
  * Every photo is embedded once per engine (largest face) to form a clean "gallery".
  * Genuine pairs = two photos of the same person; impostor pairs = two different people
    (capped and sampled with a fixed seed, so runs are repeatable).
  * For each perturbation, the first photo of every pair (the "probe") is altered and re-embedded;
    the second stays clean. Distance = cosine distance between unit-length embeddings.
  * A photo where no face is found counts as the largest possible distance (2.0): the system
    fails to match a genuine pair and correctly rejects an impostor pair.
"""

from __future__ import annotations

import csv
import dataclasses
import json
import threading
import time
import traceback
from pathlib import Path

import cv2
import numpy as np
from PySide6.QtCore import QObject, QSettings, Qt, Signal
from PySide6.QtWidgets import (
    QAbstractItemView,
    QCheckBox,
    QFileDialog,
    QGridLayout,
    QGroupBox,
    QHBoxLayout,
    QHeaderView,
    QLabel,
    QLineEdit,
    QListWidget,
    QListWidgetItem,
    QPushButton,
    QSizePolicy,
    QSpinBox,
    QSplitter,
    QTableWidget,
    QTableWidgetItem,
    QVBoxLayout,
    QWidget,
)

import facelens as fl

NO_FACE_DISTANCE = 2.0
ALTERED = "altered"
PERTURBATIONS = [
    ("none", "None (clean)"),
    ("blur", "Blur"),
    ("noise", "Noise"),
    ("jpeg", "JPEG quality 15"),
    ("downscale", "Downscale to 25%"),
    ("occlusion", "Lower face covered"),
    ("dark", "Dark"),
]
PERTURBATION_NAMES = dict(PERTURBATIONS + [(ALTERED, "Altered copies")])
ALTERED_SUFFIXES = ("_cloaked", "_low", "_mid", "_high", "")
COLUMNS = [
    "Engine",
    "Probe",
    "Genuine / impostor pairs",
    "No face",
    "Threshold",
    "Balanced accuracy",
    "False match rate",
    "False non-match rate",
    "Best threshold",
    "Best accuracy",
    "EER",
    "TAR @ FAR 1%",
    "TAR @ FAR 0.1%",
    "Seconds",
]


# --------------------------------------------------------------------------------------
# Data
# --------------------------------------------------------------------------------------


def load_dataset(folder: str = "", csv_path: str = "") -> list[tuple[str, str]]:
    """[(image path, identity)]. From a CSV (file,identity) if given, else from a folder with one
    sub-folder per person (images directly in the root folder are ignored)."""
    items: list[tuple[str, str]] = []
    if csv_path:
        base = Path(folder) if folder else Path(csv_path).parent
        with open(csv_path, newline="", encoding="utf-8-sig") as fh:
            reader = csv.DictReader(fh)
            cols = {c.lower().strip(): c for c in (reader.fieldnames or [])}
            fcol = next((cols[c] for c in ("file", "path", "image", "filename") if c in cols), None)
            icol = next((cols[c] for c in ("identity", "person", "label", "name", "id") if c in cols), None)
            if not fcol or not icol:
                raise ValueError("The CSV needs a 'file' column and an 'identity' column.")
            for row in reader:
                f, ident = (row.get(fcol) or "").strip(), (row.get(icol) or "").strip()
                if not f or not ident:
                    continue
                p = Path(f)
                if not p.is_absolute():
                    p = base / p
                if p.is_file():
                    items.append((str(p), ident))
    else:
        root = Path(folder)
        if not root.is_dir():
            raise ValueError("Choose a dataset folder (one sub-folder per person) or a CSV.")
        for sub in sorted(d for d in root.iterdir() if d.is_dir()):
            for p in sorted(sub.rglob("*")):
                if p.suffix.lower() in fl.IMAGE_EXTS and p.is_file():
                    items.append((str(p), sub.name))
    idents = {i for _, i in items}
    if len(idents) < 2:
        raise ValueError("The dataset needs at least two people.")
    counts = {}
    for _, i in items:
        counts[i] = counts.get(i, 0) + 1
    if max(counts.values()) < 2:
        raise ValueError("At least one person needs two or more photos (otherwise there are no genuine pairs).")
    return items


def make_pairs(ids: list[str], cap: int, seed: int = 0) -> tuple[np.ndarray, np.ndarray]:
    """Genuine and impostor (i, j) index pairs, i < j, each capped at `cap` by seeded sampling."""
    rng = np.random.default_rng(seed)
    n = len(ids)
    arr = np.array(ids)
    if n <= 4000:
        ii, jj = np.triu_indices(n, k=1)
        same = arr[ii] == arr[jj]
        gen = np.stack([ii[same], jj[same]], 1)
        imp = np.stack([ii[~same], jj[~same]], 1)
    else:  # very large sets: sample impostors without listing every pair
        groups: dict[str, list[int]] = {}
        for k, ident in enumerate(ids):
            groups.setdefault(ident, []).append(k)
        gen = np.array([(a, b) for g in groups.values() for x, a in enumerate(g) for b in g[x + 1:]], dtype=np.int64)
        seen, picks = set(), []
        while len(picks) < cap:
            a, b = sorted(rng.integers(0, n, 2))
            if a != b and arr[a] != arr[b] and (a, b) not in seen:
                seen.add((a, b))
                picks.append((a, b))
        imp = np.array(picks, dtype=np.int64)
    if len(gen) > cap:
        gen = gen[np.sort(rng.choice(len(gen), cap, replace=False))]
    if len(imp) > cap:
        imp = imp[np.sort(rng.choice(len(imp), cap, replace=False))]
    return gen.reshape(-1, 2), imp.reshape(-1, 2)


class AlteredResolver:
    """Find the altered copy of a dataset photo in a mirror folder. Accepts the same relative path,
    or the same stem plus a suffix such as Fawkes' "_cloaked" (any image extension)."""

    def __init__(self, altered_root: str, dataset_root: str = ""):
        self.root = Path(altered_root)
        self.dataset_root = Path(dataset_root) if dataset_root else None
        self.by_stem: dict[str, list[Path]] = {}
        for p in self.root.rglob("*"):
            if p.suffix.lower() in fl.IMAGE_EXTS and p.is_file():
                stem = p.stem
                for suf in ALTERED_SUFFIXES[:-1]:
                    if stem.endswith(suf):
                        stem = stem[: -len(suf)]
                        break
                self.by_stem.setdefault(stem, []).append(p)

    def find(self, path: str) -> str | None:
        p = Path(path)
        rel = None
        if self.dataset_root:
            try:
                rel = p.relative_to(self.dataset_root)
            except ValueError:
                rel = None
        if rel is not None:
            exact = self.root / rel
            if exact.is_file():
                return str(exact)
            for suf in ALTERED_SUFFIXES:
                for ext in fl.IMAGE_EXTS:
                    cand = self.root / rel.parent / f"{rel.stem}{suf}{ext}"
                    if cand.is_file():
                        return str(cand)
        cands = self.by_stem.get(p.stem, [])
        if not cands:
            return None
        same_parent = [c for c in cands if c.parent.name == p.parent.name]
        return str((same_parent or cands)[0])


def perturb(img: np.ndarray, kind: str, box: tuple[int, int, int, int] | None, rng: np.random.Generator) -> np.ndarray:
    h, w = img.shape[:2]
    if kind == "blur":
        sigma = max(2.0, min(h, w) / 150)
        return cv2.GaussianBlur(img, (0, 0), sigma)
    if kind == "noise":
        noisy = img.astype(np.float32) + rng.normal(0, 25, img.shape)
        return np.clip(noisy, 0, 255).astype(np.uint8)
    if kind == "jpeg":
        ok, buf = cv2.imencode(".jpg", img, [cv2.IMWRITE_JPEG_QUALITY, 15])
        return cv2.imdecode(buf, cv2.IMREAD_COLOR) if ok else img
    if kind == "downscale":
        return cv2.resize(img, (max(1, w // 4), max(1, h // 4)), interpolation=cv2.INTER_AREA)
    if kind == "occlusion":
        out = img.copy()
        if box and box[2] > 0:
            x, y, bw, bh = box
            out[max(0, y + bh // 2): y + bh, max(0, x): x + bw] = 0
        else:  # no clean face box: cover the lower-middle of the image
            out[h // 2: h * 5 // 6, w // 4: w * 3 // 4] = 0
        return out
    if kind == "dark":
        lut = (np.linspace(0, 1, 256) ** 2.5 * 255).astype(np.uint8)
        return cv2.LUT(img, lut)
    return img


# --------------------------------------------------------------------------------------
# Metrics
# --------------------------------------------------------------------------------------


def compute_metrics(gen: np.ndarray, imp: np.ndarray, threshold: float) -> dict:
    g, im = np.sort(np.asarray(gen, float)), np.sort(np.asarray(imp, float))
    ng, ni = len(g), len(im)
    out = {"genuine_pairs": ng, "impostor_pairs": ni, "threshold": threshold}
    if not ng or not ni:
        return out
    fmr = float(np.mean(im <= threshold))
    fnmr = float(np.mean(g > threshold))
    out.update(fmr=fmr, fnmr=fnmr, balanced_accuracy=1 - (fmr + fnmr) / 2)
    ts = np.unique(np.concatenate([g, im, [threshold]]))
    fmr_t = np.searchsorted(im, ts, side="right") / ni
    fnmr_t = 1 - np.searchsorted(g, ts, side="right") / ng
    acc_t = 1 - (fmr_t + fnmr_t) / 2
    best = int(np.argmax(acc_t))
    out.update(best_threshold=float(ts[best]), best_accuracy=float(acc_t[best]))
    k = int(np.argmin(np.abs(fmr_t - fnmr_t)))
    out["eer"] = float((fmr_t[k] + fnmr_t[k]) / 2)
    for far, key in ((0.01, "tar_far_1"), (0.001, "tar_far_01")):
        allowed = int(np.floor(far * ni))  # false matches allowed at this FAR
        t = im[allowed] - 1e-9 if allowed < ni else im[-1]
        out[key] = float(np.mean(g <= t))
        out[key + "_reliable"] = ni * far >= 1
    return out


def histogram_image(gen: np.ndarray, imp: np.ndarray, threshold: float, title: str,
                    width: int = 720, height: int = 300) -> np.ndarray:
    """Genuine (green) vs impostor (red) distance histograms with the threshold line, drawn with cv2."""
    img = np.full((height, width, 3), 255, np.uint8)
    left, right, top, bottom = 50, 16, 34, 40
    pw, ph = width - left - right, height - top - bottom
    hi = float(max(1.2, min(NO_FACE_DISTANCE, np.max(np.concatenate([gen, imp, [threshold]])) + 0.05)))
    bins = np.linspace(0, hi, 61)
    hg, _ = np.histogram(np.clip(gen, 0, hi), bins)
    hm, _ = np.histogram(np.clip(imp, 0, hi), bins)
    hg = hg / max(1, hg.max())
    hm = hm / max(1, hm.max())
    bw = pw / (len(bins) - 1)
    for k in range(len(bins) - 1):
        x0 = left + k * bw
        half = bw / 2
        # Side by side, so neither colour hides the other when both fall in the same bin.
        for off, val, color in ((0, hg[k], (70, 170, 60)), (half, hm[k], (70, 70, 220))):
            if val > 0:
                cv2.rectangle(img, (int(x0 + off), int(top + ph * (1 - val))),
                              (max(int(x0 + off), int(x0 + off + half) - 1), top + ph), color, -1)
    n_none = int(np.sum(np.asarray(gen) >= NO_FACE_DISTANCE) + np.sum(np.asarray(imp) >= NO_FACE_DISTANCE))
    if n_none and hi >= NO_FACE_DISTANCE:
        cv2.putText(img, f"no face: {n_none} pairs", (left + pw - 150, top + ph - 8), cv2.FONT_HERSHEY_SIMPLEX,
                    0.42, (40, 40, 40), 1, cv2.LINE_AA)
    cv2.line(img, (left, top + ph), (left + pw, top + ph), (90, 90, 90), 1)
    for v in np.arange(0, hi + 1e-9, 0.2):
        x = int(left + v / hi * pw)
        cv2.line(img, (x, top + ph), (x, top + ph + 4), (90, 90, 90), 1)
        cv2.putText(img, f"{v:.1f}", (x - 10, top + ph + 18), cv2.FONT_HERSHEY_SIMPLEX, 0.4, (60, 60, 60), 1, cv2.LINE_AA)
    tx = int(left + min(threshold, hi) / hi * pw)
    cv2.line(img, (tx, top - 4), (tx, top + ph), (30, 30, 30), 2)
    cv2.putText(img, f"threshold {threshold:.2f}", (min(tx + 5, width - 120), top + 12),
                cv2.FONT_HERSHEY_SIMPLEX, 0.42, (30, 30, 30), 1, cv2.LINE_AA)
    cv2.putText(img, title[:80], (left, 20), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (20, 20, 20), 1, cv2.LINE_AA)
    cv2.putText(img, "cosine distance", (left + pw // 2 - 50, height - 6), cv2.FONT_HERSHEY_SIMPLEX, 0.42,
                (60, 60, 60), 1, cv2.LINE_AA)
    for k, (label, color) in enumerate((("same person", (70, 170, 60)), ("different people", (70, 70, 220)))):
        x = width - right - 150
        y = top + 26 + k * 18
        cv2.rectangle(img, (x, y - 9), (x + 12, y + 1), color, -1)
        cv2.putText(img, label, (x + 18, y), cv2.FONT_HERSHEY_SIMPLEX, 0.42, (40, 40, 40), 1, cv2.LINE_AA)
    return img


# --------------------------------------------------------------------------------------
# Benchmark run (background thread)
# --------------------------------------------------------------------------------------


class BenchSignals(QObject):
    progress = Signal(str)
    finished = Signal(object)
    failed = Signal(str, str)


class BenchmarkRun:
    """Runs one benchmark on a plain Python thread. Takes fl.DEEPFACE_LOCK per photo, so other
    tabs stay usable between photos. Results are emitted as a dict."""

    _active: set["BenchmarkRun"] = set()

    def __init__(self, items, engines: list[fl.Options], perturbations: list[str], altered_root: str,
                 dataset_root: str, cap: int):
        self.items, self.engines, self.perturbations = items, engines, perturbations
        self.altered_root, self.dataset_root, self.cap = altered_root, dataset_root, cap
        self.cancel_flag = False
        self.signals = BenchSignals()
        BenchmarkRun._active.add(self)
        self.signals.finished.connect(self._release)
        self.signals.failed.connect(self._release)

    def _release(self, *_):
        from PySide6.QtCore import QTimer

        QTimer.singleShot(0, lambda: BenchmarkRun._active.discard(self))

    def start(self):
        threading.Thread(target=self._run, daemon=True).start()

    def cancel(self):
        self.cancel_flag = True

    def _embed(self, img: np.ndarray, opts: fl.Options):
        with fl.DEEPFACE_LOCK:
            faces = fl.embed_faces(img, opts)
        return faces[0] if faces else None

    def _run(self):
        try:
            self.signals.finished.emit(self.run())
        except Exception as exc:  # noqa: BLE001
            self.signals.failed.emit(fl.friendly_error(exc), traceback.format_exc())

    def run(self) -> dict:
        paths = [p for p, _ in self.items]
        ids = [i for _, i in self.items]
        gen_pairs, imp_pairs = make_pairs(ids, self.cap)
        resolver = AlteredResolver(self.altered_root, self.dataset_root) if ALTERED in self.perturbations else None
        rows, hists = [], []
        n = len(paths)
        for opts in self.engines:
            name = fl.engine_name(opts)
            threshold = fl.match_threshold(opts)
            t_engine = time.time()
            images: list[np.ndarray | None] = []
            clean: list = []
            for k, p in enumerate(paths):
                self._check()
                self.signals.progress.emit(f"{name}: embedding photo {k + 1} of {n}")
                try:
                    img = fl.read_image(p)
                except ValueError:
                    img = None
                images.append(img)
                clean.append(self._embed(img, opts) if img is not None else None)
            clean_seconds = time.time() - t_engine
            for kind in self.perturbations:
                t0 = time.time()
                rng = np.random.default_rng(1)
                missing = set()
                if kind == "none":
                    probes = clean
                else:
                    probes = []
                    for k, img in enumerate(images):
                        self._check()
                        self.signals.progress.emit(f"{name}: {PERTURBATION_NAMES[kind]} - photo {k + 1} of {n}")
                        if kind == ALTERED:
                            alt = resolver.find(paths[k])
                            if alt is None:
                                missing.add(k)
                                probes.append(None)
                                continue
                            try:
                                pimg = fl.read_image(alt)
                            except ValueError:
                                missing.add(k)
                                probes.append(None)
                                continue
                        elif img is None:
                            probes.append(None)
                            continue
                        else:
                            box = clean[k].box if clean[k] is not None else None
                            pimg = perturb(img, kind, box, rng)
                        probes.append(self._embed(pimg, opts))

                def distances(pairs):
                    out = []
                    for i, j in pairs:
                        if i in missing:
                            continue
                        a, b = probes[i], clean[j]
                        out.append(NO_FACE_DISTANCE if a is None or b is None else
                                   float(np.clip(1.0 - float(a.emb @ b.emb), 0.0, 2.0)))
                    return np.array(out, dtype=float)

                gd, idd = distances(gen_pairs), distances(imp_pairs)
                no_face = sum(1 for k in range(n) if k not in missing and (probes[k] is None or clean[k] is None))
                m = compute_metrics(gd, idd, threshold)
                m.update(
                    engine=name,
                    model=opts.model_name,
                    probe=kind,
                    probe_label=PERTURBATION_NAMES[kind],
                    no_face=no_face,
                    missing_altered=len(missing),
                    photos=n,
                    seconds=round(time.time() - t0 + (clean_seconds if kind == "none" else 0), 1),
                )
                rows.append(m)
                hists.append((gd, idd))
        return {
            "rows": rows,
            "hists": hists,
            "photos": n,
            "people": len(set(ids)),
            "genuine_pairs": int(len(gen_pairs)),
            "impostor_pairs": int(len(imp_pairs)),
        }

    def _check(self):
        if self.cancel_flag:
            raise RuntimeError("Benchmark cancelled.")


# --------------------------------------------------------------------------------------
# Tab
# --------------------------------------------------------------------------------------


def _pct(v) -> str:
    return "–" if v is None else f"{v * 100:.1f}%"


class BenchmarkTab(QWidget, fl.BusyMixin):
    def __init__(self, get_options):
        super().__init__()
        self.get_options = get_options
        self.settings = QSettings(fl.APP_NAME, fl.APP_NAME)
        self.run_obj: BenchmarkRun | None = None
        self.result: dict | None = None
        self.config: dict = {}

        # Dataset
        self.folder_edit = QLineEdit(self.settings.value("bench/folder", ""))
        self.folder_edit.setPlaceholderText("Folder with one sub-folder per person (sub-folder name = person)")
        self.csv_edit = QLineEdit(self.settings.value("bench/csv", ""))
        self.csv_edit.setPlaceholderText("Optional: CSV with columns file,identity (instead of sub-folders)")
        b1, b2 = QPushButton("Browse…"), QPushButton("Browse…")
        b1.clicked.connect(lambda: self._pick_dir(self.folder_edit, "Dataset folder"))
        b2.clicked.connect(self._pick_csv)
        self.dataset_info = QLabel("")
        self.dataset_info.setObjectName("Note")
        check = QPushButton("Check dataset")
        check.clicked.connect(self.check_dataset)
        ds = QGroupBox("Labelled photos")
        g = QGridLayout(ds)
        g.addWidget(QLabel("Folder"), 0, 0)
        g.addWidget(self.folder_edit, 0, 1)
        g.addWidget(b1, 0, 2)
        g.addWidget(QLabel("CSV"), 1, 0)
        g.addWidget(self.csv_edit, 1, 1)
        g.addWidget(b2, 1, 2)
        g.addWidget(check, 2, 2)
        g.addWidget(self.dataset_info, 2, 0, 1, 2)

        # Engines
        self.engine_list = QListWidget()
        self.engine_list.setMaximumHeight(150)
        for m in fl.MODELS:
            it = QListWidgetItem(m)
            it.setFlags(it.flags() | Qt.ItemFlag.ItemIsUserCheckable)
            it.setCheckState(Qt.CheckState.Checked if m in (fl.INSIGHT_MODEL, "Facenet512") else Qt.CheckState.Unchecked)
            self.engine_list.addItem(it)
        eng = QGroupBox("Engines to compare")
        el = QVBoxLayout(eng)
        el.addWidget(self.engine_list)
        hint = QLabel("DeepFace models use the detector chosen in Settings.")
        hint.setObjectName("Note")
        el.addWidget(hint)

        # Perturbations
        pert = QGroupBox("Probe photo condition (robustness)")
        pl = QGridLayout(pert)
        self.pert_checks: dict[str, QCheckBox] = {}
        for k, (key, label) in enumerate(PERTURBATIONS):
            cb = QCheckBox(label)
            cb.setChecked(key in ("none", "blur", "downscale", "occlusion"))
            self.pert_checks[key] = cb
            pl.addWidget(cb, k // 2, k % 2)
        row = len(PERTURBATIONS) // 2 + 1
        self.altered_check = QCheckBox("Altered copies folder")
        self.altered_check.setToolTip(
            "A folder mirroring the dataset whose photos were altered by another tool, e.g. Fawkes "
            "(which saves <name>_cloaked.png). Matched by relative path or by file name."
        )
        self.altered_edit = QLineEdit(self.settings.value("bench/altered", ""))
        self.altered_edit.setPlaceholderText("e.g. Fawkes output")
        b3 = QPushButton("Browse…")
        b3.clicked.connect(lambda: self._pick_dir(self.altered_edit, "Folder of altered copies"))
        pl.addWidget(self.altered_check, row, 0)
        alt_row = QHBoxLayout()
        alt_row.addWidget(self.altered_edit, 1)
        alt_row.addWidget(b3)
        pl.addLayout(alt_row, row, 1)
        self.cap_spin = QSpinBox()
        self.cap_spin.setRange(100, 1_000_000)
        self.cap_spin.setSingleStep(1000)
        self.cap_spin.setValue(20000)
        self.cap_spin.setToolTip("Most pairs of each kind to use (sampled with a fixed seed, so results repeat).")
        pl.addWidget(QLabel("Max pairs of each kind"), row + 1, 0)
        pl.addWidget(self.cap_spin, row + 1, 1)

        top = QHBoxLayout()
        top.addWidget(ds, 3)
        top.addWidget(eng, 2)
        top.addWidget(pert, 3)

        # Buttons
        self.run_btn = QPushButton("Run benchmark")
        self.run_btn.setObjectName("Primary")
        self.run_btn.clicked.connect(self.run)
        self.cancel_btn = QPushButton("Cancel")
        self.cancel_btn.setEnabled(False)
        self.cancel_btn.clicked.connect(self.cancel)
        self.csv_btn = QPushButton("Export CSV…")
        self.csv_btn.clicked.connect(self.export_csv)
        self.json_btn = QPushButton("Export JSON…")
        self.json_btn.clicked.connect(self.export_json)
        self.progress_label = QLabel("")
        self.progress_label.setObjectName("Note")
        self.run_buttons = [self.run_btn, self.csv_btn, self.json_btn]
        btns = QHBoxLayout()
        for b in (self.run_btn, self.cancel_btn, self.csv_btn, self.json_btn):
            btns.addWidget(b)
        btns.addWidget(self.progress_label, 1)

        # Results
        self.table = QTableWidget(0, len(COLUMNS))
        self.table.setHorizontalHeaderLabels(COLUMNS)
        self.table.verticalHeader().hide()
        self.table.setEditTriggers(QAbstractItemView.EditTrigger.NoEditTriggers)
        self.table.setSelectionBehavior(QAbstractItemView.SelectionBehavior.SelectRows)
        self.table.setSelectionMode(QAbstractItemView.SelectionMode.SingleSelection)
        self.table.horizontalHeader().setSectionResizeMode(QHeaderView.ResizeMode.ResizeToContents)
        self.table.itemSelectionChanged.connect(self.show_hist)
        self.hist = QLabel("Run a benchmark, then select a row to see how the distances spread.")
        self.hist.setAlignment(Qt.AlignmentFlag.AlignCenter)
        self.hist.setMinimumHeight(200)
        self.hist.setSizePolicy(QSizePolicy.Policy.Expanding, QSizePolicy.Policy.Expanding)
        self._hist_img = None
        split = QSplitter(Qt.Orientation.Vertical)
        split.addWidget(self.table)
        split.addWidget(self.hist)
        split.setSizes([260, 300])

        note = QLabel(
            "<b>False match rate</b>: share of different-people pairs wrongly called the same person. "
            "<b>False non-match rate</b>: share of same-person pairs the engine missed. "
            "<b>Balanced accuracy</b> averages both at the engine's own threshold. "
            "<b>EER</b> (equal error rate): where both error rates are equal; lower is better. "
            "<b>TAR @ FAR 1%</b>: share of same-person pairs found when only 1% of different-people pairs may "
            "slip through. A photo with no detected face counts as a miss. Results on small sets are rough guides."
        )
        note.setObjectName("Note")
        note.setWordWrap(True)

        layout = QVBoxLayout(self)
        layout.addLayout(top)
        layout.addLayout(btns)
        layout.addWidget(self.make_busy_bar())
        layout.addWidget(split, 1)
        layout.addWidget(note)

    # ---- helpers -------------------------------------------------------------------
    def _pick_dir(self, edit: QLineEdit, title: str):
        d = QFileDialog.getExistingDirectory(self, title, edit.text())
        if d:
            edit.setText(d)

    def _pick_csv(self):
        f, _ = QFileDialog.getOpenFileName(self, "Labels CSV", self.csv_edit.text(), "CSV (*.csv)")
        if f:
            self.csv_edit.setText(f)

    def _load(self):
        return load_dataset(self.folder_edit.text().strip(), self.csv_edit.text().strip())

    def check_dataset(self):
        try:
            items = self._load()
        except (ValueError, OSError) as exc:
            self.show_error(str(exc))
            return None
        people = {i for _, i in items}
        gen, imp = make_pairs([i for _, i in items], self.cap_spin.value())
        self.dataset_info.setText(
            f"{len(items)} photos of {len(people)} people → {len(gen)} same-person and {len(imp)} different-people pairs"
        )
        return items

    # ---- run -----------------------------------------------------------------------
    def run(self):
        items = self.check_dataset()
        if not items:
            return
        base = self.get_options()
        engines = [
            dataclasses.replace(base, model_name=self.engine_list.item(k).text())
            for k in range(self.engine_list.count())
            if self.engine_list.item(k).checkState() == Qt.CheckState.Checked
        ]
        perts = [k for k, cb in self.pert_checks.items() if cb.isChecked()]
        altered = self.altered_edit.text().strip()
        if self.altered_check.isChecked():
            if not altered or not Path(altered).is_dir():
                self.show_error("Choose the folder of altered copies, or untick 'Altered copies folder'.")
                return
            perts.append(ALTERED)
        if not engines:
            self.show_error("Tick at least one engine.")
            return
        if not perts:
            self.show_error("Tick at least one probe condition.")
            return
        self.settings.setValue("bench/folder", self.folder_edit.text().strip())
        self.settings.setValue("bench/csv", self.csv_edit.text().strip())
        self.settings.setValue("bench/altered", altered)
        self.config = {
            "dataset_folder": self.folder_edit.text().strip(),
            "labels_csv": self.csv_edit.text().strip(),
            "altered_folder": altered if ALTERED in perts else "",
            "engines": [fl.engine_name(e) for e in engines],
            "probe_conditions": perts,
            "max_pairs": self.cap_spin.value(),
            "started": time.strftime("%Y-%m-%d %H:%M:%S"),
        }
        self.run_obj = BenchmarkRun(items, engines, perts, altered, self.folder_edit.text().strip(),
                                    self.cap_spin.value())
        self.run_obj.signals.progress.connect(self.progress_label.setText)
        self.run_obj.signals.finished.connect(self.done)
        self.run_obj.signals.failed.connect(self.failed)
        self.table.setRowCount(0)
        self.cancel_btn.setEnabled(True)
        self.set_busy(True, "Benchmark running… (first use of an engine downloads its model)")
        self.run_obj.start()

    def cancel(self):
        if self.run_obj:
            self.run_obj.cancel()
            self.progress_label.setText("Cancelling after the current photo…")

    def failed(self, msg: str, details: str):
        self.cancel_btn.setEnabled(False)
        self.progress_label.setText("")
        if "cancelled" in msg.lower():
            self.set_busy(False, "Benchmark cancelled")
            return
        self.show_error(msg, details)

    def done(self, result: dict):
        self.cancel_btn.setEnabled(False)
        self.result = result
        self.set_busy(False, "Benchmark finished")
        self.progress_label.setText(
            f"{result['photos']} photos, {result['people']} people, {result['genuine_pairs']} same-person and "
            f"{result['impostor_pairs']} different-people pairs"
        )
        rows = result["rows"]
        self.table.setRowCount(len(rows))
        for r, m in enumerate(rows):
            pairs = f"{m['genuine_pairs']} / {m['impostor_pairs']}"
            no_face = str(m["no_face"]) + (f" (+{m['missing_altered']} no copy)" if m.get("missing_altered") else "")
            far01 = _pct(m.get("tar_far_01")) + ("" if m.get("tar_far_01_reliable", True) else " *")
            cells = [
                m["engine"], m["probe_label"], pairs, no_face, f"{m['threshold']:.3f}",
                _pct(m.get("balanced_accuracy")), _pct(m.get("fmr")), _pct(m.get("fnmr")),
                f"{m['best_threshold']:.3f}" if "best_threshold" in m else "–", _pct(m.get("best_accuracy")),
                _pct(m.get("eer")), _pct(m.get("tar_far_1")), far01, f"{m['seconds']:.1f}",
            ]
            for c, text in enumerate(cells):
                item = QTableWidgetItem(text)
                if c >= 2:
                    item.setTextAlignment(Qt.AlignmentFlag.AlignRight | Qt.AlignmentFlag.AlignVCenter)
                self.table.setItem(r, c, item)
        if rows:
            self.table.selectRow(0)

    # ---- output --------------------------------------------------------------------
    def show_hist(self):
        rows = {i.row() for i in self.table.selectedItems()}
        if not rows or not self.result:
            return
        r = min(rows)
        m = self.result["rows"][r]
        gd, idd = self.result["hists"][r]
        if not len(gd) or not len(idd):
            return
        self._hist_img = histogram_image(gd, idd, m["threshold"], f"{m['engine']} - {m['probe_label']}")
        self._show_hist_pixmap()

    def _show_hist_pixmap(self):
        if self._hist_img is not None:
            pm = fl.to_qpixmap(self._hist_img)
            self.hist.setPixmap(pm.scaled(self.hist.size(), Qt.AspectRatioMode.KeepAspectRatio,
                                          Qt.TransformationMode.SmoothTransformation))

    def resizeEvent(self, event):  # noqa: N802
        super().resizeEvent(event)
        self._show_hist_pixmap()

    def _rows_for_export(self) -> list[dict]:
        keys = ["engine", "probe", "photos", "genuine_pairs", "impostor_pairs", "no_face", "missing_altered",
                "threshold", "balanced_accuracy", "fmr", "fnmr", "best_threshold", "best_accuracy", "eer",
                "tar_far_1", "tar_far_01", "seconds"]
        return [{k: m.get(k) for k in keys} for m in self.result["rows"]]

    def export_csv(self):
        if not self.result:
            self.show_error("Run a benchmark first.")
            return
        path, _ = QFileDialog.getSaveFileName(self, "Export results", "facelens-benchmark.csv", "CSV (*.csv)")
        if not path:
            return
        rows = self._rows_for_export()
        with open(path, "w", newline="", encoding="utf-8") as fh:
            w = csv.DictWriter(fh, fieldnames=list(rows[0]))
            w.writeheader()
            w.writerows(rows)
        if self.status:
            self.status(f"Saved {path}")

    def export_json(self):
        if not self.result:
            self.show_error("Run a benchmark first.")
            return
        path, _ = QFileDialog.getSaveFileName(self, "Export results", "facelens-benchmark.json", "JSON (*.json)")
        if not path:
            return
        data = {"config": self.config, "summary": {k: self.result[k] for k in
                                                     ("photos", "people", "genuine_pairs", "impostor_pairs")},
                "results": self._rows_for_export()}
        Path(path).write_text(json.dumps(fl.jsonable(data), indent=2), encoding="utf-8")
        if self.status:
            self.status(f"Saved {path}")
