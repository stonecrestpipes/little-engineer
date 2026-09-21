import * as THREE from 'three';

/**
 * The sky, and the light it throws, slowly going round from day to a golden
 * evening to dusk and back through a golden morning.
 *
 * Never night. The darkest it gets is a warm blue dusk with everything still
 * plainly visible, because a game he cannot see is a game that has stopped.
 * A whole round takes eight minutes, most of it ordinary daylight, and the
 * app always opens in the day.
 *
 * With the setting off it simply stays day, easing back there if it was
 * somewhere else when it was switched off.
 */

interface Look {
  top: number;
  mid: number;
  low: number;
  hemiSky: number;
  hemiGround: number;
  hemi: number;
  sun: number;
  sunI: number;
  /** 0 in daylight, 1 at the deepest dusk: how much lamps should glow */
  dusk: number;
}

const DAY: Look = {
  top: 0x7fc8e6,
  mid: 0xc6e6f1,
  low: 0xdcf0f4,
  hemiSky: 0xdcf2ff,
  hemiGround: 0x6f9455,
  hemi: 1.05,
  sun: 0xfff3d8,
  sunI: 1.5,
  dusk: 0,
};
const GOLDEN: Look = {
  top: 0x86b4dc,
  mid: 0xe9d6b8,
  low: 0xf7d9ac,
  hemiSky: 0xffe8cc,
  hemiGround: 0x6f8a4a,
  hemi: 0.92,
  sun: 0xffc98a,
  sunI: 1.35,
  dusk: 0.15,
};
const DUSK: Look = {
  top: 0x4d5e98,
  mid: 0xb792a6,
  low: 0xf0ae86,
  hemiSky: 0xc4c0ea,
  hemiGround: 0x5c8250,
  hemi: 0.78,
  sun: 0xffa370,
  sunI: 0.86,
  dusk: 1,
};

/** Where in the round each look is at its fullest. The round is 0 … 1. */
const KEYS: [number, Look][] = [
  [0.0, GOLDEN],
  [0.1, DAY],
  [0.58, DAY],
  [0.7, GOLDEN],
  [0.8, DUSK],
  [0.88, DUSK],
  [0.95, GOLDEN],
  [1.0, GOLDEN],
];

const ROUND_S = 8 * 60;
/** Where the app opens: well into the day. */
const START = 0.14;

const colour = (hex: number) => new THREE.Color(hex);
const scratch = new THREE.Color();

/** A look held as colours, so it can be blended. */
class Mix {
  top = colour(DAY.top);
  mid = colour(DAY.mid);
  low = colour(DAY.low);
  hemiSky = colour(DAY.hemiSky);
  hemiGround = colour(DAY.hemiGround);
  sun = colour(DAY.sun);
  hemi = DAY.hemi;
  sunI = DAY.sunI;
  dusk = 0;

  blend(a: Look, b: Look, t: number): this {
    const c = scratch;
    this.top.set(a.top).lerp(c.set(b.top), t);
    this.mid.set(a.mid).lerp(c.set(b.mid), t);
    this.low.set(a.low).lerp(c.set(b.low), t);
    this.hemiSky.set(a.hemiSky).lerp(c.set(b.hemiSky), t);
    this.hemiGround.set(a.hemiGround).lerp(c.set(b.hemiGround), t);
    this.sun.set(a.sun).lerp(c.set(b.sun), t);
    this.hemi = a.hemi + (b.hemi - a.hemi) * t;
    this.sunI = a.sunI + (b.sunI - a.sunI) * t;
    this.dusk = a.dusk + (b.dusk - a.dusk) * t;
    return this;
  }

  /** Move a fraction of the way toward another mix. */
  approach(to: Mix, k: number): void {
    this.top.lerp(to.top, k);
    this.mid.lerp(to.mid, k);
    this.low.lerp(to.low, k);
    this.hemiSky.lerp(to.hemiSky, k);
    this.hemiGround.lerp(to.hemiGround, k);
    this.sun.lerp(to.sun, k);
    this.hemi += (to.hemi - this.hemi) * k;
    this.sunI += (to.sunI - this.sunI) * k;
    this.dusk += (to.dusk - this.dusk) * k;
  }
}

export class Sky {
  readonly dome: THREE.Mesh;
  private readonly canvas = document.createElement('canvas');
  private readonly texture: THREE.CanvasTexture;
  private readonly fog: THREE.Fog;
  private phase = START;
  private readonly now = new Mix();
  private readonly want = new Mix();
  private repaint = 0;

  constructor(
    scene: THREE.Scene,
    private readonly hemi: THREE.HemisphereLight,
    private readonly sun: THREE.DirectionalLight,
  ) {
    this.canvas.width = 4;
    this.canvas.height = 256;
    this.texture = new THREE.CanvasTexture(this.canvas);
    this.texture.colorSpace = THREE.SRGBColorSpace;
    this.dome = new THREE.Mesh(
      new THREE.SphereGeometry(520, 24, 16),
      new THREE.MeshBasicMaterial({ map: this.texture, side: THREE.BackSide, depthWrite: false, fog: false }),
    );
    this.dome.renderOrder = -1;
    scene.add(this.dome);
    this.fog = new THREE.Fog(DAY.low, 260, 640);
    scene.fog = this.fog;
    this.apply(true);
  }

  /** 0 in daylight, 1 at the deepest dusk. Lamps read this. */
  get dusk(): number {
    return this.now.dusk;
  }

  update(dt: number, cycling: boolean): void {
    if (cycling) {
      this.phase = (this.phase + dt / ROUND_S) % 1;
      this.lookAt(this.phase);
    } else {
      // Next time it is switched on, it starts from the day again.
      this.phase = START;
      this.want.blend(DAY, DAY, 0);
    }
    // Always eased, so switching the setting fades rather than cuts.
    this.now.approach(this.want, Math.min(1, dt * 0.8));
    this.apply(false);
  }

  private lookAt(phase: number): void {
    for (let i = 0; i < KEYS.length - 1; i++) {
      const [p0, a] = KEYS[i];
      const [p1, b] = KEYS[i + 1];
      if (phase >= p0 && phase <= p1) {
        const t = p1 > p0 ? (phase - p0) / (p1 - p0) : 0;
        // Smoothed, so no change of look arrives with a visible corner.
        this.want.blend(a, b, t * t * (3 - 2 * t));
        return;
      }
    }
  }

  private apply(force: boolean): void {
    const m = this.now;
    this.hemi.color.copy(m.hemiSky);
    this.hemi.groundColor.copy(m.hemiGround);
    this.hemi.intensity = m.hemi;
    this.sun.color.copy(m.sun);
    this.sun.intensity = m.sunI;
    this.fog.color.copy(m.low);

    // Repainting the dome is cheap but not free, and the sky moves slowly.
    if (!force && ++this.repaint % 12 !== 0) return;
    const g = this.canvas.getContext('2d')!;
    const grad = g.createLinearGradient(0, 0, 0, 256);
    grad.addColorStop(0, '#' + m.top.getHexString());
    grad.addColorStop(0.72, '#' + m.mid.getHexString());
    grad.addColorStop(1, '#' + m.low.getHexString());
    g.fillStyle = grad;
    g.fillRect(0, 0, 4, 256);
    this.texture.needsUpdate = true;
  }
}
