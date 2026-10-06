import * as THREE from 'three';
import { C, mat } from '../scenery';
import { moving } from '../../engine/merge';
import { logBundle, WAGON_LOAD_LENGTH } from '../cars';
import { railsNear, type PlaceContext } from './place';

/**
 * A crane that works.
 *
 * He kept asking to load his wagon, so this is the one thing on the railway
 * that takes something from the world and puts it into his train. Built once
 * and stood twice: on the quay at the harbour and on the building site in the
 * city.
 *
 * **It asks nothing of him.** No one wants the logs, nothing is counted, and
 * the wagon is as finished empty as it is full. What he asked for was the
 * crane *working* — the swing, the hook coming down, the bundle going in —
 * and that is all this is. Fetching and delivering is the thing he disliked
 * in the game this railway came from, and it is still not here.
 *
 * Two bits of geometry are worth knowing before moving one:
 *
 * 1. **The crane stands exactly its own reach from where the hook must come
 *    down.** A jib is a fixed length, so the stand position is not a free
 *    choice: pick where the hook goes, and the reach decides the rest. That
 *    is why `buildCrane` takes the load point and works the position out,
 *    instead of taking a position.
 * 2. **The running line curves, so it asks where the rails actually are**
 *    (`railsNear`), rather than assuming the track runs up x = 0 through the
 *    middle of the place. Over a quay's length the line swings metres across
 *    the frame, and a crane built on the assumption would reach past the
 *    train on one side and into it on the other.
 */

/** How long the hook takes to come down, and to go back up. */
const DROP_S = 0.9;
/** How long it takes to swing round, loaded or empty. */
const SLEW_S = 1.6;
/** The pause at the bottom, where the bundle changes hands. */
const HANDOVER_S = 0.3;

/**
 * Mast centre to hook, and so also how far back from the rails it stands.
 *
 * Per crane, because the two have very different room to stand in: at the
 * harbour the platform and the station building take everything within nine
 * metres of the line on the seaward side, so the crane goes out on the quay
 * with the other two and needs the reach to get back over the train.
 */
const DEFAULT_REACH = 9.5;
/** How far round it swings between its own stack and the train, in radians. */
const SWING = 1.95;

/**
 * `lift` is the one for a train with nothing a crane can fill: it picks the
 * bundle up, carries it over the track and brings it back. It exists so that
 * standing at a crane always has something to press — an absence he cannot
 * read is the thing that went wrong with the install row, and a dead button
 * at a crane he asked for would be worse.
 */
export type CraneJob = 'load' | 'unload' | 'lift';

/** What the crane is reaching into, so the game can keep the two in step. */
export interface CraneHandover {
  /** Take the bundle out of the train. The wagon's own load goes away. */
  fromTrain(): void;
  /** Put the bundle into the train. The wagon's own load comes back. */
  toTrain(): void;
}

export interface Crane {
  group: THREE.Group;
  /**
   * Begin a job. False if it is already in the middle of one, which is the
   * answer to him pressing the button twice.
   *
   * `back` is how far behind the stop the wagon's middle actually is, which
   * depends on which engine is pulling: a tank engine puts the first car six
   * metres back and the tender engine nearly nine. The crane picks the slew
   * angle that puts its hook there, so the bundle always comes down in the
   * middle of the wagon rather than hanging over one end.
   */
  start(job: CraneJob, hands: CraneHandover, back?: number): boolean;
  /** True while it is moving. The train stands still and the button waits. */
  busy(): boolean;
  /**
   * Stop now, because he has asked to drive. The job is *finished* rather
   * than abandoned — the bundle ends up wherever it was going, because a
   * load that vanished half way up a cable would be a bug he could see.
   */
  settle(): void;
  update(dt: number): void;
  /** Where the hook comes down, in the place's frame. For the stack of logs. */
  readonly over: THREE.Vector2;
  /**
   * Where the hook would actually come down for a wagon `back` metres behind
   * the stop — the aim, after the clamp and the fixed-jib approximation. Only
   * the tests use it, and they use it to check that the bundle lands in the
   * middle of the wagon for every engine.
   */
  aimFor(back: number): THREE.Vector2;
}

