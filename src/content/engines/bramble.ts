import type { EngineSpec } from './spec';

/**
 * Bramble — big, red, and never hurried. Original work for this project.
 *
 * The one tender engine here: no tanks at all, a tender of coal behind her,
 * and over eleven metres end to end against the others' six. That is the
 * difference he will see first and from furthest away — a tank engine is one
 * thing and a tender engine is two — and it is why she carries the biggest
 * number and the deepest whistle.
 *
 * Slowest to get going, with tall wheels and a long roll when the power comes
 * off. Kind, slightly sleepy face.
 */

const WHEEL_RADIUS = 0.72;

export const bramble: EngineSpec = {
  id: 'bramble',
  name: 'the big red one',
  nameplate: '',
  kind: 'tender',
  number: 5,
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
    body: 0xc0392b,
    bodyLight: 0xd45a46,
    bodyDark: 0x8e2318,
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
    // Engine and tender over the buffers, which is what the cars couple to.
    length: 11.4,
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
