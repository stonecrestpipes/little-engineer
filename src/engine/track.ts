import * as THREE from 'three';

/**
 * Rail, as a network of segments that join end to end.
 *
 * Everything that moves is still addressed by distance travelled in metres
 * along a `Route` — that has not changed and nothing above this file needs to
 * know it could. What has changed is that a route is now assembled from named
 * pieces rather than being one closed spline, so a junction is a segment with
 * two things joined onto one end rather than a rewrite of this file.
 *
 * Knows nothing about stations, scenery or any particular railway.
 */

/** What the train, the camera rig and the scenery builders actually use. */
export interface Track {
  readonly length: number;
  /** Bring any distance into range. */
  wrap(d: number): number;
  positionAt(d: number, out?: THREE.Vector3): THREE.Vector3;
  tangentAt(d: number, out?: THREE.Vector3): THREE.Vector3;
  /** Shortest signed distance from `a` to `b`. Positive means b is ahead. */
  delta(a: number, b: number): number;
  /** How far ahead of `from` is `to`, always positive. */
  ahead(from: number, to: number): number;
}

export type End = 'start' | 'end';

/** One end of one segment. */
export interface Joint {
  segment: string;
  end: End;
}

/** How close two points have to be before they count as the same joint. */
const JOINT_TOLERANCE = 0.75;

/**
 * A single run of rail between two joints.
 *
 * The curve is built through one extra control point beyond each end — taken
 * from whatever joins on there — and then only the middle is driven. That is
 * what stops a segment boundary showing up as a kink: the rails leave a joint
 * in the direction the next piece arrives.
 */
export class Segment {
  readonly joins: Record<End, Joint[]> = { start: [], end: [] };

  private curve: THREE.CatmullRomCurve3 | null = null;
  /** arc length of the whole curve, ghost tails included */
  private total = 1;
  /** where the driven part begins within that */
  private from = 0;
  /** driven length, which is the only length anything outside here sees */
  length = 0;

  constructor(
    readonly id: string,
    readonly points: THREE.Vector3[],
  ) {
    if (points.length < 2) throw new Error(`segment ${id} needs at least two points`);
  }

  get start(): THREE.Vector3 {
    return this.points[0];
  }

  get end(): THREE.Vector3 {
    return this.points[this.points.length - 1];
  }

  /** Called by the network once every segment knows its neighbours. */
  build(ghostBefore: THREE.Vector3, ghostAfter: THREE.Vector3): void {
    const pts = [ghostBefore, ...this.points, ghostAfter];
    const curve = new THREE.CatmullRomCurve3(pts, false, 'centripetal', 0.5);
    // Plenty of divisions: the arc-length table is what makes constant speed
    // actually constant rather than surging through the curves.
    curve.arcLengthDivisions = Math.max(600, this.points.length * 240);
    this.curve = curve;
    this.total = Math.max(1e-6, curve.getLength());

    // A Catmull-Rom through N+1 points reaches point i at parameter i/N, so
    // the driven part runs from the second point to the second from last.
    const n = pts.length - 1;
    this.from = this.arcLengthAt(1 / n);
    this.length = this.arcLengthAt((n - 1) / n) - this.from;
  }

  /** Arc length at curve parameter `t`, read off the cached table. */
  private arcLengthAt(t: number): number {
    const lengths = this.curve!.getLengths();
    const x = THREE.MathUtils.clamp(t, 0, 1) * (lengths.length - 1);
    const i = Math.floor(x);
    if (i >= lengths.length - 1) return lengths[lengths.length - 1];
    return lengths[i] + (lengths[i + 1] - lengths[i]) * (x - i);
  }

  private u(d: number): number {
    return THREE.MathUtils.clamp((this.from + d) / this.total, 0, 1);
  }

  positionAt(d: number, out = new THREE.Vector3()): THREE.Vector3 {
    return this.curve!.getPointAt(this.u(d), out);
  }

  tangentAt(d: number, out = new THREE.Vector3()): THREE.Vector3 {
    return this.curve!.getTangentAt(this.u(d), out).normalize();
  }
}

export interface RouteStep {
  segment: string;
  /** driven from its end to its start */
  reversed?: boolean;
}

/**
 * The railway: segments, and what joins onto what.
 *
 * Today it hands out one route and there is no choosing. The shape is here so
 * that when there is, a fork is content — one more segment joined onto an end
 * that already has one — rather than a new idea.
 */
export class Network {
  private readonly segments = new Map<string, Segment>();
  private built = false;

  add(id: string, points: THREE.Vector3[]): Segment {
    if (this.segments.has(id)) throw new Error(`segment ${id} already exists`);
    const s = new Segment(id, points);
    this.segments.set(id, s);
    this.built = false;
    return s;
  }

  get(id: string): Segment {
    const s = this.segments.get(id);
    if (!s) throw new Error(`no segment ${id}`);
    return s;
  }

  /** Join one end of one segment to one end of another, both ways. */
  join(a: Joint, b: Joint): void {
    this.get(a.segment).joins[a.end].push(b);
    this.get(b.segment).joins[b.end].push(a);
    this.built = false;
  }

  /** Join a chain of segments end to start, and optionally close the ring. */
  chain(ids: string[], closed = false): void {
    for (let i = 0; i < ids.length - 1; i++) {
      this.join({ segment: ids[i], end: 'end' }, { segment: ids[i + 1], end: 'start' });
    }
    if (closed && ids.length > 1) {
      this.join({ segment: ids[ids.length - 1], end: 'end' }, { segment: ids[0], end: 'start' });
    }
  }

  build(): void {
    for (const s of this.segments.values()) {
      s.build(this.ghost(s, 'start'), this.ghost(s, 'end'));
    }
    this.built = true;
    if (import.meta.env.DEV) this.checkJoints();
  }

