#!/usr/bin/env python3
"""pdf_meta.py <file.pdf> <title> <author>: set the document information of an adult coloring book PDF with pypdf (no tool name is left in it)."""
import sys

from pypdf import PdfReader, PdfWriter

path, title, author = sys.argv[1], sys.argv[2], sys.argv[3]
r = PdfReader(path)
w = PdfWriter(clone_from=r)
if len(sys.argv) > 5:
    # a cover: Chromium rounds the page size to its own unit; set the exact KDP size (the few hundredths of a point are in the bleed)
    from pypdf.generic import RectangleObject
    box = RectangleObject([0, 0, round(float(sys.argv[4]) * 72, 2), round(float(sys.argv[5]) * 72, 2)])
    for pg in w.pages:
        pg.mediabox = box
        pg.cropbox = box
w.add_metadata({'/Title': title, '/Author': author, '/Subject': 'Spread Love & Acceptance, adult coloring book', '/Creator': 'spreadloveandacceptance.com', '/Producer': 'spreadloveandacceptance.com'})
with open(path, 'wb') as fh:
    w.write(fh)
