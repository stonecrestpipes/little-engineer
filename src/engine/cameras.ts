import * as THREE from 'three';
import type { Track } from './track';

export type ViewName = 'wide' | 'above' | 'follow' | 'trackside';
/**
 * The order the one button cycles, widest first, each shot closer in than the
 * one before it. `above` sits where the gap was: from `wide` the train is a
 * speck, and `follow` is close enough behind the engine that the cars it is
 * pulling are off the bottom of the screen.
 */
export const VIEW_ORDER: ViewName[] = ['wide', 'above', 'follow', 'trackside'];

/** The two shots that are of the railway rather than of the train. */
const OF_THE_RAILWAY: ViewName[] = ['wide'];

export interface RigOptions {
  /** where the whole-layout shot sits, and what it looks at */
  wide: { position: THREE.Vector3; target: THREE.Vector3 };
  /** low shots beside the rails; the train enters, passes and leaves frame */
  tracksideAnchors: THREE.Vector3[];
  /** looking into the yard at The Sheds, where he picks his train */
  yard: { position: THREE.Vector3; target: THREE.Vector3 };
  /** Ground height anywhere, so a high shot never ends up inside a hill. */
  groundAt(x: number, z: number): number;
  /**
   * The underside of any leaf cover at a point, or 0 where there is none.
   *
   * Only the woods have any. Without it, the two shots that sit above the
   * train — `above` at ten to twenty metres up and `follow` at six and a half
   * — spend the whole run through the forest inside the canopy, and the
   * tunnel of trees he took that branch for is a screen full of leaves.
   */
  canopyAt(x: number, z: number): number;
}

/** How far a drag can swing the view round, and how far it can tilt. */
const MAX_SWING = 1.15;
const MIN_HEIGHT = 0.1;
const MAX_HEIGHT = 0.86;
/** Radians per pixel dragged. */
const SWING_RATE = 0.005;
const TILT_RATE = 0.0035;

/**
 * How far a pinch can take the view in and out, as a multiple of whatever
 * reach the shot it is in has of its own.
 *
 * It is a multiple rather than a distance because the four shots are nothing
 * like each other: `wide` sits four hundred metres off the middle of the
 * railway and `follow` sits fifteen behind the cab. One pair of numbers in
 * metres would be most of the range of one shot and none of the other.
 */
const MIN_ZOOM = 0.4;
const MAX_ZOOM = 2.6;
/**
 * And never nearer the engine than this, so a pinch cannot end up inside it.
 *
 * Measured from the train rather than from whatever the shot is aimed at —
 * which is not the same point and in `follow` is twelve metres further up the
 * line, so a floor set against the aim let a pinch put the camera inside the
 * cab and call it seven metres.
 */
const NEAREST = 9;

const UP = new THREE.Vector3(0, 1, 0);

/** How far below the leaves the camera stays when it is under them. */
const CANOPY_CLEAR = 1.2;

