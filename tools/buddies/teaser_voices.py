#!/usr/bin/env python3
"""teaser_voices.py: the Season 2 teaser's lines, said the way their words mean (owner, Nov 16 2026: "the tone of their
voice is good, but they do not speak in the context of what they are saying").

Same voices, same recordings (tools/buddies/voice-src/s2teaser/, the untouched source), reshaped with prosody.py's engine:
each line has a delivery picked for what it says (below), on top of prosody.py's stresses and line endings. Shouts come
out a little louder and quicker, timid or deadpan lines a little softer and flatter, "slow motion" in slow motion, a
sneeze that builds. Every line still fits its moment in the teaser (it is slowed down less if it would run over).

    python3 tools/buddies/teaser_voices.py          rewrite assets/audio/buddies/s2teaser/ from the source
Then bump CLIPV in assets/js/buddies-teaser.js."""
import json, os, sys
import numpy as np
sys.path.insert(0, os.path.dirname(__file__))
import prosody as P

ROOT = P.ROOT
SRC = os.path.join(ROOT, 'tools', 'buddies', 'voice-src', 's2teaser')
# lines kept as recorded (any reshaping blurred a word: "bone" came out as "bond")
# and Tidbit's snakes line (owner, Nov 17: "Tidbit on the snakes on the plane voice needs to be fixed": reshaping it
# doubled the wobbles in his pitch)
KEEP = {'You owe me a bigger bone!': 1.0, 'Gotcha! Just me!': 1.5, 'I have had it with these snakes on this…': 1.5}
# the only line still reshaped: slow motion is the joke (owner, Nov 17 2026: every other voice as the pups said it)
RESHAPE = {'Whoa… slow motion.'}
BUILT = os.path.join(ROOT, 'tools', 'buddies', 'voice-src', 's2teaser-built')  # lines rebuilt by teaser_build.py, used as they are
DST = os.path.join(ROOT, 'assets', 'audio', 'buddies', 's2teaser')

# extra deliveries: pitch offset (semitones), melody widening, pace (>1 slower), tremble, drift over the line
P.FEEL.update({
    'scared':  (2.4, 1.5, 0.88, 0.35, 0.3),    # an urgent shout
    'curious': (0.8, 1.25, 1.0, 0.0, 0.2),     # wondering, leaning in
    'timid':   (0.3, 0.85, 1.08, 0.45, -0.3),  # unsure, a little shaky
    'dry':     (-1.1, 0.55, 1.06, 0.0, -0.9),  # deadpan
    'slowmo':  (-3.6, 0.8, 1.55, 0.0, -1.6),   # said in slow motion, deeper
    'cool':    (-1.3, 0.8, 1.06, 0.0, -0.7),   # too cool
    'build':   (0.6, 1.1, 1.1, 0.0, 4.2),      # a sneeze winding up
    'burst':   (2.4, 1.7, 0.84, 0.0, -0.5),    # ...CHOO!
    'epic':    (-1.8, 1.35, 1.12, 0.0, -0.6),  # a big, deep, slow command
    'fed up':  (-0.4, 1.4, 0.98, 0.0, -0.4),   # had it with these snakes
    'annoyed': (0.7, 1.3, 0.94, 0.0, -0.3),    # hey, I was talking!
    'tender':  (-0.5, 1.0, 1.1, 0.0, -0.7),    # warm and settled
    'giggly':  (1.6, 1.6, 0.94, 0.25, 0.0),    # hee hee
})
P.MOODX.update({'scared': 1.5, 'curious': 1.1, 'timid': 0.8, 'dry': 0.6, 'slowmo': 0.9, 'cool': 0.8, 'build': 0.9, 'burst': 1.5,
                'epic': 1.5, 'fed up': 1.35, 'annoyed': 1.3, 'tender': 0.8, 'giggly': 1.3})
