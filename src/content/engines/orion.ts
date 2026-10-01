import type { EngineSpec } from './spec';

/**
 * The Orion Express — silver, blue, and named after the boy whose railway
 * this is.
 *
 * Every other engine here is a stubby little tank engine. This one is a
 * streamliner, after the stainless-steel trains that ran out of Chicago in
 * the nineteen-thirties: one long fluted body with a shovel nose and the
 * wheels tucked away underneath. It is the quickest thing on the railway and
 * it is the only one you can name from the other side of the layout.
 *
 * It does not burn coal, so nothing comes out of the roof, and what answers
 * the whistle button is a deep two-note horn rather than a steam whistle.
 */

const WHEEL_RADIUS = 0.5;

export const orion: EngineSpec = {
  id: 'orion',
  name: 'the silver one',
  nameplate: 'ORION',
  kind: 'streamliner',
  face: {
    skin: 0xf2efe8,
    browTilt: -0.12,
    browHeight: 0.3,
    eyeSpacing: 0.235,
    eyeSize: 0.12,
    gaze: [0, 0.02],
    smile: 0.7,
    cheeks: 0.3,
  },
  colour: {
    // Stainless, with the fluting a shade brighter again.
    body: 0xc3cad1,
    bodyLight: 0xe6ecf1,
    // Deep blue for the roof and the skirt.
    bodyDark: 0x1d3f6b,
    trim: 0x2f6fb5,
    metal: 0x39434a,
    metalLight: 0x6d7a85,
    brass: 0xc9d3db,
    wheelRim: 0x2f6fb5,
    glass: 0xbcdcf0,
  },
  dims: {
    wheelRadius: WHEEL_RADIUS,
    wheelGauge: 1.04,
    faceRadius: 1.0,
  },
  shape: {
    smoke: false,
  },
  driving: {
    // The fastest thing here, and the smoothest: it gets up to speed slowly
    // and holds it, which is what a long train does and what makes it feel
    // different to drive rather than merely look different.
    cruise: 9.0,
    slow: 3.2,
    approachSpeed: 2.8,
    approachRange: 40,
    stopWindow: 30,
    accel: 1.9,
    brake: 3.0,
    coast: 0.85,
  },
  audio: {
    // Low, for a horn rather than a whistle.
    whistleHz: 311,
    chuffsPerRev: 1,
    wheelRadius: WHEEL_RADIUS,
  },
};
