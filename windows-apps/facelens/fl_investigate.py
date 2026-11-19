"""Investigate tab: search a lawfully held photo gallery for one face, with safeguards.

Every search needs a case number, an examiner and a stated purpose. Results are candidates for
human review, never identifications: each one must be marked Possible match / Not a match /
Inconclusive by a person, and every step goes into a hash-chained audit log for the case that
shows if it was edited later. Photo-quality warnings travel with every result, and the case can
be exported as a self-contained HTML report.
"""

from __future__ import annotations

import base64
import csv
import hashlib
import html
import shutil
import time
from pathlib import Path

import cv2
import numpy as np
from PySide6.QtCore import QSize, Qt
from PySide6.QtGui import QIcon
from PySide6.QtWidgets import (
    QComboBox,
    QFileDialog,
    QFormLayout,
    QGroupBox,
    QHBoxLayout,
    QLabel,
    QLineEdit,
    QListWidget,
    QListWidgetItem,
    QMessageBox,
    QPushButton,
    QSpinBox,
    QSplitter,
    QTextEdit,
    QVBoxLayout,
    QWidget,
)

import facelens as fl

MANIFEST = "gallery_manifest.csv"
DECISIONS = ["Not reviewed", "Possible match", "Not a match", "Inconclusive"]


def crop_face(img: np.ndarray, box, pad: float = 0.35, size: int = 220) -> np.ndarray:
    x, y, w, h = box
    px, py = int(w * pad), int(h * pad)
    x0, y0 = max(0, x - px), max(0, y - py)
    x1, y1 = min(img.shape[1], x + w + px), min(img.shape[0], y + h + py)
    crop = img[y0:y1, x0:x1]
    if not crop.size:
        crop = img
    scale = size / max(crop.shape[:2])
    return cv2.resize(crop, (max(1, int(crop.shape[1] * scale)), max(1, int(crop.shape[0] * scale))))


def png_data_uri(img: np.ndarray) -> str:
    ok, buf = cv2.imencode(".png", img)
    return "data:image/png;base64," + base64.b64encode(buf.tobytes()).decode() if ok else ""


def sha256_of(img: np.ndarray) -> str:
    return hashlib.sha256(np.ascontiguousarray(img).tobytes()).hexdigest()


def load_manifest(folder: Path) -> dict[str, dict]:
    """Optional gallery_manifest.csv: file (relative path), record_id, name, notes."""
    path = folder / MANIFEST
    if not path.exists():
        return {}
    with open(path, newline="", encoding="utf-8-sig") as fh:
        return {row.get("file", "").replace("\\", "/"): row for row in csv.DictReader(fh)}


def import_records(csv_path: str, gallery: str) -> int:
    """Copy a records export (CSV listing image files, with record ids and optional names) into the
    gallery folder and write gallery_manifest.csv. Column names are matched loosely."""
    src = Path(csv_path)
    dest = Path(gallery)
    (dest / "records").mkdir(parents=True, exist_ok=True)
    with open(src, newline="", encoding="utf-8-sig") as fh:
        rows = list(csv.DictReader(fh))
    if not rows:
        raise ValueError("The CSV file has no rows.")
    cols = {c.lower().strip(): c for c in rows[0].keys()}

    def pick(*names):
        for n in names:
            for low, real in cols.items():
                if n in low:
                    return real
        return None

    c_file = pick("image", "photo", "file", "path", "picture")
    c_id = pick("record", "booking", "id", "number")
    c_name = pick("name")
    if not c_file:
        raise ValueError("Couldn't find a column with the image file (e.g. 'image' or 'file').")
    manifest = load_manifest(dest)
    copied = 0
    for n, row in enumerate(rows, 1):
        img_path = Path(row[c_file])
        if not img_path.is_absolute():
            img_path = src.parent / img_path
        if not img_path.is_file() or img_path.suffix.lower() not in fl.IMAGE_EXTS:
            continue
        rec = (row.get(c_id) or f"row{n}").strip() if c_id else f"row{n}"
        safe = "".join(c if c.isalnum() or c in "-_" else "_" for c in rec)[:60] or f"row{n}"
        target = dest / "records" / f"{safe}_{n}{img_path.suffix.lower()}"
        shutil.copy2(img_path, target)
        rel = target.relative_to(dest).as_posix()
        manifest[rel] = {"file": rel, "record_id": rec, "name": (row.get(c_name) or "").strip() if c_name else "",
                         "notes": f"imported from {src.name}"}
        copied += 1
    with open(dest / MANIFEST, "w", newline="", encoding="utf-8") as fh:
        w = csv.DictWriter(fh, fieldnames=["file", "record_id", "name", "notes"])
        w.writeheader()
        for row in manifest.values():
            w.writerow({k: row.get(k, "") for k in ("file", "record_id", "name", "notes")})
    return copied


