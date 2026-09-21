import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { Network, type Route } from './track';
import { Lines } from './junction';

/**
 * A square loop, a → b → c → d, with a branch x that leaves at the end of a
 * and rejoins at the start of c, bulging out to the side instead of b.
 */
function layout(): { net: Network; main: Route; branch: Route; lines: Lines } {
  const net = new Network();
  const add = (id: string, pts: number[][]) => net.add(id, pts.map(([x, z]) => new THREE.Vector3(x, 0, z)));
  add('a', [[0, 0], [25, -2], [50, 0]]);
  add('b', [[50, 0], [52, 25], [50, 50]]);
  add('c', [[50, 50], [25, 52], [0, 50]]);
  add('d', [[0, 50], [-2, 25], [0, 0]]);
  add('x', [[50, 0], [80, 25], [50, 50]]);
  net.chain(['a', 'b', 'c', 'd'], true);
  net.join({ segment: 'a', end: 'end' }, { segment: 'x', end: 'start' });
  net.join({ segment: 'x', end: 'end' }, { segment: 'c', end: 'start' });
  const main = net.route(['a', 'b', 'c', 'd'].map((segment) => ({ segment })));
  const branch = net.route(['a', 'x', 'c', 'd'].map((segment) => ({ segment })));
  return { net, main, branch, lines: new Lines([main, branch]) };
}

describe('Lines', () => {
  it('allows switching only while short of where the loops part', () => {
    const { main, lines } = layout();
    const points = main.startOf('b');
    expect(lines.canSwitch(1, points - 1)).toBe(true);
    expect(lines.canSwitch(1, points + 1)).toBe(false);
    expect(lines.set(1, points + 1)).toBe(false);
    expect(lines.line).toBe(0);
    expect(lines.set(1, points - 1)).toBe(true);
    expect(lines.line).toBe(1);
  });

  it('changes nothing under the engine when it switches', () => {
    const { main, branch } = layout();
    const at = main.startOf('b') - 3;
    expect(main.positionAt(at).distanceTo(branch.positionAt(at))).toBeLessThan(1e-6);
  });

  it('finds the same spot on the other loop where the rails are shared', () => {
    const { main, branch, lines } = layout();
    const onC = main.startOf('c') + 10;
    const there = lines.convert(onC, 0, 1);
    expect(there).toBeCloseTo(branch.startOf('c') + 10, 6);
    expect(main.positionAt(onC).distanceTo(branch.positionAt(there))).toBeLessThan(1e-6);
    // and back again
    expect(lines.convert(there, 1, 0)).toBeCloseTo(onC, 6);
  });

  it('reads NaN for a spot the other loop does not run over', () => {
    const { main, lines } = layout();
    expect(lines.convert(main.startOf('b') + 5, 0, 1)).toBeNaN();
  });

  it('measures the loops differently once they have parted', () => {
    const { main, branch } = layout();
    expect(branch.length).toBeGreaterThan(main.length);
    expect(branch.startOf('c') - main.startOf('c')).toBeCloseTo(branch.lengthOf('x') - main.lengthOf('b'), 6);
  });
});

describe('Route', () => {
  it('turns a distance into a segment and back', () => {
    const { main } = layout();
    for (const d of [0, 12.5, main.startOf('c') + 1, main.length - 0.5]) {
      const { segment, local } = main.where(d);
      expect(main.at(segment, local)).toBeCloseTo(d, 6);
    }
  });

  it('wraps a closed loop', () => {
    const { main } = layout();
    expect(main.wrap(main.length + 3)).toBeCloseTo(3, 6);
    expect(main.wrap(-3)).toBeCloseTo(main.length - 3, 6);
    expect(main.ahead(main.length - 2, 3)).toBeCloseTo(5, 6);
  });
});
