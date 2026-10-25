#!/usr/bin/env python3
"""pdf_meta.py <file.pdf> <title> <author>: set the document information (title, author, creator) with pypdf, so no
tool name is left in the file. The text and fonts are untouched (fonts are already embedded by Chromium)."""
import sys

from pypdf import PdfReader, PdfWriter

path, title, author = sys.argv[1], sys.argv[2], sys.argv[3]
r = PdfReader(path)
w = PdfWriter(clone_from=r)
w.add_metadata({'/Title': title, '/Author': author, '/Subject': 'Spread Love & Acceptance, kids books', '/Creator': 'spreadloveandacceptance.com', '/Producer': 'spreadloveandacceptance.com'})
with open(path, 'wb') as fh:
    w.write(fh)