class InvestigateTab(QWidget, fl.BusyMixin):
    def __init__(self, get_options):
        super().__init__()
        self.get_options = get_options
        self.probe: np.ndarray | None = None
        self.probe_path = ""
        self.probe_face = None
        self.probe_quality: dict = {}
        self.candidates: list[dict] = []
        self.search_info: dict = {}
        self.log: fl.AuditLog | None = None
        self.settings = fl.QSettings(fl.APP_NAME, fl.APP_NAME)

        # --- case details
        self.case_id = QLineEdit()
        self.case_id.setPlaceholderText("e.g. 2026-0147")
        self.examiner = QLineEdit(self.settings.value("inv/examiner", ""))
        self.examiner.setPlaceholderText("Your name")
        self.purpose = QLineEdit()
        self.purpose.setPlaceholderText("Authority / study approval, e.g. 'IRB study 22-118' or 'warrant ref.'")
        self.gallery = QLineEdit(self.settings.value("inv/gallery", ""))
        self.gallery.setPlaceholderText("Folder of photos you are authorised to search")
        browse = QPushButton("Browse…")
        browse.clicked.connect(self._browse_gallery)
        imp = QPushButton("Import records CSV…")
        imp.setToolTip("Copy a records export (CSV listing photo files, record ids and names) into the gallery.")
        imp.clicked.connect(self._import_csv)
        gal_row = QHBoxLayout()
        gal_row.addWidget(self.gallery, 1)
        gal_row.addWidget(browse)
        gal_row.addWidget(imp)

        case_box = QGroupBox("Case")
        form = QFormLayout(case_box)
        form.addRow("Case number *", self.case_id)
        form.addRow("Examiner *", self.examiner)
        form.addRow("Purpose / authority *", self.purpose)
        form.addRow("Gallery *", gal_row)

        # --- probe
        self.view = fl.ImageView("Probe photo\nDrop or click")
        self.view.setMaximumWidth(380)
        self.view.fileDropped.connect(self._load_probe)
        self.quality = QLabel("")
        self.quality.setWordWrap(True)
        self.quality.setObjectName("Note")
        self.top_n = QSpinBox()
        self.top_n.setRange(1, 100)
        self.top_n.setValue(10)
        self.run_btn = QPushButton("Search gallery")
        self.run_btn.setObjectName("Primary")
        self.run_btn.clicked.connect(self.run)
        self.run_buttons = [self.run_btn]
        left = QWidget()
        ll = QVBoxLayout(left)
        ll.setContentsMargins(0, 0, 0, 0)
        ll.addWidget(self.view, 1)
        ll.addWidget(self.quality)
        row = QHBoxLayout()
        row.addWidget(QLabel("Show top"))
        row.addWidget(self.top_n)
        row.addStretch()
        row.addWidget(self.run_btn)
        ll.addLayout(row)

        # --- candidates
        self.list = QListWidget()
        self.list.setIconSize(QSize(72, 72))
        self.list.currentRowChanged.connect(self._show_candidate)
        self.compare = QLabel("Select a candidate to compare side by side.")
        self.compare.setAlignment(Qt.AlignmentFlag.AlignCenter)
        self.compare.setMinimumHeight(180)
        self.compare.setObjectName("ImageView")
        self.detail = QLabel("")
        self.detail.setWordWrap(True)
        self.decision = QComboBox()
        self.decision.addItems(DECISIONS)
        self.notes = QLineEdit()
        self.notes.setPlaceholderText("Reason for the decision (features compared, doubts…)")
        save = QPushButton("Record decision")
        save.clicked.connect(self._record_decision)
        dec_row = QHBoxLayout()
        dec_row.addWidget(QLabel("Review:"))
        dec_row.addWidget(self.decision)
        dec_row.addWidget(self.notes, 1)
        dec_row.addWidget(save)
        mid = QWidget()
        ml = QVBoxLayout(mid)
        ml.setContentsMargins(0, 0, 0, 0)
        ml.addWidget(QLabel("<b>Candidates</b> – leads for a person to check, nearest first"))
        vsplit = QSplitter(Qt.Orientation.Vertical)
        vsplit.addWidget(self.list)
        vsplit.addWidget(self.compare)
        vsplit.setSizes([260, 230])
        ml.addWidget(vsplit, 1)
        ml.addWidget(self.detail)
        ml.addLayout(dec_row)

        split = QSplitter()
        split.addWidget(left)
        split.addWidget(mid)
        split.setSizes([360, 700])

        # --- bottom: log + report
        self.log_view = QTextEdit()
        self.log_view.setReadOnly(True)
        self.log_view.setMaximumHeight(110)
        self.log_view.setPlaceholderText("Case audit log appears here.")
        verify = QPushButton("Verify audit log")
        verify.clicked.connect(self._verify_log)
        report = QPushButton("Export case report…")
        report.clicked.connect(self._export_report)
        open_log = QPushButton("Open log folder")
        open_log.clicked.connect(lambda: fl.os.startfile(self._log_dir()) if hasattr(fl.os, "startfile")
                                 else QMessageBox.information(self, fl.APP_NAME, str(self._log_dir())))
        bot = QHBoxLayout()
        bot.addWidget(verify)
        bot.addWidget(open_log)
        bot.addStretch()
        bot.addWidget(report)

        layout = QVBoxLayout(self)
        layout.addWidget(case_box)
        layout.addWidget(self.make_busy_bar())
        layout.addWidget(split, 1)
        layout.addWidget(self.log_view)
        layout.addLayout(bot)
        note = QLabel(
            "Face matching produces leads, not identifications. Results depend heavily on photo quality and "
            "are less reliable for some groups of people. Never act on a candidate without independent checks."
        )
        note.setObjectName("Note")
        note.setWordWrap(True)
        layout.addWidget(note)

    # ---------------------------------------------------------------- helpers
    def _log_dir(self) -> Path:
        d = fl.data_dir() / "audit"
        d.mkdir(parents=True, exist_ok=True)
        return d

    def _case_log(self) -> fl.AuditLog:
        safe = "".join(c if c.isalnum() or c in "-_" else "_" for c in self.case_id.text().strip())
        path = self._log_dir() / f"case-{safe}.jsonl"
        if self.log is None or self.log.path != path:
            self.log = fl.AuditLog(path)
        return self.log

    def _require_case(self) -> bool:
        missing = [n for n, w in (("case number", self.case_id), ("examiner", self.examiner),
                                  ("purpose / authority", self.purpose)) if not w.text().strip()]
        if missing:
            self.show_error("Fill in the " + ", ".join(missing) + " first. Every search is logged against a case.")
            return False
        self.settings.setValue("inv/examiner", self.examiner.text().strip())
        return True

    def _refresh_log_view(self):
        if not self.log:
            return
        lines = []
        for e in self.log.entries()[-30:]:
            if e["event"] == "search":
                what = (f"{len(e.get('candidates', []))} candidates · {e.get('engine')} · gallery "
                        f"{e.get('gallery_photos')} photos" + (f" · warnings: {', '.join(e['warnings'])}"
                                                               if e.get("warnings") else ""))
            elif e["event"] == "review":
                what = f"{e.get('candidate')}: {e.get('decision')} – {e.get('notes', '')}"
            elif e["event"] == "case_opened":
                what = f"examiner {e.get('examiner')} · {e.get('purpose')}"
            else:
                what = e.get("file", "")
            lines.append(f"{e['time']}  {e['event']:<15} {what}")
        self.log_view.setPlainText("\n".join(lines))
        self.log_view.verticalScrollBar().setValue(self.log_view.verticalScrollBar().maximum())

    def _browse_gallery(self):
        folder = QFileDialog.getExistingDirectory(self, "Gallery folder", self.gallery.text())
        if folder:
            self.gallery.setText(folder)

    def _import_csv(self):
        if not self.gallery.text().strip():
            folder = QFileDialog.getExistingDirectory(self, "Choose (or create) the gallery folder to import into")
            if not folder:
                return
            self.gallery.setText(folder)
        path, _ = QFileDialog.getOpenFileName(self, "Records export", "", "CSV (*.csv)")
        if not path:
            return
        try:
            n = import_records(path, self.gallery.text().strip())
        except Exception as exc:  # noqa: BLE001
            self.show_error(str(exc))
            return
        QMessageBox.information(self, fl.APP_NAME, f"Imported {n} photo(s) into the gallery.")

    def _load_probe(self, path: str):
        try:
            self.probe = fl.read_image(path)
        except ValueError as exc:
            self.show_error(str(exc))
            return
        self.probe_path = path
        self.view.set_image(self.probe)
        self.quality.clear()
        self.list.clear()
        self.candidates = []

    # ---------------------------------------------------------------- search
    def run(self):
        if not self._require_case():
            return
        gallery = self.gallery.text().strip()
        if self.probe is None:
            self.show_error("Choose a probe photo.")
            return
        if not gallery or not Path(gallery).is_dir():
            self.show_error("Choose the gallery folder.")
            return
        self.settings.setValue("inv/gallery", gallery)
        opts = self.get_options()
        probe = self.probe.copy()
        top = self.top_n.value()
        log = self._case_log()
        if not log.entries():
            log.append("case_opened", case=self.case_id.text().strip(), examiner=self.examiner.text().strip(),
                       purpose=self.purpose.text().strip())

        def job():
            faces = fl.embed_faces(probe, opts)
            if not faces:
                raise ValueError("Face could not be detected in the probe photo.")
            face = faces[0]
            quality = fl.quality_check(probe, face.box, face.kps)
            index = fl.FaceIndex(gallery, opts).build()
            threshold = fl.match_threshold(opts)
            hits = index.search(face.emb, top=top)
            manifest = load_manifest(Path(gallery))
            for h in hits:
                rel = Path(h["path"]).relative_to(gallery).as_posix()
                rec = manifest.get(rel, {})
                h.update(rel=rel, record_id=rec.get("record_id") or Path(rel).stem, name=rec.get("name", ""),
                         under_threshold=h["distance"] <= threshold, decision="Not reviewed", notes="")
            return {"face": face, "quality": quality, "hits": hits, "threshold": threshold,
                    "engine": fl.engine_name(opts), "gallery_photos": len(index.files),
                    "gallery_faces": int(len(index.embs)), "faces_in_probe": len(faces)}

        worker = fl.Worker(job)
        worker.signals.finished.connect(self._done)
        worker.signals.failed.connect(self.show_error)
        self.list.clear()
        self.set_busy(True, "Indexing gallery and searching…")
        worker.start()

    def _done(self, out: dict):
        self.set_busy(False, f"{len(out['hits'])} candidate(s)")
        self.probe_face = out["face"]
        self.probe_quality = out["quality"]
        self.candidates = out["hits"]
        self.search_info = {k: out[k] for k in ("threshold", "engine", "gallery_photos", "gallery_faces",
                                                 "faces_in_probe")}
        self.search_info["time"] = time.strftime("%Y-%m-%d %H:%M:%S")
        warn = out["quality"]["warnings"]
        self.quality.setText(
            ("⚠ Probe quality: " + "; ".join(warn) + ". Treat results with extra caution.") if warn
            else "Probe quality: no problems found (size, sharpness, lighting, angle)."
        )
        if out["faces_in_probe"] > 1:
            self.quality.setText(self.quality.text() + f"  The probe has {out['faces_in_probe']} faces; "
                                 "the largest was searched.")
        annotated = self.probe.copy()
        x, y, w, h = out["face"].box
        fl.draw_label(annotated, x, y, w, h, ["searched face"], fl.BLUE)
        self.view.set_image(annotated)
        for n, h in enumerate(self.candidates, 1):
            try:
                thumb = crop_face(fl.read_image(h["path"]), h["box"], size=144)
                icon = QIcon(fl.to_qpixmap(thumb))
            except Exception:  # noqa: BLE001
                icon = QIcon()
            item = QListWidgetItem(icon, self._label(n, h))
            self.list.addItem(item)
        self._case_log().append(
            "search",
            probe_file=Path(self.probe_path).name,
            probe_sha256=sha256_of(self.probe),
            engine=out["engine"],
            threshold=round(out["threshold"], 4),
            gallery=self.gallery.text().strip(),
            gallery_photos=out["gallery_photos"],
            gallery_faces=out["gallery_faces"],
            warnings=warn,
            candidates=[{"record": h["record_id"], "file": h["rel"], "distance": round(h["distance"], 4)}
                        for h in self.candidates],
        )
        self._refresh_log_view()
        if self.candidates:
            self.list.setCurrentRow(0)

    def _label(self, n: int, h: dict) -> str:
        tag = "within match threshold" if h["under_threshold"] else "outside threshold"
        who = f"{h['record_id']}" + (f" – {h['name']}" if h["name"] else "")
        return f"#{n}  {who}\ndistance {h['distance']:.3f} ({tag})  ·  review: {h['decision']}"

    def _show_candidate(self, row: int):
        if row < 0 or row >= len(self.candidates) or self.probe_face is None:
            return
        h = self.candidates[row]
        a = crop_face(self.probe, self.probe_face.box, size=260)
        cand_img = fl.read_image(h["path"])
        b = crop_face(cand_img, h["box"], size=260)
        height = max(a.shape[0], b.shape[0])
        pad = lambda im: cv2.copyMakeBorder(im, 0, height - im.shape[0], 0, 0, cv2.BORDER_CONSTANT, value=(40, 36, 31))  # noqa: E731
        gap = np.full((height, 16, 3), (40, 36, 31), np.uint8)
        side = np.hstack([pad(a), gap, pad(b)])
        self.compare.setPixmap(fl.to_qpixmap(side).scaled(
            self.compare.size(), Qt.AspectRatioMode.KeepAspectRatio, Qt.TransformationMode.SmoothTransformation))
        cq = fl.quality_check(cand_img, h["box"])
        self.detail.setText(
            f"<b>Probe</b> (left) vs <b>{html.escape(h['record_id'])}</b> (right) · {html.escape(h['rel'])} · "
            f"distance {h['distance']:.3f}, threshold {self.search_info['threshold']:.3f} · "
            + ("candidate photo quality OK" if cq["ok"] else "candidate photo: " + "; ".join(cq["warnings"]))
        )
        self.decision.setCurrentText(h["decision"])
        self.notes.setText(h["notes"])

    def _record_decision(self):
        row = self.list.currentRow()
        if row < 0 or not self.candidates:
            self.show_error("Select a candidate first.")
            return
        if not self._require_case():
            return
        decision = self.decision.currentText()
        if decision == DECISIONS[0]:
            self.show_error("Choose Possible match, Not a match or Inconclusive.")
            return
        if decision == "Possible match" and not self.notes.text().strip():
            self.show_error("Write down why you think it is a possible match (the features you compared).")
            return
        h = self.candidates[row]
        h["decision"], h["notes"] = decision, self.notes.text().strip()
        self.list.item(row).setText(self._label(row + 1, h))
        self._case_log().append("review", examiner=self.examiner.text().strip(), candidate=h["record_id"],
                                file=h["rel"], distance=round(h["distance"], 4), decision=decision,
                                notes=h["notes"])
        self._refresh_log_view()
        self.status(f"Recorded: {h['record_id']} – {decision}")

    def _verify_log(self):
        if not self.case_id.text().strip():
            self.show_error("Enter the case number whose log you want to check.")
            return
        log = self._case_log()
        ok, msg = log.verify()
        self._refresh_log_view()
        (QMessageBox.information if ok else QMessageBox.warning)(self, "Audit log", f"{log.path}\n\n{msg}")

    # ---------------------------------------------------------------- report
    def _export_report(self):
        if not self.candidates:
            self.show_error("Run a search first.")
            return
        unreviewed = sum(1 for h in self.candidates if h["decision"] == DECISIONS[0])
        safe = "".join(c if c.isalnum() or c in "-_" else "_" for c in self.case_id.text().strip())
        path, _ = QFileDialog.getSaveFileName(self, "Save case report", f"case-{safe}-report.html", "HTML (*.html)")
        if not path:
            return
        log = self._case_log()
        ok, verify_msg = log.verify()
        entry = log.append("report_exported", file=Path(path).name, unreviewed=unreviewed)
        e = html.escape
        probe = self.probe.copy()
        x, y, w, h = self.probe_face.box
        fl.draw_label(probe, x, y, w, h, ["searched face"], fl.BLUE)
        scale = 420 / max(probe.shape[:2])
        probe = cv2.resize(probe, (int(probe.shape[1] * scale), int(probe.shape[0] * scale)))
        rows = []
        for n, c in enumerate(self.candidates, 1):
            thumb = crop_face(fl.read_image(c["path"]), c["box"], size=140)
            rows.append(
                f"<tr><td>{n}</td><td><img src='{png_data_uri(thumb)}'></td><td>{e(c['record_id'])}<br>"
                f"<small>{e(c['name'])}</small></td><td>{e(c['rel'])}</td><td>{c['distance']:.4f}</td>"
                f"<td>{'yes' if c['under_threshold'] else 'no'}</td><td><b>{e(c['decision'])}</b><br>"
                f"<small>{e(c['notes'])}</small></td></tr>"
            )
        warn = self.probe_quality.get("warnings") or []
        doc = f"""<!doctype html><html><head><meta charset="utf-8"><title>Case {e(self.case_id.text())} – FaceLens report</title>
<style>body{{font-family:Segoe UI,Arial,sans-serif;margin:32px;color:#1f2937;max-width:1100px}}
table{{border-collapse:collapse;width:100%}}td,th{{border:1px solid #d1d5db;padding:6px;vertical-align:top;text-align:left}}
th{{background:#f3f4f6}}.warn{{background:#fff7ed;border:1px solid #fdba74;padding:10px;border-radius:6px}}
.note{{color:#6b7280;font-size:90%}}</style></head><body>
<h1>Face search report – case {e(self.case_id.text())}</h1>
<table><tr><th>Examiner</th><td>{e(self.examiner.text())}</td><th>Purpose / authority</th><td>{e(self.purpose.text())}</td></tr>
<tr><th>Search time</th><td>{e(self.search_info['time'])}</td><th>Report time</th><td>{e(entry['time'])}</td></tr>
<tr><th>Engine</th><td>{e(self.search_info['engine'])}</td><th>Match threshold (cosine distance)</th><td>{self.search_info['threshold']:.4f}</td></tr>
<tr><th>Gallery</th><td>{e(self.gallery.text())}</td><th>Gallery size</th><td>{self.search_info['gallery_photos']} photos, {self.search_info['gallery_faces']} faces</td></tr>
<tr><th>Probe file</th><td>{e(Path(self.probe_path).name)}</td><th>Probe SHA-256</th><td><small>{sha256_of(self.probe)}</small></td></tr></table>
<h2>Probe</h2><p><img src="{png_data_uri(probe)}"></p>
<p class="{'warn' if warn else ''}">Probe quality: {e('; '.join(warn)) if warn else 'no problems found'}.
Metrics: {e(str({k: v for k, v in self.probe_quality.items() if k not in ('warnings', 'ok')}))}</p>
<h2>Candidates (nearest first)</h2>
<table><tr><th>#</th><th>Face</th><th>Record</th><th>File</th><th>Distance</th><th>Within threshold</th><th>Human review</th></tr>
{''.join(rows)}</table>
<p>{unreviewed} of {len(self.candidates)} candidate(s) not reviewed.</p>
<h2>Audit</h2><p>Log file: {e(str(log.path))}<br>Integrity check before export: {e(verify_msg)}<br>
Hash of the report entry: <small>{e(entry['hash'])}</small></p>
<p class="note">Face matching produces investigative leads, not identifications. Distances depend on photo quality,
camera, age and pose, and error rates differ between groups of people. No candidate should be acted on without
independent corroboration. Generated by {fl.APP_NAME} {fl.APP_VERSION}.</p></body></html>"""
        Path(path).write_text(doc, encoding="utf-8")
        self._refresh_log_view()
        self.status(f"Report saved: {path}" + ("" if ok else "  (warning: audit log failed its check)"))
