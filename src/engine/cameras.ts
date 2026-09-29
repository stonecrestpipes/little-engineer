import * as THREE from 'three';
import type { Track } from './track';

export type ViewName = 'wide' | 'follow' | 'trackside';
export const VIEW_ORDER: ViewName[] = ['wide', 'follow', 'trackside'];

export interface RigOptions {
  /** where the whole-layout shot sits, and what it looks at */
  wide: { position: THREE.Vector3; target: THREE.Vector3 };
  /** low shots beside the rails; the train enters, passes and leaves frame */
  tracksideAnchors: THREE.Vector3[];
  /** looking into the yard at The Sheds, where he picks his train */
  yard: { position: THREE.Vector3; target: THREE.Vector3 };
}

/** How far a drag can swing the view round, and how far it can tilt. */
const MAX_SWING = 1.15;
const MIN_HEIGHT = 0.1;
const MAX_HEIGHT = 0.86;
/** Radians per pixel dragged. */
const SWING_RATE = 0.005;
const TILT_RATE = 0.0035;

const UP = new THREE.Vector3(0, 1, 0);

/**
 * Three fixed views on one button, and a drag that swings whichever one he is
 * in. The drag cannot get the view stuck underground or pointing at the sky —
 * it only ever orbits what the shot was already looking at, within limits —
 * and it eases back to the proper shot as soon as the train is moving again.
 *
 * Standing still at The Sheds the rig turns to face the yard by itself, which
 * is the only way the spare engines and cars are ever big enough to pick out
 * from under the driving buttons. Pressing the camera button gives him his
 * view back.
 *
 * Switching views glides rather than cuts. Moving between trackside anchors
 * does cut, because that reads as a new shot rather than a lurch.
 */
export class CameraRig {
  view: ViewName = 'wide';
  /** True while his finger is down, so the view is not pulled back under it. */
  dragging = false;

  private readonly pos = new THREE.Vector3();
  private readonly aim = new THREE.Vector3();
  private readonly wantPos = new THREE.Vector3();
  private readonly wantAim = new THREE.Vector3();
  private readonly off = new THREE.Vector3();
  private readonly axis = new THREE.Vector3();
  private anchor = 0;
  private settled = false;
  /** How far round and how far up the drag has taken it, in radians. */
  private swing = 0;
  private tilt = 0;
  private yard = false;

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
    // Asking for a view is asking for that view, not for the yard.
    this.showYard(false);
    return this.view;
  }

  /**
   * Turn to face the yard, or give the ordinary view back. Called every frame
   * with whether he is standing still at The Sheds, so it is safe to spam.
   */
  showYard(on: boolean): void {
    if (on === this.yard) return;
    this.yard = on;
    // Coming back out, a trackside shot picks itself again from where he is.
    if (!on && this.view === 'trackside') this.settled = false;
  }

  get facingYard(): boolean {
    return this.yard;
  }

  /** He dragged across the screen: swing the view by that much. */
  nudge(dx: number, dy: number): void {
    this.swing = THREE.MathUtils.clamp(this.swing - dx * SWING_RATE, -MAX_SWING, MAX_SWING);
    this.tilt = THREE.MathUtils.clamp(this.tilt + dy * TILT_RATE, -0.5, 0.7);
  }

  /** Put the view back where the shot says it should be. */
  recentre(): void {
    this.swing = 0;
    this.tilt = 0;
  }

  update(
    dt: number,
    trainDistance: number,
    trainPos: THREE.Vector3,
    trainFwd: THREE.Vector3,
    moving = false,
  ): void {
    if (this.yard) {
      this.wantPos.copy(this.opts.yard.position);
      this.wantAim.copy(this.opts.yard.target);
    } else {
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
    }

    // Exponential smoothing: frame-rate independent, and it glides.
    const k = this.view === 'trackside' && !this.yard ? 6 : 2.6;
    const t = 1 - Math.exp(-k * dt);
    this.pos.lerp(this.wantPos, t);
    this.aim.lerp(this.wantAim, t);

    // Driving off puts the view back where it belongs, gently, so a swing he
    // has forgotten about never becomes the view he is stuck with.
    if (moving && !this.dragging) {
      const back = Math.exp(-1.1 * dt);
      this.swing *= back;
      this.tilt *= back;
    }

    this.camera.position.copy(this.swung());
    this.camera.lookAt(this.aim);
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

  /**
   * Where the camera actually goes: the shot's own position, orbited round
   * what it is looking at by however far he has dragged. Clamping the height
   * as a fraction of the distance out is what keeps it off the ground and out
   * of the sky whatever the shot was.
   */
  private swung(): THREE.Vector3 {
    if (this.swing === 0 && this.tilt === 0) return this.pos;
    this.off.subVectors(this.pos, this.aim);
    const radius = this.off.length();
    if (radius < 1e-3) return this.pos;
    this.off.applyAxisAngle(UP, this.swing);
    this.axis.crossVectors(this.off, UP).normalize();
    if (this.axis.lengthSq() > 0.5) this.off.applyAxisAngle(this.axis, this.tilt);
    this.off.y = THREE.MathUtils.clamp(this.off.y, radius * MIN_HEIGHT, radius * MAX_HEIGHT);
    return this.off.add(this.aim);
  }
}
