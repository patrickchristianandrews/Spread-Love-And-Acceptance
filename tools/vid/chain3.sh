#!/bin/bash
# resumable: records each episode whose recording predates pups.js (nothing else running, so no dropped frames),
# encodes at 24 fps, renders the short videos, then the Season 1 single file. Safe to re-run after a restart.
cd /tmp/mk; mkdir -p clip/eps
P=/home/user/Spread-Love-And-Acceptance/assets/js/pups.js
pgrep -f "[h]ttp.server 8697" >/dev/null || (cd /home/user/Spread-Love-And-Acceptance && (python3 -m http.server 8697 --bind 127.0.0.1 >/dev/null 2>&1 &)); sleep 1
ok() { ffprobe -v error -show_entries format=duration -of csv=p=0 "$1" >/dev/null 2>&1; }
for e in s1e1 s1e2 s1e3 s1e4 s1e5 s2e1 s2e2 s2e3; do
  if [ -f clip/eps/$e.webm ] && [ clip/eps/$e.webm -nt $P ]; then continue; fi
  echo "== record $e $(date +%T)"; node rec2.js $e 1000 /tmp/mk/clip/eps/$e.tmp.webm 2>&1 | tail -1
  ok clip/eps/$e.tmp.webm && mv clip/eps/$e.tmp.webm clip/eps/$e.webm
done
for e in s1e1 s1e2 s1e3 s1e4 s1e5 s2e1 s2e2 s2e3; do
  if ok clip/eps/$e-final.mp4 && [ clip/eps/$e-final.mp4 -nt clip/eps/$e.webm ]; then continue; fi
  echo "== encode $e $(date +%T)"
  ffmpeg -y -loglevel error -i clip/eps/$e.webm -vf fps=24 -c:v libx264 -preset fast -crf 26 -pix_fmt yuv420p -c:a aac -b:a 128k -movflags +faststart clip/eps/$e.tmp.mp4 && mv clip/eps/$e.tmp.mp4 clip/eps/$e-final.mp4
  echo "$e done $(ffprobe -v error -show_entries format=duration -of csv=p=0 clip/eps/$e-final.mp4) $(stat -c %s clip/eps/$e-final.mp4)"
done
ok clip/trailer-drawn.mp4 && [ clip/trailer-drawn.mp4 -nt $P ] || { echo "== trailer $(date +%T)"; node tclip.js 0 71.6 clip/trailer-drawn.mp4 2>&1 | tail -1; }
ok clip/teaser-drawn.mp4 && [ clip/teaser-drawn.mp4 -nt $P ] || { echo "== teaser $(date +%T)"; node frames.js teaser clip/teaser-drawn.mp4 2>&1 | tail -1; }
ok clip/music-drawn.mp4 && [ clip/music-drawn.mp4 -nt $P ] || { echo "== music $(date +%T)"; node frames.js music clip/music-drawn.mp4 2>&1 | tail -1; }
if ! { ok clip/season1-cat.mp4 && [ clip/season1-cat.mp4 -nt clip/eps/s1e5-final.mp4 ]; }; then
  echo "== season 1 file $(date +%T)"
  printf "file '/tmp/mk/clip/eps/%s-final.mp4'\n" s1e1 s1e2 s1e3 s1e4 s1e5 > cat.txt
  ffmpeg -y -loglevel error -f concat -safe 0 -i cat.txt -vf scale=640:360 -r 24 -fps_mode cfr -c:v libx264 -preset fast -b:v 118k -maxrate 180k -bufsize 600k -pix_fmt yuv420p -c:a aac -b:a 56k -movflags +faststart clip/season1-cat.tmp.mp4 && mv clip/season1-cat.tmp.mp4 clip/season1-cat.mp4
  echo "season done $(stat -c %s clip/season1-cat.mp4) $(ffprobe -v error -show_entries format=duration -of csv=p=0 clip/season1-cat.mp4)"
fi
echo ALLDONE
