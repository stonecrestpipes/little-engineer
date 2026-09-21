import * as THREE from 'three';
import type { Track } from '../engine/track';

/**
 * The bits of railway and countryside that more than one place needs.
 *
 * Everything here is built from boxes, cylinders and spheres in code. There is
 * no modelling pipeline and no mesh to download, which is most of why the whole
 * game fits in a cache and runs in flight mode.
 */

export const UP = new THREE.Vector3(0, 1, 0);

export const C = {
  grass: 0x7bbc58,
  grassDark: 0x5fa349,
  grassLight: 0x96ce72,
  sand: 0xdcc79a,
  rock: 0x9c9384,
  ballast: 0xc9a87c,
  sleeper: 0x8d6e4e,
  rail: 0xb9c0c5,
  brick: 0xc36552,
  brickDark: 0x9e4a3c,
  roof: 0x6b4a3e,
  slate: 0x5b6570,
  cream: 0xe4d8be,
  stone: 0xc9bca2,
  stoneDark: 0xa99c84,
  trunk: 0x8d6e4e,
  leaf: 0x4e8f3e,
  leafLight: 0x6bae52,
  pine: 0x2f6b3d,
  trim: 0xd9573f,
  metal: 0x5e7688,
  water: 0x3f86a8,
  harbourBlue: 0x2f6f96,
  farmGreen: 0x4d8f4a,
  hay: 0xdcc257,
  white: 0xf4f1e8,
} as const;

export function mat(colour: number, rough = 0.85): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color: colour, roughness: rough, metalness: 0.02 });
}

/**
 * Something lying flat on the ground — a road, a field, a painted marking. It
 * takes shadows but never casts one, because a flat thing's shadow just reads
 * as a second flat thing a few metres away.
 */
export function flat<T extends THREE.Object3D>(o: T): T {
  o.traverse((m) => {
    if ((m as THREE.Mesh).isMesh) {
      m.castShadow = false;
      m.receiveShadow = true;
    }
  });
  return o;
}

export function shadowed<T extends THREE.Object3D>(o: T): T {
  o.traverse((m) => {
    if ((m as THREE.Mesh).isMesh) {
      m.castShadow = true;
      m.receiveShadow = true;
    }
  });
  return o;
}

/** A flat ribbon following the track — the ballast bed, and bridge decks. */
export function ribbon(
  track: Track,
  halfWidth: number,
  y: number,
  material: THREE.Material,
  from = 0,
  to = track.length,
  segments = Math.max(8, Math.round((to - from) / 1.2)),
): THREE.Mesh {
  const pos: number[] = [];
  const idx: number[] = [];
  const p = new THREE.Vector3();
  const t = new THREE.Vector3();
  const side = new THREE.Vector3();

  for (let i = 0; i <= segments; i++) {
    const d = from + ((to - from) * i) / segments;
    track.positionAt(d, p);
    track.tangentAt(d, t);
    side.crossVectors(t, UP).normalize().multiplyScalar(halfWidth);
    pos.push(p.x - side.x, y, p.z - side.z);
    pos.push(p.x + side.x, y, p.z + side.z);
  }
  for (let i = 0; i < segments; i++) {
    const a = i * 2;
    idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  const m = new THREE.Mesh(geo, material);
  m.receiveShadow = true;
  return m;
}

/** One steel rail, offset from the centre line. A branch passes `closed` false. */
export function rail(
  track: Track,
  offset: number,
  y: number,
  material: THREE.Material,
  closed = true,
): THREE.Mesh {
  const pts: THREE.Vector3[] = [];
  const p = new THREE.Vector3();
  const t = new THREE.Vector3();
  const side = new THREE.Vector3();
  const N = Math.max(120, Math.round(track.length / 1.6));
  // An open rail needs its last point too, or it stops short of the joint.
  for (let i = 0; i < N + (closed ? 0 : 1); i++) {
    const d = (i / N) * track.length;
    track.positionAt(d, p);
    track.tangentAt(d, t);
    side.crossVectors(t, UP).normalize().multiplyScalar(offset);
    pts.push(new THREE.Vector3(p.x + side.x, y, p.z + side.z));
  }
  const curve = new THREE.CatmullRomCurve3(pts, closed, 'centripetal', 0.5);
  const m = new THREE.Mesh(new THREE.TubeGeometry(curve, N * 2, 0.07, 6, closed), material);
  m.receiveShadow = true;
  return m;
}

/** Sleepers, as one instanced mesh for the whole railway. */
export function sleepers(track: Track, spacing = 1.5): THREE.InstancedMesh {
  const count = Math.round(track.length / spacing);
  const m = new THREE.InstancedMesh(
    new THREE.BoxGeometry(2.7, 0.16, 0.32),
    mat(C.sleeper),
    count,
  );
  m.receiveShadow = true;
  const dummy = new THREE.Object3D();
  for (let i = 0; i < count; i++) {
    const d = (i / count) * track.length;
    const p = track.positionAt(d);
    const t = track.tangentAt(d);
    dummy.position.set(p.x, 0.09, p.z);
    dummy.rotation.y = Math.atan2(t.x, t.z);
    dummy.updateMatrix();
    m.setMatrixAt(i, dummy.matrix);
  }
  m.instanceMatrix.needsUpdate = true;
  return m;
}

export function tree(x: number, y: number, z: number, scale: number): THREE.Group {
  const g = new THREE.Group();
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.46, 3.2, 8), mat(C.trunk));
  trunk.position.y = 1.6;
  const crown = new THREE.Mesh(new THREE.SphereGeometry(2.5, 12, 9), mat(C.leaf));
  crown.position.y = 4.4;
  const crownTop = new THREE.Mesh(new THREE.SphereGeometry(1.6, 10, 8), mat(C.leafLight));
  crownTop.position.set(-0.5, 5.6, -0.4);
  g.add(trunk, crown, crownTop);
  g.position.set(x, y, z);
  g.scale.setScalar(scale);
  g.rotation.y = Math.random() * Math.PI;
  return shadowed(g);
}

