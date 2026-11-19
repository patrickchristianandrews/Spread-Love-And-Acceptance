"""
FaceLens API server: a small, local REST service (in the spirit of CompreFace) so several
researchers or tools can share one face gallery through FaceLens's engines.

Standard library only (http.server). JSON in, JSON out; images travel as base64 strings.

    GET  /health                      no key needed: status, engine, gallery counts
    POST /detect          {image}     faces with box, score, quality warnings (+ liveness on InsightFace)
    POST /verify          {image1, image2}
    POST /embed           {image}
    POST /search          {image, top?, threshold?}   candidates for human review, nearest first
    POST /gallery/enroll  {image, name}
    POST /gallery/refresh {rebuild?}

Every other endpoint needs the header  X-Api-Key: <key>.  Optional headers X-Case-Id and X-User
are written to the audit log (<data dir>/audit/api.jsonl, hash-chained) with every request.
Image bytes are never logged.

Headless:  FaceLens.exe --serve --gallery DIR [--port 8765] [--host 127.0.0.1] [--api-key KEY]
"""

from __future__ import annotations

import argparse
import base64
import binascii
import hmac
import json
import re
import secrets
import threading
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

import cv2
import numpy as np
from PySide6.QtCore import QSettings, Qt, QTimer
from PySide6.QtGui import QFont, QGuiApplication
from PySide6.QtWidgets import (
    QCheckBox,
    QComboBox,
    QFileDialog,
    QFormLayout,
    QGroupBox,
    QHBoxLayout,
    QLabel,
    QLineEdit,
    QMessageBox,
    QPlainTextEdit,
    QPushButton,
    QSpinBox,
    QSplitter,
    QVBoxLayout,
    QWidget,
)

import facelens as fl

MAX_BODY = 20 * 1024 * 1024  # 20 MB per request
DEFAULT_PORT = 8765
REVIEW_NOTE = (
    "Candidates for human review only. A close distance is a lead, not an identification; "
    "check every candidate by eye and record the decision."
)


class ApiError(Exception):
    def __init__(self, status: int, message: str):
        super().__init__(message)
        self.status, self.message = status, message


def audit_path() -> Path:
    return fl.data_dir() / "audit" / "api.jsonl"


def decode_image(value) -> np.ndarray:
    """base64 (optionally a data: URL) -> BGR image."""
    if not isinstance(value, str) or not value:
        raise ApiError(400, "Expected a base64-encoded image string.")
    if value.startswith("data:"):
        value = value.split(",", 1)[-1]
    try:
        raw = base64.b64decode(value, validate=True)
    except (binascii.Error, ValueError):
        raise ApiError(400, "Image is not valid base64.") from None
    img = cv2.imdecode(np.frombuffer(raw, dtype=np.uint8), cv2.IMREAD_COLOR)
    if img is None:
        raise ApiError(400, "Image data could not be decoded (use JPEG, PNG, BMP or WebP).")
    return img


def safe_name(name) -> str:
    if not isinstance(name, str):
        raise ApiError(400, "Field 'name' must be a string.")
    if re.search(r"[\\/:]", name):
        raise ApiError(400, "Field 'name' must not contain slashes or colons.")
    clean = re.sub(r"[^A-Za-z0-9 _.\-]", "", name).strip(" .")
    if not clean or ".." in clean or len(clean) > 64:
        raise ApiError(400, "Field 'name' must be 1-64 letters, numbers, spaces, dots, dashes or underscores.")
    return clean


def box_dict(box) -> dict:
    x, y, w, h = (int(v) for v in box)
    return {"x": x, "y": y, "w": w, "h": h}


