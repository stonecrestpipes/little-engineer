import * as THREE from 'three';
import type { Track } from '../../engine/track';
import { C, UP, mat, pine, rock } from '../scenery';
import { isNear, type Place, type PlaceContext } from './place';

/**
 * The tunnel through the hill.
 *
 * The ground is flattened along the rails everywhere, which means the hill
 * rises on both sides and leaves a cutting for the track to run in. The tunnel
 * is then a built thing standing in that cutting — an arch, with the hillside
 * carried over the top of it — rather than a hole punched in the terrain. That
 * is both how real tunnels look from the outside and much the easier thing to
 * build out of triangles.
 *
 * Its signature is the echo: whistle inside and it comes back twice, quieter
 * and darker each time.
 */

/** Half an ellipse, from one springing to the other over the crown. */
function archPoint(k: number, n: number, halfWidth: number, height: number): [number, number] {
  const theta = Math.PI * (1 - k / n);
  return [Math.cos(theta) * halfWidth, Math.sin(theta) * height];
}

/** Sweep an arch profile along a stretch of track. */
function sweep(
  track: Track,
  from: number,
  to: number,
  halfWidth: number,
  height: number,
  material: THREE.Material,
  rings = 10,
): { mesh: THREE.Mesh; profiles: THREE.Vector3[][] } {
  const steps = Math.max(6, Math.round((to - from) / 2));
  const profiles: THREE.Vector3[][] = [];
  const p = new THREE.Vector3();
  const t = new THREE.Vector3();
  const side = new THREE.Vector3();

  for (let i = 0; i <= steps; i++) {
    const d = from + ((to - from) * i) / steps;
    track.positionAt(d, p);
    track.tangentAt(d, t);
    side.crossVectors(t, UP).normalize();
    const ring: THREE.Vector3[] = [];
    for (let k = 0; k <= rings; k++) {
      const [s, y] = archPoint(k, rings, halfWidth, height);
      ring.push(new THREE.Vector3(p.x + side.x * s, y, p.z + side.z * s));
    }
    profiles.push(ring);
  }

  const pos: number[] = [];
  const idx: number[] = [];
  for (const ring of profiles) for (const v of ring) pos.push(v.x, v.y, v.z);
  const perRing = rings + 1;
  for (let i = 0; i < steps; i++) {
    for (let k = 0; k < rings; k++) {
      const a = i * perRing + k;
      const b = a + perRing;
      idx.push(a, b, a + 1, a + 1, b, b + 1);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  return { mesh: new THREE.Mesh(geo, material), profiles };
}

/** The flat face at each end, between the inner arch and the outer one. */
function portal(inner: THREE.Vector3[], outer: THREE.Vector3[], material: THREE.Material): THREE.Mesh {
  const pos: number[] = [];
  const idx: number[] = [];
  for (let k = 0; k < inner.length; k++) {
    pos.push(inner[k].x, inner[k].y, inner[k].z);
    pos.push(outer[k].x, outer[k].y, outer[k].z);
  }
  for (let k = 0; k < inner.length - 1; k++) {
    const a = k * 2;
    idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  return new THREE.Mesh(geo, material);
}

export interface TunnelSpec extends PlaceContext {
  from: number;
  to: number;
}

export function buildTunnel(ctx: TunnelSpec): Place {
  const { track, from, to } = ctx;
  const group = new THREE.Group();

  // Big for a tunnel, and deliberately so: the follow camera rides 6.4 m above
  // the rails, and an arch scaled to the engine puts it inside the masonry.
  const INNER_W = 4.3;
  const INNER_H = 7.8;
  const OUTER_W = 9.0;
  const OUTER_H = 11.8;

  // Inside: dark, and lit from within, so the arch reads as depth.
  const lining = new THREE.MeshStandardMaterial({
    color: 0x4a423c,
    roughness: 1,
    side: THREE.BackSide,
  });
  const bore = sweep(track, from, to, INNER_W, INNER_H, lining, 12);
  group.add(bore.mesh);

  // Outside: a grassy mound, because the hillside carries on over the top.
  const mound = sweep(track, from, to, OUTER_W, OUTER_H, mat(C.grassDark, 0.96), 12);
  mound.mesh.castShadow = true;
  mound.mesh.receiveShadow = true;
  group.add(mound.mesh);

  // Stone faces at each end, with the arch cut out of them.
  const stone = new THREE.MeshStandardMaterial({
    color: C.stoneDark,
    roughness: 0.92,
    side: THREE.DoubleSide,
  });
  const first = 0;
  const last = bore.profiles.length - 1;
  group.add(portal(bore.profiles[first], mound.profiles[first], stone));
  group.add(portal(bore.profiles[last], mound.profiles[last], stone));

  // Dressing on the hillside: conifers and a scatter of rock, standing on the
  // real ground so they follow the cutting rather than floating over it.
  const p = new THREE.Vector3();
  const t = new THREE.Vector3();
  const side = new THREE.Vector3();
  for (let i = 0; i < 16; i++) {
    const d = from - 26 + ((to - from + 52) * i) / 15;
    track.positionAt(d, p);
    track.tangentAt(d, t);
    side.crossVectors(t, UP).normalize();
    const out = (i % 2 === 0 ? 1 : -1) * (13 + (i % 3) * 7);
    const x = p.x + side.x * out;
    const z = p.z + side.z * out;
    const y = ctx.groundAt(x, z);
    group.add(i % 4 === 3 ? rock(x, y, z, 1.6 + (i % 3)) : pine(x, y, z, 0.9 + (i % 3) * 0.2));
  }

  const centre = track.wrap((from + to) / 2);
  const halfSpan = (to - from) / 2;

  return {
    group,
    whistle(train) {
      // Inside, or just about to be: the sound comes back.
      if (isNear(track, train, centre, halfSpan + 10)) ctx.audio.echo();
    },
  };
}
