import { describe, expect, it } from 'vitest';
import { readSettings, tunedDriving, DEFAULTS } from './settings';
import type { DrivingSpec } from './engine/train';

/**
 * A save that cannot be read must always come back as the known-good game.
 *
 * This is the one piece of stored state that can change how the engine
 * *drives*, so a value that gets through without being checked does not look
 * like a bad save — it looks like the game being broken. Everything here is
 * the shape of a save that is wrong in some particular way.
 */

const BASE: DrivingSpec = {
  cruise: 7.2,
  slow: 2.8,
  approachSpeed: 2.6,
  approachRange: 34,
  stopWindow: 30,
  accel: 2.6,
  brake: 3.4,
  coast: 1.15,
};

const save = (o: unknown) => JSON.stringify(o);

describe('reading the settings back', () => {
  it('is the game as designed when there is nothing saved', () => {
    expect(readSettings(null)).toEqual(DEFAULTS);
  });

  it('is the game as designed when the save is nonsense', () => {
    for (const raw of ['', 'not json', '[]', 'null', '42', '{"speed":']) {
      expect(readSettings(raw)).toEqual(DEFAULTS);
    }
  });

  it('keeps what a grown-up actually chose', () => {
    const s = readSettings(
      save({ speed: 1.2, stopHelp: 'less', volume: 0.5, greetingOn: false, childName: 'Orion', junctions: false, dayNight: false, quality: 'low', originalFace: false, revision: 1 }),
    );
    expect(s).toMatchObject({
      speed: 1.2,
      stopHelp: 'less',
      volume: 0.5,
      greetingOn: false,
      childName: 'Orion',
      junctions: false,
      dayNight: false,
      quality: 'low',
      originalFace: false,
    });
  });

  it('refuses a speed outside the range the panel can set', () => {
    for (const speed of [0, -1, 9, 1.6, Infinity, NaN, '1.2', null]) {
      expect(readSettings(save({ speed })).speed).toBe(DEFAULTS.speed);
    }
  });

  it('refuses a stopHelp that is not one of the three', () => {
    for (const stopHelp of ['sometimes', '', 0, null]) {
      expect(readSettings(save({ stopHelp })).stopHelp).toBe(DEFAULTS.stopHelp);
    }
  });

  it('refuses a stopHelp borrowed from the prototype chain', () => {
    // `'toString' in STOP_WINDOW` is true, so an `in` check let this through
    // and the stopping window came out NaN — the engine would then never
    // arrive anywhere, which reads as the red button being broken.
    for (const stopHelp of ['toString', 'constructor', 'hasOwnProperty', '__proto__']) {
      const s = readSettings(save({ stopHelp }));
      expect(s.stopHelp).toBe(DEFAULTS.stopHelp);
      expect(Number.isFinite(tunedDriving(BASE, s).stopWindow)).toBe(true);
    }
  });

  it('holds the volume between silent and full', () => {
    expect(readSettings(save({ volume: 5 })).volume).toBe(1);
    expect(readSettings(save({ volume: -2 })).volume).toBe(0);
    expect(readSettings(save({ volume: 'loud' })).volume).toBe(DEFAULTS.volume);
  });

  it('keeps names and nameplates to a length that fits', () => {
    const long = 'x'.repeat(200);
    const s = readSettings(save({ childName: long, nameplates: { thomas: long, pip: 7, '': 'nothing' } }));
    expect(s.childName).toHaveLength(24);
    expect(s.nameplates.thomas).toHaveLength(12);
    expect(s.nameplates.pip).toBeUndefined();
  });

  it('does not let a save hand back something that is not a nameplate', () => {
    for (const nameplates of ['plates', 7, null]) {
      expect(readSettings(save({ nameplates }))).toMatchObject({ nameplates: {} });
    }
  });

  it('an older save does not get to keep the photograph by default', () => {
    // The drawn face is the default from revision 1. A tablet saved before
    // that kept the photograph without anyone choosing it.
    expect(readSettings(save({ originalFace: false })).originalFace).toBe(true);
    expect(readSettings(save({ originalFace: false, revision: 1 })).originalFace).toBe(false);
  });
});

describe('tunedDriving', () => {
  it('scales the speeds and leaves the rest of the engine alone', () => {
    const s = { ...DEFAULTS, speed: 1.2 };
    const d = tunedDriving(BASE, s);
    expect(d.cruise).toBeCloseTo(BASE.cruise * 1.2, 6);
    expect(d.slow).toBeCloseTo(BASE.slow * 1.2, 6);
    expect(d.accel).toBe(BASE.accel);
    expect(d.brake).toBe(BASE.brake);
    expect(d.coast).toBe(BASE.coast);
  });

  it('never eases off later than a stop can be asked for', () => {
    // A wide stopping window with a short approach would brake from full speed.
    for (const stopHelp of ['more', 'normal', 'less'] as const) {
      const d = tunedDriving(BASE, { ...DEFAULTS, stopHelp });
      expect(d.approachRange).toBeGreaterThanOrEqual(d.stopWindow);
    }
  });
});
