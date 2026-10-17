/**
 * A little night music, made in the browser so there's nothing to download or license:
 * a slightly warped music box over a low drone, in A minor, looping until dawn.
 */

const BPM = 64;
const BEAT = 60 / BPM;
// Two bars per chord: Am, Dm, E, Am, F, Dm, E, Am. Roots as MIDI numbers, with the chord's notes.
const CHORDS: { root: number; notes: number[] }[] = [
  { root: 45, notes: [69, 72, 76] },
  { root: 50, notes: [69, 74, 77] },
  { root: 40, notes: [68, 71, 76] },
  { root: 45, notes: [69, 72, 76] },
  { root: 41, notes: [69, 72, 77] },
  { root: 50, notes: [65, 69, 74] },
  { root: 40, notes: [68, 71, 74] },
  { root: 45, notes: [64, 69, 72] },
];
// Which chord tone each eighth note plays across two bars (-1 is a rest). A lilting, uneven figure.
const FIGURE = [0, 2, 1, 2, 0, -1, 2, 1, 1, 2, 0, -1, 2, -1, 1, -1];

const hz = (midi: number) => 440 * 2 ** ((midi - 69) / 12);

class NightMusic {
  private ctx: AudioContext | null = null;
  private out: GainNode | null = null;
  private wet: ConvolverNode | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;
  private next = 0;
  private step = 0;
  private level = 0.6;
  private ducked = false;

  get playing() {
    return this.timer !== null;
  }

  start() {
    if (this.timer) return;
    const ctx = (this.ctx ??= new AudioContext());
    void ctx.resume();
    if (!this.out) {
      this.out = ctx.createGain();
      this.out.connect(ctx.destination);
      this.wet = ctx.createConvolver();
      this.wet.buffer = this.impulse(3.2);
      const wetGain = ctx.createGain();
      wetGain.gain.value = 0.55;
      this.wet.connect(wetGain).connect(this.out);
    }
    this.applyLevel(0.8);
    this.next = ctx.currentTime + 0.15;
    this.step = 0;
    this.timer = setInterval(() => this.schedule(), 60);
  }

  stop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    if (this.ctx && this.out) this.out.gain.setTargetAtTime(0, this.ctx.currentTime, 0.4);
  }

  setLevel(v: number) {
    this.level = Math.max(0, Math.min(1, v));
    this.applyLevel(0.2);
  }

  /** Quieten right down while the player is being woken. */
  duck(on: boolean) {
    this.ducked = on;
    this.applyLevel(0.6);
  }

  private applyLevel(over: number) {
    if (!this.ctx || !this.out) return;
    const target = this.level * (this.ducked ? 0.12 : 1) * 0.5;
    this.out.gain.setTargetAtTime(target, this.ctx.currentTime, over / 3);
  }

  private impulse(seconds: number) {
    const ctx = this.ctx!;
    const len = Math.floor(ctx.sampleRate * seconds);
    const buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const data = buf.getChannelData(ch);
      for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len) ** 2.6;
    }
    return buf;
  }

  private schedule() {
    const ctx = this.ctx!;
    while (this.next < ctx.currentTime + 0.3) {
      const eighth = this.step % FIGURE.length;
      const chord = CHORDS[Math.floor(this.step / FIGURE.length) % CHORDS.length];
      if (eighth === 0) {
        this.drone(chord.root, this.next, BEAT * 8);
        if (Math.floor(this.step / FIGURE.length) % CHORDS.length === 0) this.toll(this.next);
      }
      const pick = FIGURE[eighth];
      if (pick >= 0 && Math.random() > 0.08) {
        // Now and then the box reaches up an octave, and every note is a touch out of tune.
        const octave = Math.random() < 0.12 ? 12 : 0;
        const swing = eighth % 2 ? BEAT * 0.06 : 0;
        this.chime(chord.notes[pick] + octave, this.next + swing, 0.5 + Math.random() * 0.4);
      }
      this.next += BEAT / 2;
      this.step += 1;
    }
  }

  private send(node: AudioNode) {
    node.connect(this.out!);
    node.connect(this.wet!);
  }

  private chime(midi: number, at: number, velocity: number) {
    const ctx = this.ctx!;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, at);
    g.gain.exponentialRampToValueAtTime(0.16 * velocity, at + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, at + 2.2);
    this.send(g);
    const warp = 1 + (Math.random() - 0.5) * 0.012;
    [
      [1, 1],
      [2.01, 0.28],
      [3.98, 0.08],
    ].forEach(([ratio, amp]) => {
      const o = ctx.createOscillator();
      const og = ctx.createGain();
      o.type = 'sine';
      o.frequency.value = hz(midi) * ratio * warp;
      og.gain.value = amp;
      o.connect(og).connect(g);
      o.start(at);
      o.stop(at + 2.3);
    });
  }

  private drone(root: number, at: number, length: number) {
    const ctx = this.ctx!;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 520;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, at);
    g.gain.linearRampToValueAtTime(0.045, at + 1.6);
    g.gain.setValueAtTime(0.045, at + length - 1.2);
    g.gain.linearRampToValueAtTime(0.0001, at + length + 0.4);
    filter.connect(g);
    this.send(g);
    for (const [midi, detune] of [
      [root - 12, -7],
      [root - 12, 6],
      [root - 5, 3],
    ]) {
      const o = ctx.createOscillator();
      o.type = 'sawtooth';
      o.frequency.value = hz(midi);
      o.detune.value = detune;
      o.connect(filter);
      o.start(at);
      o.stop(at + length + 0.5);
    }
  }

  /** A distant bell at the top of each round. */
  private toll(at: number) {
    const ctx = this.ctx!;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, at);
    g.gain.exponentialRampToValueAtTime(0.05, at + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, at + 6);
    this.send(g);
    for (const [ratio, amp] of [
      [0.5, 0.6],
      [1, 1],
      [1.19, 0.5],
      [2, 0.35],
    ]) {
      const o = ctx.createOscillator();
      const og = ctx.createGain();
      o.frequency.value = 110 * ratio;
      og.gain.value = amp;
      o.connect(og).connect(g);
      o.start(at);
      o.stop(at + 6.1);
    }
  }
}

export const nightMusic = new NightMusic();
