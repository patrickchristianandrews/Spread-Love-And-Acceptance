"""People tab: sort a photo library into the people in it, like the face groups in phone photo apps.

Works on any folder (phone backups, Google Photos downloads) and can import your own Facebook
data download ("Download your information"), which contains your photos and the photos you're
tagged in. Groups can be named; names are remembered and carried over when you re-group after
adding photos. Everything stays in the chosen folder on this PC.
"""

from __future__ import annotations

import csv
import json
import shutil
import time
import zipfile
from pathlib import Path

import numpy as np
from PySide6.QtCore import QSize, Qt
from PySide6.QtGui import QIcon
from PySide6.QtWidgets import (
    QCheckBox,
    QFileDialog,
    QHBoxLayout,
    QLabel,
    QLineEdit,
    QListWidget,
    QListWidgetItem,
    QMessageBox,
    QPushButton,
    QSpinBox,
    QSplitter,
    QVBoxLayout,
    QWidget,
)

import facelens as fl
from fl_investigate import crop_face

NAMES_FILE = "facelens_people.json"


def cluster_faces(embs: np.ndarray, threshold: float, passes: int = 2) -> np.ndarray:
    """Group unit-length face vectors. Each face joins the nearest group whose average face is within
    `threshold` (cosine distance), else starts a new group; a second pass re-assigns every face to its
    nearest final group. Linear in faces x groups, so it scales to large libraries without chaining
    everyone into one group the way single-link clustering can."""
    n = len(embs)
    labels = np.full(n, -1, dtype=np.int64)
    if n == 0:
        return labels
    centroids: list[np.ndarray] = []
    sums: list[np.ndarray] = []
    counts: list[int] = []
    for i in range(n):
        if centroids:
            d = 1.0 - np.stack(centroids) @ embs[i]
            j = int(np.argmin(d))
            if d[j] <= threshold:
                labels[i] = j
                sums[j] += embs[i]
                counts[j] += 1
                centroids[j] = sums[j] / (np.linalg.norm(sums[j]) or 1.0)
                continue
        labels[i] = len(centroids)
        centroids.append(embs[i].copy())
        sums.append(embs[i].copy())
        counts.append(1)
    for _ in range(passes - 1):
        c = np.stack(centroids)
        d = 1.0 - embs @ c.T
        best = np.argmin(d, axis=1)
        ok = d[np.arange(n), best] <= threshold
        labels = np.where(ok, best, labels)
        new_c = []
        for j in range(len(centroids)):
            members = embs[labels == j]
            if len(members):
                s = members.sum(axis=0)
                new_c.append(s / (np.linalg.norm(s) or 1.0))
            else:
                new_c.append(centroids[j])
        centroids = new_c
    # Renumber by group size, largest first.
    uniq, cnt = np.unique(labels, return_counts=True)
    order = uniq[np.argsort(-cnt)]
    remap = {int(old): new for new, old in enumerate(order)}
    return np.array([remap[int(v)] for v in labels], dtype=np.int64)


def import_facebook(source: str, dest: str, progress=None) -> int:
    """Copy every photo out of a Facebook 'Download your information' export (.zip or unzipped folder)
    into dest, keeping its folder structure. Videos and everything else are skipped."""
    out = Path(dest)
    out.mkdir(parents=True, exist_ok=True)
    count = 0
    src = Path(source)
    if src.is_file() and src.suffix.lower() == ".zip":
        with zipfile.ZipFile(src) as zf:
            members = [m for m in zf.infolist() if not m.is_dir() and Path(m.filename).suffix.lower() in fl.IMAGE_EXTS]
            for n, m in enumerate(members, 1):
                rel = Path(*[p for p in Path(m.filename).parts if p not in ("..", "")])
                target = out / rel
                if out.resolve() not in target.resolve().parents:
                    continue  # never write outside the destination folder
                target.parent.mkdir(parents=True, exist_ok=True)
                with zf.open(m) as fin, open(target, "wb") as fout:
                    shutil.copyfileobj(fin, fout)
                count += 1
                if progress and n % 25 == 0:
                    progress(n, len(members))
    elif src.is_dir():
        files = [p for p in src.rglob("*") if p.is_file() and p.suffix.lower() in fl.IMAGE_EXTS]
        for n, p in enumerate(files, 1):
            target = out / p.relative_to(src)
            target.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(p, target)
            count += 1
            if progress and n % 25 == 0:
                progress(n, len(files))
    else:
        raise ValueError("Choose the Facebook download .zip file or its unzipped folder.")
    return count


