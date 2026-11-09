import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { Network } from './track';
import { CameraRig } from './cameras';

/**
 * What a pinch is allowed to do at the end of its travel.
 *
 * The first play log ended with seven pinch-outs in five seconds, which is
 * what a clamp with no feedback looks like from the outside. The view now
 * gives a little past the end and springs back, so there are three promises
 * worth holding on to: it does give, it does come back, and it comes back to
 * exactly the end of the travel rather than creeping toward it forever —
 * because `moved` compares against 1 and a view that never quite settles is a
 * view the camera button can never hand back.
 */

const MIN_ZOOM = 0.4;
const MAX_ZOOM = 2.6;

function ring() {
  const net = new Network();
  const pts: THREE.Vector3[] = [];
  for (let i = 0; i <= 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    pts.push(new THREE.Vector3(Math.cos(a) * 120, 0, Math.sin(a) * 120));
  }
  net.add('ring', pts);
  net.chain(['ring'], true);
  return net.route([{ segment: 'ring' }]);
}

function setup() {
  const track = ring();
  const rig = new CameraRig(new THREE.PerspectiveCamera(60, 1.6, 0.1, 4000), track, {
    wide: { position: new THREE.Vector3(0, 300, 400), target: new THREE.Vector3() },
    tracksideAnchors: [new THREE.Vector3(100, 2, 0)],
    yard: { position: new THREE.Vector3(30, 8, 30), target: new THREE.Vector3() },
    groundAt: () => 0,
    canopyAt: () => 0,
  });
  const pos = new THREE.Vector3(120, 0, 0);
  const fwd = new THREE.Vector3(0, 0, 1);
  const step = (seconds: number) => {
    for (let i = 0; i < Math.round(seconds * 60); i++) rig.update(1 / 60, 0, pos, fwd, false);
  };
  const zoom = () => (rig as unknown as { zoom: number }).zoom;
  /** What a pinch of two fingers moving apart by this ratio does. */
  const out = (times: number) => {
    for (let i = 0; i < times; i++) rig.pinch(0.9);
  };
  const into = (times: number) => {
    for (let i = 0; i < times; i++) rig.pinch(1 / 0.9);
  };
  return { rig, step, zoom, out, into };
}

describe('the end of a pinch', () => {
  it('gives past the end of the travel rather than stopping dead', () => {
    const { rig, zoom, out } = setup();
    out(40);
    expect(zoom()).toBeGreaterThan(MAX_ZOOM);
    expect(rig.stretched).toBe(true);
  });

  it('springs back to exactly the end of the travel once he stops pushing', () => {
    const { rig, step, zoom, out } = setup();
    out(40);
    step(1.5);
    expect(zoom()).toBe(MAX_ZOOM);
    expect(rig.stretched).toBe(false);
    // Still a view he pulled out, so the camera button still has something
    // to hand back.
    expect(rig.moved).toBe(true);
  });

  it('gives and springs back at the near end too', () => {
    const { rig, step, zoom, into } = setup();
    into(40);
    expect(zoom()).toBeLessThan(MIN_ZOOM);
    step(1.5);
    expect(zoom()).toBe(MIN_ZOOM);
    expect(rig.stretched).toBe(false);
  });

  it('never pulls a view that is inside the travel', () => {
    const { rig, step, zoom, out } = setup();
    out(4);
    const held = zoom();
    expect(held).toBeGreaterThan(1);
    expect(held).toBeLessThan(MAX_ZOOM);
    step(2);
    expect(zoom()).toBe(held);
    expect(rig.stretched).toBe(false);
  });

  it('is given back whole by the camera button', () => {
    const { rig, zoom, out } = setup();
    out(40);
    rig.recentre();
    expect(zoom()).toBe(1);
    expect(rig.stretched).toBe(false);
    expect(rig.moved).toBe(false);
  });
});
