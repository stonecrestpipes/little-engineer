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
  private waterGain!: GainNode;
  private nextChuff = 0;
  private nextBird = 0;
  private speed = 0;
  private birds = 0;
  private volume = 0.85;

  constructor(private spec: AudioSpec) {}

  /** The grown-ups' volume, 0 … 1. Remembered until the context exists. */
  setVolume(v: number): void {
    this.volume = Math.max(0, Math.min(1, v));
    if (this.ctx) this.master.gain.setTargetAtTime(this.volume, this.ctx.currentTime, 0.05);
  }

  /** Another engine, another whistle. */
  retune(spec: AudioSpec): void {
    this.spec = spec;
  }

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
    this.master.gain.value = this.volume;
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

    // Moving water, for the river and the harbour. One noise source, opened
    // and closed by how near he is to any of it.
    const wash = ctx.createBufferSource();
    wash.buffer = this.noise;
    wash.loop = true;
    const wlp = ctx.createBiquadFilter();
    wlp.type = 'lowpass';
    wlp.frequency.value = 620;
    wlp.Q.value = 0.4;
    const swell = ctx.createOscillator();
    swell.type = 'sine';
    swell.frequency.value = 0.13;
    const swellDepth = ctx.createGain();
    swellDepth.gain.value = 180;
    swell.connect(swellDepth).connect(wlp.frequency);
    swell.start();
    this.waterGain = ctx.createGain();
    this.waterGain.gain.value = 0;
    wash.connect(wlp).connect(this.waterGain).connect(this.master);
    wash.start();

    this.nextChuff = ctx.currentTime;
    this.nextBird = ctx.currentTime + 2;
  }

  private noiseSource(): AudioBufferSourceNode {
    const s = this.ctx!.createBufferSource();
    s.buffer = this.noise;
    s.loop = true;
    s.playbackRate.value = 0.8 + Math.random() * 0.4;
    return s;
  }

  whistle(): void {
    if (!this.ctx) return;
    this.whistleAt(this.ctx.currentTime, 1, 3200);
  }

  /**
   * The tunnel. Two returns, each quieter and darker than the last, which is
   * what an echo is: the bright part of the sound comes back least.
   */
  echo(): void {
    const ctx = this.ctx;
    if (!ctx) return;
    this.whistleAt(ctx.currentTime + 0.36, 0.36, 1400);
    this.whistleAt(ctx.currentTime + 0.74, 0.15, 780);
  }

  /**
   * The windmill's sails catching the wind: a few soft swooshes, quickening,
   * one per sail going past, made from the same breathy noise as the steam.
   */
  whoosh(): void {
    const ctx = this.ctx;
    if (!ctx) return;
    const t0 = ctx.currentTime;
    let at = t0;
    for (let i = 0; i < 6; i++) {
      const s = ctx.createBufferSource();
      s.buffer = this.noise;
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.Q.value = 1.4;
      bp.frequency.setValueAtTime(420, at);
      bp.frequency.linearRampToValueAtTime(900, at + 0.3);
      const g = ctx.createGain();
      const level = 0.16 * (1 - i * 0.1);
      g.gain.setValueAtTime(0.0001, at);
      g.gain.exponentialRampToValueAtTime(level, at + 0.14);
      g.gain.exponentialRampToValueAtTime(0.0001, at + 0.42);
      s.connect(bp).connect(g).connect(this.master);
      s.start(at, Math.random() * 0.5);
      s.stop(at + 0.45);
      at += 0.42 - i * 0.04;
    }
  }

  private whistleAt(t: number, level: number, cutoff: number): void {
    const ctx = this.ctx;
    if (!ctx) return;
    const f = this.spec.whistleHz;

    const out = ctx.createGain();
    out.gain.setValueAtTime(0.0001, t);
    out.gain.exponentialRampToValueAtTime(0.5 * level, t + 0.05);
    out.gain.setValueAtTime(0.5 * level, t + 0.5);
    out.gain.exponentialRampToValueAtTime(0.0001, t + 0.92);

    const shape = ctx.createBiquadFilter();
    shape.type = 'lowpass';
    shape.frequency.value = cutoff;
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
    ag.gain.exponentialRampToValueAtTime(0.22 * level, t + 0.04);
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

  /**
   * A boat answering. Deliberately lower and slower than the engine's whistle,
   * so the two read as two different things talking to each other.
   */
  horn(delay = 0): void {
    const ctx = this.ctx;
    if (!ctx) return;
    const t = ctx.currentTime + delay;

    const out = ctx.createGain();
    out.gain.setValueAtTime(0.0001, t);
    out.gain.exponentialRampToValueAtTime(0.4, t + 0.22);
    out.gain.setValueAtTime(0.4, t + 1.25);
    out.gain.exponentialRampToValueAtTime(0.0001, t + 1.9);
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 900;
    out.connect(lp).connect(this.master);

    for (const [hz, level, type] of [
      [104, 0.5, 'sawtooth'],
      [104 * 1.008, 0.42, 'sawtooth'],
      [156, 0.22, 'triangle'],
      [208, 0.1, 'sine'],
    ] as [number, number, OscillatorType][]) {
      const o = ctx.createOscillator();
      o.type = type;
      o.frequency.setValueAtTime(hz * 0.97, t);
      o.frequency.linearRampToValueAtTime(hz, t + 0.3);
      o.frequency.linearRampToValueAtTime(hz * 0.98, t + 1.9);
      const g = ctx.createGain();
      g.gain.value = level;
      o.connect(g).connect(out);
      o.start(t);
      o.stop(t + 2.0);
    }

    const air = this.noiseSource();
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 220;
    bp.Q.value = 0.9;
    const ag = ctx.createGain();
    ag.gain.setValueAtTime(0.0001, t);
    ag.gain.exponentialRampToValueAtTime(0.14, t + 0.18);
    ag.gain.exponentialRampToValueAtTime(0.0001, t + 1.8);
    air.connect(bp).connect(ag).connect(out);
    air.start(t);
    air.stop(t + 2.0);
  }

  /** A sheep. Wobbly on purpose — the wobble is the whole joke. */
  bleat(): void {
    const ctx = this.ctx;
    if (!ctx) return;
    const t = ctx.currentTime + Math.random() * 0.12;
    const base = 330 + Math.random() * 90;

    const o = ctx.createOscillator();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(base * 1.1, t);
    o.frequency.linearRampToValueAtTime(base, t + 0.1);
    o.frequency.linearRampToValueAtTime(base * 0.82, t + 0.62);

    // The bleat itself: a fast tremor on the pitch.
    const wobble = ctx.createOscillator();
    wobble.type = 'sine';
    wobble.frequency.value = 22;
    const depth = ctx.createGain();
    depth.gain.setValueAtTime(2, t);
    depth.gain.linearRampToValueAtTime(26, t + 0.2);
    wobble.connect(depth).connect(o.frequency);

    const formant = ctx.createBiquadFilter();
    formant.type = 'bandpass';
    formant.frequency.value = base * 2.6;
    formant.Q.value = 2.4;

    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.2, t + 0.05);
    g.gain.setValueAtTime(0.2, t + 0.4);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.66);

    o.connect(formant).connect(g).connect(this.master);
    o.start(t);
    wobble.start(t);
    o.stop(t + 0.7);
    wobble.stop(t + 0.7);
  }

  /** The crossing bell: a struck ding, repeated while the gates are down. */
  bell(times = 8, gap = 0.52): void {
    const ctx = this.ctx;
    if (!ctx) return;
    for (let i = 0; i < times; i++) {
      const at = ctx.currentTime + i * gap;
      for (const [hz, level] of [[784, 0.13], [1176, 0.06], [2093, 0.025]] as [number, number][]) {
        const o = ctx.createOscillator();
        o.type = 'sine';
        o.frequency.value = hz;
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.0001, at);
        g.gain.exponentialRampToValueAtTime(level, at + 0.006);
        g.gain.exponentialRampToValueAtTime(0.0001, at + 0.42);
        o.connect(g).connect(this.master);
        o.start(at);
        o.stop(at + 0.45);
      }
    }
  }

  /**
   * A flock going up out of a field: a flurry of wingbeats and a scatter of
   * chirps over a second or so, louder than the birds in the background.
   */
  flock(): void {
    const ctx = this.ctx;
    if (!ctx) return;
    const t0 = ctx.currentTime;
    for (let i = 0; i < 9; i++) {
      const at = t0 + i * 0.045 + Math.random() * 0.03;
      const s = ctx.createBufferSource();
      s.buffer = this.noise;
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = 900 + Math.random() * 500;
      bp.Q.value = 0.9;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, at);
      g.gain.exponentialRampToValueAtTime(0.09 * (1 - i / 12), at + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, at + 0.06);
      s.connect(bp).connect(g).connect(this.master);
      s.start(at, Math.random() * 0.8);
      s.stop(at + 0.07);
    }
    for (let i = 0; i < 6; i++) this.chirp(t0 + 0.2 + Math.random() * 1.1);
  }

  /** A single bird, somewhere off to the side. */
  private chirp(at: number): void {
    const ctx = this.ctx!;
    const base = 2300 + Math.random() * 1500;
    const notes = 2 + Math.floor(Math.random() * 3);
    for (let i = 0; i < notes; i++) {
      const t = at + i * (0.07 + Math.random() * 0.05);
      const o = ctx.createOscillator();
      o.type = 'sine';
      o.frequency.setValueAtTime(base * (0.9 + Math.random() * 0.3), t);
      o.frequency.exponentialRampToValueAtTime(base * (1.1 + Math.random() * 0.4), t + 0.03);
      o.frequency.exponentialRampToValueAtTime(base * 0.85, t + 0.07);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.035, t + 0.008);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.08);
      o.connect(g).connect(this.master);
      o.start(t);
      o.stop(t + 0.1);
    }
  }

  /**
   * How much of the countryside he can hear from where he is: water near the
   * river and the harbour, birds over the fields. Both slide rather than cut,
   * so crossing the bridge sounds like arriving somewhere.
   */
  setAmbience(mix: { water: number; birds: number }): void {
    const ctx = this.ctx;
    if (!ctx) return;
    this.waterGain.gain.setTargetAtTime(mix.water * 0.075, ctx.currentTime, 0.9);
    this.birds = mix.birds;
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

    // Birds, scattered rather than looped, so they never fall into a pattern.
    if (this.birds > 0.05 && ctx.currentTime > this.nextBird) {
      this.chirp(ctx.currentTime + Math.random() * 0.3);
      this.nextBird = ctx.currentTime + (1.4 + Math.random() * 4.5) / this.birds;
    } else if (this.birds <= 0.05) {
      this.nextBird = Math.max(this.nextBird, ctx.currentTime + 1);
    }

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