/**
 * Four fixed views on one button, a drag that swings whichever one he is in,
 * and a pinch that takes it nearer or further off. Neither gesture can get the
 * view stuck underground or pointing at the sky — both only ever move the
 * camera around what the shot was already looking at, within limits.
 *
 * The drag eases back to the proper shot as soon as the train is moving again.
 * The pinch does not: a view he has deliberately pulled in close is one he
 * wants to keep, and a zoom that crept back out while he was driving would
 * read as the game taking it off him. The camera button is what gives it back,
 * because asking for a shot is asking for that shot.
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
  /** Where the engine is, so a pinch can be stopped before it reaches it. */
  private readonly train = new THREE.Vector3();
  private anchor = 0;
  private settled = false;
  /** How far round and how far up the drag has taken it, in radians. */
  private swing = 0;
  private tilt = 0;
  /** How far in or out the pinch has taken it, as a multiple of the shot's reach. */
  private zoom = 1;
  private yard = false;
  /** End to end of engine and cars, so `above` frames whatever he is pulling. */
  private trainLength = 6;

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
    // Asking for a view is asking for that view, not for the yard — and not
    // for the last shot's zoom either, which is the only way back out from a
    // pinch that went too far in.
    this.zoom = 1;
    this.showYard(false);
    return this.view;
  }

  /**
   * He has set off from a shot of the whole railway, where the train is a
   * speck and nothing he does to it is visible. Come down to it.
   *
   * Only from `wide`: `above` already holds the whole train, and `follow` and
   * `trackside` are at train level already. The glide is the ordinary one, so
   * this reads as the camera coming down to meet him rather than a cut.
   */
  toTrain(): void {
    if (!OF_THE_RAILWAY.includes(this.view)) return;
    this.view = 'above';
    this.recentre();
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

  /**
   * His fingers moved apart or together by this ratio: come in or go out by
   * the same. Fingers apart is nearer, which is the way round every map he
   * will ever use works.
   */
  pinch(apart: number): void {
    if (!(apart > 0)) return;
    this.zoom = THREE.MathUtils.clamp(this.zoom / apart, MIN_ZOOM, MAX_ZOOM);
  }

  /** True while the view is anywhere other than where the shot puts it. */
  get moved(): boolean {
    return this.swing !== 0 || this.tilt !== 0 || this.zoom !== 1;
  }

  /** Put the view back where the shot says it should be. */
  recentre(): void {
    this.swing = 0;
    this.tilt = 0;
    this.zoom = 1;
  }

  update(
    dt: number,
    trainDistance: number,
    trainPos: THREE.Vector3,
    trainFwd: THREE.Vector3,
    moving = false,
    trainLength = this.trainLength,
  ): void {
    this.trainLength = trainLength;
    this.train.copy(trainPos);
    if (this.yard) {
      this.wantPos.copy(this.opts.yard.position);
      this.wantAim.copy(this.opts.yard.target);
    } else {
      switch (this.view) {
        case 'wide':
          this.wantPos.copy(this.opts.wide.position);
          this.wantAim.copy(this.opts.wide.target);
          break;

        case 'above': {
          // High and behind, far enough back that the engine and everything
          // coupled to it are all in frame at once — which is the whole point
          // of this shot, so the reach is worked out from the train's length
          // rather than fixed. Aimed at the middle of the train, not the
          // front of it, so the cars are not pushed off the bottom.
          const reach = 14 + this.trainLength * 0.8;
          this.wantPos
            .copy(trainPos)
            .addScaledVector(trainFwd, -reach)
            .add(new THREE.Vector3(0, reach * 0.58, 0));
          this.wantAim
            .copy(trainPos)
            .addScaledVector(trainFwd, -this.trainLength * 0.35)
            .add(new THREE.Vector3(0, 1.2, 0));
          break;
        }

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
    this.floor(trainPos);
    this.duck();
    this.camera.lookAt(this.aim);
  }

  /**
   * Keep the camera under the leaves where there are leaves.
   *
   * The ceiling is read at the camera, not at the train, so the shot drops as
   * it goes in under the canopy and lifts again on the way out rather than
   * snapping between the two. Nothing else on the railway has a ceiling, so
   * everywhere else this costs one lookup and does nothing.
   */
  private duck(): void {
    const p = this.camera.position;
    const leaves = this.opts.canopyAt(p.x, p.z);
    if (leaves <= 0) return;
    const under = leaves - CANOPY_CLEAR;
    const ground = this.opts.groundAt(p.x, p.z) + 2.5;
    // Never so low that it is in the ground instead: a shot of soil is no
    // better than a shot of leaves.
    if (p.y > under) p.y = Math.max(under, ground);
  }

  /**
   * Keep the camera above the ground.
   *
   * Only while the engine itself is out in the open. Under the hill the
   * ground over the tunnel stands eighteen metres up, and lifting the camera
   * clear of that would put the hill between him and his own train for the
   * five seconds that are the best part of the lap.
   */
  private floor(trainPos: THREE.Vector3): void {
    if (this.opts.groundAt(trainPos.x, trainPos.z) > 3) return;
    const p = this.camera.position;
    const ground = this.opts.groundAt(p.x, p.z) + 2.5;
    if (p.y < ground) p.y = ground;
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
   * what it is looking at by however far he has dragged, and pulled in or
   * pushed out by however far he has pinched. Clamping the height as a
   * fraction of the distance out is what keeps it off the ground and out of
   * the sky whatever the shot was — and doing that against the pinched
   * distance rather than the shot's own is what keeps it true after a zoom.
   */
  private swung(): THREE.Vector3 {
    if (!this.moved) return this.pos;
    this.off.subVectors(this.pos, this.aim);
    const radius = this.off.length();
    if (radius < 1e-3) return this.pos;
    this.off.applyAxisAngle(UP, this.swing);
    this.axis.crossVectors(this.off, UP).normalize();
    if (this.axis.lengthSq() > 0.5) this.off.applyAxisAngle(this.axis, this.tilt);
    const reach = radius * this.zoom;
    this.off.setLength(reach);
    this.off.y = THREE.MathUtils.clamp(this.off.y, reach * MIN_HEIGHT, reach * MAX_HEIGHT);
    this.off.add(this.aim);
    // Far enough off the engine to be a shot of it. Pushed back along the
    // line from the engine rather than from the aim, so the direction he
    // pinched to is kept and only the distance is given back.
    const gap = this.off.distanceTo(this.train);
    if (gap > 1e-3 && gap < NEAREST) {
      this.off.sub(this.train).multiplyScalar(NEAREST / gap).add(this.train);
    }
    return this.off;
  }
}
