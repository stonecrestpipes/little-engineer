import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { Shunting } from './shunting';

/**
 * The promise `settle` makes: when he presses green, the yard lets go of his
 * engine *at once* and everything is where it was going.
 *
 * The case that matters is the one the roundhouse actually uses — a chain of
 * moves, where each leg is started by the leg before it arriving. Finishing
 * only the leg in flight left the next one running, so green returned with
 * the engine still off the rails and the train drove away without it. These
 * are written against a chain rather than a single move for that reason.
 */

const straight = (fromZ: number, toZ: number): THREE.Vector3[] => [
  new THREE.Vector3(0, 0, fromZ),
  new THREE.Vector3(0, 0, (fromZ + toZ) / 2),
  new THREE.Vector3(0, 0, toZ),
];

describe('Shunting', () => {
  it('runs a move along its path and says when it gets there', () => {
    const yard = new Shunting();
    const object = new THREE.Object3D();
    let arrived = false;
    yard.start({ object, path: straight(0, 20), speed: 10, arrived: () => (arrived = true) });

    expect(yard.busy).toBe(true);
    expect(object.position.z).toBeCloseTo(0, 3);

    for (let i = 0; i < 60 * 3 && yard.busy; i++) yard.update(1 / 60);

    expect(arrived).toBe(true);
    expect(yard.busy).toBe(false);
    expect(object.position.z).toBeCloseTo(20, 1);
  });

  it('holds the object it is driving, and lets go when it is done', () => {
    const yard = new Shunting();
    const mine = new THREE.Object3D();
    const other = new THREE.Object3D();
    yard.start({ object: mine, path: straight(0, 10), speed: 10 });

    expect(yard.holds(mine)).toBe(true);
    expect(yard.holds(other)).toBe(false);

    yard.finish();
    expect(yard.holds(mine)).toBe(false);
  });

  it('a move with nowhere to go has already arrived', () => {
    const yard = new Shunting();
    let arrived = false;
    yard.start({
      object: new THREE.Object3D(),
      path: [new THREE.Vector3()],
      speed: 4,
      arrived: () => (arrived = true),
    });
    expect(arrived).toBe(true);
    expect(yard.busy).toBe(false);
  });

  it('stands still for its wait before setting off', () => {
    const yard = new Shunting();
    const object = new THREE.Object3D();
    object.position.set(99, 99, 99);
    yard.start({ object, path: straight(0, 20), speed: 10, wait: 1 });
    // Put on its mark straight away, so a move that waits does not leave the
    // object wherever it happened to be standing.
    expect(object.position.z).toBeCloseTo(0, 3);
    for (let i = 0; i < 30; i++) yard.update(1 / 60);
    expect(object.position.z).toBeCloseTo(0, 3);
  });

  it('finishes a whole chain of moves, not just the leg in flight', () => {
    const yard = new Shunting();
    const object = new THREE.Object3D();
    const legs: string[] = [];

    // The shape of the engine swap: out, then back, then home.
    yard.start({
      object,
      path: straight(0, 30),
      speed: 8,
      arrived() {
        legs.push('out');
        yard.start({
          object,
          path: straight(30, -10),
          speed: 6,
          arrived() {
            legs.push('back');
            yard.start({
              object,
              path: straight(-10, 5),
              speed: 6,
              arrived: () => legs.push('home'),
            });
          },
        });
      },
    });

    // Green, half way through the first leg.
    yard.update(1);
    expect(yard.busy).toBe(true);
    yard.finish();

    // Every leg has happened, and the yard is still. This is the whole test:
    // one pass used to leave the second leg running for another ten seconds.
    expect(legs).toEqual(['out', 'back', 'home']);
    expect(yard.busy).toBe(false);
    expect(yard.holds(object)).toBe(false);
    // And the object is at the end of the last leg, not stranded mid-path.
    expect(object.position.z).toBeCloseTo(5, 1);
  });

  it('gives up rather than spinning on a chain that never ends', () => {
    const yard = new Shunting();
    const object = new THREE.Object3D();
    let started = 0;
    const again = () => {
      started++;
      yard.start({ object, path: straight(0, 10), speed: 5, arrived: again });
    };
    again();

    yard.finish();

    // Bounded, and — the part that matters — still not busy afterwards.
    expect(yard.busy).toBe(false);
    expect(started).toBeLessThan(100);
  });

  it('finishing twice is not an error', () => {
    const yard = new Shunting();
    yard.start({ object: new THREE.Object3D(), path: straight(0, 10), speed: 5 });
    yard.finish();
    expect(() => yard.finish()).not.toThrow();
    expect(yard.busy).toBe(false);
  });
});
