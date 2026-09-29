import type { Track } from './track';

export interface Stop {
  id: string;
  /** distance along the loop where the engine's face should come to rest */
  at: number;
}

export interface DrivingSpec {
  /** speed on the second press of the green button, metres per second */
  cruise: number;
  /** speed on the first press — a gentle amble is still a drive */
  slow: number;
  /** speed it eases down to while rolling through a station */
  approachSpeed: number;
  /** how far out it starts easing off */
  approachRange: number;
  /** stopping anywhere inside this window counts as arriving */
  stopWindow: number;
  accel: number;
  /** deceleration with the red button pressed: a deliberate stop */
  brake: number;
  /** deceleration with no power on: a long, gentle roll to a halt */
  coast: number;
}

export type TrainEvent =
  | { type: 'arrived'; stop: Stop }
  | { type: 'departed'; stop: Stop };

/** Below this the throttle counts as centred — a four-year-old's thumb drifts. */
const DEAD_ZONE = 0.08;

/**
 * Backing up is a slow creep, taken as a fraction of the gentlest forward
 * speed so that it scales with the engine and with the grown-ups' speed
 * setting. Reverse is for easing up to a car in the yard, not for getting
 * anywhere.
 */
const REVERSE_FRACTION = 0.42;
const REVERSE_TOP = 1.8;

/** Slow enough to count as standing still, for turning round. */
const STILL = 0.02;

/**
 * The train controller. Follows the rails by itself; the child only ever
 * chooses whether it is going, stopping or backing up.
 *
 * Green sets it off and a second green press opens it up; red stops it; and
 * holding R creeps it backwards for as long as he holds it. Green and red
 * latch, because two buttons that stay where they are put is the whole reason
 * he asked for them. R never latches: letting go of it always means stopping.
 *
 * The one piece of cleverness is the docking profile: if he presses red
 * anywhere near a platform, the engine brakes along a curve that lands it
 * exactly on the mark. He feels responsible for the stop and cannot miss it.
 */
export class Train {
  distance = 0;
  speed = 0;
  wheelAngle = 0;

  /** -1 (stop now) … 0 (no power, coasting) … +1 (full power) */
  private power = 0;
  /** Which way it is going. Speed itself is never negative. */
  private dir: 1 | -1 = 1;
  /** True while he is holding R down. */
  private wantsBack = false;
  private docking: Stop | null = null;
  /** speed and gap at the moment he pressed red, which set the glide path */
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

  /** +1 forward, -1 backing up. What the wheels turn with. */
  get direction(): 1 | -1 {
    return this.dir;
  }

  /** True only while it is actually rolling backwards. */
  get reversing(): boolean {
    return this.dir === -1 && this.moving;
  }

  get atStop(): Stop | null {
    return this.restingAt;
  }

  /** Called when the green or the red button changes what it is asking for. */
  setThrottle(value: number): void {
    const v = Math.max(-1, Math.min(1, value));
    const next = Math.abs(v) < DEAD_ZONE ? 0 : v;
    const was = this.power;
    this.power = next;

    // Red means stop, whatever it is doing — including backing up.
    if (next < 0) this.wantsBack = false;

    if (next > 0) {
      // Going again cancels any arrival he had lined up.
      this.docking = null;
      this.leave();
      return;
    }

    // Pressing red near a platform means "arrive here", not "brake here".
    // Only on the way in, and only while actually rolling forward: a stop
    // asked for at a standstill must never make the engine set off.
    if (next < 0 && was >= 0) {
      this.docking = this.moving && this.dir === 1 ? this.stopAhead(this.spec.stopWindow) : null;
      if (this.docking) {
        this.dockV0 = this.speed;
        this.dockS0 = Math.max(0.1, this.track.ahead(this.distance, this.docking.at));
      }
    }
    // Coming off the power keeps an arrival that is already under way: it only
    // ever slows the engine, so it is never the game driving for him.
  }

  /**
   * Hold R and it creeps backwards; let go and it stops. Asking to back up
   * gives up everything forward, so R can be pressed at any moment without
   * having to stop first — it comes to a stand by itself on the way.
   */
  setReverse(on: boolean): void {
    if (on === this.wantsBack) return;
    this.wantsBack = on;
    if (!on) return;
    this.power = 0;
    this.docking = null;
    this.leave();
  }

  /** No longer standing at a platform, and the place should hear about it. */
  private leave(): void {
    if (!this.restingAt) return;
    this.emit({ type: 'departed', stop: this.restingAt });
    this.restingAt = null;
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

    let target = 0;
    let rate: number;

    if (this.wantsBack || this.dir === -1) {
      // --- backing up, or coming to a stand either side of it --------------
      // Whichever way it is rolling it has to stop before it can turn round,
      // so pressing or releasing R is always a stop first and a start after.
      if (this.dir === 1) {
        if (this.speed <= STILL) this.dir = -1;
      } else if (this.wantsBack) {
        target = Math.min(REVERSE_TOP, slow * REVERSE_FRACTION);
      } else if (this.speed <= STILL) {
        this.dir = 1;
      }
      rate = target > this.speed ? accel : brake;
    } else {
      // --- what speed are we aiming for ------------------------------------
      if (this.power > 0) {
        // The first press is still a proper drive, not a crawl.
        target = slow + (cruise - slow) * this.power;

        // Ease off automatically when a platform is coming up, so arriving
        // always feels unhurried even if he never touches a button.
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
        // instant he presses red — so the button visibly does something — and
        // still arrives exactly on the mark.
        target = this.dockV0 * Math.sqrt(remaining / this.dockS0);
        // Never faster than he was already going.
        target = Math.min(target, this.dockV0);
        // A creep over the last stretch, so it settles onto the mark crisply
        // instead of approaching it asymptotically.
        target = Math.max(target, Math.min(0.8, remaining * 3));
      }

      // --- move toward that speed ------------------------------------------
      // With no power on, the engine slows far more gently than it does when
      // he asks for a stop. That difference is most of what the buttons teach.
      if (target > this.speed) rate = accel;
      else rate = this.power < 0 || this.docking ? brake : coast;
      // If the stop came very late, brake harder rather than sailing past.
      if (this.docking && target < this.speed) rate = Math.max(rate, brake * 2.5);
    }

    const delta = target - this.speed;
    const ramp = rate * dt;
    this.speed += Math.abs(delta) <= ramp ? delta : Math.sign(delta) * ramp;
    if (this.speed < 0) this.speed = 0;

    if (this.speed <= 0) return;

    const step = this.speed * dt;

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

    this.distance = this.track.wrap(this.distance + this.dir * step);
    if (this.restingAt) this.restingAt = null;
  }

  /** Radians the wheels should have turned, given their radius. */
  advanceWheels(radius: number, dt: number): number {
    this.wheelAngle += (this.dir * this.speed * dt) / radius;
    return this.wheelAngle;
  }
}
