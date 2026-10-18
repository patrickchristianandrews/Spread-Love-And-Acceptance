#!/usr/bin/env python3
"""Finish one printed book (called by tools/book/build_pdfs.js; needs pypdf).

    python3 tools/book/pdf_finish.py job.json

job.json holds:
  interior   the interior as Chromium printed it (page 1 = the half-title, a right-hand page)
  cover      a two-page PDF: the front cover, then the back cover
  screen     where to write the screen edition: front cover + interior + back cover
  print_interior, print_cover   (optional) where to write the print-shop files: the interior on its own and
             the cover on its own
  title, author, subject      document information
  outline    [[title, interior page, level], ...]: the bookmarks (level 0 = part or section, 1 = chapter)

The interior is padded with blank pages to an even page count, so it binds as whole sheets. In the screen
edition the viewer's page labels match the printed page numbers: "Cover", 1, 2, 3 ... "Back cover".
"""
import json
import sys

from pypdf import PdfReader, PdfWriter
from pypdf.constants import PageLabelStyle


def info(w, job):
    w.add_metadata({
        '/Title': job['title'],
        '/Author': job.get('author', ''),
        '/Subject': job.get('subject', ''),
        '/Creator': 'spreadloveandacceptance.com (tools/book/build_pdfs.js)',
        '/Producer': 'Chromium and pypdf',
    })


def outline(w, items, offset):
    parent = None
    for title, page, level in items:
        if not page:
            continue
        idx = int(page) - 1 + offset
        if idx < 0 or idx >= len(w.pages):
            continue
        if level == 0:
            parent = w.add_outline_item(title, idx)
        else:
            w.add_outline_item(title, idx, parent=parent)
    w.page_mode = '/UseOutlines'


def main():
    job = json.load(open(sys.argv[1], encoding='utf-8'))
    interior = PdfReader(job['interior'])
    cover = PdfReader(job['cover']) if job.get('cover') else None
    n = len(interior.pages)
    pad = n % 2
    box = interior.pages[0].mediabox
    w_, h_ = float(box.width), float(box.height)

    # the screen edition
    w = PdfWriter()
    if cover is not None:
        w.append(cover, pages=(0, 1), import_outline=False)
    w.append(interior, import_outline=False)
    for _ in range(pad):
        w.add_blank_page(width=w_, height=h_)
    if cover is not None and len(cover.pages) > 1:
        w.append(cover, pages=(1, 2), import_outline=False)
    off = 1 if cover is not None else 0
    if cover is not None:
        w.set_page_label(0, 0, prefix='Cover')
    w.set_page_label(off, off + n + pad - 1, style=PageLabelStyle.DECIMAL, start=1)
    if cover is not None and len(cover.pages) > 1:
        last = len(w.pages) - 1
        w.set_page_label(last, last, prefix='Back cover')
    info(w, job)
    outline(w, job.get('outline', []), off)
    w.compress_identical_objects(remove_duplicates=True, remove_unreferenced=True)
    with open(job['screen'], 'wb') as f:
        w.write(f)
    out = {'screen_pages': len(w.pages), 'interior_pages': n + pad, 'padded': pad}

    # the print-shop files
    if job.get('print_interior'):
        p = PdfWriter()
        p.append(interior, import_outline=False)
        for _ in range(pad):
            p.add_blank_page(width=w_, height=h_)
        info(p, dict(job, title=job['title'] + ' — interior for printing'))
        outline(p, job.get('outline', []), 0)
        p.compress_identical_objects(remove_duplicates=True, remove_unreferenced=True)
        with open(job['print_interior'], 'wb') as f:
            p.write(f)
    if job.get('print_cover') and cover is not None:
        c = PdfWriter()
        c.append(cover, import_outline=False)
        info(c, dict(job, title=job['title'] + ' — cover (front, then back)'))
        with open(job['print_cover'], 'wb') as f:
            c.write(f)
    print(json.dumps(out))


if __name__ == '__main__':
    main()