# loudness for each delivery, in dB from a common level a little under the recordings' own peaks
LOUD = {'scared': 2.5, 'burst': 2.5, 'epic': 2.5, 'excited': 1.5, 'surprised': 1.5, 'annoyed': 1.5, 'fed up': 1.0, 'proud': 0.5,
        'happy': 0.5, 'giggly': 0.5, 'curious': 0.0, 'silly': 0.5, 'build': -0.5, 'cool': -1.0, 'tender': -1.5, 'dry': -2.0,
        'timid': -3.0, 'slowmo': -0.5, 'worried': -0.5, 'calm': -1.0}

# what each line means, so how it is said
MOOD = {
    'Did you hear that?': ('worried', 1.0), 'It came from out there!': ('scared', 0.9),
    'Wheee!': ('excited', 1.3), 'Look down there!': ('excited', 1.1), 'We made it!': ('proud', 1.2),
    'A secret door!': ('surprised', 1.1), 'So many lanterns!': ('excited', 1.0), 'Ooh, it’s glowing!': ('curious', 1.1),
    'Make a wish!': ('happy', 1.0), 'Who’s that?': ('curious', 1.0), 'Maybe a new friend!': ('happy', 1.1),
    'Ah… ahh…': ('build', 1.0), 'CHOO!': ('burst', 1.3), '…Bless you!': ('happy', 0.9), 'Hee hee!': ('giggly', 1.1),
    'That was on purpose!': ('proud', 1.1), 'A golden bone? Easy!': ('proud', 1.1), 'Tidbit… what did you do?': ('worried', 1.1), 'Oh no.': ('worried', 1.0), 'RUN!': ('scared', 1.3),
    'Wait… a beach ball?': ('surprised', 1.0), 'This never happened.': ('dry', 1.0), 'Nice night for a swim.': ('calm', 1.0),
    'Um… hello?': ('timid', 1.0), 'Gotcha! Just me!': ('silly', 0.8), 'You owe me a bigger bone!': ('annoyed', 0.8),
    'Whoa… slow motion.': ('slowmo', 1.0), 'I know pie-fu.': ('cool', 1.0), 'Why is it always me?': ('grumpy', 1.1),
    'At least it’s cherry.': ('dry', 0.9), 'What a smooth flight!': ('happy', 1.0), 'Wait… snakes?!': ('scared', 1.2),
    'I have had it with these snakes on this…': ('fed up', 1.2), '…PLANE! This lovely plane!': ('excited', 1.2),
    'That’s NOT what I meant!': ('annoyed', 1.2), 'I know.': ('dry', 0.9),
    'Almost there…': ('worried', 1.0), 'I’m holding on tight!': ('scared', 1.0), 'Got it!': ('proud', 1.2), '…Oops.': ('timid', 0.9),
    'Mission: possible… ish.': ('silly', 1.0), 'YOU SHALL NOT PASS!': ('epic', 1.3), '…Okay.': ('timid', 0.9),
    'Did I do that?': ('timid', 1.0), 'Ready? Watch this!': ('excited', 1.2), 'To infinity… and beyond!': ('excited', 1.3),
    'That’s my laundry basket!': ('annoyed', 1.1), 'To infinity… and the laundry!': ('silly', 1.2),
    'Wherever we go next…': ('tender', 1.0), '…we go together.': ('tender', 1.0),
    'Wait… did anyone see where Tidbit went?': ('worried', 1.0), 'Right here! Ready for Season 2!': ('excited', 1.3),
    'Of course you are!': ('happy', 1.1), 'I’ll be bark!': ('cool', 1.1),
}


def onsets_for(a, text):
    """where each word starts: the voiced stretch, shared out by the length of each word (the clips have no word timing)."""
    import parselmouth
    toks = P.tokens(text)
    snd = parselmouth.Sound(a, P.SR)
    it = snd.to_intensity(minimum_pitch=100, time_step=0.01)
    lv = it.values[0]; tt = it.xs()
    on = tt[lv > lv.max() - 30]
    t0, t1 = (float(on[0]), float(on[-1])) if len(on) else (0.0, snd.duration)
    w = np.array([len(x) + 2 for x, _ in toks], float)
    starts = t0 + (t1 - t0) * np.concatenate([[0], np.cumsum(w)[:-1]]) / w.sum()
    return [round(float(s), 3) for s in starts]