/** One leg of the cycle: move something, or hand the bundle over. */
interface Step {
  dur: number;
  /** hook height, 0 up … 1 down */
  drop?: [number, number];
  /** where it is pointing, 0 its own stack … 1 the train */
  slew?: [number, number];
  act?: 'take-stack' | 'give-train' | 'take-train' | 'give-stack';
}

/** Lower, pick the bundle up, raise, swing across, lower, let go, raise, home. */
const LOADING: Step[] = [
  { dur: DROP_S, drop: [0, 1] },
  { dur: HANDOVER_S, act: 'take-stack' },
  { dur: DROP_S, drop: [1, 0] },
  { dur: SLEW_S, slew: [0, 1] },
  { dur: DROP_S, drop: [0, 1] },
  { dur: HANDOVER_S, act: 'give-train' },
  { dur: DROP_S, drop: [1, 0] },
  { dur: SLEW_S, slew: [1, 0] },
];

/** The same eight legs the other way round: across first, stack last. */
const UNLOADING: Step[] = [
  { dur: SLEW_S, slew: [0, 1] },
  { dur: DROP_S, drop: [0, 1] },
  { dur: HANDOVER_S, act: 'take-train' },
  { dur: DROP_S, drop: [1, 0] },
  { dur: SLEW_S, slew: [1, 0] },
  { dur: DROP_S, drop: [0, 1] },
  { dur: HANDOVER_S, act: 'give-stack' },
  { dur: DROP_S, drop: [1, 0] },
];

/** Up, across, back and down again, with nowhere to put it. */
const LIFTING: Step[] = [
  { dur: DROP_S, drop: [0, 1] },
  { dur: HANDOVER_S, act: 'take-stack' },
  { dur: DROP_S, drop: [1, 0] },
  { dur: SLEW_S, slew: [0, 1] },
  { dur: SLEW_S, slew: [1, 0] },
  { dur: DROP_S, drop: [0, 1] },
  { dur: HANDOVER_S, act: 'give-stack' },
  { dur: DROP_S, drop: [1, 0] },
];

export interface CraneOpts {
  /**
   * How far back along the track from this place's stop the hook comes down.
   * Negative is behind the engine, which is where the cars are: the first one
   * sits about eight metres back.
   */
  along: number;
  /** Which side of the line it stands on: -1 left of the train, +1 right. */
  side: -1 | 1;
  /** Height the bundle changes hands at — where an open wagon's load sits. */
  liftY: number;
  /** Mast to hook. Also exactly how far back from the rails it stands. */
  reach?: number;
  /**
   * How high the jib is. Worth raising for a crane whose load has to travel
   * over something: at the harbour the hook swings across the station, whose
   * gable peaks at 6.85 m, and at the default height it would clip the roof.
   */
  jibY?: number;
  /** Ground under the crane, if the place is not flat. Defaults to the frame. */
  groundY?: number;
}