  /**
   * A control point just beyond one end of a segment, taken from whatever is
   * joined on there so the curve leaves the joint heading the right way.
   */
  private ghost(s: Segment, end: End): THREE.Vector3 {
    const join = s.joins[end][0];
    if (join) {
      const n = this.get(join.segment);
      // one control point back from the end we are joined to
      const p = join.end === 'end' ? n.points[n.points.length - 2] : n.points[1];
      return p.clone();
    }
    // Nothing joined on: carry straight on past the end of the rails.
    const pts = s.points;
    const here = end === 'start' ? pts[0] : pts[pts.length - 1];
    const back = end === 'start' ? pts[1] : pts[pts.length - 2];
    return here.clone().add(here.clone().sub(back));
  }

  /** Joined ends that are not actually in the same place are a content bug. */
  private checkJoints(): void {
    for (const s of this.segments.values()) {
      for (const end of ['start', 'end'] as End[]) {
        const here = end === 'start' ? s.start : s.end;
        for (const join of s.joins[end]) {
          const n = this.get(join.segment);
          const there = join.end === 'start' ? n.start : n.end;
          const gap = here.distanceTo(there);
          if (gap > JOINT_TOLERANCE) {
            console.warn(
              `track: ${s.id}.${end} and ${n.id}.${join.end} are ${gap.toFixed(2)} m apart`,
            );
          }
        }
      }
    }
  }

  /** Assemble a route from a list of segments, in the order they are driven. */
  route(steps: RouteStep[], closed = true): Route {
    if (!this.built) this.build();
    return new Route(
      steps.map((s) => ({ segment: this.get(s.segment), reversed: s.reversed === true })),
      closed,
    );
  }

}

interface Leg {
  segment: Segment;
  reversed: boolean;
  /** distance along the route at which this leg begins */
  at: number;
}

/**
 * One way round the railway, measured in metres from the start.
 *
 * This is what the train drives and what the camera rig follows. A closed
 * route wraps; an open one — a branch line, a siding, the shed road — simply
 * runs out at each end.
 */
export class Route implements Track {
  readonly length: number;
  private readonly legs: Leg[] = [];

  constructor(
    steps: { segment: Segment; reversed: boolean }[],
    readonly closed: boolean,
  ) {
    if (steps.length === 0) throw new Error('a route needs at least one segment');
    let at = 0;
    for (const step of steps) {
      this.legs.push({ segment: step.segment, reversed: step.reversed, at });
      at += step.segment.length;
    }
    this.length = at;
  }

  wrap(d: number): number {
    if (!this.closed) return THREE.MathUtils.clamp(d, 0, this.length);
    const m = d % this.length;
    return m < 0 ? m + this.length : m;
  }

  /** The leg covering a distance, and how far into it that is. */
  private locate(d: number): { leg: Leg; local: number } {
    const at = this.wrap(d);
    // Few enough legs that a scan beats an index, and it never allocates.
    let leg = this.legs[0];
    for (let i = this.legs.length - 1; i >= 0; i--) {
      if (at >= this.legs[i].at) {
        leg = this.legs[i];
        break;
      }
    }
    const local = THREE.MathUtils.clamp(at - leg.at, 0, leg.segment.length);
    return { leg, local };
  }

  positionAt(d: number, out = new THREE.Vector3()): THREE.Vector3 {
    const { leg, local } = this.locate(d);
    return leg.segment.positionAt(leg.reversed ? leg.segment.length - local : local, out);
  }

  tangentAt(d: number, out = new THREE.Vector3()): THREE.Vector3 {
    const { leg, local } = this.locate(d);
    leg.segment.tangentAt(leg.reversed ? leg.segment.length - local : local, out);
    return leg.reversed ? out.negate() : out;
  }

  delta(a: number, b: number): number {
    if (!this.closed) return this.wrap(b) - this.wrap(a);
    let d = this.wrap(b) - this.wrap(a);
    if (d > this.length / 2) d -= this.length;
    if (d < -this.length / 2) d += this.length;
    return d;
  }

  ahead(from: number, to: number): number {
    if (!this.closed) return Math.max(0, this.wrap(to) - this.wrap(from));
    return this.wrap(this.wrap(to) - this.wrap(from));
  }

  /** The segments driven, in order. */
  get segments(): string[] {
    return this.legs.map((l) => l.segment.id);
  }

  lengthOf(segmentId: string): number {
    const leg = this.legs.find((l) => l.segment.id === segmentId);
    if (!leg) throw new Error(`segment ${segmentId} is not on this route`);
    return leg.segment.length;
  }

  /** Whether this route runs over a named segment at all. */
  has(segmentId: string): boolean {
    return this.legs.some((l) => l.segment.id === segmentId);
  }

  /**
   * Which segment a distance falls on, and how far along that segment it is,
   * measured in the direction the segment was drawn. This is what lets a
   * distance on one route be found again on another that shares the segment.
   */
  where(d: number): { segment: string; local: number } {
    const { leg, local } = this.locate(d);
    return { segment: leg.segment.id, local: leg.reversed ? leg.segment.length - local : local };
  }

  /** The inverse of `where`, or NaN if this route does not use that segment. */
  at(segmentId: string, local: number): number {
    const leg = this.legs.find((l) => l.segment.id === segmentId);
    if (!leg) return NaN;
    return leg.at + (leg.reversed ? leg.segment.length - local : local);
  }

  /** Where a named segment begins along this route, for placing scenery. */
  startOf(segmentId: string): number {
    const leg = this.legs.find((l) => l.segment.id === segmentId);
    if (!leg) throw new Error(`segment ${segmentId} is not on this route`);
    return leg.at;
  }
}
