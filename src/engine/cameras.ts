import * as THREE from 'three';
import type { Track } from './track';

export type ViewName = 'wide' | 'follow' | 'trackside';
export const VIEW_ORDER: ViewName[] = ['wide', 'follow', 'trackside'];

export interface RigOptions {
  /** where the whole-layout shot sits, and what it looks at */
  wide: { position: THREE.Vector3; target: THREE.Vector3 };
  /** low shots beside the rails; the train enters, passes and leaves frame */
  tracksideAnchors: THREE.Vector3[];
}

/**
 * Three fixed views on one button. No free camera, no pinch, no drag:
 * a four-year-old cannot get the view stuck underground or pointing at sky.
 *
 * Switching views glides rather than cuts. Moving between trackside anchors
 * does cut, because that reads as a new shot rather than a lurch.
 */
export class CameraRig {
  view: ViewName = 'wide';

  private readonly pos = new THREE.Vector3();
  private readonly aim = new THREE.Vector3();
  private readonly wantPos = new THREE.Vector3();
  private readonly wantAim = new THREE.Vector3();
  private anchor = 0;
  private settled = false;

  constructor(
    private readonly camera: THREE.PerspectiveCamera,
    private readonly track: Track,
    private readonly opts: RigOptions,
  ) {
    this.pos.copy(opts.wide.position);
    this.aim.copy(opts.wide.target);
  }

  cycle(): ViewName {
    const i = VIEW_ORDER.indexOf(this.view);
    this.view = VIEW_ORDER[(i + 1) % VIEW_ORDER.length];
    if (this.view === 'trackside') this.settled = false;
    return this.view;
  }

  /** Pick the trackside shot the train is heading toward. */
  private chooseAnchor(trainDistance: number): void {
    const here = this.track.positionAt(trainDistance);
    let best = 0;
    let bestScore = Infinity;
    this.opts.tracksideAnchors.forEach((a, i) => {
      // Prefer anchors a little way ahead: close enough to matter, far
      // enough that we watch it approach rather than flash past.
      const d = a.distanceTo(here);
      const score = Math.abs(d - 26);
      if (score < bestScore) {
        bestScore = score;
        best = i;
      }
    });
    this.anchor = best;
    this.settled = true;
  }

  update(dt: number, trainDistance: number, trainPos: THREE.Vector3, trainFwd: THREE.Vector3): void {
    switch (this.view) {
      case 'wide':
        this.wantPos.copy(this.opts.wide.position);
        this.wantAim.copy(this.opts.wide.target);
        break;

      case 'follow':
        this.wantPos
          .copy(trainPos)
          .addScaledVector(trainFwd, -14.5)
          .add(new THREE.Vector3(0, 6.4, 0));
        this.wantAim.copy(trainPos).addScaledVector(trainFwd, 12).add(new THREE.Vector3(0, 1.4, 0));
        break;

      case 'trackside': {
        const anchor = this.opts.tracksideAnchors[this.anchor];
        const gone = anchor ? anchor.distanceTo(trainPos) : Infinity;
        // Once it has gone well past, cut to the shot it is heading for next.
        if (!this.settled || gone > 46) {
          this.chooseAnchor(trainDistance);
          const picked = this.opts.tracksideAnchors[this.anchor];
          this.pos.copy(picked);
          this.aim.copy(trainPos);
        }
        this.wantPos.copy(this.opts.tracksideAnchors[this.anchor]);
        this.wantAim.copy(trainPos).add(new THREE.Vector3(0, 1.2, 0));
        break;
      }
    }

    // Exponential smoothing: frame-rate independent, and it glides.
    const k = this.view === 'trackside' ? 6 : 2.6;
    const t = 1 - Math.exp(-k * dt);
    this.pos.lerp(this.wantPos, t);
    this.aim.lerp(this.wantAim, t);

    this.camera.position.copy(this.pos);
    this.camera.lookAt(this.aim);
  }
}
