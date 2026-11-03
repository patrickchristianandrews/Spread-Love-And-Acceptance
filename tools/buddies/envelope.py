#!/usr/bin/env python3
"""envelope.py: the loudness curve of every recorded line, 40 steps a second, as a string of digits 0-9 in
assets/audio/buddies/<episode>/env.json. The player moves the mouth with it, so the talking follows the voice.
Run after prosody.py:  python3 tools/buddies/envelope.py"""
import json, os, subprocess, sys
import numpy as np
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
AUD = os.path.join(ROOT, 'assets', 'audio', 'buddies'); SR = 24000; HZ = 40
EPS = ['s1e1', 's1e2', 's1e3', 's1e4', 's1e5', 's2e1', 's2e2', 's2e3']

def decode(path):
    r = subprocess.run(['ffmpeg', '-loglevel', 'error', '-i', path, '-ac', '1', '-ar', str(SR), '-f', 'f32le', '-'], capture_output=True, check=True)
    return np.frombuffer(r.stdout, dtype=np.float32)

def env(a):
    n = SR // HZ; m = len(a) // n
    if m < 2: return '5'
    rms = np.sqrt((a[:m * n].reshape(m, n) ** 2).mean(axis=1))
    rms = np.convolve(rms, [0.25, 0.5, 0.25], mode='same')               # a little smoothing: the jaw is not a switch
    top = np.percentile(rms, 97) or 1.0; v = np.clip(rms / top, 0, 1) ** 0.7  # a soft knee: quiet syllables still move the mouth
    v[v < 0.08] = 0                                                       # silence between words closes it
    return ''.join(str(int(round(x * 9))) for x in v)

for ep in EPS:
    d = os.path.join(AUD, ep); idx = json.load(open(os.path.join(d, 'index.json'))); out = {}
    for k in idx:
        p = os.path.join(d, k + '.mp3')
        if os.path.exists(p): out[k] = env(decode(p))
    json.dump(out, open(os.path.join(d, 'env.json'), 'w'), separators=(',', ':'))
    print(ep, len(out), flush=True)
