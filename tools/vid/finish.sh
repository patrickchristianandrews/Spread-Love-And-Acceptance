#!/bin/bash
# after the chain ends (naturally or by timeout): encode whatever is not encoded, one at a time, then the short videos if missing
cd /tmp/mk
while pgrep -f "[c]hain2.sh" >/dev/null || pgrep -f "[r]ec2.js" >/dev/null; do sleep 30; done
(cd /home/user/Spread-Love-And-Acceptance && (python3 -m http.server 8697 --bind 127.0.0.1 >/dev/null 2>&1 &)); sleep 1
if [ ! -f clip/eps/s2e3.webm ]; then echo "== record s2e3 $(date +%T)"; node rec2.js s2e3 1000 clip/eps/s2e3.webm 2>&1 | tail -1; echo "saved s2e3 $(stat -c %s clip/eps/s2e3.webm)"; fi
ok() { ffprobe -v error -show_entries format=duration -of csv=p=0 "$1" >/dev/null 2>&1; }
for e in s1e1 s1e2 s1e3 s1e4 s1e5 s2e1 s2e2 s2e3; do
  if [ -f clip/eps/$e.webm ] && ! ok clip/eps/$e-final.mp4; then
    echo "== encode $e $(date +%T)"; ffmpeg -y -loglevel error -i clip/eps/$e.webm -c:v libx264 -preset medium -crf 21 -pix_fmt yuv420p -c:a aac -b:a 160k -movflags +faststart clip/eps/$e-final.mp4
    echo "$e done $(ffprobe -v error -show_entries format=duration -of csv=p=0 clip/eps/$e-final.mp4)"
  fi
done
ok clip/trailer-drawn.mp4 && [ clip/trailer-drawn.mp4 -nt /home/user/Spread-Love-And-Acceptance/assets/js/pups.js ] || { echo "== trailer $(date +%T)"; node tclip.js 0 71.6 clip/trailer-drawn.mp4 2>&1 | tail -1; }
ok clip/teaser-drawn.mp4 && [ clip/teaser-drawn.mp4 -nt /home/user/Spread-Love-And-Acceptance/assets/js/pups.js ] || { echo "== teaser $(date +%T)"; node frames.js teaser clip/teaser-drawn.mp4 2>&1 | tail -1; }
ok clip/music-drawn.mp4 && [ clip/music-drawn.mp4 -nt /home/user/Spread-Love-And-Acceptance/assets/js/pups.js ] || { echo "== music $(date +%T)"; node frames.js music clip/music-drawn.mp4 2>&1 | tail -1; }
echo FINISHDONE