class ApiServer:
    """Runs the HTTP service on a background thread."""

    def __init__(self):
        self.httpd: ThreadingHTTPServer | None = None
        self.thread: threading.Thread | None = None
        self.gallery: Path | None = None
        self.opts: fl.Options | None = None
        self.api_key = ""
        self.index: fl.FaceIndex | None = None
        self.audit = fl.AuditLog(audit_path())
        self.started_at = 0.0

    # ---- lifecycle -------------------------------------------------------------------
    def start(self, host: str, port: int, gallery_dir: str, api_key: str, opts: fl.Options):
        """Build (or refresh) the gallery index, then start serving. Blocking until listening;
        call it from a background thread. Do not hold fl.DEEPFACE_LOCK when calling."""
        if self.is_running:
            raise RuntimeError("The server is already running.")
        if not api_key or len(api_key) < 16:
            raise ValueError("Use an API key of at least 16 characters.")
        gallery = Path(gallery_dir)
        if not gallery.is_dir():
            raise ValueError(f"Gallery folder not found: {gallery_dir}")
        self.gallery, self.opts, self.api_key = gallery, opts, api_key
        self.refresh_index()
        httpd = ThreadingHTTPServer((host, int(port)), _Handler)
        httpd.daemon_threads = True
        httpd.api = self  # type: ignore[attr-defined]
        self.httpd = httpd
        self.started_at = time.time()
        self.thread = threading.Thread(target=httpd.serve_forever, name="FaceLensAPI", daemon=True)
        self.thread.start()
        self.audit.append("api_started", url=self.url, engine=fl.engine_name(opts), gallery=str(gallery),
                          photos=len(self.index.files), faces=int(len(self.index.embs)))

    def stop(self):
        if self.httpd:
            self.httpd.shutdown()
            self.httpd.server_close()
            self.audit.append("api_stopped", url=self.url)
        if self.thread:
            self.thread.join(5)
        self.httpd = self.thread = None

    @property
    def is_running(self) -> bool:
        return bool(self.thread and self.thread.is_alive())

    @property
    def url(self) -> str:
        if not self.httpd:
            return ""
        host, port = self.httpd.server_address[:2]
        return f"http://{'localhost' if host in ('127.0.0.1', '0.0.0.0') else host}:{port}"

    def refresh_index(self, rebuild: bool = False):
        with fl.DEEPFACE_LOCK:
            self.index = fl.FaceIndex(str(self.gallery), self.opts).build(rebuild)

    # ---- endpoints -------------------------------------------------------------------
    def _faces(self, img):
        with fl.DEEPFACE_LOCK:
            return fl.embed_faces(img, self.opts)

    def health(self) -> dict:
        idx = self.index
        return {
            "status": "ok",
            "engine": fl.engine_name(self.opts),
            "threshold": fl.match_threshold(self.opts),
            "gallery_photos": len(idx.files) if idx else 0,
            "gallery_faces": int(len(idx.embs)) if idx else 0,
            "uptime_seconds": round(time.time() - self.started_at, 1),
            "version": fl.APP_VERSION,
        }

    def detect(self, body: dict) -> dict:
        img = decode_image(body.get("image"))
        faces = self._faces(img)
        out = []
        for f in faces:
            item = {"box": box_dict(f.box), "score": round(f.score, 4), "quality": fl.quality_check(img, f.box, f.kps)}
            if self.opts.model_name == fl.INSIGHT_MODEL and f.kps is not None:
                try:
                    with fl.DEEPFACE_LOCK:
                        item["liveness"] = fl.Extras.liveness(img, f.kps)
                except Exception as exc:  # noqa: BLE001 - liveness is optional
                    item["liveness"] = {"status": "error", "message": str(exc)}
            out.append(item)
        return {"faces": out, "count": len(out), "engine": fl.engine_name(self.opts)}

    def verify(self, body: dict) -> dict:
        a, b = decode_image(body.get("image1")), decode_image(body.get("image2"))
        fa, fb = self._faces(a), self._faces(b)
        if not fa or not fb:
            raise ApiError(422, f"No face found in image{'1' if not fa else '2'}.")
        distance = max(0.0, float(1.0 - fa[0].emb @ fb[0].emb))
        thr = fl.match_threshold(self.opts)
        return {
            "verified": distance <= thr,
            "distance": round(distance, 4),
            "threshold": thr,
            "engine": fl.engine_name(self.opts),
            "box1": box_dict(fa[0].box),
            "box2": box_dict(fb[0].box),
            "quality1": fl.quality_check(a, fa[0].box, fa[0].kps)["warnings"],
            "quality2": fl.quality_check(b, fb[0].box, fb[0].kps)["warnings"],
        }

    def embed(self, body: dict) -> dict:
        img = decode_image(body.get("image"))
        faces = self._faces(img)
        return {
            "engine": fl.engine_name(self.opts),
            "faces": [{"box": box_dict(f.box), "score": round(f.score, 4), "embedding": f.emb.astype(float).tolist()}
                      for f in faces],
            "count": len(faces),
        }

    def search(self, body: dict) -> dict:
        img = decode_image(body.get("image"))
        try:
            top = max(1, min(100, int(body.get("top", 10))))
            thr = float(body["threshold"]) if body.get("threshold") is not None else fl.match_threshold(self.opts)
        except (TypeError, ValueError):
            raise ApiError(400, "'top' must be an integer and 'threshold' a number.") from None
        faces = self._faces(img)
        if not faces:
            raise ApiError(422, "No face found in the image.")
        q = faces[0]
        idx = self.index
        hits = idx.search(q.emb, thr, top) if idx is not None and idx.embs.shape[1:] == q.emb.shape else []
        candidates = []
        for h in hits:
            rel = Path(h["path"]).relative_to(self.gallery).as_posix()
            candidates.append({
                "path": rel,
                "name": rel.split("/")[0] if "/" in rel else None,
                "distance": round(h["distance"], 4),
                "box": box_dict(h["box"]),
            })
        return {
            "note": REVIEW_NOTE,
            "engine": fl.engine_name(self.opts),
            "threshold": thr,
            "query_box": box_dict(q.box),
            "query_quality": fl.quality_check(img, q.box, q.kps)["warnings"],
            "faces_in_query": len(faces),
            "candidates": candidates,
            "count": len(candidates),
        }

    def enroll(self, body: dict) -> dict:
        name = safe_name(body.get("name"))
        img = decode_image(body.get("image"))
        if not self._faces(img):
            raise ApiError(422, "No face found in the image; nothing was enrolled.")
        folder = (self.gallery / name).resolve()
        if self.gallery.resolve() not in folder.parents:
            raise ApiError(400, "Invalid name.")
        folder.mkdir(parents=True, exist_ok=True)
        dest = folder / f"{time.strftime('%Y%m%d-%H%M%S')}-{secrets.token_hex(3)}.jpg"
        fl.write_image(str(dest), img)
        self.refresh_index()
        return {"enrolled": dest.relative_to(self.gallery).as_posix(), "name": name,
                "gallery_photos": len(self.index.files), "gallery_faces": int(len(self.index.embs))}

    def refresh(self, body: dict) -> dict:
        self.refresh_index(bool(body.get("rebuild")))
        return {"gallery_photos": len(self.index.files), "gallery_faces": int(len(self.index.embs))}

    ROUTES = {
        "/detect": "detect",
        "/verify": "verify",
        "/embed": "embed",
        "/search": "search",
        "/gallery/enroll": "enroll",
        "/gallery/refresh": "refresh",
    }


