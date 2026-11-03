#!/bin/bash
cd /tmp/mk
(cd /home/user/Spread-Love-And-Acceptance && (python3 -m http.server 8697 --bind 127.0.0.1 >/dev/null 2>&1 &)); sleep 1
echo "== trailer $(date +%T)"; node tclip.js 0 71.6 /tmp/mk/clip/trailer-drawn.mp4 2>&1 | tail -1
echo "== teaser $(date +%T)"; node frames.js teaser /tmp/mk/clip/teaser-drawn.mp4 2>&1 | tail -1
echo "== music $(date +%T)"; node frames.js music /tmp/mk/clip/music-drawn.mp4 2>&1 | tail -1
rm -f /tmp/mk/clip/eps/*
for e in s1e1 s1e2 s1e3 s1e4 s1e5 s2e1 s2e2 s2e3; do
  echo "== $e $(date +%T)"
  node rec2.js $e 1000 /tmp/mk/clip/eps/$e.webm 2>&1 | tail -1
  ffmpeg -y -loglevel error -i /tmp/mk/clip/eps/$e.webm -c:v libx264 -preset medium -crf 21 -pix_fmt yuv420p -c:a aac -b:a 160k -movflags +faststart /tmp/mk/clip/eps/$e.mp4
  echo "$e done $(ffprobe -v error -show_entries format=duration -of csv=p=0 /tmp/mk/clip/eps/$e.mp4)"
done
echo ALLDONE