class PeopleTab(QWidget, fl.BusyMixin):
    def __init__(self, get_options):
        super().__init__()
        self.get_options = get_options
        self.settings = fl.QSettings(fl.APP_NAME, fl.APP_NAME)
        self.index: fl.FaceIndex | None = None
        self.groups: list[dict] = []
        self.threshold = 0.5

        self.folder = QLineEdit(self.settings.value("people/folder", ""))
        self.folder.setPlaceholderText("Photo library folder (sub-folders included)")
        browse = QPushButton("Browse…")
        browse.clicked.connect(self._browse)
        fb = QPushButton("Import Facebook download…")
        fb.setToolTip("Facebook: Settings → Your information → Download your information. Choose the .zip here.")
        fb.clicked.connect(self._import_facebook)
        self.min_size = QSpinBox()
        self.min_size.setRange(1, 50)
        self.min_size.setValue(2)
        self.min_size.setToolTip("Hide groups with fewer photos than this (1 shows everyone seen once).")
        self.min_size.valueChanged.connect(lambda _v: self._fill_people() if self.groups else None)
        self.strict = QCheckBox("Strict")
        self.strict.setToolTip("Use a tighter match so different people are less likely to share a group "
                               "(the same person may then be split into several groups).")
        self.strict.setChecked(True)
        self.run_btn = QPushButton("Group by person")
        self.run_btn.setObjectName("Primary")
        self.run_btn.clicked.connect(self.run)
        self.run_buttons = [self.run_btn]
        top = QHBoxLayout()
        top.addWidget(QLabel("Library:"))
        top.addWidget(self.folder, 1)
        top.addWidget(browse)
        top.addWidget(fb)
        top.addWidget(QLabel("Min photos"))
        top.addWidget(self.min_size)
        top.addWidget(self.strict)
        top.addWidget(self.run_btn)

        self.people = QListWidget()
        self.people.setIconSize(QSize(64, 64))
        self.people.setMaximumWidth(330)
        self.people.currentRowChanged.connect(self._show_group)
        self.photos = QListWidget()
        self.photos.setViewMode(QListWidget.ViewMode.IconMode)
        self.photos.setIconSize(QSize(120, 120))
        self.photos.setResizeMode(QListWidget.ResizeMode.Adjust)
        self.photos.setSpacing(6)
        self.photos.itemDoubleClicked.connect(
            lambda it: fl.os.startfile(it.data(Qt.ItemDataRole.UserRole)) if hasattr(fl.os, "startfile") else None)
        self.name = QLineEdit()
        self.name.setPlaceholderText("Name this person")
        save_name = QPushButton("Save name")
        save_name.clicked.connect(self._save_name)
        self.name.returnPressed.connect(self._save_name)
        export_csv = QPushButton("Export list (CSV)…")
        export_csv.clicked.connect(self._export_csv)
        export_dirs = QPushButton("Copy into person folders…")
        export_dirs.clicked.connect(self._export_folders)
        name_row = QHBoxLayout()
        name_row.addWidget(self.name, 1)
        name_row.addWidget(save_name)
        name_row.addStretch()
        name_row.addWidget(export_csv)
        name_row.addWidget(export_dirs)
        right = QWidget()
        rl = QVBoxLayout(right)
        rl.setContentsMargins(0, 0, 0, 0)
        self.group_title = QLabel("<b>Photos</b>")
        rl.addWidget(self.group_title)
        rl.addWidget(self.photos, 1)
        rl.addLayout(name_row)

        split = QSplitter()
        split.addWidget(self.people)
        split.addWidget(right)
        split.setSizes([320, 720])

        self.summary = QLabel("")
        self.summary.setObjectName("Note")
        layout = QVBoxLayout(self)
        layout.addLayout(top)
        layout.addWidget(self.make_busy_bar())
        layout.addWidget(split, 1)
        layout.addWidget(self.summary)
        note = QLabel("Groups are automatic and can be wrong: look-alikes may share a group and one person may be "
                      "split across several. Photos and names stay in the library folder on this PC.")
        note.setObjectName("Note")
        note.setWordWrap(True)
        layout.addWidget(note)

    # ------------------------------------------------------------------ actions
    def _browse(self):
        folder = QFileDialog.getExistingDirectory(self, "Photo library", self.folder.text())
        if folder:
            self.folder.setText(folder)

    def _import_facebook(self):
        src, _ = QFileDialog.getOpenFileName(self, "Facebook download (.zip)", "", "Zip files (*.zip);;All files (*)")
        if not src:
            src = QFileDialog.getExistingDirectory(self, "…or the unzipped Facebook download folder")
        if not src:
            return
        default = str(fl.data_dir() / "facebook" / time.strftime("%Y-%m-%d"))
        dest = QFileDialog.getExistingDirectory(self, "Folder to copy the photos into", default)
        if not dest:
            return

        worker = fl.Worker(import_facebook, src, dest)
        worker.signals.finished.connect(lambda n: self._imported(n, dest))
        worker.signals.failed.connect(self.show_error)
        self.set_busy(True, "Copying photos out of the Facebook download…")
        worker.start()

    def _imported(self, n: int, dest: str):
        self.set_busy(False, f"Imported {n} photos")
        self.folder.setText(dest)
        if n and QMessageBox.question(self, fl.APP_NAME, f"Copied {n} photos into\n{dest}\n\nGroup them by person now?") \
                == QMessageBox.StandardButton.Yes:
            self.run()

    def run(self):
        folder = self.folder.text().strip()
        if not folder or not Path(folder).is_dir():
            self.show_error("Choose a photo library folder.")
            return
        self.settings.setValue("people/folder", folder)
        opts = self.get_options()
        strict = self.strict.isChecked()

        def job():
            index = fl.FaceIndex(folder, opts).build()
            base = fl.match_threshold(opts)
            threshold = base * (0.85 if strict else 1.0)
            labels = cluster_faces(index.embs, threshold) if len(index.embs) else np.zeros(0, dtype=np.int64)
            return index, labels, threshold

        worker = fl.Worker(job)
        worker.signals.finished.connect(self._done)
        worker.signals.failed.connect(self.show_error)
        self.people.clear()
        self.photos.clear()
        self.set_busy(True, "Finding faces (only new photos are processed)…")
        worker.start()

    def _names_path(self) -> Path:
        return Path(self.folder.text().strip()) / NAMES_FILE

    def _load_names(self) -> list[dict]:
        try:
            return json.loads(self._names_path().read_text(encoding="utf-8"))
        except Exception:  # noqa: BLE001
            return []

    def _done(self, out):
        self.index, labels, self.threshold = out
        names = self._load_names()
        self.groups = []
        for g in range(int(labels.max()) + 1 if len(labels) else 0):
            members = np.nonzero(labels == g)[0]
            c = self.index.embs[members].sum(axis=0)
            c = c / (np.linalg.norm(c) or 1.0)
            name = ""
            for saved in names:  # carry names over from an earlier grouping
                if 1.0 - float(np.dot(c, np.asarray(saved["centroid"], dtype=np.float32))) <= self.threshold:
                    name = saved["name"]
                    break
            files = sorted({int(self.index.face_file[m]) for m in members})
            self.groups.append({"members": members, "centroid": c, "name": name, "files": files})
        self._fill_people()
        n_faces = len(self.index.embs)
        self.set_busy(False, f"{len(self.groups)} people found")
        self.summary.setText(f"{len(self.index.files)} photos · {n_faces} faces · {len(self.groups)} groups "
                             f"(threshold {self.threshold:.2f}, {fl.engine_name(self.get_options())})")

    def _fill_people(self):
        self.people.clear()
        shown = 0
        for gi, g in enumerate(self.groups):
            item = QListWidgetItem(self._group_icon(g), self._group_label(gi, g))
            item.setData(Qt.ItemDataRole.UserRole, gi)
            hidden = len(g["files"]) < self.min_size.value()
            self.people.addItem(item)
            item.setHidden(hidden)
            shown += 0 if hidden else 1
        for i in range(self.people.count()):
            if not self.people.item(i).isHidden():
                self.people.setCurrentRow(i)
                break

    def _group_label(self, gi: int, g: dict) -> str:
        return f"{g['name'] or f'Person {gi + 1}'}\n{len(g['files'])} photo(s)"

    def _group_icon(self, g: dict) -> QIcon:
        m = int(g["members"][0])
        path = Path(self.index.folder) / self.index.files[int(self.index.face_file[m])]
        try:
            return QIcon(fl.to_qpixmap(crop_face(fl.read_image(str(path)), tuple(self.index.boxes[m]), size=128)))
        except Exception:  # noqa: BLE001
            return QIcon()

    def _show_group(self, row: int):
        self.photos.clear()
        if row < 0:
            return
        gi = self.people.item(row).data(Qt.ItemDataRole.UserRole)
        g = self.groups[gi]
        self.group_title.setText(f"<b>{g['name'] or f'Person {gi + 1}'}</b> – {len(g['files'])} photo(s)")
        self.name.setText(g["name"])
        shown = set()
        for m in g["members"][:400]:
            fi = int(self.index.face_file[m])
            if fi in shown:
                continue
            shown.add(fi)
            path = str(Path(self.index.folder) / self.index.files[fi])
            try:
                icon = QIcon(fl.to_qpixmap(crop_face(fl.read_image(path), tuple(self.index.boxes[m]), pad=0.6, size=180)))
            except Exception:  # noqa: BLE001
                icon = QIcon()
            item = QListWidgetItem(icon, Path(path).name)
            item.setData(Qt.ItemDataRole.UserRole, path)
            item.setToolTip(path)
            self.photos.addItem(item)

    def _save_name(self):
        row = self.people.currentRow()
        if row < 0:
            return
        gi = self.people.item(row).data(Qt.ItemDataRole.UserRole)
        g = self.groups[gi]
        g["name"] = self.name.text().strip()
        self.people.item(row).setText(self._group_label(gi, g))
        saved = [s for s in self._load_names()
                 if 1.0 - float(np.dot(g["centroid"], np.asarray(s["centroid"], dtype=np.float32))) > self.threshold]
        if g["name"]:
            saved.append({"name": g["name"], "centroid": g["centroid"].astype(float).round(6).tolist()})
        self._names_path().write_text(json.dumps(saved), encoding="utf-8")
        self.status(f"Saved name: {g['name'] or '(cleared)'}")

    def _rows(self, min_photos: int = 1):
        for gi, g in enumerate(self.groups):
            if len(g["files"]) < min_photos:
                continue
            for fi in g["files"]:
                yield g["name"] or f"Person {gi + 1}", str(Path(self.index.folder) / self.index.files[fi])

    def _export_csv(self):
        if not self.groups:
            self.show_error("Group a library first.")
            return
        path, _ = QFileDialog.getSaveFileName(self, "Export list", "people.csv", "CSV (*.csv)")
        if path:
            with open(path, "w", newline="", encoding="utf-8") as fh:
                w = csv.writer(fh)
                w.writerow(["person", "photo"])
                w.writerows(self._rows())
            self.status(f"Saved {path}")

    def _export_folders(self):
        if not self.groups:
            self.show_error("Group a library first.")
            return
        dest = QFileDialog.getExistingDirectory(self, "Copy photos into one folder per person (copies, originals untouched)")
        if not dest:
            return
        n = 0
        for person, src in self._rows(self.min_size.value()):
            safe = "".join(c if c.isalnum() or c in " -_" else "_" for c in person).strip() or "Unnamed"
            target = Path(dest) / safe / Path(src).name
            target.parent.mkdir(parents=True, exist_ok=True)
            if not target.exists():
                shutil.copy2(src, target)
                n += 1
        QMessageBox.information(self, fl.APP_NAME, f"Copied {n} photos into person folders in\n{dest}")