def main():
    lines = json.load(open(sys.argv[1])) if len(sys.argv) > 1 else None
    idx = json.load(open(os.path.join(SRC, 'index.json')))
    if lines is None:
        sys.exit('usage: teaser_voices.py <lines.json from TOLTeaser.lines(false)>')
    out = dict(json.load(open(os.path.join(DST, 'index.json'))))
    done = 0
    lines = sorted(lines, key=lambda x: x['t'])
    for i, l in enumerate(lines):  # each voice must end before the next one starts (it may run a little past its bubble)
        nxt = next((m['t'] for m in lines[i + 1:] if m['t'] > l['t'] + 0.01), l['t'] + l['dur'] + 2)
        l['room'] = min(nxt - l['t'] - 0.06, l['dur'] + 0.9)
    for l in lines:
        if l['who'] not in P.PUPS:
            continue
        k = P.ckey(l['who'], l['text'])
        src = os.path.join(SRC, k + '.mp3')
        built = os.path.join(BUILT, k + '.mp3')
        if not os.path.exists(src) and not os.path.exists(built):
            print('no recording:', l['text']); continue
        mood, energy = MOOD.get(l['text'], ('', 1.0))
        if os.path.exists(built):  # rebuilt (or built from the pup's own words): its delivery is already in it
            b = P.decode(built)
            P.encode(b, os.path.join(DST, k + '.mp3')); out[k] = [round(len(b) / P.SR, 2)]; done += 1
            print('%-10s %-8s %5.2fs (rebuilt, room %.2fs)  %s' % (l['who'], 'built', len(b) / P.SR, l['room'], l['text']), flush=True)
            continue
        a = P.decode(src)
        if l['text'] in KEEP:
            b = a / max(1e-9, np.abs(a).max()) * np.abs(a).max() * 10 ** ((KEEP[l['text']] - 2.0) / 20)
            P.encode(b, os.path.join(DST, k + '.mp3')); out[k] = [round(len(b) / P.SR, 2)]; done += 1
            print('%-10s %-8s %5.2fs (kept as recorded)  %s' % (l['who'], 'kept', len(b) / P.SR, l['text']), flush=True)
            continue
        if l['text'] not in RESHAPE:   # as recorded (owner, Nov 17: the reshaped voices sounded robotic)
            b = a / max(1e-9, np.abs(a).max()) * 0.89
            P.encode(b, os.path.join(DST, k + '.mp3')); out[k] = [round(len(b) / P.SR, 2)]; done += 1
            print('%-10s %-8s %5.2fs (as recorded)  %s' % (l['who'], 'natural', len(b) / P.SR, l['text']), flush=True)
            continue
        on = onsets_for(a, l['text'])
        room = l['room']
        base = P.FEEL[mood]
        for tries in range(4):
            b, _ = P.say(a, {'who': l['who'], 'text': l['text'], 'mood': mood, 'energy': energy}, on, len(a) / P.SR)
            if len(b) / P.SR <= room or base[2] <= 1.0:
                break
            f = list(P.FEEL[mood]); f[2] = max(1.0, f[2] - 0.12); P.FEEL[mood] = tuple(f)  # slower would run over: a little less slow
        P.FEEL[mood] = base
        g = 10 ** ((LOUD.get(mood, 0.0) - 2.0) / 20)
        b = b / max(1e-9, np.abs(b).max()) * np.abs(a).max() * g
        pk = np.abs(b).max()
        if pk > 0.97:
            b = np.tanh(b / pk * 1.4) / np.tanh(1.4) * 0.97  # a soft ceiling instead of clipping
        P.encode(b, os.path.join(DST, k + '.mp3'))
        out[k] = [round(len(b) / P.SR, 2)]
        done += 1
        print('%-10s %-8s %5.2fs (was %.2fs, room %.2fs)  %s' % (l['who'], mood, len(b) / P.SR, len(a) / P.SR, l['room'], l['text']), flush=True)
    json.dump(out, open(os.path.join(DST, 'index.json'), 'w'), separators=(',', ':'))
    print('done', done)


if __name__ == '__main__':
    main()
