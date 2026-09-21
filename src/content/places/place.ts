import * as THREE from 'three';
import type { Track } from '../../engine/track';
import type { Stop } from '../../engine/train';
import type { Audio } from '../../engine/audio';

/** What the world tells a place about the engine, every frame. */
export interface TrainState {
  distance: number;
  speed: number;
  moving: boolean;
}

export interface PlaceContext {
  track: Track;
  audio: Audio;
  /** Ground height anywhere on the map, for standing things on. */
  groundAt(x: number, z: number): number;
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