class _Handler(BaseHTTPRequestHandler):
    server_version = "FaceLensAPI/" + fl.APP_VERSION
    protocol_version = "HTTP/1.1"

    @property
    def api(self) -> ApiServer:
        return self.server.api  # type: ignore[attr-defined]

    def log_message(self, fmt, *args):  # keep the console quiet; the audit log is the record
        pass

    def _send(self, status: int, payload: dict):
        body = json.dumps(fl.jsonable(payload)).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def _audit(self, event: str, status: int, **fields):
        try:
            self.api.audit.append(
                event,
                endpoint=self.path.split("?")[0],
                client=self.client_address[0],
                case_id=self.headers.get("X-Case-Id", ""),
                user=self.headers.get("X-User", ""),
                status=status,
                **fields,
            )
        except Exception:  # noqa: BLE001 - never fail a request because logging failed
            pass

    def _drain(self, length: int):
        """Read and discard an unread body so the client sees our error reply instead of a broken
        connection. Bodies beyond 4x the limit are not drained; the connection is just closed."""
        if 0 < length <= 4 * MAX_BODY:
            remaining = length
            while remaining > 0:
                chunk = self.rfile.read(min(1024 * 1024, remaining))
                if not chunk:
                    break
                remaining -= len(chunk)

    def do_GET(self):  # noqa: N802
        path = self.path.split("?")[0]
        if path in ("/", "/health"):
            self._send(200, self.api.health())
        else:
            self._send(404, {"error": f"Unknown endpoint {path}. Try GET /health."})

    def do_POST(self):  # noqa: N802
        path = self.path.split("?")[0]
        method = ApiServer.ROUTES.get(path)
        if method is None:
            self.close_connection = True
            try:
                self._drain(min(int(self.headers.get("Content-Length", "0")), MAX_BODY))
            except ValueError:
                pass
            self._send(404, {"error": f"Unknown endpoint {path}."})
            return
        try:
            length = int(self.headers.get("Content-Length", "0"))
        except ValueError:
            length = -1
        key = self.headers.get("X-Api-Key", "")
        if not hmac.compare_digest(key.encode("utf-8"), self.api.api_key.encode("utf-8")):
            self.close_connection = True
            self._drain(min(length, MAX_BODY))
            self._audit("api_unauthorized", 401)
            self._send(401, {"error": "Missing or wrong X-Api-Key header."})
            return
        if length > MAX_BODY:
            self.close_connection = True
            self._drain(length)
            self._audit("api_request", 413, bytes=length)
            self._send(413, {"error": f"Request too large ({length} bytes; limit {MAX_BODY})."})
            return
        if length <= 0:
            self.close_connection = True
            self._audit("api_request", 400)
            self._send(400, {"error": "Send a JSON body with a Content-Length header."})
            return
        t0 = time.time()
        try:
            try:
                body = json.loads(self.rfile.read(length).decode("utf-8"))
            except (UnicodeDecodeError, json.JSONDecodeError):
                raise ApiError(400, "Body is not valid JSON.") from None
            if not isinstance(body, dict):
                raise ApiError(400, "Body must be a JSON object.")
            result = getattr(self.api, method)(body)
        except ApiError as exc:
            self._audit("api_request", exc.status, error=exc.message)
            self._send(exc.status, {"error": exc.message})
            return
        except Exception as exc:  # noqa: BLE001
            msg = fl.friendly_error(exc)
            self._audit("api_request", 500, error=msg)
            self._send(500, {"error": msg})
            return
        summary = {k: result[k] for k in ("count", "verified", "distance", "enrolled", "gallery_faces") if k in result}
        if path == "/search":
            summary["top_candidates"] = [c["path"] for c in result["candidates"][:5]]
        self._audit("api_request", 200, seconds=round(time.time() - t0, 3), **summary)
        self._send(200, result)