/** A conifer, for the hillside — a different silhouette at a distance. */
export function pine(x: number, y: number, z: number, scale: number): THREE.Group {
  const g = new THREE.Group();
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.34, 2.4, 6), mat(C.trunk));
  trunk.position.y = 1.2;
  g.add(trunk);
  for (let i = 0; i < 3; i++) {
    const r = 2.3 - i * 0.55;
    const cone = new THREE.Mesh(new THREE.ConeGeometry(r, 3.0, 9), mat(C.pine));
    cone.position.y = 3.0 + i * 1.7;
    g.add(cone);
  }
  g.position.set(x, y, z);
  g.scale.setScalar(scale);
  g.rotation.y = Math.random() * Math.PI;
  return shadowed(g);
}

/** A rock, for the hillside and the shore. */
export function rock(x: number, y: number, z: number, scale: number): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.DodecahedronGeometry(1, 0), mat(C.rock, 0.95));
  m.position.set(x, y, z);
  m.scale.set(scale * 1.3, scale * 0.8, scale);
  m.rotation.set(Math.random(), Math.random() * Math.PI, Math.random() * 0.4);
  return shadowed(m);
}

/**
 * A little person. Everyone in the game is the same two shapes in different
 * colours, which is enough: he reads them as people and they cost nothing.
 */
export function person(coat: number, scale = 1): THREE.Group {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.3, 0.66, 4, 10), mat(coat));
  body.position.y = 0.66;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.29, 12, 10), mat(0xe8b98f));
  head.position.y = 1.32;
  g.add(body, head);
  g.scale.setScalar(scale);
  return shadowed(g);
}

/**
 * Where one tree stands. A wood is a list of these rather than a list of
 * objects, because the whole wood is drawn as a handful of instanced meshes.
 */
export interface Planting {
  x: number;
  y: number;
  z: number;
  scale: number;
  turn?: number;
}

interface Part {
  geometry: THREE.BufferGeometry;
  material: THREE.Material;
  /** where this part sits within one plant, before it is placed and scaled */
  at: [number, number, number];
}

/**
 * One instanced mesh per part, rather than one object per tree.
 *
 * Two hundred and sixty trees built the obvious way is eight hundred draw
 * calls, twice over once shadows are counted, which a tablet will not hold at
 * sixty frames. The same wood as instances is seven.
 */
