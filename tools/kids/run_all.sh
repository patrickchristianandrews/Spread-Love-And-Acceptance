#!/bin/bash
# run_all.sh: rebuild the whole kids package (kids22). Needs a local server on the site first:
#     python3 -m http.server 8673 --bind 127.0.0.1 &      (stop it by its PID when done)
# Then, from the repo root:   bash tools/kids/run_all.sh
# Writes book/kids/*.pdf, covers, EPUBs, previews; then tools/kids/make_package.py writes the listing and the zip.
set -e
cd "$(dirname "$0")/../.."
export NODE_PATH="$(npm root -g)"
P=tools/kids
pages() { pdfinfo "$1" | awk '/^Pages:/{print $2}'; }

python3 $P/lint_kids.py >/dev/null || { python3 $P/lint_kids.py; echo "language lint found problems"; exit 1; }
python3 $P/build_picture.py
python3 $P/build_coloring.py
python3 $P/build_chapter.py >/dev/null

node $P/print_kids.js interior picture-book
node $P/print_kids.js interior picture-book-screen picture-book-screen picture-book
node $P/print_kids.js interior coloring-younger
node $P/print_kids.js interior coloring-older
node $P/print_kids.js interior chapter-book
if [ $(( $(pages book/kids/chapter-book.pdf) % 2 )) -eq 1 ]; then
  export PAD_BLANK=1
  python3 $P/build_chapter.py >/dev/null
  node $P/print_kids.js interior chapter-book
fi
python3 $P/build_chapter.py          # again: the cover takes its spine from the final page count

for b in picture-book chapter-book coloring-younger coloring-older; do node $P/print_kids.js cover $b; done

# the Kindle files
python3 $P/build_epubs.py art
node $P/print_kids.js shots picture-book-screen ".pg" epub-pb 1600 jpg
node $P/print_kids.js shots chapter-art-sheet ".art-item" epub-cb 920 png
python3 $P/build_epubs.py epub
python3 $P/check_pdfs.py
echo "built."
