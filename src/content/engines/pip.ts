import type { EngineSpec } from './spec';

/**
 * Pip — small, green, and in a hurry. Original work for this project.
 *
 * The quickest of them off the mark and the highest whistle, with small wheels
 * that spin visibly faster than anyone else's at the same speed. Cheeky face.
 */

const WHEEL_RADIUS = 0.52;

export const pip: EngineSpec = {
  id: 'pip',
  name: 'the small green one',
  nameplate: '',
  face: {
    skin: 0xf6ead6,
    browTilt: -0.12,
    browHeight: 0.29,
    eyeSpacing: 0.215,
    eyeSize: 0.12,
    gaze: [0.35, 0],
    smile: 0.95,
    openMouth: true,
    cheeks: 0.7,
    freckles: true,
  },
  colour: {
    body: 0x3f8f52,
    bodyLight: 0x5fae6c,
    bodyDark: 0x2a6a3a,
    trim: 0xf0b23e,
    metal: 0x39434a,
    metalLight: 0x556773,
    brass: 0xe5b64a,
    wheelRim: 0xd9573f,
    glass: 0xc8e6ef,
  },
  dims: {
    wheelRadius: WHEEL_RADIUS,
    wheelGauge: 1.0,
    faceRadius: 1.08,
  },
  shape: { funnelHeight: 0.74, funnelFlare: 0.15, dome: true },
  driving: {
    cruise: 8.0,
    slow: 3.2,
    approachSpeed: 2.6,
    approachRange: 34,
    stopWindow: 30,
    accel: 3.2,
    brake: 3.8,
    coast: 1.3,
  },
  audio: {
    whistleHz: 830,
    chuffsPerRev: 4,
    wheelRadius: WHEEL_RADIUS,
  },
};
