import * as THREE from 'three';

/**
 * Stock moving under its own steam, off the train.
 *
 * Everything else in this game is placed from one number — how far the train
 * has got along the route — and that is right for the train and useless for a
 * yard, where an engine has to come out of a shed, run forward past its own
 * cars and set back onto them. This moves an object along a path of its own,
 * at its own speed, and tells somebody when it has arrived.
 *
 * It knows nothing about engines, sheds or doors. A move is an object, a list
 * of points, a speed, and which way round the thing faces while it travels —
 * which is the whole of what "setting back" means: the same path, the same
 * direction of travel, the engine still facing the way it was.
 *
 * Nothing here is ever required of him. Everything it does can be abandoned
 * mid-move by `finish()`, which puts every object where it was going and lets
 * the ordinary machinery take over on the next frame. That is what happens if
 * he presses green half way through: he wants to drive, so he drives.
 */

export interface Move {
  object: THREE.Object3D;
  /** Where it goes, in world space. Smoothed into a curve through all of them. */
  path: THREE.Vector3[];
  /** Metres a second. */
  speed: number;
  /** +1 faces the way it is going; -1 is setting back. */
  facing?: 1 | -1;
  /** Seconds to stand still before setting off. */
  wait?: number;
  /** Called once, when it gets there. */
  arrived?(): void;
}

interface Running {
  move: Move;
  curve: THREE.CatmullRomCurve3;
  length: number;
  /** how far along, in metres; negative while it is still waiting */
  at: number;
}

/**
 * How many times `finish` will go round before deciding a chain of moves is
 * never going to end. The longest chain here is the engine swap's two legs,
 * so this is many times what any real shunt needs.
 */
const PASSES = 16;

export class Shunting {
  private readonly running: Running[] = [];
  private readonly here = new THREE.Vector3();
  private readonly ahead = new THREE.Vector3();
  private readonly look = new THREE.Vector3();

  /** True while anything is on the move. */
  get busy(): boolean {
    return this.running.length > 0;
  }

  /** Is this particular object being driven from here rather than by the train? */
  holds(object: THREE.Object3D): boolean {
    return this.running.some((r) => r.move.object === object);
  }

  start(move: Move): void {
    if (move.path.length < 2) {
      move.arrived?.();
      return;
    }
    // Centripetal, like the rails themselves: it will not loop back on itself
    // where two points of a yard road happen to sit close together.
    const curve = new THREE.CatmullRomCurve3(move.path.map((p) => p.clone()), false, 'centripetal', 0.5);
    curve.arcLengthDivisions = 400;
    const length = Math.max(0.01, curve.getLength());
    this.running.push({ move, curve, length, at: -(move.wait ?? 0) * move.speed });
    // Put it on the mark straight away, so a move that waits does not leave
    // the object wherever it happened to be standing.
    this.place(this.running[this.running.length - 1], 0);
  }

  update(dt: number): void {
    for (let i = this.running.length - 1; i >= 0; i--) {
      const r = this.running[i];
      r.at += r.move.speed * dt;
      if (r.at >= r.length) {
        this.place(r, r.length);
        this.running.splice(i, 1);
        r.move.arrived?.();
        continue;
      }
      this.place(r, Math.max(0, r.at));
    }
  }

  /**
   * Abandon everything, with every object left exactly where it was going.
   *
   * Called when he does something that matters more than the shunt — pressing
   * green, which is the one thing in this game that must always work the
   * instant he touches it.
   *
   * **When this returns, nothing is running.** That is the whole promise, and
   * it is harder than it looks, because a shunt is a chain: each leg is
   * started by the leg before it arriving. The list is copied before it is
   * walked, so that a move an `arrived` handler starts is not finished by the
   * loop it was started from — splicing underneath an iteration is how you
   * skip half a list. But it must still be finished, and for a long time it
   * was not: one pass finished the leg in flight and left its successor
   * running, so green returned with the yard still busy and the engine still
   * off the rails. The train then drove away without it — ten seconds and
   * thirty-six metres of cars with nothing on the front. So: go round again
   * until the list stays empty.
   */
  finish(): void {
    for (let pass = 0; pass < PASSES && this.running.length > 0; pass++) {
      const all = this.running.splice(0, this.running.length);
      for (const r of all) {
        this.place(r, r.length);
        r.move.arrived?.();
      }
    }
    // A chain that never ends would otherwise spin here rather than at sixty
    // frames a second. Nothing in the yard is anywhere near this long, so
    // reaching it means a cycle: drop what is left where it was going and say
    // so, because a busy yard after `finish()` is the bug this method exists
    // to prevent.
    if (this.running.length > 0) {
      const stuck = this.running.splice(0, this.running.length);
      for (const r of stuck) this.place(r, r.length);
      if (import.meta.env.DEV) {
        console.warn(
          `shunting: gave up settling after ${PASSES} passes — an arrived ` +
            'handler is starting another move every time it is called',
        );
      }
    }
  }

  private place(r: Running, at: number): void {
    const u = THREE.MathUtils.clamp(at / r.length, 0, 1);
    r.curve.getPointAt(u, this.here);
    r.curve.getTangentAt(u, this.ahead).normalize();
    if ((r.move.facing ?? 1) < 0) this.ahead.negate();
    r.move.object.position.copy(this.here);
    r.move.object.lookAt(this.look.copy(this.here).add(this.ahead));
  }
}
