"""
FaceLens Benchmark tab: measure how accurate each recognition engine is on a labelled photo set,
how much that accuracy drops when the probe photo is degraded (blur, noise, low resolution,
occlusion, darkness, heavy JPEG) or altered by a tool such as Fawkes, and whether errors are
higher for some groups of people (age, gender, skin type) than others.

Protocol
  * Every photo (or video frame) is embedded once per engine (largest face) to form a clean "gallery".
  * Genuine pairs = two photos of the same person; impostor pairs = two different people
    (capped and sampled with a fixed seed, so runs are repeatable).
  * For each perturbation, the first photo of every pair (the "probe") is altered and re-embedded;
    the second stays clean. Distance = cosine distance between unit-length embeddings.
  * A photo where no face is found counts as the largest possible distance (2.0): the system
    fails to match a genuine pair and correctly rejects an impostor pair.
  * Group breakdown: a genuine pair belongs to its person's group; an impostor pair counts for a
    group only when both photos are in that group.

Dataset types
  * Folder per person (sub-folder name = person), optional groups.csv mapping person -> labels.
  * CSV with file and identity columns; any extra columns become group labels.
  * DigiFace-1M (Microsoft, synthetic faces, no real people): numbered folder per identity.
  * Casual Conversations (Meta, consented paid participants): a CSV or JSON annotation file mapping
    file -> subject plus optional age / gender / skin-type labels. Videos are sampled into frames.
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
    QComboBox,
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
VIDEO_EXTS = {".mp4", ".mov", ".avi", ".mkv", ".webm", ".m4v", ".mpg", ".mpeg"}
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

DS_FOLDER, DS_CSV, DS_DIGIFACE, DS_CASUAL = "folder", "csv", "digiface", "casual"
DATASET_TYPES = [
    (DS_FOLDER, "Folder per person"),
    (DS_CSV, "CSV (file, identity)"),
    (DS_DIGIFACE, "DigiFace-1M (synthetic, no real people)"),
    (DS_CASUAL, "Casual Conversations (consented participants)"),
]
MIN_GROUP_GENUINE, MIN_GROUP_IMPOSTOR = 20, 50

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
GROUP_COLUMNS = ["Label", "Group", "Genuine / impostor pairs", "False match rate", "False non-match rate", "EER", "Check"]

DATA_SOURCES_HTML = (
    "<b>Where to get consented test data</b> (FaceLens never downloads data by itself): "
    "<a href='https://github.com/microsoft/DigiFace1M'>DigiFace-1M</a>: synthetic faces, no real people; "
    "Microsoft research licence, non-commercial. "
    "<a href='https://ai.meta.com/datasets/casual-conversations-dataset/'>Casual Conversations v1/v2</a>: "
    "Meta's videos of paid participants who consented, with self-reported age and gender and annotated "
    "skin type; licence terms on that page."
)


# --------------------------------------------------------------------------------------
# Data
# --------------------------------------------------------------------------------------


@dataclasses.dataclass
class Item:
    """One photo (or one frame of a video) of one person, with optional group labels."""

    path: str
    identity: str
    frame: int | None = None  # frame number when path is a video
    groups: dict = dataclasses.field(default_factory=dict)

    @property
    def label(self) -> str:
        return self.path if self.frame is None else f"{self.path}#frame{self.frame}"


def _pick(cols: list[str], *needles: str, exclude: tuple[str, ...] = ()) -> str | None:
    """First column whose lower-cased name contains a needle (needles tried in order)."""
    low = [(c, c.lower().strip()) for c in cols]
    for needle in needles:
        for c, lc in low:
            if needle in lc and c not in exclude:
                return c
    return None


def _age_band(value: str) -> str:
    try:
        age = float(value)
    except (TypeError, ValueError):
        return str(value).strip()
    for hi, band in ((18, "under 18"), (31, "18-30"), (46, "31-45"), (61, "46-60")):
        if age < hi:
            return band
    return "61+"


def _group_columns(cols: list[str], used: tuple[str, ...]) -> dict[str, str]:
    """Map label name -> column for the group labels found among cols."""
    out = {}
    for name, needles in (("age", ("age",)), ("gender", ("gender", "sex")),
                          ("skin", ("fitzpatrick", "monk", "skin", "tone"))):
        c = _pick(cols, *needles, exclude=used)
        if c:
            out[name] = c
    return out


def _clean_groups(raw: dict) -> dict:
    out = {}
    for k, v in raw.items():
        v = "" if v is None else str(v).strip()
        if not v or v.lower() in ("nan", "none", "n/a", "unknown", "-"):
            continue
        out[k] = _age_band(v) if k == "age" else (v.capitalize() if k == "gender" else v)
    return out


def _flatten(rec: dict) -> dict:
    """Lift nested label dicts (e.g. {"label": {"age": ...}}) to the top level."""
    flat = {}
    for k, v in rec.items():
        if isinstance(v, dict):
            flat.update({kk: vv for kk, vv in v.items() if not isinstance(vv, (dict, list))})
        elif not isinstance(v, list):
            flat[k] = v
    return flat


def _read_records(path: str) -> list[dict]:
    """Rows from a CSV, or records from a JSON file in any of the common shapes:
    a list of records; {file: record}; or {subject: {"files": [...], "label": {...}}}."""
    if path.lower().endswith(".json"):
        data = json.loads(Path(path).read_text(encoding="utf-8-sig"))
        records = []
        if isinstance(data, dict):
            for key, rec in data.items():
                if not isinstance(rec, dict):
                    continue
                files = rec.get("files") or rec.get("videos") or rec.get("images")
                if isinstance(files, list):  # subject -> files + labels
                    base = _flatten(rec)
                    base.setdefault("subject_id", key)
                    for f in files:
                        records.append({**base, "file": f})
                else:  # file -> record
                    r = _flatten(rec)
                    r.setdefault("file", key)
                    records.append(r)
        elif isinstance(data, list):
            records = [_flatten(r) for r in data if isinstance(r, dict)]
        return records
    with open(path, newline="", encoding="utf-8-sig") as fh:
        return list(csv.DictReader(fh))


def _video_frames(path: str, n: int) -> list[int]:
    cap = cv2.VideoCapture(path)
    try:
        total = int(cap.get(cv2.CAP_PROP_FRAME_COUNT) or 0)
    finally:
        cap.release()
    if total <= 0:
        return []
    n = max(1, min(n, total))
    return sorted({int(round((k + 0.5) * total / n)) for k in range(n)} - {total})


def load_records(records: list[dict], base: Path, frames: int) -> list[Item]:
    """Turn annotation rows into Items using loose column-name matching."""
    if not records:
        raise ValueError("The annotation file has no rows.")
    cols = list({k for r in records for k in r})
    fcol = _pick(cols, "file", "path", "video", "image")
    icol = _pick(cols, "subject", "participant", "identity", "person", "label", "name", "id", exclude=(fcol,))
    if not fcol or not icol:
        raise ValueError("The annotation file needs a file/path/video column and a subject/identity column.")
    gcols = _group_columns(cols, (fcol, icol))
    items: list[Item] = []
    for r in records:
        f, ident = str(r.get(fcol) or "").strip(), str(r.get(icol) or "").strip()
        if not f or not ident:
            continue
        p = Path(f)
        if not p.is_absolute():
            p = base / p
        if not p.is_file():
            continue
        groups = _clean_groups({name: r.get(col) for name, col in gcols.items()})
        if p.suffix.lower() in VIDEO_EXTS:
            for fr in _video_frames(str(p), frames):
                items.append(Item(str(p), ident, fr, groups))
        elif p.suffix.lower() in fl.IMAGE_EXTS:
            items.append(Item(str(p), ident, None, groups))
    return items


def _folder_items(root: Path, frames: int) -> list[Item]:
    items = []
    subs = [d for d in root.iterdir() if d.is_dir()]
    subs.sort(key=lambda d: (0, int(d.name), "") if d.name.isdigit() else (1, 0, d.name.lower()))
    for sub in subs:
        for p in sorted(sub.rglob("*")):
            if not p.is_file():
                continue
            if p.suffix.lower() in fl.IMAGE_EXTS:
                items.append(Item(str(p), sub.name))
            elif p.suffix.lower() in VIDEO_EXTS:
                items += [Item(str(p), sub.name, fr) for fr in _video_frames(str(p), frames)]
    groups_csv = root / "groups.csv"
    if groups_csv.is_file():
        rows = _read_records(str(groups_csv))
        cols = list({k for r in rows for k in r})
        icol = _pick(cols, "identity", "person", "subject", "participant", "folder", "name", "id")
        gcols = _group_columns(cols, (icol,)) if icol else {}
        table = {str(r.get(icol, "")).strip(): _clean_groups({n: r.get(c) for n, c in gcols.items()}) for r in rows}
        for it in items:
            it.groups = table.get(it.identity, {})
    return items


def cap_items(items: list[Item], max_people: int, max_per_person: int) -> list[Item]:
    if not max_people and not max_per_person:
        return items
    order, by_id = [], {}
    for it in items:
        if it.identity not in by_id:
            by_id[it.identity] = []
            order.append(it.identity)
        by_id[it.identity].append(it)
    if max_people:
        order = order[:max_people]
    out = []
    for ident in order:
        out += by_id[ident][: max_per_person or None]
    return out


def load_dataset(kind: str, folder: str = "", annotations: str = "", frames: int = 3,
                 max_people: int = 0, max_per_person: int = 0) -> list[Item]:
    if kind in (DS_FOLDER, DS_DIGIFACE):
        root = Path(folder)
        if not root.is_dir():
            raise ValueError("Choose the dataset folder (one sub-folder per person).")
        items = _folder_items(root, frames)
    else:
        if not annotations or not Path(annotations).is_file():
            raise ValueError("Choose the annotation file (CSV or JSON).")
        base = Path(folder) if folder and Path(folder).is_dir() else Path(annotations).parent
        items = load_records(_read_records(annotations), base, frames)
    items = cap_items(items, max_people, max_per_person)
    idents = {it.identity for it in items}
    if len(idents) < 2:
        raise ValueError("The dataset needs at least two people (check the folder, file paths and columns).")
    counts: dict[str, int] = {}
    for it in items:
        counts[it.identity] = counts.get(it.identity, 0) + 1
    if max(counts.values()) < 2:
        raise ValueError("At least one person needs two or more photos (otherwise there are no genuine pairs).")
    return items


def load_image(item: Item) -> np.ndarray | None:
    if item.frame is None:
        try:
            return fl.read_image(item.path)
        except ValueError:
            return None
    cap = cv2.VideoCapture(item.path)
    try:
        cap.set(cv2.CAP_PROP_POS_FRAMES, item.frame)
        ok, frame = cap.read()
    finally:
        cap.release()
    return frame if ok else None


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
    if ng:
        out["fnmr"] = float(np.mean(g > threshold))
    if ni:
        out["fmr"] = float(np.mean(im <= threshold))
    if not ng or not ni:
        return out
    out["balanced_accuracy"] = 1 - (out["fmr"] + out["fnmr"]) / 2
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


def group_breakdown(items: list[Item], gen_pairs, imp_pairs, gd_by_pair: dict, id_by_pair: dict,
                    threshold: float, overall: dict) -> list[dict]:
    """Metrics per (label, group). gd_by_pair / id_by_pair map pair index -> distance (missing pairs absent)."""
    labels = sorted({k for it in items for k in it.groups})
    rows = []
    for label in labels:
        values = sorted({it.groups[label] for it in items if label in it.groups})
        for value in values:
            gd = [d for k, d in gd_by_pair.items() if items[gen_pairs[k][0]].groups.get(label) == value]
            idd = [d for k, d in id_by_pair.items()
                   if items[imp_pairs[k][0]].groups.get(label) == value
                   and items[imp_pairs[k][1]].groups.get(label) == value]
            m = compute_metrics(np.array(gd), np.array(idd), threshold)
            enough = len(gd) >= MIN_GROUP_GENUINE and len(idd) >= MIN_GROUP_IMPOSTOR
            flags = []
            if enough:
                for key, name in (("fmr", "false matches"), ("fnmr", "missed matches")):
                    g, o = m.get(key), overall.get(key)
                    if g is not None and o is not None and g > 0 and g > 2 * o:
                        flags.append(f"{name} {g / o:.1f}x overall" if o > 0 else f"{name} (overall 0)")
            check = "too few pairs" if not enough else ("; ".join(flags) if flags else "ok")
            rows.append({"label": label, "group": value, "genuine_pairs": len(gd), "impostor_pairs": len(idd),
                         "fmr": m.get("fmr"), "fnmr": m.get("fnmr"), "eer": m.get("eer"),
                         "enough_pairs": enough, "flagged": bool(flags), "check": check})
    return rows


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
    lx = width - right - 156
    cv2.rectangle(img, (lx - 6, top + 12), (width - right, top + 52), (255, 255, 255), -1)
    cv2.rectangle(img, (lx - 6, top + 12), (width - right, top + 52), (200, 200, 200), 1)
    for k, (label, color) in enumerate((("same person", (70, 170, 60)), ("different people", (70, 70, 220)))):
        x = lx
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

    def __init__(self, items: list[Item], engines: list[fl.Options], perturbations: list[str], altered_root: str,
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
        items = self.items
        ids = [it.identity for it in items]
        gen_pairs, imp_pairs = make_pairs(ids, self.cap)
        resolver = AlteredResolver(self.altered_root, self.dataset_root) if ALTERED in self.perturbations else None
        has_groups = any(it.groups for it in items)
        rows, hists = [], []
        n = len(items)
        for opts in self.engines:
            name = fl.engine_name(opts)
            threshold = fl.match_threshold(opts)
            t_engine = time.time()
            images: list[np.ndarray | None] = []
            clean: list = []
            for k, it in enumerate(items):
                self._check()
                self.signals.progress.emit(f"{name}: embedding photo {k + 1} of {n}")
                img = load_image(it)
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
                            alt = resolver.find(items[k].path) if items[k].frame is None else None
                            pimg = fl.read_image(alt) if alt else None
                            if pimg is None:
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

                def distances(pairs) -> dict[int, float]:
                    out = {}
                    for p, (i, j) in enumerate(pairs):
                        if i in missing:
                            continue
                        a, b = probes[i], clean[j]
                        out[p] = (NO_FACE_DISTANCE if a is None or b is None else
                                  float(np.clip(1.0 - float(a.emb @ b.emb), 0.0, 2.0)))
                    return out

                g_map, i_map = distances(gen_pairs), distances(imp_pairs)
                gd, idd = np.array(list(g_map.values())), np.array(list(i_map.values()))
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
                    groups=group_breakdown(items, gen_pairs, imp_pairs, g_map, i_map, threshold, m) if has_groups else [],
                )
                rows.append(m)
                hists.append((gd, idd))
        return {
            "rows": rows,
            "hists": hists,
            "photos": n,
            "people": len(set(ids)),
            "videos": len({it.path for it in items if it.frame is not None}),
            "genuine_pairs": int(len(gen_pairs)),
            "impostor_pairs": int(len(imp_pairs)),
            "group_labels": sorted({k for it in items for k in it.groups}),
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
        self.items: list[Item] = []

        # Dataset
        self.type_box = QComboBox()
        for key, label in DATASET_TYPES:
            self.type_box.addItem(label, key)
        saved = self.settings.value("bench/type", DS_FOLDER)
        self.type_box.setCurrentIndex(max(0, [k for k, _ in DATASET_TYPES].index(saved) if saved in
                                          [k for k, _ in DATASET_TYPES] else 0))
        self.folder_edit = QLineEdit(self.settings.value("bench/folder", ""))
        self.ann_edit = QLineEdit(self.settings.value("bench/csv", ""))
        b1, b2 = QPushButton("Browse…"), QPushButton("Browse…")
        b1.clicked.connect(lambda: self._pick_dir(self.folder_edit, "Dataset folder"))
        b2.clicked.connect(self._pick_ann)
        self.people_spin = QSpinBox()
        self.people_spin.setRange(0, 1_000_000)
        self.people_spin.setSpecialValueText("all")
        self.people_spin.setToolTip("Use only the first N people (0 = all). Keeps big sets like DigiFace-1M quick.")
        self.per_spin = QSpinBox()
        self.per_spin.setRange(0, 10_000)
        self.per_spin.setSpecialValueText("all")
        self.per_spin.setToolTip("Use at most N photos (or video frames) per person (0 = all).")
        self.frames_spin = QSpinBox()
        self.frames_spin.setRange(1, 60)
        self.frames_spin.setValue(3)
        self.frames_spin.setToolTip("Evenly spaced frames taken from each video; each counts as one photo.")
        self.type_hint = QLabel("")
        self.type_hint.setObjectName("Note")
        self.type_hint.setWordWrap(True)
        self.dataset_info = QLabel("")
        self.dataset_info.setObjectName("Note")
        self.dataset_info.setWordWrap(True)
        check = QPushButton("Check dataset")
        check.clicked.connect(self.check_dataset)
        ds = QGroupBox("Labelled photos")
        g = QGridLayout(ds)
        g.addWidget(QLabel("Type"), 0, 0)
        g.addWidget(self.type_box, 0, 1, 1, 2)
        self.folder_label = QLabel("Folder")
        g.addWidget(self.folder_label, 1, 0)
        g.addWidget(self.folder_edit, 1, 1)
        g.addWidget(b1, 1, 2)
        self.ann_label = QLabel("Annotations")
        self.ann_browse = b2
        g.addWidget(self.ann_label, 2, 0)
        g.addWidget(self.ann_edit, 2, 1)
        g.addWidget(b2, 2, 2)
        caps = QHBoxLayout()
        caps.addWidget(QLabel("People"))
        caps.addWidget(self.people_spin)
        caps.addWidget(QLabel("Photos each"))
        caps.addWidget(self.per_spin)
        caps.addWidget(QLabel("Frames per video"))
        caps.addWidget(self.frames_spin)
        caps.addStretch()
        g.addLayout(caps, 3, 0, 1, 3)
        g.addWidget(self.type_hint, 4, 0, 1, 3)
        g.addWidget(self.dataset_info, 5, 0, 1, 2)
        g.addWidget(check, 5, 2)
        self.type_box.currentIndexChanged.connect(self._type_changed)

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
            "(which saves <name>_cloaked.png). Matched by relative path or by file name. Not used for video frames."
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
        top.addWidget(ds, 4)
        top.addWidget(eng, 2)
        top.addWidget(pert, 3)

        sources = QLabel(DATA_SOURCES_HTML)
        sources.setObjectName("Note")
        sources.setWordWrap(True)
        sources.setOpenExternalLinks(True)
        sources.setTextFormat(Qt.TextFormat.RichText)

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
        self.table = self._table(COLUMNS)
        self.table.itemSelectionChanged.connect(self.show_selected)
        self.group_table = self._table(GROUP_COLUMNS)
        self.group_title = QLabel("<b>By group</b>")
        bias_note = QLabel(
            "Face matching often works less well for some ages, genders or skin tones. This table shows each "
            "group's error rates for the selected row so you can check; rows more than twice the overall rate "
            "are highlighted."
        )
        bias_note.setObjectName("Note")
        bias_note.setWordWrap(True)
        self.group_empty = QLabel("No group labels in this dataset. Add age, gender or skin-type columns "
                                  "(CSV / annotations) or a groups.csv next to the person folders.")
        self.group_empty.setObjectName("Note")
        self.group_empty.setWordWrap(True)
        gbox = QWidget()
        gl = QVBoxLayout(gbox)
        gl.setContentsMargins(0, 0, 0, 0)
        gl.addWidget(self.group_title)
        gl.addWidget(bias_note)
        gl.addWidget(self.group_table, 1)
        gl.addWidget(self.group_empty)
        self.hist = QLabel("Run a benchmark, then select a row to see how the distances spread.")
        self.hist.setAlignment(Qt.AlignmentFlag.AlignCenter)
        self.hist.setMinimumHeight(180)
        self.hist.setSizePolicy(QSizePolicy.Policy.Expanding, QSizePolicy.Policy.Expanding)
        self._hist_img = None
        lower = QSplitter(Qt.Orientation.Horizontal)
        lower.addWidget(gbox)
        lower.addWidget(self.hist)
        lower.setSizes([620, 620])
        split = QSplitter(Qt.Orientation.Vertical)
        split.addWidget(self.table)
        split.addWidget(lower)
        split.setSizes([240, 320])

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
        layout.addWidget(sources)
        layout.addLayout(btns)
        layout.addWidget(self.make_busy_bar())
        layout.addWidget(split, 1)
        layout.addWidget(note)
        self._type_changed()

    # ---- helpers -------------------------------------------------------------------
    @staticmethod
    def _table(columns: list[str]) -> QTableWidget:
        t = QTableWidget(0, len(columns))
        t.setHorizontalHeaderLabels(columns)
        t.verticalHeader().hide()
        t.setEditTriggers(QAbstractItemView.EditTrigger.NoEditTriggers)
        t.setSelectionBehavior(QAbstractItemView.SelectionBehavior.SelectRows)
        t.setSelectionMode(QAbstractItemView.SelectionMode.SingleSelection)
        t.horizontalHeader().setSectionResizeMode(QHeaderView.ResizeMode.ResizeToContents)
        return t

    def _kind(self) -> str:
        return self.type_box.currentData()

    def _type_changed(self, *_):
        kind = self._kind()
        uses_ann = kind in (DS_CSV, DS_CASUAL)
        self.ann_label.setVisible(uses_ann)
        self.ann_edit.setVisible(uses_ann)
        self.ann_browse.setVisible(uses_ann)
        self.folder_label.setText("Media folder" if uses_ann else "Folder")
        hints = {
            DS_FOLDER: ("One sub-folder per person; the sub-folder name is the person. Optional groups.csv in the "
                        "folder (identity plus age / gender / skin columns) enables the group breakdown."),
            DS_CSV: ("CSV with a file column and an identity column; paths are relative to the media folder (or "
                     "the CSV's folder). Extra age / gender / skin columns enable the group breakdown."),
            DS_DIGIFACE: ("Synthetic faces, no real people: numbered folders, one per made-up identity. Use the "
                          "People and Photos each limits (e.g. 200 x 5) to keep runs short."),
            DS_CASUAL: ("Consented, paid participants. Choose the annotation CSV or JSON (file / subject / age / "
                        "gender / skin type) and the folder holding the videos. Each video gives the chosen number "
                        "of frames."),
        }
        self.folder_edit.setPlaceholderText({
            DS_FOLDER: "Folder with one sub-folder per person",
            DS_CSV: "Optional: folder the CSV paths are relative to",
            DS_DIGIFACE: "DigiFace-1M folder (numbered identity folders)",
            DS_CASUAL: "Folder holding the videos (optional if paths in the file are absolute)",
        }[kind])
        self.ann_edit.setPlaceholderText("CSV with file,identity" if kind == DS_CSV else "Annotation CSV or JSON")
        self.type_hint.setText(hints[kind])
        # DigiFace-1M has 10,000+ identities: suggest 200 x 5, and undo that suggestion (only if unchanged)
        # when switching to another dataset type.
        auto = (200, 5)
        caps = (self.people_spin.value(), self.per_spin.value())
        if kind == DS_DIGIFACE and caps == (0, 0):
            self.people_spin.setValue(auto[0])
            self.per_spin.setValue(auto[1])
        elif kind != DS_DIGIFACE and caps == auto and getattr(self, "_auto_caps", False):
            self.people_spin.setValue(0)
            self.per_spin.setValue(0)
        self._auto_caps = kind == DS_DIGIFACE and (self.people_spin.value(), self.per_spin.value()) == auto

    def _pick_dir(self, edit: QLineEdit, title: str):
        d = QFileDialog.getExistingDirectory(self, title, edit.text())
        if d:
            edit.setText(d)

    def _pick_ann(self):
        f, _ = QFileDialog.getOpenFileName(self, "Annotations", self.ann_edit.text(), "CSV or JSON (*.csv *.json)")
        if f:
            self.ann_edit.setText(f)

    def _load(self) -> list[Item]:
        return load_dataset(self._kind(), self.folder_edit.text().strip(), self.ann_edit.text().strip(),
                            self.frames_spin.value(), self.people_spin.value(), self.per_spin.value())

    def check_dataset(self):
        try:
            items = self._load()
        except (ValueError, OSError, json.JSONDecodeError) as exc:
            self.show_error(str(exc))
            return None
        people = {it.identity for it in items}
        videos = {it.path for it in items if it.frame is not None}
        labels = sorted({k for it in items for k in it.groups})
        gen, imp = make_pairs([it.identity for it in items], self.cap_spin.value())
        text = (f"{len(items)} photos" + (f" (incl. frames from {len(videos)} videos)" if videos else "")
                + f" of {len(people)} people → {len(gen)} same-person and {len(imp)} different-people pairs")
        if labels:
            text += ". Group labels: " + ", ".join(labels)
        if self._kind() == DS_DIGIFACE:
            text += ". Synthetic, no real people."
        self.dataset_info.setText(text)
        self.items = items
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
        self.settings.setValue("bench/type", self._kind())
        self.settings.setValue("bench/folder", self.folder_edit.text().strip())
        self.settings.setValue("bench/csv", self.ann_edit.text().strip())
        self.settings.setValue("bench/altered", altered)
        self.config = {
            "dataset_type": self._kind(),
            "dataset_folder": self.folder_edit.text().strip(),
            "annotations": self.ann_edit.text().strip(),
            "max_people": self.people_spin.value(),
            "max_photos_per_person": self.per_spin.value(),
            "frames_per_video": self.frames_spin.value(),
            "altered_folder": altered if ALTERED in perts else "",
            "engines": [fl.engine_name(e) for e in engines],
            "probe_conditions": perts,
            "max_pairs": self.cap_spin.value(),
            "started": time.strftime("%Y-%m-%d %H:%M:%S"),
        }
        root = self.folder_edit.text().strip()
        self.run_obj = BenchmarkRun(items, engines, perts, altered, root, self.cap_spin.value())
        self.run_obj.signals.progress.connect(self.progress_label.setText)
        self.run_obj.signals.finished.connect(self.done)
        self.run_obj.signals.failed.connect(self.failed)
        self.table.setRowCount(0)
        self.group_table.setRowCount(0)
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
            if any(gr["flagged"] for gr in m.get("groups", [])):
                cells[1] += "  ⚑"
            for c, text in enumerate(cells):
                item = QTableWidgetItem(text)
                if c >= 2:
                    item.setTextAlignment(Qt.AlignmentFlag.AlignRight | Qt.AlignmentFlag.AlignVCenter)
                self.table.setItem(r, c, item)
        if rows:
            self.table.selectRow(0)

    # ---- output --------------------------------------------------------------------
    def show_selected(self):
        rows = {i.row() for i in self.table.selectedItems()}
        if not rows or not self.result:
            return
        r = min(rows)
        m = self.result["rows"][r]
        self._fill_groups(m)
        gd, idd = self.result["hists"][r]
        if not len(gd) or not len(idd):
            return
        self._hist_img = histogram_image(gd, idd, m["threshold"], f"{m['engine']} - {m['probe_label']}")
        self._show_hist_pixmap()

    def _fill_groups(self, m: dict):
        groups = m.get("groups", [])
        self.group_title.setText(f"<b>By group</b> - {m['engine']}, {m['probe_label']}")
        self.group_empty.setVisible(not groups)
        self.group_table.setVisible(bool(groups))
        self.group_table.setRowCount(len(groups))
        for r, gr in enumerate(groups):
            cells = [gr["label"], gr["group"], f"{gr['genuine_pairs']} / {gr['impostor_pairs']}",
                     _pct(gr["fmr"]), _pct(gr["fnmr"]), _pct(gr["eer"]), gr["check"]]
            for c, text in enumerate(cells):
                item = QTableWidgetItem(text)
                if 2 <= c <= 5:
                    item.setTextAlignment(Qt.AlignmentFlag.AlignRight | Qt.AlignmentFlag.AlignVCenter)
                if gr["flagged"]:
                    item.setBackground(Qt.GlobalColor.yellow)
                    item.setForeground(Qt.GlobalColor.black)
                elif not gr["enough_pairs"]:
                    item.setForeground(Qt.GlobalColor.gray)
                self.group_table.setItem(r, c, item)

    def _show_hist_pixmap(self):
        if self._hist_img is not None:
            pm = fl.to_qpixmap(self._hist_img)
            self.hist.setPixmap(pm.scaled(self.hist.size(), Qt.AspectRatioMode.KeepAspectRatio,
                                          Qt.TransformationMode.SmoothTransformation))

    def resizeEvent(self, event):  # noqa: N802
        super().resizeEvent(event)
        self._show_hist_pixmap()

    METRIC_KEYS = ["threshold", "balanced_accuracy", "fmr", "fnmr", "best_threshold", "best_accuracy", "eer",
                   "tar_far_1", "tar_far_01"]

    def _rows_for_export(self) -> list[dict]:
        """One row per engine x probe (group fields blank), then one per engine x probe x group."""
        out = []
        for m in self.result["rows"]:
            base = {"engine": m["engine"], "probe": m["probe"], "group_label": "", "group": "",
                    "photos": m["photos"], "genuine_pairs": m["genuine_pairs"], "impostor_pairs": m["impostor_pairs"],
                    "no_face": m["no_face"], "missing_altered": m["missing_altered"],
                    **{k: m.get(k) for k in self.METRIC_KEYS}, "check": "", "seconds": m["seconds"]}
            out.append(base)
            for gr in m.get("groups", []):
                row = {k: "" for k in base}
                row.update(engine=m["engine"], probe=m["probe"], group_label=gr["label"], group=gr["group"],
                           genuine_pairs=gr["genuine_pairs"], impostor_pairs=gr["impostor_pairs"],
                           threshold=m["threshold"], fmr=gr["fmr"], fnmr=gr["fnmr"], eer=gr["eer"], check=gr["check"])
                out.append(row)
        return out

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
        results = []
        for m in self.result["rows"]:
            results.append({"engine": m["engine"], "probe": m["probe"], "photos": m["photos"],
                            "genuine_pairs": m["genuine_pairs"], "impostor_pairs": m["impostor_pairs"],
                            "no_face": m["no_face"], "missing_altered": m["missing_altered"],
                            **{k: m.get(k) for k in self.METRIC_KEYS}, "seconds": m["seconds"],
                            "by_group": m.get("groups", [])})
        data = {"config": self.config,
                "summary": {k: self.result[k] for k in ("photos", "people", "videos", "genuine_pairs",
                                                         "impostor_pairs", "group_labels")},
                "results": results}
        Path(path).write_text(json.dumps(fl.jsonable(data), indent=2), encoding="utf-8")
        if self.status:
            self.status(f"Saved {path}")
