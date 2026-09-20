import type { Track } from './track';

export interface Stop {
  id: string;
  /** distance along the loop where the engine's face should come to rest */
  at: number;
}

export interface DrivingSpec {
  /** normal running speed, metres per second */
  cruise: number;
  /** speed it eases down to while rolling through a station */
  approachSpeed: number;
  /** how far out it starts easing off */
  approachRange: number;
  /** pressing STOP anywhere inside this window counts as arriving */
  stopWindow: number;
  accel: number;
  brake: number;
}

export type TrainEvent =
  | { type: 'arrived'; stop: Stop }
  | { type: 'departed'; stop: Stop };

/**
 * The train controller. Follows the rails by itself; the child only ever
 * chooses between going and stopping.
 *
 * The one piece of cleverness is the docking profile: if STOP is pressed
 * anywhere near a platform, the engine brakes along a curve that lands it
 * exactly on the mark. He feels responsible for the stop and cannot miss it.
 */
export class Train {
  distance = 0;
  speed = 0;
  wheelAngle = 0;

  private throttle: 'go' | 'stop' = 'stop';
  private docking: Stop | null = null;
  /** speed and gap at the moment STOP was pressed, which set the glide path */
  private dockV0 = 0;
  private dockS0 = 1;
  private restingAt: Stop | null = null;
  private listeners: ((e: TrainEvent) => void)[] = [];

  constructor(
    private readonly track: Track,
    private readonly spec: DrivingSpec,
    private readonly stops: Stop[],
  ) {}

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

  go(): void {
    this.throttle = 'go';
    this.docking = null;
    if (this.restingAt) {
      this.emit({ type: 'departed', stop: this.restingAt });
      this.restingAt = null;
    }
  }

  stop(): void {
    this.throttle = 'stop';
    // Pressing STOP near a platform means "arrive here", not "brake here".
    // Only while actually rolling, though: STOP at a standstill must never
    // make the engine set off toward a platform on its own.
    this.docking = this.moving ? this.stopAhead(this.spec.stopWindow) : null;
    if (this.docking) {
      this.dockV0 = this.speed;
      this.dockS0 = Math.max(0.1, this.track.ahead(this.distance, this.docking.at));
    }
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
    const { cruise, approachSpeed, approachRange, accel, brake } = this.spec;

    // --- what speed are we aiming for -----------------------------------
    let target = this.throttle === 'go' ? cruise : 0;

    // Ease off automatically when a platform is coming up, so arriving
    // always feels unhurried even if he never touches STOP.
    if (this.throttle === 'go') {
      const near = this.stopAhead(approachRange);
      if (near) {
        const gap = this.track.ahead(this.distance, near.at);
        const t = Math.min(1, gap / approachRange); // 0 at the platform
        target = approachSpeed + (cruise - approachSpeed) * t;
      }
    }

    // --- docking: brake along a curve that lands on the mark -------------
    if (this.docking) {
      const remaining = this.track.ahead(this.distance, this.docking.at);
      // Glide path: v(s) = v0 * sqrt(s / s0), which is constant deceleration
      // spread over the whole remaining distance. It starts slowing the
      // instant he presses — so the button visibly does something — and still
      // arrives exactly on the mark. Note this replaces the throttle's target
      // rather than being clamped against it: while docking, "stop" means
      // "arrive there", not "stand still here".
      target = this.dockV0 * Math.sqrt(remaining / this.dockS0);
      // Never faster than he was already going.
      target = Math.min(target, this.dockV0);
      // A creep over the last stretch, so it settles onto the mark crisply
      // instead of approaching it asymptotically.
      target = Math.max(target, Math.min(0.8, remaining * 3));
    }

    // --- move toward that speed -----------------------------------------
    let rate = target > this.speed ? accel : brake;
    // If STOP came very late, brake harder rather than sailing past the mark.
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
