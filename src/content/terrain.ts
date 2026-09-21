import * as THREE from 'three';
import type { Track } from '../engine/track';
import { C, smoothstep } from './scenery';

/**
 * The ground, as one heightmapped mesh, and one sheet of water under it.
 *
 * The water is a single flat plane across the whole map at `WATER_LEVEL`. It is
 * only visible where the ground has been dug below it — the river channel, the
 * pond, the sea — which means the coastline is a consequence of the terrain
 * rather than a shape anyone has to draw.
 *
 * The rails are always at y = 0, so the ground is flattened to meet them along
 * a corridor either side of the track. The exceptions are the spans where the
 * railway is carried over the ground or bored through it — the bridge and the
 * tunnel — where the corridor is left alone so the river can run underneath and
 * the hill can close over the top.
 */

/**
  * Where the water sits. High enough that a quay wall is something a boat
  * could be tied to rather than a cliff, and low enough that the countryside
  * never dips below it and puddles on the grass — see `natural` below.
  */
export const WATER_LEVEL = -3.2;

/** Ground within this of the rails is flat; it blends back to natural by BLEND. */
const CORRIDOR = 7;
const BLEND = 19;

const MAP = 520;
const GRID = 200;

export interface Hill {
  x: number;
  z: number;
  /** how far out it reaches */
  radius: number;
  /** how high it stands above the surrounding ground */
  height: number;
}

export interface TerrainSpec {
  /** route spans where the rails are not on the ground: bridges and tunnels */
  freeSpans: { from: number; to: number }[];
  /** the river, as a centre line from source to sea */
  river: [number, number][];
  /** how deep the river runs, and how wide before it shelves out */
  riverDepth?: number;
  riverWidth?: number;
  hills: Hill[];
  /** still water inside the loop */
  ponds?: { x: number; z: number; radius: number; depth: number }[];
  /**
   * Patches levelled with the rails the same way the track corridor is — a
   * yard, a quay, anywhere that wants to be flat ground rather than country.
   */
  flats?: { x: number; z: number; radius: number; blend?: number }[];
  /** the sea: everything behind `shore` slides down to `seaDepth` by `deep` */
  shore?: number;
  deep?: number;
  seaDepth?: number;
}

export interface Terrain {
  ground: THREE.Mesh;
  water: THREE.Mesh;
  /** Ground height at a point — for standing trees, buildings and people on. */
  heightAt(x: number, z: number): number;
  /** How far a point is from the rails, so nothing is planted on them. */
  distanceToTrack(x: number, z: number): number;
}

/** Nearest point on the track, found through a coarse grid of samples. */
class TrackProximity {
  private readonly cell = 24;
  private readonly buckets = new Map<number, number[]>();
  private readonly xs: number[] = [];
  private readonly zs: number[] = [];
  private readonly ds: number[] = [];

  /**
   * The first track is the main line, and `at` is measured along it. Samples
   * from any other line (a branch) report an `at` far outside every free span,
   * since only the main line has bridges or tunnels to lift the ground for.
   */
  constructor(tracks: Track[], step = 1.5) {
    const p = new THREE.Vector3();
    tracks.forEach((track, line) => {
      const n = Math.max(2, Math.round(track.length / step));
      for (let i = 0; i < n; i++) {
        const d = (i / n) * track.length;
        track.positionAt(d, p);
        const index = this.xs.length;
        this.xs.push(p.x);
        this.zs.push(p.z);
        this.ds.push(line === 0 ? d : -1e6);
        const key = this.key(p.x, p.z);
        const bucket = this.buckets.get(key);
        if (bucket) bucket.push(index);
        else this.buckets.set(key, [index]);
      }
    });
  }

  private key(x: number, z: number): number {
    return (Math.floor(x / this.cell) + 2048) * 4096 + (Math.floor(z / this.cell) + 2048);
  }

  /** Distance to the rails, and how far along the route the nearest point is. */
  nearest(x: number, z: number): { distance: number; at: number } {
    let best = Infinity;
    let bestAt = 0;
    const cx = Math.floor(x / this.cell);
    const cz = Math.floor(z / this.cell);
    for (let ix = cx - 1; ix <= cx + 1; ix++) {
      for (let iz = cz - 1; iz <= cz + 1; iz++) {
        const bucket = this.buckets.get((ix + 2048) * 4096 + (iz + 2048));
        if (!bucket) continue;
        for (const i of bucket) {
          const dx = this.xs[i] - x;
          const dz = this.zs[i] - z;
          const d2 = dx * dx + dz * dz;
          if (d2 < best) {
            best = d2;
            bestAt = this.ds[i];
          }
        }
      }
    }
    return { distance: Math.sqrt(best), at: bestAt };
  }
}

/** Distance from a point to a polyline, in the ground plane. */
export function distanceToPath(path: [number, number][], x: number, z: number): number {
  let best = Infinity;
  for (let i = 0; i < path.length - 1; i++) {
    const [ax, az] = path[i];
    const [bx, bz] = path[i + 1];
    const vx = bx - ax;
    const vz = bz - az;
    const len2 = vx * vx + vz * vz;
    const t = len2 === 0 ? 0 : THREE.MathUtils.clamp(((x - ax) * vx + (z - az) * vz) / len2, 0, 1);
    const dx = x - (ax + vx * t);
    const dz = z - (az + vz * t);
    const d = Math.sqrt(dx * dx + dz * dz);
    if (d < best) best = d;
  }
  return best;
}

