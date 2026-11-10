import { describe, expect, it } from 'vitest';
import { easeBy } from './scenery';

/**
 * `easeBy` exists so that an animal's head comes up in the same *time* on a
 * tablet holding sixty frames and one holding thirty. The promise is about
 * where an ease ends up after a given time, not about any one frame.
 */

/** Ease from 0 toward 1 for `seconds`, at `fps` frames a second. */
function settle(fraction: number, seconds: number, fps: number): number {
  let x = 0;
  const dt = 1 / fps;
  for (let t = 0; t < seconds - 1e-9; t += dt) x += (1 - x) * easeBy(fraction, dt);
  return x;
}

describe('easeBy', () => {
  it('is exactly the old per-frame number at sixty frames a second', () => {
    // Everything that was already tuned by eye against `* 0.14` must not move.
    for (const f of [0.06, 0.12, 0.14, 0.16, 0.2]) {
      expect(easeBy(f, 1 / 60)).toBeCloseTo(f, 12);
    }
  });

  it('takes no step when no time has passed', () => {
    expect(easeBy(0.14, 0)).toBe(0);
  });

  it('never overshoots, however long the frame', () => {
    // A frame that lasted a second must land on the target at most, not past it.
    for (const dt of [0.001, 0.016, 0.1, 1, 10]) {
      const k = easeBy(0.14, dt);
      expect(k).toBeGreaterThanOrEqual(0);
      expect(k).toBeLessThanOrEqual(1);
    }
  });

  it('gets to the same place in the same time at any frame rate', () => {
    // This is the whole point. The per-frame form it replaces reaches 99% of
    // the way in a second at 60 fps and about 90% at 30 — so the same head
    // came up visibly slower on the slower tablet.
    const at60 = settle(0.14, 1, 60);
    for (const fps of [24, 30, 45, 90, 120]) {
      expect(settle(0.14, 1, fps), `${fps} fps`).toBeCloseTo(at60, 3);
    }
  });
});
