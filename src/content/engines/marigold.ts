import type { EngineSpec } from './spec';

/**
 * Marigold — yellow, bright, wide awake. Original work for this project.
 *
 * Middle of the three in every way, which is the point of her: she is the one
 * to drive when he does not want a character, just a train.
 */

const WHEEL_RADIUS = 0.62;

export const marigold: EngineSpec = {
  id: 'marigold',
  name: 'the yellow one',
  nameplate: '',
  face: {
    skin: 0xf7ecdd,
    browTilt: 0.12,
    browHeight: 0.275,
    eyeSpacing: 0.245,
    eyeSize: 0.13,
    gaze: [-0.25, 0],
    smile: 0.85,
    cheeks: 0.6,
  },
  colour: {
    body: 0xe0a93b,
    bodyLight: 0xf0c25e,
    bodyDark: 0xb8812a,
    trim: 0x2f6f96,
    metal: 0x36414a,
    metalLight: 0x53646f,
    brass: 0xe7c35c,
    wheelRim: 0x2f6f96,
    glass: 0xc8e6ef,
  },
  dims: {
    wheelRadius: WHEEL_RADIUS,
    wheelGauge: 1.05,
    faceRadius: 1.12,
  },
  shape: { funnelHeight: 0.92, funnelFlare: 0.5, dome: true },
  driving: {
    cruise: 7.2,
    slow: 2.8,
    approachSpeed: 2.6,
    approachRange: 34,
    stopWindow: 30,
    accel: 2.6,
    brake: 3.4,
    coast: 1.15,
  },
  audio: {
    whistleHz: 700,
    chuffsPerRev: 4,
    wheelRadius: WHEEL_RADIUS,
  },
};
