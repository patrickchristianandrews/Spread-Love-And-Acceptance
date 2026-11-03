#!/bin/bash
cd /tmp/mk; mkdir -p clip/eps
for e in s1e1 s1e2 s1e3 s1e4 s1e5 s2e1 s2e2 s2e3; do
  echo "== $e $(date +%T)"
  node rec2.js $e 1000 /tmp/mk/clip/eps/$e.webm 2>&1 | tail -1
  ffmpeg -y -loglevel error -i /tmp/mk/clip/eps/$e.webm -c:v libx264 -preset medium -crf 21 -pix_fmt yuv420p -c:a aac -b:a 160k -movflags +faststart /tmp/mk/clip/eps/$e.mp4
  echo "$e done $(ffprobe -v error -show_entries format=duration -of csv=p=0 /tmp/mk/clip/eps/$e.mp4)"
done
echo ALLDONE
