"""
FaceLens Video tab.

  * Find in video  - scan your own video file for the person in a query photo and list when they appear
  * Redact faces   - blur, pixelate or black out faces in photos or a video (all faces, everyone except
                     one person, or only that person)

Everything runs locally. The heavy work runs on a background thread; the UI only shows progress.
"""

from __future__ import annotations

import csv
import threading
import time
from pathlib import Path

import cv2
import numpy as np
from PySide6.QtCore import QObject, QSize, Qt, Signal
from PySide6.QtGui import QIcon
from PySide6.QtWidgets import (
    QButtonGroup,
    QComboBox,
    QDoubleSpinBox,
    QFileDialog,
    QFormLayout,
    QHBoxLayout,
    QLabel,
    QLineEdit,
    QListWidget,
    QListWidgetItem,
    QProgressBar,
    QPushButton,
    QRadioButton,
    QSizePolicy,
    QSplitter,
    QTabWidget,
    QVBoxLayout,
    QWidget,
)

import facelens as fl

VIDEO_FILTER = "Videos (*.mp4 *.avi *.mov *.mkv *.m4v *.wmv *.webm)"
REDACT_STYLES = ["Blur", "Pixelate", "Solid box"]
REDACT_MODES = [
    "Every face",
    "Everyone except the person in the reference photo",
    "Only the person in the reference photo",
]


class Cancelled(Exception):
    pass


# --------------------------------------------------------------------------------------
# Plain functions (no Qt): easy to test and reuse
# --------------------------------------------------------------------------------------


def fmt_time(seconds: float) -> str:
    seconds = max(0.0, float(seconds))
    h, rem = divmod(seconds, 3600)
    m, s = divmod(rem, 60)
    return f"{int(h):02d}:{int(m):02d}:{s:04.1f}"


def video_info(path: str) -> dict:
    cap = cv2.VideoCapture(path)
    if not cap.isOpened():
        raise ValueError(f"Could not open video: {path}")
    fps = cap.get(cv2.CAP_PROP_FPS) or 25.0
    frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT) or 0)
    w, h = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH)), int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    cap.release()
    return {"fps": float(fps), "frames": frames, "duration": frames / fps if fps else 0.0, "size": (w, h)}


def read_frame(path: str, index: int) -> np.ndarray:
    cap = cv2.VideoCapture(path)
    try:
        cap.set(cv2.CAP_PROP_POS_FRAMES, max(0, int(index)))
        ok, frame = cap.read()
        if not ok:
            raise ValueError(f"Could not read frame {index}")
        return frame
    finally:
        cap.release()


def group_appearances(hits: list[dict], interval: float) -> list[dict]:
    """Merge hits less than ~1.5 sampling intervals apart into continuous appearances."""
    out: list[dict] = []
    for h in sorted(hits, key=lambda h: h["time"]):
        if out and h["time"] - out[-1]["end"] <= interval * 1.5 + 1e-6:
            out[-1]["end"] = h["time"]
            out[-1]["hits"] += 1
            out[-1]["best"] = min(out[-1]["best"], h["distance"])
        else:
            out.append({"start": h["time"], "end": h["time"], "hits": 1, "best": h["distance"]})
    return out


