import type { DrivingSpec } from './engine/train';

/**
 * The grown-ups' settings, and the only state in the game besides which train
 * he picked. Everything here is reached through the hidden panel in
 * src/ui/parents.ts; nothing he can see ever changes one of these.
 *
 * Every setting defaults to exactly how the game played before the panel
 * existed, so an empty or unreadable save is always the known-good game.
 */

export type StopHelp = 'more' | 'normal' | 'less';
export type Quality = 'auto' | 'high' | 'low';

export interface Settings {
  /** Scales every engine's top speed and bottom-of-the-green speed. */
  speed: number;
  /** How far out pulling the lever down still counts as arriving. */
  stopHelp: StopHelp;
  /** 0 … 1, on top of the device's own volume. */
  volume: number;
  /** Say hello out loud when the app opens. */
  greetingOn: boolean;
  /** Who the hello is addressed to. Blank says a plain hello. */
  childName: string;
  /** What is painted on each engine's side tanks, by engine id. */
  nameplates: Record<string, string>;
  /** Whether the points on the branch line are his to choose. */
  junctions: boolean;
  /** The sky slowly going round from morning to evening and back. */
  dayNight: boolean;
  /** Shadows and scenery density; 'auto' steps down if frames are slow. */
  quality: Quality;
  /** The blue engine's drawn face instead of the photograph. */
  originalFace: boolean;
}

/**
 * Bumped whenever a *default* changes in a way an already-saved tablet has to
 * pick up.
 *
 * Settings are remembered, and a remembered value beats a new default — which
 * is right for everything a grown-up actually chose, and wrong for a default
 * that has since been decided differently. Without this, changing a default
 * would silently do nothing at all on the one tablet that matters.
 */
const REVISION = 1;

export const SPEEDS = [
  { value: 0.75, label: 'Slower' },
  { value: 1, label: 'Normal' },
  { value: 1.2, label: 'Faster' },
] as const;

const STOP_WINDOW: Record<StopHelp, number> = { more: 1.5, normal: 1, less: 0.6 };

const DEFAULTS: Settings = {
  speed: 1,
  stopHelp: 'normal',
  volume: 0.85,
  greetingOn: true,
  childName: 'Orion',
  nameplates: {},
  junctions: true,
  dayNight: true,
  quality: 'auto',
  originalFace: true,
};

const SAVE_KEY = 'little-engineer:settings';

type Listener = (s: Settings) => void;

function load(): Settings {
  const s: Settings = { ...DEFAULTS, nameplates: {} };
  try {
    const raw = window.localStorage.getItem(SAVE_KEY);
    if (!raw) return s;
    const p = JSON.parse(raw) as Partial<Settings> & { revision?: number };
    if (typeof p.speed === 'number' && p.speed >= 0.5 && p.speed <= 1.5) s.speed = p.speed;
    if (p.stopHelp && p.stopHelp in STOP_WINDOW) s.stopHelp = p.stopHelp;
    if (typeof p.volume === 'number') s.volume = Math.max(0, Math.min(1, p.volume));
    if (typeof p.greetingOn === 'boolean') s.greetingOn = p.greetingOn;
    if (typeof p.childName === 'string') s.childName = p.childName.slice(0, 24);
    if (p.nameplates && typeof p.nameplates === 'object') {
      for (const [id, v] of Object.entries(p.nameplates)) {
        if (typeof v === 'string') s.nameplates[id] = v.slice(0, 12);
      }
    }
    if (typeof p.junctions === 'boolean') s.junctions = p.junctions;
    if (typeof p.dayNight === 'boolean') s.dayNight = p.dayNight;
    // The drawn face is the default from revision 1. A tablet saved before
    // that kept the photograph without anyone choosing it, so an older save
    // does not get to hold on to it.
    const saved = typeof p.revision === 'number' ? p.revision : 0;
    if (saved >= 1 && typeof p.originalFace === 'boolean') s.originalFace = p.originalFace;
    if (p.quality === 'auto' || p.quality === 'high' || p.quality === 'low') s.quality = p.quality;
  } catch {
    // Unreadable or blocked storage: the defaults are the game as designed.
  }
  return s;
}

class SettingsStore {
  private state = load();
  private listeners: Listener[] = [];

  get(): Readonly<Settings> {
    return this.state;
  }

  set(patch: Partial<Settings>): void {
    this.state = { ...this.state, ...patch };
    try {
      window.localStorage.setItem(SAVE_KEY, JSON.stringify({ ...this.state, revision: REVISION }));
    } catch {
      // Still applies for this session; it just will not be remembered.
    }
    for (const fn of this.listeners) fn(this.state);
  }

  reset(): void {
    this.set({ ...DEFAULTS, nameplates: {} });
  }

  onChange(fn: Listener): void {
    this.listeners.push(fn);
  }
}

export const settings = new SettingsStore();

/** An engine's own driving numbers, adjusted by the grown-ups' settings. */
export function tunedDriving(base: DrivingSpec, s: Readonly<Settings>): DrivingSpec {
  const w = STOP_WINDOW[s.stopHelp];
  return {
    ...base,
    cruise: base.cruise * s.speed,
    slow: base.slow * s.speed,
    stopWindow: base.stopWindow * w,
    // The easing-off has to start at least as far out as a stop can be asked
    // for, or a wide window would brake from full speed.
    approachRange: Math.max(base.approachRange, base.stopWindow * w + 4),
  };
}
