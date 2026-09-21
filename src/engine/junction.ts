import type * as THREE from 'three';
import type { Route, Track } from './track';

/**
 * A railway with choices in it, seen as one track.
 *
 * Every way round is a whole closed loop from the same start, and two loops
 * are identical up to the first place they part. So while the engine is still
 * short of that place, moving it from one loop to the other changes nothing
 * about where anything is — not the engine, not the cars behind it, not the
 * camera. That is the only moment a switch is allowed, and it is why nothing
 * that drives, follows or couples up needs to know junctions exist: they all
 * hold this object and keep asking it where things are.
 *
 * With two junctions there are four loops, and so on. Setting the points at
 * one junction is moving to the loop that differs only there.
 */
export class Lines implements Track {
  private active = 0;
  /** shared[a][b]: how far from the start loops a and b are the same rails */
  private readonly shared: number[][];

  constructor(readonly routes: Route[]) {
    this.shared = routes.map((a) => routes.map((b) => (a === b ? Infinity : sameUntil(a, b))));
  }

  /** Which loop the engine is on. */
  get line(): number {
    return this.active;
  }

  get route(): Route {
    return this.routes[this.active];
  }

  /** True while moving to `line` would change nothing under the engine. */
  canSwitch(line: number, head: number): boolean {
    return line === this.active || this.route.wrap(head) < this.shared[this.active][line];
  }

  /**
   * Move to another loop. Refused, returning false, if the engine is already
   * past where they part — the loop it is on is then the loop it is on until
   * next time round.
   */
  set(line: number, head: number): boolean {
    if (!this.routes[line] || !this.canSwitch(line, head)) return false;
    this.active = line;
    return true;
  }

  /**
   * A distance measured on one loop, as measured on another: found by which
   * segment it is on, so it is exact wherever the loops share rails, and NaN
   * where they do not. NaN is safe anywhere something asks "is he near": every
   * comparison with it is false, so it simply never hears him.
   */
  convert(at: number, from: number, to: number): number {
    if (from === to || Number.isNaN(at)) return at;
    const { segment, local } = this.routes[from].where(at);
    return this.routes[to].at(segment, local);
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

/** Where two loops that start together first go different ways. */
function sameUntil(a: Route, b: Route): number {
  let at = 0;
  for (const [i, id] of a.segments.entries()) {
    if (b.segments[i] !== id) return at;
    at = a.startOf(id) + a.lengthOf(id);
  }
  return at;
}
