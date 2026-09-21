import type { EngineSpec } from './spec';

/**
 * The first engine, and the only one whose face is a photograph rather than
 * drawn. It is left exactly as it is because he already knows it; every engine
 * added after it is original work — see the others in this folder.
 */

const WHEEL_RADIUS = 0.62;

export const thomas: EngineSpec = {
  id: 'thomas',
  name: 'the blue one',
  nameplate: '',
  faceTexture: `${import.meta.env.BASE_URL}assets/engines/thomas/face.png`,
  colour: {
    body: 0x2f7fc9,
    bodyLight: 0x4e9bdd,
    bodyDark: 0x1e5e9b,
    trim: 0xd9573f,
    metal: 0x34404a,
    metalLight: 0x4d6273,
    brass: 0xe0a93b,
    wheelRim: 0xc64b3a,
    glass: 0xbedfef,
  },
  dims: {
    wheelRadius: WHEEL_RADIUS,
    wheelGauge: 1.05,
    faceRadius: 1.12,
  },
  driving: {
    // Deliberately unhurried. He did not pick "going fast" as something he
    // enjoys, so the top of the lever is a speed you can watch rather than
    // chase, and the bottom of the green is still a proper drive.
    cruise: 7.2,
    slow: 2.8,
    approachSpeed: 2.6,
    approachRange: 34,
    // Very wide on purpose: pulling the lever down anywhere in here arrives.
    stopWindow: 30,
    accel: 2.6,
    brake: 3.4,
    // Released, it rolls for about six seconds before it finally stands still.
    // Long enough that letting go reads as "easing off" rather than "stop".
    coast: 1.15,
  },
  audio: {
    whistleHz: 660,
    chuffsPerRev: 4,
    wheelRadius: WHEEL_RADIUS,
  },
};
