#!/bin/bash
# records every episode with nothing else running (no dropped frames), then encodes them all, then the short videos
cd /tmp/mk; mkdir -p clip/eps; rm -f clip/eps/*
(cd /home/user/Spread-Love-And-Acceptance && (python3 -m http.server 8697 --bind 127.0.0.1 >/dev/null 2>&1 &)); sleep 1
for e in s1e1 s1e2 s1e3 s1e4 s1e5 s2e1 s2e2 s2e3; do
  echo "== record $e $(date +%T)"; node rec2.js $e 1000 /tmp/mk/clip/eps/$e.webm 2>&1 | tail -1
done
for e in s1e1 s1e2 s1e3 s1e4 s1e5 s2e1 s2e2 s2e3; do
  echo "== encode $e $(date +%T)"
  ffmpeg -y -loglevel error -i /tmp/mk/clip/eps/$e.webm -c:v libx264 -preset medium -crf 21 -pix_fmt yuv420p -c:a aac -b:a 160k -movflags +faststart /tmp/mk/clip/eps/$e-final.mp4
  echo "$e done $(ffprobe -v error -show_entries format=duration -of csv=p=0 /tmp/mk/clip/eps/$e-final.mp4)"
done
echo "== trailer $(date +%T)"; node tclip.js 0 71.6 /tmp/mk/clip/trailer-drawn.mp4 2>&1 | tail -1
echo "== teaser $(date +%T)"; node frames.js teaser /tmp/mk/clip/teaser-drawn.mp4 2>&1 | tail -1
echo "== music $(date +%T)"; node frames.js music /tmp/mk/clip/music-drawn.mp4 2>&1 | tail -1
echo ALLDONE
