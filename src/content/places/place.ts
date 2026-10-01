import * as THREE from 'three';
import type { Track } from '../../engine/track';
import type { Stop } from '../../engine/train';
import type { Audio } from '../../engine/audio';
import type { Roster } from '../roster';

/**
 * What the world tells a place about the engine, every frame.
 *
 * **`distance` is NaN while the engine is on rails this place's line does not
 * share.** That is deliberate and it is what makes a place on a branch simply
 * not hear him: every comparison with NaN is false, so `isNear` and `gapTo`
 * are safe to use without checking. Doing arithmetic with it is not — and
 * handing it to `track.positionAt` throws from deep inside the curve, which
 * takes the whole frame loop with it. Use `watching` before reading a
 * position out of it.
 */
export interface TrainState {
  distance: number;
  speed: number;
  moving: boolean;
}

/** True while the engine is somewhere this place's own line can measure. */
export function watching(train: TrainState): boolean {
  return Number.isFinite(train.distance);
}

export interface PlaceContext {
  track: Track;
  audio: Audio;
  /** Ground height anywhere on the map, for standing things on. */
  groundAt(x: number, z: number): number;
  /** Every engine and every car, and which of them he is driving. */
  roster: Roster;
  /** Where along the route this place sits. */
  at: number;
}

/**
 * Somewhere on the railway that does something.
 *
 * A place owns its own geometry and its own behaviour, and the world does no
 * more than hand it the train's position and pass on the whistle. Nothing a
 * place does is ever required of him: the most a place can do is react.
 */
export interface Place {
  group: THREE.Group;
  /** Set if the engine can stand at a platform here. */
  stop?: Stop;
  arrive?(): void;
  depart?(): void;
  /** He blew the whistle. The place decides whether it is near enough to care. */
  whistle?(train: TrainState): void;
  update?(dt: number, elapsed: number, train: TrainState): void;
  /**
   * True while this place is driving stock about under its own steam, and the
   * train must leave its engine alone. Only the yard ever says yes.
   */
  busy?(): boolean;
  /**
   * Stop whatever it is doing at once, with everything left exactly where it
   * was going. Called the moment he asks to drive, which always wins.
   */
  settle?(): void;
  /**
   * He touched the world rather than a button. Return true if this place did
   * something about it, so nowhere else tries to.
   *
   * The only place that uses this is the yard, and only while he is standing
   * still in it — there is nothing anywhere else on the railway to touch.
   */
  pick?(ray: THREE.Raycaster, train: TrainState): boolean;
}

/**
 * A group sitting on the track at `at`, turned to face along it.
 *
 * Inside the group, +z is the direction of travel and +x is the right-hand
 * side of the train. Every place is built in those terms, so the same station
 * can be dropped anywhere on the railway and still face the right way.
 */
export function frameAt(track: Track, at: number): THREE.Group {
  const g = new THREE.Group();
  const p = track.positionAt(at);
  const t = track.tangentAt(at);
  g.position.copy(p);
  g.rotation.y = Math.atan2(t.x, t.z);
  return g;
}

/**
 * The same ground lookup, but in a place's own local frame — so a place can
 * stand a barn on the hillside without knowing where on the map it is.
 */
export function localGround(
  frame: THREE.Group,
  groundAt: (x: number, z: number) => number,
): (x: number, z: number) => number {
  frame.updateMatrixWorld();
  const v = new THREE.Vector3();
  return (x, z) => {
    frame.localToWorld(v.set(x, 0, z));
    return groundAt(v.x, v.z);
  };
}

/**
 * The rails near a place, in that place's own frame, as a list of points.
 *
 * What it is for: a place that lays something out in a ring or a run — a
 * fence round a field, a road, a row of anything — needs to know where the
 * railway goes through it, so it can leave a gap instead of building across
 * the track. The route knows where it is; the place only knows local x and z.
 */
export function railsNear(
  frame: THREE.Group,
  track: Track,
  at: number,
  span = 60,
  step = 2,
): THREE.Vector2[] {
  frame.updateMatrixWorld();
  const out: THREE.Vector2[] = [];
  const p = new THREE.Vector3();
  for (let d = -span; d <= span; d += step) {
    track.positionAt(at + d, p);
    frame.worldToLocal(p);
    out.push(new THREE.Vector2(p.x, p.z));
  }
  return out;
}

/** How far a point in a place's frame is from the nearest of those rails. */
export function clearOfRails(rails: THREE.Vector2[], x: number, z: number): number {
  let best = Infinity;
  for (const r of rails) {
    const d = (r.x - x) ** 2 + (r.y - z) ** 2;
    if (d < best) best = d;
  }
  return Math.sqrt(best);
}

/**
 * Signed distance from the engine to here. Positive means this place is still
 * ahead of him; negative means he has gone through it and it is behind.
 */
export function gapTo(track: Track, train: TrainState, at: number): number {
  return track.delta(train.distance, at);
}

/** True while the engine is within `range` metres of here, coming or going. */
export function isNear(track: Track, train: TrainState, at: number, range: number): boolean {
  return Math.abs(track.delta(train.distance, at)) <= range;
}