export function buildCrane(ctx: PlaceContext, frame: THREE.Group, opts: CraneOpts): Crane {
  const { along, side, liftY } = opts;
  const REACH = opts.reach ?? DEFAULT_REACH;
  const JIB = opts.jibY ?? 8.6;

  // --- where the rails are, and so where everything else goes -------------
  // The load point is on the track, `along` metres back from the stop. Asking
  // the route for it rather than taking x = 0 is the whole of lesson two.
  const rails = railsNear(frame, ctx.track, ctx.at, 80, 2);
  const railAt = (z: number): THREE.Vector2 =>
    rails.reduce((best, p) => (Math.abs(p.y - z) < Math.abs(best.y - z) ? p : best), rails[0]);
  const over = new THREE.Vector2(railAt(along).x, along);

  // The crane stands its own reach away, square out from the line. Any other
  // distance and the hook either cannot get there or goes past it.
  const stand = new THREE.Vector2(over.x + side * REACH, over.y);
  const groundY = opts.groundY ?? 0;

  // Pointing at the train is whichever way round puts the hook on the load
  // point; the stack sits where the hook rests, a swing away from that. The
  // stack is scenery and never moves, so its angle is fixed at the default.
  const squareOn = side === 1 ? 0 : Math.PI;
  const atStack = squareOn + SWING * side;
  const hookAt = (angle: number) =>
    new THREE.Vector2(stand.x - REACH * Math.cos(angle), stand.y + REACH * Math.sin(angle));
  const stackAt = hookAt(atStack);

  /**
   * The angle that aims the hook at a point `b` metres behind the stop.
   *
   * The jib is a fixed length, so a point that is not exactly a reach away
   * cannot be hit dead on — this aims along the line to it instead, which
   * over the couple of metres the car's position varies by is accurate to a
   * centimetre or two. Clamped because aiming far off the mark would have the
   * hook come down well short of where it was pointed.
   */
  const aimAt = (b: number): number => {
    const want = Math.max(along - 3, Math.min(along + 3, b));
    const tx = railAt(want).x;
    const dx = stand.x - tx;
    const dz = want - stand.y;
    const d = Math.hypot(dx, dz);
    return d < 0.001 ? squareOn : Math.atan2(dz / d, dx / d);
  };

  /** Where it is aiming for this job. Set when the job starts. */
  let atTrain = squareOn;

  // --- the crane ----------------------------------------------------------
  const group = new THREE.Group();
  group.position.set(stand.x, groundY, stand.y);

  const base = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.8, 0.8, 10), mat(C.slate));
  base.position.y = 0.4;
  base.castShadow = true;
  base.receiveShadow = true;

  const swing = new THREE.Group();
  swing.position.y = 0.8;
  moving(swing);

  const mast = new THREE.Mesh(new THREE.BoxGeometry(1.1, JIB + 0.4, 1.1), mat(C.trim));
  mast.position.y = (JIB + 0.4) / 2;
  // The jib runs out over the hook and a little way back the other side, where
  // the counterweight balances it.
  const jibLen = REACH + 2.4;
  const jib = new THREE.Mesh(new THREE.BoxGeometry(jibLen, 0.7, 0.7), mat(C.trim));
  jib.position.set((1.2 - REACH) / 2, JIB, 0);
  const weight = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.3, 1.6), mat(C.slate));
  weight.position.set(1.6, JIB - 0.3, 0);
  const cab = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.8, 2.2), mat(C.cream));
  cab.position.set(1.4, 2.2, 0);
  for (const m of [mast, jib, weight, cab]) {
    m.castShadow = true;
    m.receiveShadow = true;
  }

  // The cable and the hook are the only parts that move inside the swing, so
  // they are marked too: a part that moves inside something that moves has to
  // be, or the merge bakes it flat.
  const JIB_Y = JIB - 0.25;
  const cable = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1, 5), mat(0x2b3a45));
  cable.position.set(-REACH, 0, 0);
  const hook = new THREE.Group();
  hook.position.set(-REACH, 0, 0);
  const block = new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.1, 1.1), mat(C.metal));
  block.castShadow = true;
  hook.add(block);
  moving(cable, hook);

  // What the hook carries while it is carrying it. Parked invisible: it shows
  // only between picking up and putting down, so the bundle is either on the
  // hook or in the wagon, never both.
  const carried = logBundle(WAGON_LOAD_LENGTH);
  carried.position.y = -0.9;
  carried.visible = false;
  moving(carried);
  hook.add(carried);

  swing.add(mast, jib, weight, cab, cable, hook);
  group.add(base, swing);

  // --- its own stock of logs, on the ground where the hook rests -----------
  // A pile rather than a single bundle, and it never runs down. That is one
  // less thing to keep straight than it sounds: because the stack is always
  // there, whether the button loads or unloads depends only on whether his
  // wagon is full, and two cranes sharing one wagon can never disagree about
  // how many bundles exist.
  const stack = new THREE.Group();
  for (const [i, dz] of [-1.3, 0, 1.3].entries()) {
    const pile = logBundle(WAGON_LOAD_LENGTH);
    pile.position.set(0, i === 1 ? 0.86 : 0.3, dz);
    stack.add(pile);
  }
  stack.position.set(stackAt.x - stand.x, 0, stackAt.y - stand.y);
  stack.rotation.y = atStack;
  group.add(stack);

  // --- the cycle ----------------------------------------------------------
  // Heights are in the swing's own frame, so the hook's travel is from just
  // under the jib down to the height the bundle changes hands at.
  const topY = JIB_Y - 2.4;
  const lowY = liftY - groundY - 0.8 + 0.9;

  let steps: Step[] = [];
  let step = 0;
  let t = 0;
  let hands: CraneHandover | null = null;
  let drop = 0;
  let slew = 0;

  const apply = (act: Step['act']): void => {
    switch (act) {
      case 'take-stack':
        carried.visible = true;
        break;
      case 'give-train':
        carried.visible = false;
        hands?.toTrain();
        break;
      case 'take-train':
        hands?.fromTrain();
        carried.visible = true;
        break;
      case 'give-stack':
        carried.visible = false;
        break;
    }
  };

  /** Put the crane where the numbers say it is. */
  const pose = (): void => {
    swing.rotation.y = atStack + (atTrain - atStack) * slew;
    const y = topY + (lowY - topY) * drop;
    hook.position.y = y;
    // The cable is drawn from the jib down to the block, so it has to stretch.
    const len = Math.max(0.2, JIB_Y - y);
    cable.scale.y = len;
    cable.position.y = JIB_Y - len / 2;
  };

  const rest = (): void => {
    steps = [];
    step = 0;
    t = 0;
    hands = null;
    drop = 0;
    slew = 0;
    pose();
  };

  rest();

  return {
    group,
    over,

    aimFor(back) {
      return hookAt(aimAt(back));
    },

    start(job, h, back) {
      if (steps.length > 0) return false;
      atTrain = aimAt(back ?? along);
      hands = h;
      steps = job === 'load' ? LOADING : job === 'unload' ? UNLOADING : LIFTING;
      step = 0;
      t = 0;
      if (steps[0].act) apply(steps[0].act);
      return true;
    },

    busy() {
      return steps.length > 0;
    },

    settle() {
      // Everything it had left to do, done at once. The bundle lands where it
      // was going; only the watching is cut short.
      for (let i = step; i < steps.length; i++) {
        const act = steps[i].act;
        // The step in progress has already had its act applied.
        if (act && i !== step) apply(act);
      }
      rest();
    },

    update(dt) {
      if (steps.length === 0) return;
      t += dt;
      // A long frame can cross more than one leg, so this walks forward
      // rather than assuming it is still inside the one it started in.
      while (step < steps.length && t >= steps[step].dur) {
        const s = steps[step];
        if (s.drop) drop = s.drop[1];
        if (s.slew) slew = s.slew[1];
        t -= s.dur;
        step++;
        if (step < steps.length && steps[step].act) apply(steps[step].act!);
      }
      if (step >= steps.length) {
        rest();
        return;
      }
      const s = steps[step];
      const k = s.dur > 0 ? Math.min(1, t / s.dur) : 1;
      // Eased, because a crane does not start and stop dead.
      const e = k * k * (3 - 2 * k);
      if (s.drop) drop = s.drop[0] + (s.drop[1] - s.drop[0]) * e;
      if (s.slew) slew = s.slew[0] + (s.slew[1] - s.slew[0]) * e;
      pose();
    },
  };
}
