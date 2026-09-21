import * as THREE from 'three';
import type { Track } from '../../engine/track';
import { C, UP, mat, ribbon, rock, shadowed } from '../scenery';
import { WATER_LEVEL } from '../terrain';
import { isNear, type Place, type PlaceContext } from './place';

/**
 * The bridge over the river.
 *
 * The ground under the rails is left alone here — see terrain.ts — so the
 * river really does run underneath rather than being painted on. The deck
 * carries the track across it on piers standing in the water.
 *
 * A boat works its way up and down the river. It is not going anywhere and
 * nothing happens if he misses it, but it answers a whistle, and from the
 * bridge he is looking straight down at it.
 */

/** A low wall following the track, offset to one side. */
function parapet(
  track: Track,
  offset: number,
  from: number,
  to: number,
  height: number,
  material: THREE.Material,
): THREE.Mesh {
  const steps = Math.max(8, Math.round((to - from) / 1.2));
  const pos: number[] = [];
  const idx: number[] = [];
  const p = new THREE.Vector3();
  const t = new THREE.Vector3();
  const side = new THREE.Vector3();
  for (let i = 0; i <= steps; i++) {
    const d = from + ((to - from) * i) / steps;
    track.positionAt(d, p);
    track.tangentAt(d, t);
    side.crossVectors(t, UP).normalize().multiplyScalar(offset);
    pos.push(p.x + side.x, -0.3, p.z + side.z);
    pos.push(p.x + side.x, height, p.z + side.z);
  }
  for (let i = 0; i < steps; i++) {
    const a = i * 2;
    idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  const m = new THREE.Mesh(geo, material);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

export interface BridgeSpec extends PlaceContext {
  from: number;
  to: number;
  /** the river this crosses, so the boat has somewhere to go */
  river: [number, number][];
}

export function buildBridge(ctx: BridgeSpec): Place {
  const { track, from, to, river } = ctx;
  const group = new THREE.Group();

  const stone = new THREE.MeshStandardMaterial({
    color: C.stone,
    roughness: 0.9,
    side: THREE.DoubleSide,
  });

  // The deck the ballast sits on, a touch wider than the track bed.
  const deck = ribbon(track, 4.4, -0.35, mat(C.stoneDark), from - 3, to + 3);
  deck.castShadow = true;
  group.add(deck);
  const underside = ribbon(track, 4.4, -1.5, mat(C.stoneDark, 0.95), from - 3, to + 3);
  group.add(underside);

  group.add(parapet(track, 3.9, from - 3, to + 3, 1.25, stone));
  group.add(parapet(track, -3.9, from - 3, to + 3, 1.25, stone));

  // Piers down into the water.
  const p = new THREE.Vector3();
  for (let i = 1; i <= 3; i++) {
    const d = from + ((to - from) * i) / 4;
    track.positionAt(d, p);
    const pier = new THREE.Mesh(new THREE.BoxGeometry(3.2, 14, 4.4), mat(C.stoneDark));
    pier.position.set(p.x, -7.2, p.z);
    const cutwater = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.2, 14, 3), mat(C.stoneDark));
    cutwater.position.set(p.x, -7.2, p.z);
    cutwater.rotation.y = Math.PI / 6;
    group.add(pier, cutwater);
  }

  // Rocks along the bank, at the waterline.
  const t = new THREE.Vector3();
  const side = new THREE.Vector3();
  for (let i = 0; i < 8; i++) {
    const d = from - 8 + ((to - from + 16) * i) / 7;
    track.positionAt(d, p);
    track.tangentAt(d, t);
    side.crossVectors(t, UP).normalize();
    const out = (i % 2 === 0 ? 1 : -1) * (11 + (i % 3) * 4);
    group.add(rock(p.x + side.x * out, WATER_LEVEL + 0.2, p.z + side.z * out, 1.3 + (i % 3) * 0.5));
  }

  // ---------------------------------------------------------------- boat
  const boat = new THREE.Group();
  const hull = new THREE.Mesh(new THREE.CapsuleGeometry(1.1, 4.0, 4, 10), mat(0x4a7c59));
  hull.rotation.z = Math.PI / 2;
  hull.scale.set(1, 1, 0.7);
  hull.position.y = 0.3;
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.8, 1.3, 1.6), mat(C.cream));
  cabin.position.set(-0.5, 1.4, 0);
  const funnel = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.32, 1.2, 8), mat(C.trim));
  funnel.position.set(0.7, 1.7, 0);
  boat.add(hull, cabin, funnel);
  boat.position.y = WATER_LEVEL + 0.7;
  group.add(boat);

  shadowed(group);

  // Where the boat goes: the stretch of river either side of the bridge.
  const centre = track.wrap((from + to) / 2);
  const here = track.positionAt(centre);
  let nearest = 0;
  for (let i = 0; i < river.length - 1; i++) {
    const [ax, az] = river[i];
    if ((ax - here.x) ** 2 + (az - here.z) ** 2 < (river[nearest][0] - here.x) ** 2 + (river[nearest][1] - here.z) ** 2) {
      nearest = i;
    }
  }
  const legFrom = river[Math.max(0, nearest - 1)];
  const legTo = river[Math.min(river.length - 1, nearest + 2)];

  let clock = 0;
  let along = 0;
  let direction = 1;
  let hornAt = -99;

  return {
    group,
    whistle(train) {
      if (!isNear(track, train, centre, 55)) return;
      if (clock - hornAt < 2) return;
      hornAt = clock;
      ctx.audio.horn(0.55);
    },
    update(dt, elapsed) {
      clock = elapsed;
      along += direction * dt * 0.035;
      if (along > 1) {
        along = 1;
        direction = -1;
      } else if (along < 0) {
        along = 0;
        direction = 1;
      }
      const x = legFrom[0] + (legTo[0] - legFrom[0]) * along;
      const z = legFrom[1] + (legTo[1] - legFrom[1]) * along;
      boat.position.set(x, WATER_LEVEL + 0.7 + Math.sin(elapsed * 1.1) * 0.12, z);
      boat.rotation.y =
        Math.atan2(
          (legTo[0] - legFrom[0]) * direction,
          (legTo[1] - legFrom[1]) * direction,
        ) - Math.PI / 2;
      boat.rotation.z = Math.sin(elapsed * 0.8) * 0.04;
      const since = elapsed - hornAt;
      funnel.scale.setScalar(1 + (since > 0 && since < 1.4 ? Math.sin((since / 1.4) * Math.PI) * 0.15 : 0));
    },
  };
}
