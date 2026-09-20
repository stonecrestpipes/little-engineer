import * as THREE from 'three';

/**
 * A closed loop of rail. Everything that moves on it is addressed by
 * distance travelled in metres, which wraps at the end of the lap.
 *
 * Knows nothing about stations, scenery or any particular railway.
 */
export class Track {
  readonly curve: THREE.CatmullRomCurve3;
  readonly length: number;

  constructor(points: THREE.Vector3[]) {
    this.curve = new THREE.CatmullRomCurve3(points, true, 'centripetal', 0.5);
    // Plenty of divisions: the arc-length table is what makes constant speed
    // actually constant rather than surging through the curves.
    this.curve.arcLengthDivisions = 2000;
    this.length = this.curve.getLength();
  }

  /** Bring any distance into [0, length). */
  wrap(d: number): number {
    const m = d % this.length;
    return m < 0 ? m + this.length : m;
  }

  positionAt(d: number, out = new THREE.Vector3()): THREE.Vector3 {
    return this.curve.getPointAt(this.wrap(d) / this.length, out);
  }

  tangentAt(d: number, out = new THREE.Vector3()): THREE.Vector3 {
    return this.curve.getTangentAt(this.wrap(d) / this.length, out).normalize();
  }

  /**
   * Shortest signed distance from `a` to `b` around the loop.
   * Positive means b is ahead of a.
   */
  delta(a: number, b: number): number {
    let d = this.wrap(b) - this.wrap(a);
    if (d > this.length / 2) d -= this.length;
    if (d < -this.length / 2) d += this.length;
    return d;
  }

  /** How far ahead of `from` is `to`, always positive (0 .. length). */
  ahead(from: number, to: number): number {
    const d = this.wrap(this.wrap(to) - this.wrap(from));
    return d;
  }

  /** Evenly spaced points, for building the rails and sleepers. */
  samples(count: number): { position: THREE.Vector3; tangent: THREE.Vector3 }[] {
    const out = [];
    for (let i = 0; i < count; i++) {
      const u = i / count;
      out.push({
        position: this.curve.getPointAt(u),
        tangent: this.curve.getTangentAt(u).normalize(),
      });
    }
    return out;
  }
}
