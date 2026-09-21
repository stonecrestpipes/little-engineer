import type * as THREE from 'three';
import type { Route, Track } from './track';

/**
 * A railway with a choice in it, seen as one track.
 *
 * Each line is a whole closed loop, and every loop is identical from its start
 * up to the points: same segments, same distances. So while the engine is
 * still short of the points, moving him from one loop to the other changes
 * nothing about where anything is — not the engine, not the cars behind it,
 * not the camera. That is the only moment a switch is allowed, and it is why
 * nothing that drives, follows or couples up needs to know a junction exists:
 * they all hold this object and keep asking it where things are.
 *
 * The loops may differ in length after the points, and may rejoin — distances
 * beyond the points are only meaningful on the line they were measured on.
 */
export class Lines implements Track {
  private active = 0;

  constructor(
    readonly routes: Route[],
    /** Distance of the points from the start; the same on every line. */
    readonly points: number,
  ) {}

  /** Which line the engine is on. */
  get line(): number {
    return this.active;
  }

  get route(): Route {
    return this.routes[this.active];
  }

  /** True while the engine has not yet reached the points on this lap. */
  canSwitch(head: number): boolean {
    const d = this.route.wrap(head);
    return d < this.points;
  }

  /**
   * Set the points. Refused, returning false, if the engine is already past
   * them — the line it is on is then the line it is on until next time round.
   */
  set(line: number, head: number): boolean {
    if (line === this.active) return true;
    if (!this.canSwitch(head) || !this.routes[line]) return false;
    this.active = line;
    return true;
  }

  get length(): number {
    return this.route.length;
  }

  wrap(d: number): number {
    return this.route.wrap(d);
  }

  positionAt(d: number, out?: THREE.Vector3): THREE.Vector3 {
    return this.route.positionAt(d, out);
  }

  tangentAt(d: number, out?: THREE.Vector3): THREE.Vector3 {
    return this.route.tangentAt(d, out);
  }

  delta(a: number, b: number): number {
    return this.route.delta(a, b);
  }

  ahead(from: number, to: number): number {
    return this.route.ahead(from, to);
  }
}