/** `tracks[0]` is the main line; any others are branches laid on the ground. */
export function buildTerrain(tracks: Track[], spec: TerrainSpec): Terrain {
  const {
    freeSpans,
    river,
    riverDepth = 10,
    riverWidth = 7,
    hills,
    ponds = [],
    flats = [],
    shore = -106,
    deep = -146,
    seaDepth = 16,
  } = spec;

  const near = new TrackProximity(tracks);

  /** Whether the rails at this point along the route are off the ground. */
  const carried = (at: number): number => {
    let most = 0;
    for (const span of freeSpans) {
      // Feathered at the ends so the ground does not step where a bridge
      // meets an embankment.
      const inside = Math.min(
        smoothstep(span.from - 9, span.from + 5, at),
        1 - smoothstep(span.to - 5, span.to + 9, at),
      );
      if (inside > most) most = inside;
    }
    return most;
  };

  /** The shape of the country, before the railway is allowed a say. */
  const natural = (x: number, z: number): number => {
    // Biased upward by more than the waves can take away, so no fold of the
    // countryside ever drops below the water and fills with it.
    let h =
      1.5 +
      1.7 * Math.sin(x / 34) * Math.cos(z / 39) +
      1.2 * Math.sin((x + z) / 27) +
      0.8 * Math.cos((x - z) / 22);

    for (const hill of hills) {
      const dx = x - hill.x;
      const dz = z - hill.z;
      const r = Math.sqrt(dx * dx + dz * dz) / hill.radius;
      if (r < 1) {
        const f = 1 - r * r;
        h += hill.height * f * f;
      }
    }

    for (const pond of ponds) {
      const dx = x - pond.x;
      const dz = z - pond.z;
      const r = Math.sqrt(dx * dx + dz * dz);
      h -= pond.depth * (1 - smoothstep(pond.radius * 0.35, pond.radius, r));
    }

    h -= riverDepth * (1 - smoothstep(riverWidth, riverWidth + 18, distanceToPath(river, x, z)));
    h -= seaDepth * smoothstep(shore, deep, z);
    return h;
  };

  /** Natural ground, pulled level with the rails wherever they run on it. */
  const heightAt = (x: number, z: number): number => {
    const h = natural(x, z);
    const { distance, at } = near.nearest(x, z);
    let grip = Number.isFinite(distance)
      ? (1 - smoothstep(CORRIDOR, BLEND, distance)) * (1 - carried(at))
      : 0;
    for (const flat of flats) {
      const dx = x - flat.x;
      const dz = z - flat.z;
      const r = Math.sqrt(dx * dx + dz * dz);
      grip = Math.max(grip, 1 - smoothstep(flat.radius, flat.radius + (flat.blend ?? 14), r));
    }
    return h * (1 - grip);
  };

  // ------------------------------------------------------------------ mesh
  const geo = new THREE.PlaneGeometry(MAP, MAP, GRID, GRID);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position as THREE.BufferAttribute;
  const colour = new Float32Array(pos.count * 3);

  const grass = new THREE.Color(C.grass);
  const grassDark = new THREE.Color(C.grassDark);
  const grassLight = new THREE.Color(C.grassLight);
  const sand = new THREE.Color(C.sand);
  const rockCol = new THREE.Color(C.rock);
  const tmp = new THREE.Color();

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    const y = heightAt(x, z);
    pos.setY(i, y);

    // Painted by height: sand at the waterline, grass above, rock up top.
    tmp.copy(grass);
    tmp.lerp(grassLight, smoothstep(2, 9, y) * 0.55);
    tmp.lerp(grassDark, smoothstep(0, -3, y) * 0.5);
    tmp.lerp(sand, 1 - smoothstep(WATER_LEVEL, WATER_LEVEL + 2.6, y));
    tmp.lerp(rockCol, smoothstep(15, 27, y) * 0.75);
    colour[i * 3] = tmp.r;
    colour[i * 3 + 1] = tmp.g;
    colour[i * 3 + 2] = tmp.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colour, 3));
  geo.computeVertexNormals();

  const ground = new THREE.Mesh(
    geo,
    new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.94, metalness: 0 }),
  );
  ground.receiveShadow = true;

  // ----------------------------------------------------------------- water
  const water = new THREE.Mesh(
    new THREE.PlaneGeometry(MAP * 1.6, MAP * 1.6, 1, 1),
    new THREE.MeshStandardMaterial({
      color: C.water,
      roughness: 0.22,
      metalness: 0.15,
      transparent: true,
      opacity: 0.88,
    }),
  );
  water.rotation.x = -Math.PI / 2;
  water.position.y = WATER_LEVEL;
  water.receiveShadow = false;

  return {
    ground,
    water,
    heightAt,
    distanceToTrack: (x, z) => near.nearest(x, z).distance,
  };
}