function instanced(spots: Planting[], parts: Part[]): THREE.Group {
  const group = new THREE.Group();
  const placed = new THREE.Matrix4();
  const local = new THREE.Matrix4();
  const turn = new THREE.Quaternion();
  const at = new THREE.Vector3();
  const size = new THREE.Vector3();

  for (const part of parts) {
    const mesh = new THREE.InstancedMesh(part.geometry, part.material, spots.length);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    spots.forEach((spot, i) => {
      turn.setFromAxisAngle(UP, spot.turn ?? 0);
      placed.compose(at.set(spot.x, spot.y, spot.z), turn, size.setScalar(spot.scale));
      local.makeTranslation(part.at[0], part.at[1], part.at[2]);
      mesh.setMatrixAt(i, placed.multiply(local));
    });
    mesh.instanceMatrix.needsUpdate = true;
    group.add(mesh);
  }
  return group;
}

/** A wood of the round sort. */
export function broadleaves(spots: Planting[]): THREE.Group {
  return instanced(spots, [
    { geometry: new THREE.CylinderGeometry(0.34, 0.46, 3.2, 8), material: mat(C.trunk), at: [0, 1.6, 0] },
    { geometry: new THREE.SphereGeometry(2.5, 12, 9), material: mat(C.leaf), at: [0, 4.4, 0] },
    { geometry: new THREE.SphereGeometry(1.6, 10, 8), material: mat(C.leafLight), at: [-0.5, 5.6, -0.4] },
  ]);
}

/** And a wood of the pointed sort, for the high ground. */
export function conifers(spots: Planting[]): THREE.Group {
  const parts: Part[] = [
    { geometry: new THREE.CylinderGeometry(0.22, 0.34, 2.4, 6), material: mat(C.trunk), at: [0, 1.2, 0] },
  ];
  const needles = mat(C.pine);
  for (let i = 0; i < 3; i++) {
    parts.push({
      geometry: new THREE.ConeGeometry(2.3 - i * 0.55, 3.0, 9),
      material: needles,
      at: [0, 3.0 + i * 1.7, 0],
    });
  }
  return instanced(spots, parts);
}

export const COATS = [0xb8577f, 0x4a7c59, 0xf0b23e, 0x6b6fb8, 0xd9573f, 0x4f8fbe];

/** A run of fence posts and rails beside the track. */
export function fenceAlong(
  track: Track,
  from: number,
  to: number,
  offset: number,
  colour = 0x9e7b58,
): THREE.InstancedMesh {
  const posts = Math.max(2, Math.round((to - from) / 2.6));
  const mesh = new THREE.InstancedMesh(
    new THREE.BoxGeometry(0.16, 1.3, 0.16),
    mat(colour),
    posts + 1,
  );
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  const side = new THREE.Vector3();
  const dummy = new THREE.Object3D();
  for (let i = 0; i <= posts; i++) {
    const d = from + ((to - from) * i) / posts;
    const p = track.positionAt(d);
    const t = track.tangentAt(d);
    side.crossVectors(t, UP).normalize().multiplyScalar(offset);
    dummy.position.set(p.x + side.x, 0.65, p.z + side.z);
    dummy.rotation.y = Math.atan2(t.x, t.z);
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
  }
  mesh.instanceMatrix.needsUpdate = true;
  return mesh;
}

/**
 * A pitched roof, as a stretched triangular prism: `width` across, `length`
 * along the ridge, sitting on y = 0. The ridge runs along z, so a roof needs
 * no turning to sit on a building built the same way round.
 */
export function pitchedRoof(
  width: number,
  length: number,
  height: number,
  colour: number,
): THREE.Mesh {
  const shape = new THREE.Shape();
  shape.moveTo(-width / 2, 0);
  shape.lineTo(width / 2, 0);
  shape.lineTo(0, height);
  shape.closePath();
  const geo = new THREE.ExtrudeGeometry(shape, { depth: length, bevelEnabled: false });
  geo.translate(0, 0, -length / 2);
  const m = new THREE.Mesh(geo, mat(colour));
  return shadowed(m);
}

/** Smooth 0→1 between two edges. The workhorse of the terrain. */
export function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = THREE.MathUtils.clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}
