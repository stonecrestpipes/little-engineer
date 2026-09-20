/**
 * Every sound in the game is synthesised here. Nothing is loaded, nothing is
 * licensed, and the whistle can be retuned by changing a number.
 *
 * The whistle is the most-heard sound in the game by a wide margin, so it gets
 * the most attention: two near-unison sawtooths plus breath noise, with a small
 * pitch swell on the way in and a sag on the way out. That sag is most of what
 * makes a steam whistle sound like one.
 */
export interface AudioSpec {
  /** fundamental of the whistle, Hz */
  whistleHz: number;
  /** chuffs per wheel revolution (four for a simple two-cylinder engine) */
  chuffsPerRev: number;
  wheelRadius: number;
}

export class Audio {
  private ctx: AudioContext | null = null;
  private master!: GainNode;
  private noise!: AudioBuffer;
  private hissGain!: GainNode;
  private nextChuff = 0;
  private speed = 0;

  constructor(private readonly spec: AudioSpec) {}

  /** Must be called from inside a real user gesture. Safe to call repeatedly. */
  start(): void {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') void this.ctx.resume();
      return;
    }
    const Ctor = window.AudioContext ?? (window as any).webkitAudioContext;
    if (!Ctor) return;
    const ctx: AudioContext = new Ctor();
    this.ctx = ctx;

    this.master = ctx.createGain();
    this.master.gain.value = 0.85;
    this.master.connect(ctx.destination);

    // One second of pink-ish noise, reused for everything breathy.
    const len = Math.floor(ctx.sampleRate);
    this.noise = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = this.noise.getChannelData(0);
    let last = 0;
    for (let i = 0; i < len; i++) {
      const white = Math.random() * 2 - 1;
      last = (last + 0.02 * white) / 1.02;
      data[i] = last * 3.2;
    }

    // Standing hiss while the engine waits.
    const hiss = ctx.createBufferSource();
    hiss.buffer = this.noise;
    hiss.loop = true;
    const hp = ctx.createBiquadFilter();
    hp.type = 'bandpass';
    hp.frequency.value = 1600;
    hp.Q.value = 0.6;
    this.hissGain = ctx.createGain();
    this.hissGain.gain.value = 0;
    hiss.connect(hp).connect(this.hissGain).connect(this.master);
    hiss.start();

    this.nextChuff = ctx.currentTime;
  }

  private noiseSource(): AudioBufferSourceNode {
    const s = this.ctx!.createBufferSource();
    s.buffer = this.noise;
    s.loop = true;
    s.playbackRate.value = 0.8 + Math.random() * 0.4;
    return s;
  }

  whistle(): void {
    const ctx = this.ctx;
    if (!ctx) return;
    const t = ctx.currentTime;
    const f = this.spec.whistleHz;

    const out = ctx.createGain();
    out.gain.setValueAtTime(0.0001, t);
    out.gain.exponentialRampToValueAtTime(0.5, t + 0.05);
    out.gain.setValueAtTime(0.5, t + 0.5);
    out.gain.exponentialRampToValueAtTime(0.0001, t + 0.92);

    const shape = ctx.createBiquadFilter();
    shape.type = 'lowpass';
    shape.frequency.value = 3200;
    out.connect(shape).connect(this.master);

    const voice = (hz: number, type: OscillatorType, level: number) => {
      const o = ctx.createOscillator();
      o.type = type;
      o.frequency.setValueAtTime(hz * 0.94, t);
      o.frequency.linearRampToValueAtTime(hz, t + 0.09);
      o.frequency.setValueAtTime(hz, t + 0.55);
      o.frequency.linearRampToValueAtTime(hz * 0.965, t + 0.92);
      const g = ctx.createGain();
      g.gain.value = level;
      o.connect(g).connect(out);
      o.start(t);
      o.stop(t + 1.0);
    };

    voice(f, 'sawtooth', 0.34);
    voice(f * 1.006, 'sawtooth', 0.3);
    voice(f * 1.5, 'triangle', 0.12);
    voice(f * 2.005, 'sine', 0.07);

    // Breath.
    const air = this.noiseSource();
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = f * 2.2;
    bp.Q.value = 1.1;
    const ag = ctx.createGain();
    ag.gain.setValueAtTime(0.0001, t);
    ag.gain.exponentialRampToValueAtTime(0.22, t + 0.04);
    ag.gain.exponentialRampToValueAtTime(0.0001, t + 0.9);
    air.connect(bp).connect(ag).connect(out);
    air.start(t);
    air.stop(t + 1.0);
  }

  private chuff(at: number, strength: number): void {
    const ctx = this.ctx!;
    const s = this.noiseSource();
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.setValueAtTime(320, at);
    bp.frequency.exponentialRampToValueAtTime(900, at + 0.11);
    bp.Q.value = 1.3;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, at);
    g.gain.exponentialRampToValueAtTime(0.26 * strength, at + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, at + 0.17);
    s.connect(bp).connect(g).connect(this.master);
    s.start(at);
    s.stop(at + 0.2);
  }

  chime(): void {
    const ctx = this.ctx;
    if (!ctx) return;
    const t = ctx.currentTime;
    [880, 1174.7, 1567.98].forEach((hz, i) => {
      const o = ctx.createOscillator();
      o.type = 'sine';
      o.frequency.value = hz;
      const g = ctx.createGain();
      const at = t + i * 0.11;
      g.gain.setValueAtTime(0.0001, at);
      g.gain.exponentialRampToValueAtTime(0.18, at + 0.015);
      g.gain.exponentialRampToValueAtTime(0.0001, at + 0.75);
      o.connect(g).connect(this.master);
      o.start(at);
      o.stop(at + 0.8);
    });
  }

  setSpeed(speed: number): void {
    this.speed = speed;
  }

  /** Schedules chuffs a little ahead of the clock so they land evenly. */
  update(): void {
    const ctx = this.ctx;
    if (!ctx) return;

    const moving = this.speed > 0.08;
    this.hissGain.gain.setTargetAtTime(moving ? 0.012 : 0.05, ctx.currentTime, 0.4);

    if (!moving) {
      this.nextChuff = Math.max(this.nextChuff, ctx.currentTime);
      return;
    }

    const perMetre = this.spec.chuffsPerRev / (2 * Math.PI * this.spec.wheelRadius);
    const rate = Math.max(0.5, this.speed * perMetre);
    const gap = 1 / rate;
    const horizon = ctx.currentTime + 0.15;
    let guard = 0;
    while (this.nextChuff < horizon && guard++ < 16) {
      if (this.nextChuff >= ctx.currentTime) {
        // Alternate strength slightly: real engines are never quite even.
        this.chuff(this.nextChuff, guard % 2 === 0 ? 0.85 : 1);
      }
      this.nextChuff += gap;
    }
    if (this.nextChuff < ctx.currentTime) this.nextChuff = ctx.currentTime;
  }
}