# --------------------------------------------------------------------------------------
# Headless mode
# --------------------------------------------------------------------------------------


def default_model() -> str:
    import importlib.util

    return fl.INSIGHT_MODEL if importlib.util.find_spec("insightface") else "Facenet512"


def serve_cli(argv) -> int:
    """FaceLens.exe --serve --gallery DIR [--port 8765] [--host 127.0.0.1] [--api-key KEY]
    [--model NAME] [--detector NAME]"""
    p = argparse.ArgumentParser(prog="FaceLens --serve", description="Run the FaceLens API without the window.")
    p.add_argument("--serve", action="store_true")
    p.add_argument("--gallery", required=True, help="Folder of gallery photos (sub-folders = names)")
    p.add_argument("--host", default="127.0.0.1", help="127.0.0.1 (this PC only) or 0.0.0.0 (whole network)")
    p.add_argument("--port", type=int, default=DEFAULT_PORT)
    p.add_argument("--api-key", default="", help="Shared secret clients send as X-Api-Key")
    p.add_argument("--model", default=None, help="Recognition model (default: InsightFace if installed)")
    p.add_argument("--detector", default="opencv")
    args, _ = p.parse_known_args(argv)
    key = args.api_key or secrets.token_urlsafe(24)
    opts = fl.Options(model_name=args.model or default_model(), detector_backend=args.detector)
    server = ApiServer()
    try:
        server.start(args.host, args.port, args.gallery, key, opts)
    except Exception as exc:  # noqa: BLE001
        print(f"Could not start: {fl.friendly_error(exc)}", flush=True)
        return 1
    print(f"FaceLens API running at {server.url}  ({fl.engine_name(opts)})", flush=True)
    print(f"API key: {key}", flush=True)
    if args.host == "0.0.0.0":
        print("WARNING: listening on every network interface; anyone on the network can reach it.", flush=True)
    print(f"Audit log: {audit_path()}", flush=True)
    print("Press Ctrl+C to stop.", flush=True)
    try:
        while server.is_running:
            time.sleep(0.5)
    except KeyboardInterrupt:
        pass
    finally:
        server.stop()
    return 0


