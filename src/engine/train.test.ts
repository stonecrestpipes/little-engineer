import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { Network } from './track';
import { Train, type DrivingSpec, type Stop, type TrainEvent } from './train';

/**
 * The promises the buttons make to him, checked: red near a platform always
 * arrives exactly on the mark, never past it; coming off the power only ever
 * slows the engine; nothing he does at a standstill makes it move; and R can
 * be pressed at any moment without the engine ever lurching backwards while
 * it is still going forwards.
 */

const SPEC: DrivingSpec = {
  cruise: 7.2,
  slow: 2.8,
  approachSpeed: 2.6,
  approachRange: 34,
  stopWindow: 30,
  accel: 2.6,
  brake: 3.4,
  coast: 1.15,
};

function circle() {
  const net = new Network();
  const pts: number[][] = [];
  for (let i = 0; i <= 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    pts.push([Math.cos(a) * 60, Math.sin(a) * 60]);
  }
  net.add('ring', pts.map(([x, z]) => new THREE.Vector3(x, 0, z)));
  net.chain(['ring'], true);
  return net.route([{ segment: 'ring' }]);
}

function setup(stopAt = 200) {
  const track = circle();
  const stop: Stop = { id: 'here', at: stopAt };
  const train = new Train(track, SPEC, [stop]);
  const events: TrainEvent[] = [];
  train.on((e) => events.push(e));
  return { track, stop, train, events };
}

const run = (train: Train, seconds: number, step = 1 / 60) => {
  for (let t = 0; t < seconds; t += step) train.update(step);
};

describe('Train', () => {
  it('pulling down near a platform arrives exactly on the mark', () => {
    for (const gap of [4, 12, 25, 29]) {
      for (const speed of [2, 5, 7.2]) {
        const { train, stop, events } = setup();
        train.distance = stop.at - gap;
        train.speed = speed;
        train.setThrottle(-1);
        let furthest = 0;
        for (let i = 0; i < 60 * 30 && !train.atStop; i++) {
          train.update(1 / 60);
          furthest = Math.max(furthest, train.distance);
        }
        expect(train.atStop?.id, `gap ${gap}, speed ${speed}`).toBe('here');
        expect(train.distance).toBe(stop.at);
        expect(furthest).toBeLessThanOrEqual(stop.at);
        expect(events.filter((e) => e.type === 'arrived')).toHaveLength(1);
      }
    }
  });

  it('pulling down far from a platform just stops, without arriving', () => {
    const { train, stop, events } = setup();
    train.distance = stop.at - 80;
    train.speed = 6;
    train.setThrottle(-1);
    run(train, 10);
    expect(train.speed).toBe(0);
    expect(train.atStop).toBeNull();
    expect(events).toHaveLength(0);
  });

  it('letting go only ever slows it down, and it rolls to a halt', () => {
    const { train } = setup(9999);
    train.distance = 10;
    train.speed = 7;
    train.setThrottle(0);
    let last = train.speed;
    for (let i = 0; i < 60 * 10; i++) {
      train.update(1 / 60);
      expect(train.speed).toBeLessThanOrEqual(last);
      last = train.speed;
    }
    expect(train.speed).toBe(0);
  });

  it('never moves off from a standstill unless pushed up', () => {
    const { train, stop } = setup();
    train.distance = stop.at - 10;
    train.speed = 0;
    for (const v of [-1, -0.5, 0, 0.05]) {
      train.setThrottle(v);
      run(train, 2);
      expect(train.distance).toBe(stop.at - 10);
    }
  });

  it('pushing up leaves a platform and says so', () => {
    const { train, stop, events } = setup();
    train.distance = stop.at - 5;
    train.speed = 3;
    train.setThrottle(-1);
    run(train, 5);
    expect(train.atStop?.id).toBe('here');
    train.setThrottle(1);
    run(train, 2);
    expect(train.distance).toBeGreaterThan(stop.at);
    expect(events.map((e) => e.type)).toEqual(['arrived', 'departed']);
  });

  it('ignores a stop that is not on the line it is driving', () => {
    const track = circle();
    const train = new Train(track, SPEC, [{ id: 'elsewhere', at: NaN }]);
    train.distance = 100;
    train.speed = 5;
    train.setThrottle(-1);
    run(train, 5);
    expect(train.atStop).toBeNull();
    expect(Number.isFinite(train.distance)).toBe(true);
  });
  it('a further press of green is faster than the one before', () => {
    const gentle = setup(9999);
    gentle.train.setThrottle(0.22);
    run(gentle.train, 10);
    const full = setup(9999);
    full.train.setThrottle(1);
    run(full.train, 10);
    expect(gentle.train.speed).toBeGreaterThan(1);
    expect(full.train.speed).toBeGreaterThan(gentle.train.speed * 1.5);
  });

  it('holding R backs it up at about first-notch speed, and letting go brings it to a stand', () => {
    const { train } = setup(9999);
    train.distance = 100;
    train.setReverse(true);
    run(train, 4);
    expect(train.reversing).toBe(true);
    expect(train.direction).toBe(-1);
    expect(train.distance).toBeLessThan(100);
    // Reverse is a going-back control, not a yard creep: the play log of
    // 2026-10-06 has him backing 44 m to the sheds to change engines, which
    // took 87 seconds at the old 0.42 fraction. It should now be about as
    // quick as the gentlest press of green, and never quicker.
    expect(train.speed).toBeGreaterThan(SPEC.slow * 0.85);
    expect(train.speed).toBeLessThanOrEqual(SPEC.slow);

    const back = train.distance;
    train.setReverse(false);
    run(train, 4);
    expect(train.speed).toBe(0);
    expect(train.distance).toBeLessThan(back);
    // And it is pointing forwards again, ready for green.
    expect(train.direction).toBe(1);
  });

  it('pressing R while it is still rolling forward stops it first', () => {
    const { train } = setup(9999);
    train.distance = 100;
    train.speed = 6;
    train.setReverse(true);
    let last = train.distance;
    let turned = false;
    for (let i = 0; i < 60 * 12; i++) {
      train.update(1 / 60);
      if (train.direction === -1) turned = true;
      // Nothing may go backwards while it is still going forwards.
      if (!turned) expect(train.distance).toBeGreaterThanOrEqual(last);
      last = train.distance;
    }
    expect(turned).toBe(true);
    expect(train.distance).toBeLessThan(100);
  });

  it('red stops it even while he is holding R', () => {
    const { train } = setup(9999);
    train.distance = 100;
    train.setReverse(true);
    run(train, 3);
    expect(train.reversing).toBe(true);
    train.setThrottle(-1);
    run(train, 4);
    expect(train.speed).toBe(0);
    expect(train.direction).toBe(1);
  });

  it('backing up through a platform never counts as arriving', () => {
    const { train, stop, events } = setup();
    train.distance = stop.at + 6;
    train.setReverse(true);
    run(train, 12);
    expect(train.distance).toBeLessThan(stop.at);
    expect(train.atStop).toBeNull();
    expect(events.filter((e) => e.type === 'arrived')).toHaveLength(0);
  });

  it('backing away from a platform says he has left it', () => {
    const { train, stop, events } = setup();
    train.distance = stop.at - 5;
    train.speed = 3;
    train.setThrottle(-1);
    run(train, 5);
    expect(train.atStop?.id).toBe('here');
    train.setReverse(true);
    expect(train.atStop).toBeNull();
    expect(events.map((e) => e.type)).toEqual(['arrived', 'departed']);
  });
});