def find_in_video(
    path: str,
    query_emb: np.ndarray,
    opts: fl.Options,
    interval: float = 1.0,
    start: float = 0.0,
    end: float = 0.0,
    progress=None,
    cancelled=None,
) -> dict:
    """Sample a frame every `interval` seconds and keep faces that match query_emb."""
    info = video_info(path)
    fps = info["fps"]
    threshold = fl.match_threshold(opts)
    step = max(1, int(round(interval * fps)))
    first = int(round(max(0.0, start) * fps))
    last = info["frames"] - 1 if not end or end <= start else min(info["frames"] - 1, int(round(end * fps)))
    cap = cv2.VideoCapture(path)
    hits: list[dict] = []
    sampled = 0
    t0 = time.time()
    try:
        if first:
            cap.set(cv2.CAP_PROP_POS_FRAMES, first)
        index = first
        while index <= last:
            if cancelled and cancelled():
                raise Cancelled()
            ok, frame = cap.read()
            if not ok:
                break
            sampled += 1
            for f in fl.embed_faces(frame, opts):
                dist = float(max(0.0, 1.0 - float(f.emb @ query_emb)))
                if dist <= threshold:
                    x, y, w, h = f.box
                    crop = frame[max(0, y): y + h, max(0, x): x + w]
                    thumb = cv2.resize(crop, (96, int(96 * h / w))) if crop.size and w else None
                    hits.append({"time": index / fps, "frame": index, "distance": dist, "box": f.box, "thumb": thumb})
            if progress:
                progress(index - first, max(1, last - first), f"{fmt_time(index / fps)} - {len(hits)} match(es)")
            # Skip ahead by grabbing (cheap, and more reliable than seeking on many codecs).
            for _ in range(step - 1):
                if not cap.grab():
                    index = last + 1
                    break
            index += step
    finally:
        cap.release()
    return {
        "hits": hits,
        "appearances": group_appearances(hits, interval),
        "threshold": threshold,
        "sampled": sampled,
        "interval": interval,
        "info": info,
        "seconds": time.time() - t0,
    }


def expand_box(box, shape, pct: float = 0.25) -> tuple[int, int, int, int]:
    x, y, w, h = box
    dx, dy = int(w * pct / 2), int(h * pct / 2)
    H, W = shape[:2]
    x1, y1 = max(0, x - dx), max(0, y - int(dy * 1.4))  # a little extra above for the forehead and hair
    x2, y2 = min(W, x + w + dx), min(H, y + h + dy)
    return x1, y1, x2 - x1, y2 - y1