# --------------------------------------------------------------------------------------
# Tab
# --------------------------------------------------------------------------------------


class ServerTab(QWidget):
    status = None  # set by MainWindow: callable(str)

    def __init__(self, get_options):
        super().__init__()
        self.get_options = get_options
        self.server = ApiServer()
        self.settings = QSettings(fl.APP_NAME, fl.APP_NAME)
        self._jobs = set()

        self.gallery = QLineEdit(self.settings.value("server/gallery", ""))
        self.gallery.setPlaceholderText("Folder of gallery photos (sub-folders are treated as names)")
        browse = QPushButton("Browse…")
        browse.clicked.connect(self.browse)
        grow = QHBoxLayout()
        grow.addWidget(self.gallery, 1)
        grow.addWidget(browse)

        self.host = QComboBox()
        self.host.setEditable(True)
        self.host.addItems(["127.0.0.1", "0.0.0.0"])
        self.host.setCurrentText(self.settings.value("server/host", "127.0.0.1"))
        self.host.setToolTip("127.0.0.1: only this PC. 0.0.0.0: every computer on the network (the key is still required).")
        self.port = QSpinBox()
        self.port.setRange(1024, 65535)
        self.port.setValue(int(self.settings.value("server/port", DEFAULT_PORT)))

        # A fresh key every session; it is never saved to disk or the registry.
        self.key = QLineEdit(secrets.token_urlsafe(24))
        self.key.setEchoMode(QLineEdit.EchoMode.Password)
        self.key.textChanged.connect(self.update_examples)
        show = QCheckBox("Show")
        show.toggled.connect(lambda on: self.key.setEchoMode(
            QLineEdit.EchoMode.Normal if on else QLineEdit.EchoMode.Password))
        gen = QPushButton("New key")
        gen.clicked.connect(lambda: self.key.setText(secrets.token_urlsafe(24)))
        copy = QPushButton("Copy")
        copy.clicked.connect(lambda: QGuiApplication.clipboard().setText(self.key.text()))
        krow = QHBoxLayout()
        krow.addWidget(self.key, 1)
        krow.addWidget(show)
        krow.addWidget(gen)
        krow.addWidget(copy)

        self.start_btn = QPushButton("Start server")
        self.start_btn.setObjectName("Primary")
        self.start_btn.clicked.connect(self.toggle)
        verify_btn = QPushButton("Verify audit log")
        verify_btn.clicked.connect(self.verify_log)
        self.state = QLabel("Stopped.")
        self.state.setTextInteractionFlags(Qt.TextInteractionFlag.TextSelectableByMouse)
        brow = QHBoxLayout()
        brow.addWidget(self.start_btn)
        brow.addWidget(verify_btn)
        brow.addWidget(self.state, 1)

        box = QGroupBox("Server")
        form = QFormLayout(box)
        form.addRow("Gallery folder", grow)
        form.addRow("Listen on", self.host)
        form.addRow("Port", self.port)
        form.addRow("API key", krow)
        form.addRow(brow)

        self.log = QPlainTextEdit()
        self.log.setReadOnly(True)
        self.log.setFont(QFont("Consolas", 9))
        self.log.setPlaceholderText("Requests appear here (from the hash-chained audit log).")
        self.examples = QPlainTextEdit()
        self.examples.setReadOnly(True)
        self.examples.setFont(QFont("Consolas", 9))
        self.examples.setLineWrapMode(QPlainTextEdit.LineWrapMode.NoWrap)  # keep commands copyable

        lw, ew = QWidget(), QWidget()
        ll, el = QVBoxLayout(lw), QVBoxLayout(ew)
        ll.setContentsMargins(0, 0, 0, 0)
        el.setContentsMargins(0, 0, 0, 0)
        ll.addWidget(QLabel("<b>Request log</b>"))
        ll.addWidget(self.log, 1)
        el.addWidget(QLabel("<b>How to call it</b>"))
        el.addWidget(self.examples, 1)
        split = QSplitter()
        split.addWidget(lw)
        split.addWidget(ew)
        split.setSizes([520, 520])

        note = QLabel(
            "Shares this PC's engine and gallery with other tools. Search results are candidates for human "
            "review, not identifications. Every request is written to a tamper-evident audit log; images are not stored."
        )
        note.setObjectName("Note")
        note.setWordWrap(True)

        layout = QVBoxLayout(self)
        layout.addWidget(box)
        layout.addWidget(split, 1)
        layout.addWidget(note)

        self.timer = QTimer(self)
        self.timer.timeout.connect(self.refresh_log)
        self.timer.start(1500)
        self.update_examples()
        self.refresh_log()

    # ---- helpers ---------------------------------------------------------------------
    def _say(self, text: str):
        if self.status:
            self.status(text)

    def _run(self, fn, done, fail):
        """Background job without fl.Worker: the server takes fl.DEEPFACE_LOCK itself."""
        sig = fl.WorkerSignals()
        self._jobs.add(sig)
        sig.finished.connect(done)
        sig.failed.connect(fail)
        sig.finished.connect(lambda *_: QTimer.singleShot(0, lambda: self._jobs.discard(sig)))
        sig.failed.connect(lambda *_: QTimer.singleShot(0, lambda: self._jobs.discard(sig)))

        def body():
            try:
                result = fn()
            except Exception as exc:  # noqa: BLE001
                import traceback

                sig.failed.emit(fl.friendly_error(exc), traceback.format_exc())
            else:
                sig.finished.emit(result)

        threading.Thread(target=body, daemon=True).start()

    def browse(self):
        folder = QFileDialog.getExistingDirectory(self, "Gallery folder", self.gallery.text())
        if folder:
            self.gallery.setText(folder)

    def update_examples(self, *_):
        url = self.server.url or f"http://localhost:{self.port.value()}"
        key = self.key.text() or "<key>"
        self.examples.setPlainText(
            "# Health (no key)\n"
            f"curl {url}/health\n\n"
            "# Search the gallery (PowerShell)\n"
            "$img = [Convert]::ToBase64String([IO.File]::ReadAllBytes('query.jpg'))\n"
            f"Invoke-RestMethod -Method Post -Uri {url}/search -ContentType 'application/json' `\n"
            f"  -Headers @{{ 'X-Api-Key' = '{key}'; 'X-Case-Id' = 'CASE-001'; 'X-User' = 'analyst' }} `\n"
            "  -Body (@{ image = $img; top = 10 } | ConvertTo-Json)\n\n"
            "# Python client\n"
            "import base64, json, urllib.request\n"
            "def call(path, **body):\n"
            f"    req = urllib.request.Request('{url}' + path, json.dumps(body).encode(),\n"
            f"        {{'Content-Type': 'application/json', 'X-Api-Key': '{key}', 'X-Case-Id': 'CASE-001'}})\n"
            "    return json.load(urllib.request.urlopen(req))\n"
            "img = base64.b64encode(open('query.jpg', 'rb').read()).decode()\n"
            "print(call('/search', image=img, top=10))\n\n"
            "# Endpoints: /detect /verify (image1, image2) /embed /search /gallery/enroll (image, name) /gallery/refresh"
        )

    def refresh_log(self):
        entries = self.server.audit.entries()[-60:]
        lines = []
        for e in reversed(entries):
            what = e.get("endpoint") or e.get("url", "")
            extra = ""
            if "count" in e:
                extra = f" count={e['count']}"
            if "verified" in e:
                extra += f" verified={e['verified']}"
            if e.get("error"):
                extra += f" error={e['error']}"
            case = f" case={e['case_id']}" if e.get("case_id") else ""
            status = f" {e['status']}" if "status" in e else ""
            lines.append(f"{e['time'][11:19]}  {e['event']:<17}{status} {what}{case}{extra}")
        text = "\n".join(lines)
        if text != self.log.toPlainText():
            self.log.setPlainText(text)

    # ---- actions ---------------------------------------------------------------------
    def toggle(self):
        if self.server.is_running:
            self.server.stop()
            self.start_btn.setText("Start server")
            self.state.setText("Stopped.")
            self._say("API server stopped")
            self.update_examples()
            return
        gallery, host, key = self.gallery.text().strip(), self.host.currentText().strip(), self.key.text().strip()
        if not gallery:
            QMessageBox.warning(self, fl.APP_NAME, "Choose a gallery folder first.")
            return
        if host == "0.0.0.0":
            answer = QMessageBox.question(
                self, fl.APP_NAME,
                "Listening on 0.0.0.0 lets every computer on your network reach the server "
                "(they still need the API key). Traffic is not encrypted. Continue?",
            )
            if answer != QMessageBox.StandardButton.Yes:
                return
        for k, v in (("gallery", gallery), ("host", host), ("port", self.port.value())):
            self.settings.setValue(f"server/{k}", v)
        opts = self.get_options()
        port = self.port.value()
        self.start_btn.setEnabled(False)
        self.state.setText("Indexing gallery and starting…")
        self._say(f"Starting API server with {fl.engine_name(opts)}…")
        self._run(lambda: self.server.start(host, port, gallery, key, opts), self.started, self.failed)

    def started(self, _):
        h = self.server.health()
        self.start_btn.setEnabled(True)
        self.start_btn.setText("Stop server")
        self.state.setText(
            f"Running at <b>{self.server.url}</b> · {h['engine']} · {h['gallery_photos']} photos / "
            f"{h['gallery_faces']} faces"
        )
        self._say(f"API server running at {self.server.url}")
        self.update_examples()
        self.refresh_log()

    def failed(self, message, details=""):
        self.start_btn.setEnabled(True)
        self.start_btn.setText("Start server")
        self.state.setText("Stopped.")
        box = QMessageBox(self)
        box.setIcon(QMessageBox.Icon.Warning)
        box.setWindowTitle(fl.APP_NAME)
        box.setText(f"The server could not start:\n\n{message}")
        if details:
            box.setDetailedText(details)
        box.exec()

    def verify_log(self):
        ok, msg = self.server.audit.verify()
        (QMessageBox.information if ok else QMessageBox.warning)(
            self, "Audit log", f"{msg}\n\n{self.server.audit.path}")

    def shutdown(self):
        """Call from MainWindow.closeEvent."""
        if self.server.is_running:
            self.server.stop()
