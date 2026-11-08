"""Synthesise the Toogo soundtracks in plain Python (no samples, no licences): every cue sits on a moment of the
animation, so the sound stays in sync with the frames that render.sh draws.

    python3 sound.py promo  out.wav    # 25 s, for toogo-promo-*.mp4
    python3 sound.py logo   out.wav    # 5 s, for toogo-logo-*.mp4

The signature is the "step up": a small dip, a rising sweep and a two-note chime (E5 then B5) when the ring lands.
Everything is in C major; the bed is a soft 120 BPM beat with a C-G-Am-F pad.
"""
import math, random, struct, sys, wave

SR = 44100
random.seed(7)


class Mix:
    def __init__(self, seconds):
        self.n = int(seconds * SR)
        self.L = [0.0] * self.n
        self.R = [0.0] * self.n

    def add(self, t0, samples, gain=1.0, pan=0.0):
        """pan -1 left .. +1 right (equal power)."""
        a = (pan + 1) * math.pi / 4
        gl, gr = math.cos(a) * gain, math.sin(a) * gain
        i0 = int(t0 * SR)
        for k, s in enumerate(samples):
            i = i0 + k
            if 0 <= i < self.n:
                self.L[i] += s * gl
                self.R[i] += s * gr

    def write(self, path):
        peak = max(max(abs(x) for x in self.L), max(abs(x) for x in self.R), 1e-9)
        g = 0.89 / peak
        with wave.open(path, "wb") as w:
            w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
            w.writeframes(b"".join(struct.pack("<hh", int(l * g * 32767), int(r * g * 32767))
                                   for l, r in zip(self.L, self.R)))


def note(name):
    """'E5' -> Hz."""
    names = {"C": 0, "D": 2, "E": 4, "F": 5, "G": 7, "A": 9, "B": 11}
    return 440 * 2 ** ((names[name[0]] + 12 * (int(name[1]) + 1) - 69) / 12)


def env(k, attack, tau):
    t = k / SR
    return (t / attack if t < attack else 1.0) * math.exp(-max(0, t - attack) / tau)


# ---------------- instruments ----------------
def pop(f, dur=0.12):
    out, ph = [], 0.0
    for k in range(int(dur * SR)):
        t = k / SR
        ph += 2 * math.pi * f * (1 - 0.45 * min(1, t / 0.07)) / SR
        out.append(math.sin(ph) * env(k, 0.002, 0.03))
    return out


def bell(f, dur=1.6, tau=0.55):
    parts = [(1, 1.0), (2.0, 0.35), (2.76, 0.18), (5.4, 0.06)]
    return [sum(a * math.sin(2 * math.pi * f * m * k / SR) * math.exp(-k / SR / (tau / m ** 0.5)) for m, a in parts)
            * min(1, k / (0.003 * SR)) for k in range(int(dur * SR))]


def pluck(f, dur=0.5, tau=0.14):
    return [(math.sin(2 * math.pi * f * k / SR) + 0.3 * math.sin(4 * math.pi * f * k / SR)) * env(k, 0.003, tau)
            for k in range(int(dur * SR))]


def sweep(f0, f1, dur, tau=0.25):
    out, ph = [], 0.0
    for k in range(int(dur * SR)):
        x = k / (dur * SR)
        f = f0 * (f1 / f0) ** (x ** 0.6)
        ph += 2 * math.pi * f / SR
        out.append(math.sin(ph) * math.sin(math.pi * min(1, x * 1.15)) ** 0.5 * math.exp(-x * dur / tau * 0.4))
    return out


def noise_swell(dur, lo=300, hi=4000, rising=True):
    """filtered white noise whose cutoff sweeps: a whoosh."""
    out, y = [], 0.0
    for k in range(int(dur * SR)):
        x = k / (dur * SR)
        c = lo * (hi / lo) ** (x if rising else 1 - x)
        a = 1 - math.exp(-2 * math.pi * c / SR)
        y += a * (random.uniform(-1, 1) - y)
        out.append(y * math.sin(math.pi * x) ** 2)
    return out


def tick(f=2600, dur=0.03):
    return [math.sin(2 * math.pi * f * k / SR) * env(k, 0.001, 0.006) for k in range(int(dur * SR))]


def kick():
    out, ph = [], 0.0
    for k in range(int(0.3 * SR)):
        t = k / SR
        ph += 2 * math.pi * (45 + 75 * math.exp(-t / 0.03)) / SR
        out.append(math.sin(ph) * env(k, 0.002, 0.09))
    return out


def hat():
    out, y = [], 0.0
    for k in range(int(0.06 * SR)):
        n = random.uniform(-1, 1)
        y += 0.5 * (n - y)
        out.append((n - y) * env(k, 0.001, 0.012))   # noise minus its low end
    return out


def pad(freqs, dur, attack=0.5, release=0.8):
    n = int(dur * SR)
    out = [0.0] * n
    for f in freqs:
        for det in (-0.12, 0.12):                     # two slightly detuned voices per note: warmth
            w = 2 * math.pi * f * 2 ** (det / 12) / SR
            for k in range(n):
                out[k] += math.sin(w * k) + 0.15 * math.sin(2 * w * k)
    for k in range(n):
        t = k / SR
        out[k] *= min(1, t / attack) * min(1, (dur - t) / release) / (len(freqs) * 2)
    return out


