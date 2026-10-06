import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { Network } from '../../engine/track';
import { buildCrane, type CraneHandover, type CraneJob } from './crane';
import { frameAt, type PlaceContext } from './place';

/**
 * The promises the crane makes about his logs.
 *
 * The thing that actually matters here is that a bundle is never lost. It
 * lives in exactly one place at a time — the stack, the hook, or his wagon —
 * and the two ways out of a cycle are running it to the end and `settle`,
 * which is what happens when he presses green half way through a lift. Both
 * have to leave the wagon in the state the job promised.
 */

function circle() {
  const net = new Network();
  const pts: number[][] = [];
  for (let i = 0; i <= 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    pts.push([Math.cos(a) * 90, Math.sin(a) * 90]);
  }
  net.add('ring', pts.map(([x, z]) => new THREE.Vector3(x, 0, z)));
  net.chain(['ring'], true);
  return net.route([{ segment: 'ring' }]);
}

/** A crane on a circle, with a tally of which way the bundle went. */
function setup() {
  const track = circle();
  const at = 100;
  const ctx = {
    track,
    at,
    audio: {} as PlaceContext['audio'],
    groundAt: () => 0,
    roster: {} as PlaceContext['roster'],
  } as PlaceContext;
  const frame = frameAt(track, at);
  const crane = buildCrane(ctx, frame, { along: -7.4, side: -1, liftY: 1.5 });

  /** What the wagon has, as the crane believes it. */
  let full = false;
  const moves: string[] = [];
  const hands: CraneHandover = {
    fromTrain() {
      moves.push('out');
      full = false;
    },
    toTrain() {
      moves.push('in');
      full = true;
    },
  };
  return { crane, hands, moves, wagon: () => full };
}

/** Run it to a stand, or give up — a cycle that never ends is the bug. */
function finish(crane: ReturnType<typeof setup>['crane']): number {
  let frames = 0;
  while (crane.busy() && frames < 60 * 40) {
    crane.update(1 / 60);
    frames++;
  }
  return frames;
}

describe('the crane', () => {
  it('loads the wagon once, and is finished afterwards', () => {
    const { crane, hands, moves, wagon } = setup();
    expect(crane.start('load', hands)).toBe(true);
    expect(crane.busy()).toBe(true);
    // Nothing has reached the wagon yet: the hook has to get there first.
    expect(moves).toEqual([]);

    finish(crane);
    expect(crane.busy()).toBe(false);
    expect(moves).toEqual(['in']);
    expect(wagon()).toBe(true);
  });

  it('unloads it again, and the bundle goes back exactly once', () => {
    const { crane, hands, moves, wagon } = setup();
    crane.start('load', hands);
    finish(crane);
    expect(crane.start('unload', hands)).toBe(true);
    finish(crane);
    expect(moves).toEqual(['in', 'out']);
    expect(wagon()).toBe(false);
  });

  it('will not start a second job over the top of one', () => {
    const { crane, hands, moves } = setup();
    expect(crane.start('load', hands)).toBe(true);
    // Him pressing the button again, repeatedly, which he does.
    for (let i = 0; i < 5; i++) {
      crane.update(1 / 60);
      expect(crane.start('load', hands)).toBe(false);
      expect(crane.start('unload', hands)).toBe(false);
    }
    finish(crane);
    expect(moves).toEqual(['in']);
  });

  it('finishes the job when he asks to drive part way through', () => {
    // Every moment of a load, settled: wherever he interrupts it, the wagon
    // ends up full, because that is what pressing the button promised.
    for (let cut = 0; cut < 60 * 8; cut += 7) {
      const { crane, hands, moves, wagon } = setup();
      crane.start('load', hands);
      for (let i = 0; i < cut && crane.busy(); i++) crane.update(1 / 60);
      const wasBusy = crane.busy();
      crane.settle();
      expect(crane.busy()).toBe(false);
      if (wasBusy || moves.length > 0) {
        expect(moves).toEqual(['in']);
        expect(wagon()).toBe(true);
      }
    }
  });

  it('settles an unload the same way, leaving the wagon empty', () => {
    for (let cut = 0; cut < 60 * 8; cut += 7) {
      const { crane, hands, moves, wagon } = setup();
      crane.start('load', hands);
      finish(crane);
      crane.start('unload', hands);
      for (let i = 0; i < cut && crane.busy(); i++) crane.update(1 / 60);
      crane.settle();
      expect(moves).toEqual(['in', 'out']);
      expect(wagon()).toBe(false);
    }
  });

  it('lifts and puts back without ever touching the train', () => {
    const { crane, hands, moves, wagon } = setup();
    expect(crane.start('lift', hands)).toBe(true);
    finish(crane);
    expect(moves).toEqual([]);
    expect(wagon()).toBe(false);
  });

  it('comes to a stand rather than running on for ever', () => {
    for (const job of ['load', 'unload', 'lift'] as CraneJob[]) {
      const { crane, hands } = setup();
      crane.start(job, hands);
      const frames = finish(crane);
      expect(crane.busy()).toBe(false);
      // Long enough to be worth watching, short enough to press again.
      expect(frames / 60).toBeGreaterThan(4);
      expect(frames / 60).toBeLessThan(12);
    }
  });

  it('stands exactly its own reach from where the hook comes down', () => {
    const { crane } = setup();
    // The load point is on the rails, which on this curve is not x = 0 — the
    // whole reason the crane asks the route instead of assuming.
    expect(crane.over.y).toBeCloseTo(-7.4, 5);
    expect(Number.isFinite(crane.over.x)).toBe(true);
  });

  it('aims at the wagon wherever the engine in front of it leaves it', () => {
    const { crane } = setup();
    // A tank engine puts the first car 5.96 m back, the tender engine 8.81.
    // Both have to land in the middle of a wagon 5.2 m long, so being out by
    // more than a few centimetres would show as the bundle jumping when it
    // changes hands.
    // Within a hand's breadth is the bar: the bundle is 3.8 m long and the
    // wagon 5.2, so a tenth of a metre is invisible and half of one is not.
    for (const back of [-5.96, -7.4, -8.81]) {
      const hook = crane.aimFor(back);
      expect(Math.abs(hook.y - back)).toBeLessThan(0.15);
    }
  });

  it('does not reach somewhere it cannot, however far off he stops', () => {
    const { crane } = setup();
    // Well past either end: the aim is clamped, so the hook still comes down
    // over the track rather than out in the field pointing at nothing.
    for (const back of [-40, 25]) {
      const hook = crane.aimFor(back);
      expect(Math.abs(hook.y - crane.over.y)).toBeLessThanOrEqual(3.2);
    }
  });
});
