import type { EngineSpec } from './spec';

/**
 * Bramble — big, maroon, and never hurried. Original work for this project.
 *
 * The deepest whistle and the slowest to get going, with tall wheels and a
 * long roll when the lever is let go. Kind, slightly sleepy face.
 */

const WHEEL_RADIUS = 0.72;

export const bramble: EngineSpec = {
  id: 'bramble',
  name: 'the big maroon one',
  nameplate: '',
  face: {
    skin: 0xf2e4d0,
    browTilt: 0.3,
    browHeight: 0.315,
    eyeSpacing: 0.235,
    eyeSize: 0.105,
    gaze: [0, 0.18],
    smile: 0.55,
    cheeks: 0.45,
  },
  colour: {
    body: 0x8e3a44,
    bodyLight: 0xa9525c,
    bodyDark: 0x6b2830,
    trim: 0xe4d8be,
    metal: 0x30383e,
    metalLight: 0x4c5a64,
    brass: 0xdaa738,
    wheelRim: 0x3f4850,
    glass: 0xc8e6ef,
  },
  dims: {
    wheelRadius: WHEEL_RADIUS,
    wheelGauge: 1.1,
    faceRadius: 1.16,
  },
  shape: { funnelHeight: 1.06, funnelFlare: 0.85, dome: true },
  driving: {
    cruise: 6.4,
    slow: 2.4,
    approachSpeed: 2.4,
    approachRange: 38,
    stopWindow: 32,
    accel: 1.9,
    brake: 2.9,
    coast: 0.85,
  },
  audio: {
    whistleHz: 452,
    chuffsPerRev: 4,
    wheelRadius: WHEEL_RADIUS,
  },
};