def step_up(m, t_dip, t_jump, t_land, gain=1.0, pan=0.15):
    """the signature: dip, rising sweep, two-note chime."""
    m.add(t_dip, pluck(note("C4"), 0.25, 0.05), 0.35 * gain, pan)
    m.add(t_jump, sweep(330, 990, t_land - t_jump + 0.05), 0.22 * gain, pan)
    m.add(t_land, bell(note("E5")), 0.32 * gain, pan)
    m.add(t_land + 0.11, bell(note("B5")), 0.26 * gain, pan + 0.1)


def beat(m, start, end, gain=1.0):
    t = start
    while t < end - 0.05:
        m.add(t, kick(), 0.30 * gain)
        m.add(t + 0.25, hat(), 0.12 * gain, 0.3)
        t += 0.5


CHORDS = [["C4", "E4", "G4"], ["B3", "D4", "G4"], ["A3", "C4", "E4"], ["A3", "C4", "F4"]]


def chords(m, start, end, gain=1.0):
    t, i = start, 0
    while t < end - 0.1:
        d = min(2.0, end - t)
        m.add(t, pad([note(x) for x in CHORDS[i % 4]], d + 0.4, 0.3, 0.6), 0.12 * gain)
        t += 2.0; i += 1


# ---------------- the two scores ----------------
def promo():
    m = Mix(25.0)
    # 0-3.2: the group-chat mess. A low, uneasy pad and a pop per message bubble.
    m.add(0.0, pad([note("A2"), note("E3")], 3.4, 1.0, 0.5), 0.07)
    for i, f in enumerate([880, 1046, 784, 988, 932, 1175]):
        m.add(0.45 + i * 0.32, pop(f), 0.42, (-0.4, 0.4)[i % 2])
    m.add(2.8, noise_swell(0.75, 400, 6000, rising=False), 0.35)           # swallowed into the rings
    # 3.3: the rings draw, one steps up, the beat starts
    m.add(3.3, sweep(520, 660, 0.55, 0.4), 0.10, -0.2)
    m.add(3.5, sweep(620, 780, 0.55, 0.4), 0.10, 0.2)
    step_up(m, 4.08, 4.25, 4.45)
    beat(m, 4.45, 20.35)
    chords(m, 4.45, 20.35)
    # 5.3: the phone rises in
    m.add(5.2, noise_swell(0.7, 200, 2500), 0.22)
    for i, at in enumerate([6.7, 7.3, 7.9]):                              # plan items ticked off
        m.add(at, pluck(note(["E5", "G5", "C6"][i]), 0.4), 0.22, 0.2)
    for at in (9.8, 13.8, 17.3):                                          # swipe between screens
        m.add(at - 0.05, noise_swell(0.5, 800, 5000), 0.12, 0.3)
    for i, at in enumerate([11.0, 11.6, 12.2]):                           # hearts
        m.add(at, pluck(note(["G5", "A5", "C6"][i]), 0.4, 0.1), 0.22, -0.2)
    m.add(12.7, bell(note("E6"), 0.9, 0.3), 0.14, 0.3)                    # "been there"
    for i in range(4):                                                    # booking cards drop in
        m.add(14.3 + i * 0.25 + 0.15, pluck(note(["C4", "E4", "G4", "C5"][i]), 0.3, 0.06), 0.3)
    m.add(18.2, bell(note("G5"), 0.8, 0.3), 0.2, 0.25)                    # notification
    m.add(18.32, bell(note("C6"), 0.9, 0.35), 0.18, 0.25)
    m.add(18.6, pluck(note("E5"), 0.4), 0.18)                             # new row
    m.add(20.3, noise_swell(0.7, 3000, 300, rising=True), 0.2)            # the phone drops away
    # 20.9: the logo, alone, then the closing chord
    m.add(20.9, sweep(520, 660, 0.6, 0.4), 0.10, -0.2)
    m.add(21.1, sweep(620, 780, 0.6, 0.4), 0.10, 0.2)
    step_up(m, 21.75, 21.95, 22.15, 1.1)
    m.add(22.15, pad([note("C3"), note("G3"), note("C4"), note("E4"), note("G4")], 2.85, 0.6, 1.6), 0.24)
    for i in range(5):                                                    # the name rises in
        m.add(22.75 + i * 0.08 + 0.1, tick(2200 + i * 180), 0.08)
    m.add(23.55, bell(note("B5"), 1.3, 0.5), 0.14, 0.2)                   # the echo step
    return m


def logo():
    m = Mix(5.0)
    m.add(0.25, sweep(520, 660, 0.7, 0.4), 0.10, -0.2)
    m.add(0.5, sweep(620, 780, 0.7, 0.4), 0.10, 0.2)
    step_up(m, 1.3, 1.48, 1.7)
    m.add(1.7, pad([note("C3"), note("G3"), note("C4"), note("E4"), note("G4")], 3.3, 0.6, 1.8), 0.24)
    for i in range(5):
        m.add(2.35 + i * 0.08 + 0.1, tick(2200 + i * 180), 0.08)
    m.add(3.15, bell(note("B5"), 1.3, 0.5), 0.14, 0.2)
    return m


if __name__ == "__main__":
    which, out = sys.argv[1], sys.argv[2]
    {"promo": promo, "logo": logo}[which]().write(out)
    print("wrote", out)
