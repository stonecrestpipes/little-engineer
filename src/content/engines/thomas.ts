import type { EngineSpec } from './spec';

/**
 * The first engine, and the only one with two faces to choose between.
 *
 * It wears the drawn one by default from v0.3.1. The photograph is still here
 * and still one tap away in the grown-ups' panel, because he has known that
 * face longer than he has known this game — but the moment he takes to the
 * drawn one, deleting `faceTexture` and the file it points at closes the last
 * thing in this repository that is not original work. It is the blue tank engine with the 1 on its tanks: a tall firebox,
 * side tanks, six coupled wheels and a short stovepipe, which is the shape he
 * means when he says "train".
 *
 * Everything about it is original work for this project bar the photograph,
 * which the grown-ups' panel can swap for a drawn face at any time — see
 * `originalFace` below and *Asset and IP separation* in GAME_DESIGN.md.
 */

const WHEEL_RADIUS = 0.62;

export const thomas: EngineSpec = {
  id: 'thomas',
  name: 'the blue one',
  nameplate: '',
  kind: 'tank',
  number: 1,
  faceTexture: `${import.meta.env.BASE_URL}assets/engines/thomas/face.png`,
  // His own face, for when the photograph goes: round, kind and a little
  // surprised to see you, in keeping with the others but nobody's in particular.
  originalFace: {
    skin: 0xf0ebe2,
    browTilt: 0.2,
    browHeight: 0.31,
    eyeSpacing: 0.225,
    eyeSize: 0.125,
    gaze: [0.12, 0.04],
    smile: 0.85,
    cheeks: 0.45,
  },
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
  shape: { funnelHeight: 0.82, funnelFlare: 0.1, dome: false },
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
