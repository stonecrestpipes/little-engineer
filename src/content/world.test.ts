import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { Lines } from '../engine/junction';
import { TIGHTEST_CURVE, buildRailway, sharpestCurve } from './world';

/**
 * The railway as rails, checked without drawing any of it.
 *
 * What goes wrong in the track goes wrong silently: the rails still join up,
 * the train still follows them, and the only symptom is a four-year-old saying
 * a corner does not look right. A one-metre-twenty hairpin lived on the woods
 * branch that way for a long time. These used to be a `console.warn` in a
 * development build, which only ever reached someone with the console open.
 */

const { loops, branches } = buildRailway();

describe('the railway', () => {
  it('has a whole loop for every combination of branches', () => {
    // Four junctions, so sixteen ways round, each a closed loop from The Sheds.
    expect(loops).toHaveLength(16);
    for (const loop of loops) expect(loop.closed).toBe(true);
  });

  it('has no corner anywhere on any of the sixteen ways round', () => {
    for (const [n, loop] of loops.entries()) {
      const { radius, at } = sharpestCurve(loop);
      expect(
        radius,
        `loop ${n} turns through ${radius.toFixed(1)} m at ${at.toFixed(0)} m, on ${loop.where(at).segment}`,
      ).toBeGreaterThanOrEqual(TIGHTEST_CURVE);
    }
  });

  it('is one unbroken run of rail on every loop — no gap, no jump at a joint', () => {
    // A joint two metres out would put a step in the track that nothing
    // reports: consecutive half-metre samples are the same half metre apart
    // everywhere, unless two segments do not actually meet.
    const STEP = 0.5;
    const a = new THREE.Vector3();
    const b = new THREE.Vector3();
    for (const [n, loop] of loops.entries()) {
      let widest = 0;
      let where = 0;
      for (let d = 0; d < loop.length; d += STEP) {
        loop.positionAt(loop.wrap(d), a);
        loop.positionAt(loop.wrap(d + STEP), b);
        const gap = a.distanceTo(b);
        if (gap > widest) {
          widest = gap;
          where = d;
        }
      }
      expect(widest, `loop ${n}: ${widest.toFixed(2)} m between samples at ${where.toFixed(0)} m`).toBeLessThan(
        STEP * 1.6,
      );
    }
  });

  it('closes up: the end of every loop is where it began', () => {
    for (const [n, loop] of loops.entries()) {
      const from = loop.positionAt(0);
      const back = loop.positionAt(loop.length - 1e-3);
      expect(from.distanceTo(back), `loop ${n}`).toBeLessThan(0.5);
    }
  });

  it('starts every loop from the same place, which is what makes a switch free', () => {
    // `Lines` can only change loop while the engine is short of where they
    // part, because until then every loop is the same rails. If one of them
    // started somewhere else, a switch would move the engine.
    const home = loops[0].positionAt(5);
    for (const [n, loop] of loops.entries()) {
      expect(loop.positionAt(5).distanceTo(home), `loop ${n}`).toBeLessThan(1e-6);
    }
  });

  it('runs every branch end to end, and each one rejoins the main line', () => {
    expect(branches).toHaveLength(4);
    for (const branch of branches) expect(branch.length).toBeGreaterThan(100);
    // Every segment a branch uses is also on some whole loop, so there is a
    // way round that actually goes there.
    for (const branch of branches) {
      for (const id of branch.segments) {
        expect(loops.some((loop) => loop.has(id)), `${id} is on no loop`).toBe(true);
      }
    }
  });

  it('lets the engine move between any two loops at the start of the line', () => {
    const lines = new Lines(loops);
    for (let line = 0; line < loops.length; line++) {
      expect(lines.set(line, 1), `loop ${line}`).toBe(true);
    }
  });

  it('makes the main line the shortest way round, with every branch a detour', () => {
    const main = loops[0].length;
    for (const [n, loop] of loops.entries()) {
      expect(loop.length, `loop ${n}`).toBeGreaterThanOrEqual(main - 1e-6);
    }
  });
});
