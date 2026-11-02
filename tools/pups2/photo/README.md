# Tracing Tidbit and Sugarfoot from their photos

Owner, Nov 2 2026: "match exactly to the pictures". These scripts turn a photo into flat, smooth vector markings:

1. `seg.py`: shrink the photo to 1000 px wide (writes `<name>-img.png`).
2. `poster.py`: holds the hand-drawn outline of each dog (`POLY`), used to start the cut-out.
3. `auto.py`: cuts the dog out (grabCut from that outline), white-balances on a patch of known white fur,
   and sorts every pixel into black coat, tan, rusty brown, white or pink, then tidies the areas.
4. `final.py`: traces each area into smooth curves (potrace) and adds eyes, nose, mouth and the ear and leg
   lines, as a color page and a coloring page.

The photos themselves are not in the repo; the commands used are in the session notes.
Needs: pip install opencv-python-headless potracer scikit-learn
