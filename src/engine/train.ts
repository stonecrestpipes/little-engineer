import type { Track } from './track';

export interface Stop {
  id: string;
  /** distance along the loop where the engine's face should come to rest */
  at: number;
}

export interface DrivingSpec {
  /** speed at the top of the lever, metres per second */
  cruise: number;
  /** speed at the very bottom of the green zone — a nudge is still a drive */
  slow: number;
  /** speed it eases down to while rolling through a station */
  approachSpeed: number;
  /** how far out it starts easing off */
  approachRange: number;
  /** braking anywhere inside this window counts as arriving */
  stopWindow: number;
  accel: number;
  /** deceleration with the lever pulled down: a deliberate stop */
  brake: number;
  /** deceleration with the lever released: a long, gentle roll to a halt */
  coast: number;
}

export type TrainEvent =
  | { type: 'arrived'; stop: Stop }
  | { type: 'departed'; stop: Stop };

/** Below this the lever counts as centred — a four-year-old's thumb drifts. */
const DEAD_ZONE = 0.08;

/**
 * The train controller. Follows the rails by itself; the child only ever
 * chooses how hard to pull the lever.
 *
 * The lever is the whole interface: push it up and the engine goes, faster the
 * further it goes; let go and it rolls gently down to nothing on its own; pull
 * it down and it stops properly. Nothing is ever held or latched, so the engine
 * cannot be left running by a lever he has forgotten about.
 *
 * The one piece of cleverness is the docking profile: if he pulls down anywhere
 * near a platform, the engine brakes along a curve that lands it exactly on the
 * mark. He feels responsible for the stop and cannot miss it.
 */
export class Train {
  distance = 0;
  speed = 0;
  wheelAngle = 0;

  /** -1 (full stop) … 0 (released, coasting) … +1 (full power) */
  private power = 0;
  private docking: Stop | null = null;
  /** speed and gap at the moment he pulled down, which set the glide path */
  private dockV0 = 0;
  private dockS0 = 1;
  private restingAt: Stop | null = null;
  private listeners: ((e: TrainEvent) => void)[] = [];

  constructor(
    private readonly track: Track,
    private spec: DrivingSpec,
    private readonly stops: Stop[],
  ) {}

  /**
   * Swap in another engine's driving feel. Only ever called while standing
   * still in the yard, so nothing has to be smoothed across the change.
   */
  retune(spec: DrivingSpec): void {
    this.spec = spec;
  }

  on(fn: (e: TrainEvent) => void): void {
    this.listeners.push(fn);
  }

  private emit(e: TrainEvent): void {
    for (const fn of this.listeners) fn(e);
  }

  get moving(): boolean {
    return this.speed > 0.05;
  }

  get atStop(): Stop | null {
    return this.restingAt;
  }


  /** Called every time the lever moves, which may be every frame. */
  setThrottle(value: number): void {
    const v = Math.max(-1, Math.min(1, value));
    const next = Math.abs(v) < DEAD_ZONE ? 0 : v;
    const was = this.power;
    this.power = next;

    if (next > 0) {
      // Going again cancels any arrival he had lined up.
      this.docking = null;
      if (this.restingAt) {
        this.emit({ type: 'departed', stop: this.restingAt });
        this.restingAt = null;
      }
      return;
    }

    // Pulling down near a platform means "arrive here", not "brake here".
    // Only on the way in, and only while actually rolling: a lever pulled down
    // at a standstill must never make the engine set off toward a platform.
    if (next < 0 && was >= 0) {
      this.docking = this.moving ? this.stopAhead(this.spec.stopWindow) : null;
      if (this.docking) {
        this.dockV0 = this.speed;
        this.dockS0 = Math.max(0.1, this.track.ahead(this.distance, this.docking.at));
      }
    }
    // Releasing back to the middle keeps an arrival that is already under way:
    // it only ever slows the engine, so it is never the game driving for him.
  }

  /** The next platform within `range` metres ahead, if any. */
  private stopAhead(range: number): Stop | null {
    let best: Stop | null = null;
    let bestGap = Infinity;
    for (const s of this.stops) {
      const gap = this.track.ahead(this.distance, s.at);
      if (gap <= range && gap < bestGap) {
        best = s;
        bestGap = gap;
      }
    }
    return best;
  }

  update(dt: number): void {
    const { cruise, slow, approachSpeed, approachRange, accel, brake, coast } = this.spec;

    // --- what speed are we aiming for -----------------------------------
    let target = 0;
    if (this.power > 0) {
      // The bottom of the green zone is still a proper drive, not a crawl.
      target = slow + (cruise - slow) * this.power;

      // Ease off automatically when a platform is coming up, so arriving
      // always feels unhurried even if he never touches the lever.
      const near = this.stopAhead(approachRange);
      if (near) {
        const gap = this.track.ahead(this.distance, near.at);
        const t = Math.min(1, gap / approachRange); // 0 at the platform
        target = Math.min(target, approachSpeed + (cruise - approachSpeed) * t);
      }
    }

    // --- docking: brake along a curve that lands on the mark -------------
    if (this.docking) {
      const remaining = this.track.ahead(this.distance, this.docking.at);
      // Glide path: v(s) = v0 * sqrt(s / s0), which is constant deceleration
      // spread over the whole remaining distance. It starts slowing the
      // instant he pulls down — so the lever visibly does something — and
      // still arrives exactly on the mark.
      target = this.dockV0 * Math.sqrt(remaining / this.dockS0);
      // Never faster than he was already going.
      target = Math.min(target, this.dockV0);
      // A creep over the last stretch, so it settles onto the mark crisply
      // instead of approaching it asymptotically.
      target = Math.max(target, Math.min(0.8, remaining * 3));
    }

    // --- move toward that speed -----------------------------------------
    // Released, the engine slows far more gently than it does when he asks
    // for a stop. That difference is most of what the lever teaches.
    let rate: number;
    if (target > this.speed) rate = accel;
    else rate = this.power < 0 || this.docking ? brake : coast;
    // If the stop came very late, brake harder rather than sailing past.
    if (this.docking && target < this.speed) rate = Math.max(rate, brake * 2.5);

    const delta = target - this.speed;
    const ramp = rate * dt;
    this.speed += Math.abs(delta) <= ramp ? delta : Math.sign(delta) * ramp;
    if (this.speed < 0) this.speed = 0;

    if (this.speed <= 0) return;

    let step = this.speed * dt;

    // While docking, never step past the platform. Clamping here rather than
    // snapping afterwards means the engine can neither overshoot nor jump
    // backwards onto the mark — it simply arrives.
    if (this.docking) {
      const remaining = this.track.ahead(this.distance, this.docking.at);
      if (step >= remaining || remaining > this.track.length / 2) {
        this.distance = this.docking.at;
        this.speed = 0;
        this.restingAt = this.docking;
        this.docking = null;
        this.emit({ type: 'arrived', stop: this.restingAt });
        return;
      }
    }

    this.distance = this.track.wrap(this.distance + step);
    if (this.restingAt) this.restingAt = null;
  }

  /** Radians the wheels should have turned, given their radius. */
  advanceWheels(radius: number, dt: number): number {
    this.wheelAngle += (this.speed * dt) / radius;
    return this.wheelAngle;
  }
}
