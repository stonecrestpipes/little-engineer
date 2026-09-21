import * as THREE from 'three';
import type { Vehicle } from '../engine/consist';
import { buildEngine, type EngineMesh } from './buildEngine';
import { CARS, buildCar, type CarMesh } from './cars';
import { ENGINES, engineById } from './engines';
import { drawFace } from './faces';

/**
 * Every engine and every car, built once, and which of them he is driving.
 *
 * All of it exists from the first launch. Nothing is unlocked, nothing is
 * earned and nothing is hidden: the whole point of the yard is that he walks
 * up to it and everything is already there.
 *
 * What he chose is remembered, because coming back to find his engine put away
 * and somebody else's on the rails would be the game taking something off him.
 */

/** Over the buffers, to match `CarSpec.length`. */
export const ENGINE_LENGTH = 6.0;

/** More than this and the tail of the train is out of shot in every view. */
export const MAX_CARS = 3;

const SAVE_KEY = 'little-engineer:train';

export interface Roster {
  /** the engine on the rails */
  engine: EngineMesh;
  /** what is coupled behind it, in order */
  cars: CarMesh[];
  /** engine first, then the cars: what the consist puts on the track */
  vehicles(): Vehicle[];
  /** the ones standing in the yard */
  spareEngines(): EngineMesh[];
  spareCars(): CarMesh[];
  /** Take that engine out and put this one away in its place. */
  chooseEngine(id: string): void;
  /** Couple a car up, or take it off again if it is already on. */
  toggleCar(id: string): boolean;
  onChange(fn: () => void): void;
}

interface Saved {
  engine: string;
  cars: string[];
}

function load(): Saved {
  try {
    const raw = window.localStorage.getItem(SAVE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<Saved>;
      const engine = typeof parsed.engine === 'string' ? parsed.engine : ENGINES[0].id;
      const cars = Array.isArray(parsed.cars) ? parsed.cars.filter((c) => typeof c === 'string') : [];
      return { engine, cars: cars.slice(0, MAX_CARS) };
    }
  } catch {
    // Private windows and cleared site data both land here. Not a problem:
    // he gets the engine he started with, which is the right default anyway.
  }
  return { engine: ENGINES[0].id, cars: [] };
}

function save(state: Saved): void {
  try {
    window.localStorage.setItem(SAVE_KEY, JSON.stringify(state));
  } catch {
    // Nothing in the game depends on this having worked.
  }
}

/** A drawn face, or the one photograph the first engine still uses. */
async function faceFor(
  spec: (typeof ENGINES)[number],
  anisotropy: number,
): Promise<THREE.Texture | null> {
  if (spec.face) {
    const texture = drawFace(spec.face);
    texture.anisotropy = anisotropy;
    return texture;
  }
  if (spec.faceTexture) {
    try {
      const texture = await new THREE.TextureLoader().loadAsync(spec.faceTexture);
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.anisotropy = anisotropy;
      return texture;
    } catch {
      // No texture is not fatal: the engine gets a plain face and still drives.
      return null;
    }
  }
  return null;
}

export async function buildRoster(scene: THREE.Scene, anisotropy: number): Promise<Roster> {
  const engines = new Map<string, EngineMesh>();
  for (const spec of ENGINES) {
    const mesh = buildEngine(spec, await faceFor(spec, anisotropy));
    engines.set(spec.id, mesh);
    scene.add(mesh.group);
  }

  const cars = new Map<string, CarMesh>();
  for (const spec of CARS) {
    const mesh = buildCar(spec);
    cars.set(spec.id, mesh);
    scene.add(mesh.group);
  }

  const state = load();
  if (!engines.has(state.engine)) state.engine = ENGINES[0].id;
  state.cars = state.cars.filter((id) => cars.has(id));

  const listeners: (() => void)[] = [];
  const changed = () => {
    save(state);
    for (const fn of listeners) fn();
  };

  const roster: Roster = {
    get engine() {
      return engines.get(state.engine)!;
    },
    get cars() {
      return state.cars.map((id) => cars.get(id)!);
    },
    vehicles() {
      return [
        { object: roster.engine.group, length: ENGINE_LENGTH },
        ...roster.cars.map((c) => ({ object: c.group, length: c.spec.length })),
      ];
    },
    spareEngines() {
      return ENGINES.filter((e) => e.id !== state.engine).map((e) => engines.get(e.id)!);
    },
    spareCars() {
      return CARS.filter((c) => !state.cars.includes(c.id)).map((c) => cars.get(c.id)!);
    },
    chooseEngine(id) {
      if (!engines.has(id) || id === state.engine) return;
      state.engine = engineById(id).id;
      changed();
    },
    toggleCar(id) {
      if (!cars.has(id)) return false;
      const at = state.cars.indexOf(id);
      if (at >= 0) {
        state.cars.splice(at, 1);
      } else {
        if (state.cars.length >= MAX_CARS) return false;
        state.cars.push(id);
      }
      changed();
      return true;
    },
    onChange(fn) {
      listeners.push(fn);
    },
  };

  return roster;
}