def obscure(img: np.ndarray, box, style: str) -> None:
    x, y, w, h = box
    if w <= 0 or h <= 0:
        return
    roi = img[y: y + h, x: x + w]
    if style == "Pixelate":
        small = cv2.resize(roi, (max(1, w // 12), max(1, h // 12)), interpolation=cv2.INTER_LINEAR)
        img[y: y + h, x: x + w] = cv2.resize(small, (w, h), interpolation=cv2.INTER_NEAREST)
    elif style == "Solid box":
        img[y: y + h, x: x + w] = 0
    else:
        k = max(31, (max(w, h) // 2) | 1)
        blurred = cv2.GaussianBlur(roi, (k, k), 0)
        img[y: y + h, x: x + w] = cv2.GaussianBlur(blurred, (k, k), 0)


def detect_for_redaction(img: np.ndarray, opts: fl.Options, need_emb: bool) -> list:
    """Faces to consider: (box, emb-or-None). Fast InsightFace detection when embeddings aren't needed."""
    if not need_emb:
        try:
            return [((b["x"], b["y"], b["w"], b["h"]), None)
                    for b in (fl.InsightEngine._box(f) for f in fl.InsightEngine.faces(img, require=False))]
        except ImportError:
            pass
    return [(f.box, f.emb) for f in fl.embed_faces(img, opts)]


def redact_image(
    img: np.ndarray,
    opts: fl.Options,
    style: str = "Blur",
    mode: str = REDACT_MODES[0],
    ref_emb: np.ndarray | None = None,
    threshold: float | None = None,
) -> tuple[np.ndarray, int, int]:
    """Return (redacted copy, faces obscured, faces found)."""
    need_emb = mode != REDACT_MODES[0]
    if need_emb and ref_emb is None:
        raise ValueError("Choose a reference photo for this redaction mode.")
    threshold = fl.match_threshold(opts) if threshold is None else threshold
    out = img.copy()
    faces = detect_for_redaction(img, opts, need_emb)
    done = 0
    for box, emb in faces:
        if need_emb:
            same = float(1.0 - float(emb @ ref_emb)) <= threshold
            if (mode == REDACT_MODES[1] and same) or (mode == REDACT_MODES[2] and not same):
                continue
        obscure(out, expand_box(box, img.shape), style)
        done += 1
    return out, done, len(faces)


def redact_video(
    src: str,
    dst: str,
    opts: fl.Options,
    style: str = "Blur",
    mode: str = REDACT_MODES[0],
    ref_emb: np.ndarray | None = None,
    progress=None,
    cancelled=None,
) -> dict:
    info = video_info(src)
    cap = cv2.VideoCapture(src)
    writer = None
    frames = obscured = 0
    threshold = fl.match_threshold(opts)
    t0 = time.time()
    try:
        while True:
            if cancelled and cancelled():
                raise Cancelled()
            ok, frame = cap.read()
            if not ok:
                break
            if writer is None:
                h, w = frame.shape[:2]
                writer = cv2.VideoWriter(dst, cv2.VideoWriter_fourcc(*"mp4v"), info["fps"], (w, h))
                if not writer.isOpened():
                    raise ValueError(f"Could not write video: {dst}")
            out, n, _ = redact_image(frame, opts, style, mode, ref_emb, threshold)
            writer.write(out)
            frames += 1
            obscured += n
            if progress:
                progress(frames, max(1, info["frames"]), f"frame {frames} of {info['frames']}")
    finally:
        cap.release()
        if writer is not None:
            writer.release()
    if cancelled and cancelled():
        Path(dst).unlink(missing_ok=True)
    return {"frames": frames, "obscured": obscured, "seconds": time.time() - t0, "output": dst}


def redact_photos(
    paths: list[str],
    out_dir: str,
    opts: fl.Options,
    style: str = "Blur",
    mode: str = REDACT_MODES[0],
    ref_emb: np.ndarray | None = None,
    progress=None,
    cancelled=None,
) -> dict:
    Path(out_dir).mkdir(parents=True, exist_ok=True)
    written, obscured, t0 = [], 0, time.time()
    for n, p in enumerate(paths, 1):
        if cancelled and cancelled():
            raise Cancelled()
        img = fl.read_image(p)
        out, k, _ = redact_image(img, opts, style, mode, ref_emb)
        dst = str(Path(out_dir) / f"{Path(p).stem}-redacted{Path(p).suffix or '.png'}")
        fl.write_image(dst, out)
        written.append(dst)
        obscured += k
        if progress:
            progress(n, len(paths), Path(p).name)
    return {"files": written, "obscured": obscured, "seconds": time.time() - t0, "output": out_dir}


# --------------------------------------------------------------------------------------
# Qt
# --------------------------------------------------------------------------------------


class ProgressSignals(QObject):
    progress = Signal(int, int, str)


class FrameView(QLabel):
    """Displays an image scaled to fit (no click-to-open, unlike fl.ImageView)."""

    def __init__(self, text: str = ""):
        super().__init__(text)
        self._pixmap = None
        self.setObjectName("ImageView")
        self.setAlignment(Qt.AlignmentFlag.AlignCenter)
        self.setMinimumSize(240, 180)
        self.setSizePolicy(QSizePolicy.Policy.Expanding, QSizePolicy.Policy.Expanding)

    def set_image(self, img):
        self._pixmap = fl.to_qpixmap(img) if img is not None else None
        if self._pixmap is None:
            self.clear()
        self._rescale()

    def _rescale(self):
        if self._pixmap is not None:
            self.setPixmap(self._pixmap.scaled(self.size(), Qt.AspectRatioMode.KeepAspectRatio,
                                               Qt.TransformationMode.SmoothTransformation))

    def resizeEvent(self, event):  # noqa: N802
        super().resizeEvent(event)
        self._rescale()


class _Panel(QWidget, fl.BusyMixin):
    """Shared plumbing: progress bar, cancel, error display."""

    status = None

    def __init__(self, get_options):
        super().__init__()
        self.get_options = get_options
        self._cancel = threading.Event()
        self.sig = ProgressSignals()
        self.sig.progress.connect(self._on_progress)
        self.progress = QProgressBar()
        self.progress.setMaximumHeight(14)
        self.progress.setTextVisible(True)
        self.progress.hide()
        self.cancel_btn = QPushButton("Cancel")
        self.cancel_btn.clicked.connect(self._cancel.set)
        self.cancel_btn.setEnabled(False)
        self.make_busy_bar()

    def _on_progress(self, done: int, total: int, text: str):
        self.progress.setMaximum(max(1, total))
        self.progress.setValue(min(done, total))
        self.progress.setFormat(f"%p%  {text}")

    def begin(self, message: str):
        self._cancel.clear()
        self.progress.setValue(0)
        self.progress.setFormat("%p%")
        self.progress.show()
        self.cancel_btn.setEnabled(True)
        self.set_busy(True, message)

    def end(self, message: str = ""):
        self.progress.hide()
        self.cancel_btn.setEnabled(False)
        self.set_busy(False, message)

    def failed(self, message: str, details: str = ""):
        self.progress.hide()
        self.cancel_btn.setEnabled(False)
        if "Cancelled" in details:
            self.set_busy(False, "Cancelled")
            return
        self.show_error(message, details)

    def report(self, done, total, text=""):
        self.sig.progress.emit(int(done), int(total), str(text))


class FindInVideoPanel(_Panel):
    def __init__(self, get_options):
        super().__init__(get_options)
        self.query: np.ndarray | None = None
        self.result: dict | None = None
        self.shown_frame: np.ndarray | None = None

        self.query_view = fl.ImageView("Photo of the person\nDrop or click")
        self.query_view.setMaximumWidth(300)
        self.query_view.fileDropped.connect(self.load_query)

        self.video_edit = QLineEdit()
        self.video_edit.setPlaceholderText("Video file (mp4, avi, mov, mkv…)")
        browse = QPushButton("Browse…")
        browse.clicked.connect(self.browse)
        self.interval = QDoubleSpinBox()
        self.interval.setRange(0.1, 60)
        self.interval.setValue(1.0)
        self.interval.setSingleStep(0.5)
        self.interval.setSuffix(" s")
        self.interval.setToolTip("Check one frame this often. Smaller finds brief appearances but takes longer.")
        self.start = QDoubleSpinBox()
        self.start.setRange(0, 10 ** 6)
        self.start.setSuffix(" s")
        self.end_t = QDoubleSpinBox()
        self.end_t.setRange(0, 10 ** 6)
        self.end_t.setSuffix(" s")
        self.end_t.setSpecialValueText("end of video")

        self.run_btn = QPushButton("Search video")
        self.run_btn.setObjectName("Primary")
        self.run_btn.clicked.connect(self.run)
        self.run_buttons = [self.run_btn]
        self.csv_btn = QPushButton("Export CSV…")
        self.csv_btn.clicked.connect(self.export_csv)
        self.frame_btn = QPushButton("Save frame…")
        self.frame_btn.clicked.connect(self.save_frame)

        top = QHBoxLayout()
        top.addWidget(QLabel("Video:"))
        top.addWidget(self.video_edit, 1)
        top.addWidget(browse)
        opts_row = QHBoxLayout()
        for label, w in (("Check every", self.interval), ("From", self.start), ("To", self.end_t)):
            opts_row.addWidget(QLabel(label))
            opts_row.addWidget(w)
        opts_row.addStretch()
        for b in (self.run_btn, self.cancel_btn, self.csv_btn, self.frame_btn):
            opts_row.addWidget(b)

        self.frame_view = FrameView("Matching frames appear here")
        self.hits = QListWidget()
        self.hits.setViewMode(QListWidget.ViewMode.IconMode)
        self.hits.setIconSize(QSize(72, 90))
        self.hits.setResizeMode(QListWidget.ResizeMode.Adjust)
        self.hits.setMovement(QListWidget.Movement.Static)
        self.hits.setSpacing(6)
        self.hits.setMaximumHeight(170)
        self.hits.currentRowChanged.connect(self.show_hit)
        self.summary = QLabel("")
        self.summary.setObjectName("Note")
        self.summary.setWordWrap(True)

        right = QSplitter(Qt.Orientation.Vertical)
        right.addWidget(self.frame_view)
        bottom = QWidget()
        bl = QVBoxLayout(bottom)
        bl.setContentsMargins(0, 0, 0, 0)
        bl.addWidget(QLabel("<b>Matches</b> (click one to see the frame)"))
        bl.addWidget(self.hits)
        bl.addWidget(self.summary)
        right.addWidget(bottom)
        right.setSizes([420, 220])

        split = QSplitter()
        split.addWidget(self.query_view)
        split.addWidget(right)
        split.setSizes([280, 760])

        layout = QVBoxLayout(self)
        layout.addLayout(top)
        layout.addLayout(opts_row)
        layout.addWidget(self.busy_bar)
        layout.addWidget(self.progress)
        layout.addWidget(split, 1)

    def browse(self):
        path, _ = QFileDialog.getOpenFileName(self, "Choose a video", "", VIDEO_FILTER)
        if path:
            self.video_edit.setText(path)

    def load_query(self, path: str):
        try:
            self.query = fl.read_image(path)
        except ValueError as exc:
            self.show_error(str(exc))
            return
        self.query_view.set_image(self.query)

    def run(self):
        video = self.video_edit.text().strip()
        if self.query is None:
            self.show_error("Choose the photo of the person to look for.")
            return
        if not video or not Path(video).is_file():
            self.show_error("Choose a video file.")
            return
        opts = self.get_options()
        query = self.query.copy()
        interval, start, end = self.interval.value(), self.start.value(), self.end_t.value()

        def job():
            faces = fl.embed_faces(query, opts)
            if not faces:
                raise ValueError("Face could not be detected in the query photo.")
            out = find_in_video(video, faces[0].emb, opts, interval, start, end, self.report, self._cancel.is_set)
            out["video"] = video
            out["engine"] = fl.engine_name(opts)
            return out

        worker = fl.Worker(job)
        worker.signals.finished.connect(self.done)
        worker.signals.failed.connect(self.failed)
        self.hits.clear()
        self.summary.clear()
        self.frame_view.set_image(None)
        self.begin(f"Searching video with {fl.engine_name(opts)}…")
        worker.start()

    def done(self, out: dict):
        self.result = out
        self.end(f"{len(out['hits'])} matching frame(s)")
        for h in out["hits"]:
            icon = QIcon(fl.to_qpixmap(h["thumb"])) if h["thumb"] is not None else QIcon()
            item = QListWidgetItem(icon, f"{fmt_time(h['time'])}\nd {h['distance']:.2f}")
            item.setToolTip(f"Frame {h['frame']}, distance {h['distance']:.3f}")
            self.hits.addItem(item)
        apps = out["appearances"]
        spans = ", ".join(
            fmt_time(a["start"]) if a["start"] == a["end"] else f"{fmt_time(a['start'])}–{fmt_time(a['end'])}"
            for a in apps[:12]
        ) + (" …" if len(apps) > 12 else "")
        self.summary.setText(
            f"<b>{len(apps)} appearance(s)</b>: {spans or 'none'}<br>"
            f"{len(out['hits'])} matching face(s) in {out['sampled']} checked frames "
            f"({out['info']['duration']:.0f} s of video, every {out['interval']:g} s) in {out['seconds']:.1f} s · "
            f"{out['engine']} · match threshold {out['threshold']:.2f}. "
            "Matches are leads: check each one by eye."
        )
        if out["hits"]:
            self.hits.setCurrentRow(0)

    def show_hit(self, row: int):
        if not self.result or row < 0 or row >= len(self.result["hits"]):
            return
        h = self.result["hits"][row]
        try:
            frame = read_frame(self.result["video"], h["frame"])
        except ValueError as exc:
            self.show_error(str(exc))
            return
        x, y, w, h_ = h["box"]
        fl.draw_label(frame, x, y, w, h_, [fmt_time(h["time"]), f"d {h['distance']:.2f}"], fl.GREEN)
        self.shown_frame = frame
        self.frame_view.set_image(frame)

    def export_csv(self):
        if not self.result or not self.result["hits"]:
            self.show_error("Search a video first.")
            return
        path, _ = QFileDialog.getSaveFileName(self, "Export matches", f"{Path(self.result['video']).stem}-matches.csv",
                                              "CSV (*.csv)")
        if path:
            write_hits_csv(path, self.result)
            if self.status:
                self.status(f"Saved {path}")

    def save_frame(self):
        if self.shown_frame is None:
            self.show_error("Click a match first.")
            return
        path, _ = QFileDialog.getSaveFileName(self, "Save frame", "frame.png", fl.IMAGE_FILTER)
        if path:
            fl.write_image(path, self.shown_frame)


def write_hits_csv(path: str, result: dict) -> None:
    with open(path, "w", newline="", encoding="utf-8") as fh:
        w = csv.writer(fh)
        w.writerow(["video", "time", "seconds", "frame", "distance", "threshold", "x", "y", "w", "h"])
        for h in result["hits"]:
            w.writerow([result["video"], fmt_time(h["time"]), f"{h['time']:.2f}", h["frame"], f"{h['distance']:.4f}",
                        f"{result['threshold']:.3f}", *h["box"]])


class RedactPanel(_Panel):
    def __init__(self, get_options):
        super().__init__(get_options)
        self.inputs: list[str] = []
        self.reference: np.ndarray | None = None

        self.photos_radio = QRadioButton("Photos")
        self.video_radio = QRadioButton("Video")
        self.photos_radio.setChecked(True)
        group = QButtonGroup(self)
        group.addButton(self.photos_radio)
        group.addButton(self.video_radio)
        self.photos_radio.toggled.connect(self._kind_changed)

        self.input_label = QLabel("No input chosen")
        self.input_label.setWordWrap(True)
        choose = QPushButton("Choose input…")
        choose.clicked.connect(self.choose_input)
        self.mode = QComboBox()
        self.mode.addItems(REDACT_MODES)
        self.mode.currentIndexChanged.connect(self._mode_changed)
        self.style = QComboBox()
        self.style.addItems(REDACT_STYLES)
        self.out_edit = QLineEdit()
        self.out_edit.setPlaceholderText("Output folder for photos")
        out_btn = QPushButton("Browse…")
        out_btn.clicked.connect(self.choose_output)

        self.ref_view = fl.ImageView("Reference photo\n(for 'except' / 'only' modes)")
        self.ref_view.setMaximumWidth(240)
        self.ref_view.setMinimumSize(180, 160)
        self.ref_view.fileDropped.connect(self.load_reference)

        self.preview_btn = QPushButton("Preview")
        self.preview_btn.clicked.connect(self.preview)
        self.run_btn = QPushButton("Redact and save")
        self.run_btn.setObjectName("Primary")
        self.run_btn.clicked.connect(self.run)
        self.run_buttons = [self.run_btn, self.preview_btn]

        form = QFormLayout()
        kind = QHBoxLayout()
        kind.addWidget(self.photos_radio)
        kind.addWidget(self.video_radio)
        kind.addStretch()
        form.addRow("Redact", kind)
        inp = QHBoxLayout()
        inp.addWidget(self.input_label, 1)
        inp.addWidget(choose)
        form.addRow("Input", inp)
        form.addRow("Which faces", self.mode)
        form.addRow("Style", self.style)
        out = QHBoxLayout()
        out.addWidget(self.out_edit, 1)
        out.addWidget(out_btn)
        form.addRow("Save to", out)

        btns = QHBoxLayout()
        btns.addStretch()
        for b in (self.preview_btn, self.run_btn, self.cancel_btn):
            btns.addWidget(b)

        top = QHBoxLayout()
        top.addLayout(form, 1)
        top.addWidget(self.ref_view)

        self.before = FrameView("Before")
        self.after = FrameView("After")
        pics = QHBoxLayout()
        pics.addWidget(self.before)
        pics.addWidget(self.after)
        self.result_label = QLabel("")
        self.result_label.setObjectName("Note")
        self.result_label.setWordWrap(True)
        self.audio_note = QLabel("Videos are saved as MP4 without sound: the audio track is not kept.")
        self.audio_note.setObjectName("Note")
        self.audio_note.hide()

        layout = QVBoxLayout(self)
        layout.addLayout(top)
        layout.addLayout(btns)
        layout.addWidget(self.busy_bar)
        layout.addWidget(self.progress)
        layout.addLayout(pics, 1)
        layout.addWidget(self.audio_note)
        layout.addWidget(self.result_label)
        self._mode_changed()

    # -- inputs -------------------------------------------------------------------------
    def _kind_changed(self):
        video = self.video_radio.isChecked()
        self.inputs = []
        self.input_label.setText("No input chosen")
        self.out_edit.clear()
        self.out_edit.setPlaceholderText("Output video file (.mp4)" if video else "Output folder for photos")
        self.audio_note.setVisible(video)

    def _mode_changed(self):
        self.ref_view.setEnabled(self.mode.currentIndex() != 0)

    def choose_input(self):
        if self.video_radio.isChecked():
            path, _ = QFileDialog.getOpenFileName(self, "Choose a video", "", VIDEO_FILTER)
            paths = [path] if path else []
        else:
            paths, _ = QFileDialog.getOpenFileNames(self, "Choose photos", "", fl.IMAGE_FILTER)
        if paths:
            self.set_inputs(paths)

    def set_inputs(self, paths: list[str]):
        self.inputs = list(paths)
        names = ", ".join(Path(p).name for p in self.inputs[:3]) + (" …" if len(self.inputs) > 3 else "")
        self.input_label.setText(f"{len(self.inputs)} file(s): {names}")
        if not self.out_edit.text():
            first = Path(self.inputs[0])
            self.out_edit.setText(str(first.with_name(first.stem + "-redacted.mp4")) if self.video_radio.isChecked()
                                  else str(first.parent / "redacted"))

    def choose_output(self):
        if self.video_radio.isChecked():
            path, _ = QFileDialog.getSaveFileName(self, "Save redacted video", self.out_edit.text(), "MP4 video (*.mp4)")
        else:
            path = QFileDialog.getExistingDirectory(self, "Folder for redacted photos", self.out_edit.text())
        if path:
            self.out_edit.setText(path)

    def load_reference(self, path: str):
        try:
            self.reference = fl.read_image(path)
        except ValueError as exc:
            self.show_error(str(exc))
            return
        self.ref_view.set_image(self.reference)

    # -- work ---------------------------------------------------------------------------
    def _params(self):
        if not self.inputs:
            raise ValueError("Choose the photos or video to redact.")
        mode = self.mode.currentText()
        if mode != REDACT_MODES[0] and self.reference is None:
            raise ValueError("Choose a reference photo of the person for this mode.")
        return self.get_options(), mode, self.style.currentText(), (
            self.reference.copy() if self.reference is not None else None)

    def _ref_emb(self, ref, opts):
        if ref is None:
            return None
        faces = fl.embed_faces(ref, opts)
        if not faces:
            raise ValueError("Face could not be detected in the reference photo.")
        return faces[0].emb

    def preview(self):
        try:
            opts, mode, style, ref = self._params()
        except ValueError as exc:
            self.show_error(str(exc))
            return
        src, video = self.inputs[0], self.video_radio.isChecked()

        def job():
            if video:
                info = video_info(src)
                frame = read_frame(src, min(info["frames"] - 1, int(info["fps"])))  # about 1 s in
            else:
                frame = fl.read_image(src)
            out, n, found = redact_image(frame, opts, style, mode, self._ref_emb(ref, opts))
            return frame, out, n, found

        worker = fl.Worker(job)
        worker.signals.finished.connect(self._preview_done)
        worker.signals.failed.connect(self.failed)
        self.begin("Preparing preview…")
        worker.start()

    def _preview_done(self, res):
        frame, out, n, found = res
        self.end("Preview ready")
        self.before.set_image(frame)
        self.after.set_image(out)
        self.result_label.setText(f"Preview: {n} of {found} face(s) obscured. Check the result before sharing.")

    def run(self):
        try:
            opts, mode, style, ref = self._params()
        except ValueError as exc:
            self.show_error(str(exc))
            return
        dst = self.out_edit.text().strip()
        if not dst:
            self.show_error("Choose where to save the result.")
            return
        video, inputs = self.video_radio.isChecked(), list(self.inputs)
        if video and not dst.lower().endswith(".mp4"):
            dst += ".mp4"

        def job():
            emb = self._ref_emb(ref, opts)
            if video:
                return redact_video(inputs[0], dst, opts, style, mode, emb, self.report, self._cancel.is_set)
            return redact_photos(inputs, dst, opts, style, mode, emb, self.report, self._cancel.is_set)

        worker = fl.Worker(job)
        worker.signals.finished.connect(self._run_done)
        worker.signals.failed.connect(self.failed)
        self.begin("Redacting…")
        worker.start()

    def _run_done(self, res: dict):
        self.end("Redaction saved")
        what = f"{res['frames']} frames" if "frames" in res else f"{len(res['files'])} photo(s)"
        self.result_label.setText(
            f"Saved {what} to {res['output']} ({res['obscured']} face(s) obscured in {res['seconds']:.1f} s). "
            "Review it before sharing: a face the detector missed (very small, turned away or covered) is not blurred."
        )
        try:
            if "frames" in res:
                info = video_info(res["output"])
                first = read_frame(res["output"], min(info["frames"] - 1, int(info["fps"])))
            else:
                first = fl.read_image(res["files"][0])
            self.after.set_image(first)
        except Exception:  # noqa: BLE001 - the preview is a convenience
            pass


class VideoTab(QWidget, fl.BusyMixin):
    """Video tools: find a person in your own videos, and redact faces in photos and videos."""

    def __init__(self, get_options):
        super().__init__()
        self.find_panel = FindInVideoPanel(get_options)
        self.redact_panel = RedactPanel(get_options)
        self.inner = QTabWidget()
        self.inner.addTab(self.find_panel, "Find in a video")
        self.inner.addTab(self.redact_panel, "Redact faces")
        note = QLabel(
            "Video stays on this PC. Matches are leads to check by eye, not identifications. "
            "Review redacted files before sharing: a face the detector misses (very small or turned away) is not blurred."
        )
        note.setObjectName("Note")
        note.setWordWrap(True)
        layout = QVBoxLayout(self)
        layout.setContentsMargins(0, 0, 0, 0)
        layout.addWidget(self.inner, 1)
        layout.addWidget(note)
        self.make_busy_bar()

    @property
    def status(self):
        return self.find_panel.status

    @status.setter
    def status(self, fn):
        self.find_panel.status = fn
        self.redact_panel.status = fn

    def stop(self):
        """Cancel any running job (called when the window closes)."""
        self.find_panel._cancel.set()
        self.redact_panel._cancel.set()


__all__ = ["VideoTab", "find_in_video", "redact_image", "redact_video", "redact_photos", "fmt_time"]
