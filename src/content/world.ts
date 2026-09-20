import * as THREE from 'three';
import { Track } from '../engine/track';
import type { Stop } from '../engine/train';

export interface World {
  track: Track;
  stops: Stop[];
  tracksideAnchors: THREE.Vector3[];
  wide: { position: THREE.Vector3; target: THREE.Vector3 };
  arrive(): void;
  depart(): void;
  update(dt: number, elapsed: number): void;
}

const UP = new THREE.Vector3(0, 1, 0);

const C = {
  grass: 0x7bbc58,
  grassDark: 0x5fa349,
  grassLight: 0x96ce72,
  ballast: 0xc9a87c,
  sleeper: 0x8d6e4e,
  rail: 0xb9c0c5,
  brick: 0xc36552,
  roof: 0x6b4a3e,
  cream: 0xe4d8be,
  stone: 0xc9bca2,
  trunk: 0x8d6e4e,
  leaf: 0x4e8f3e,
  leafLight: 0x6bae52,
  trim: 0xd9573f,
  metal: 0x5e7688,
};

function mat(colour: number, rough = 0.85): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color: colour, roughness: rough, metalness: 0.02 });
}

/** A flat ribbon following the track — used for the ballast bed. */
function ribbon(track: Track, halfWidth: number, y: number, material: THREE.Material, segments = 400): THREE.Mesh {
  const pos: number[] = [];
  const idx: number[] = [];
  const p = new THREE.Vector3();
  const t = new THREE.Vector3();
  const side = new THREE.Vector3();

  for (let i = 0; i <= segments; i++) {
    const d = (i / segments) * track.length;
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

/** One steel rail, offset from the centre line. */
function rail(track: Track, offset: number, y: number, material: THREE.Material): THREE.Mesh {
  const pts: THREE.Vector3[] = [];
  const p = new THREE.Vector3();
  const t = new THREE.Vector3();
  const side = new THREE.Vector3();
  const N = 240;
  for (let i = 0; i < N; i++) {
    const d = (i / N) * track.length;
    track.positionAt(d, p);
    track.tangentAt(d, t);
    side.crossVectors(t, UP).normalize().multiplyScalar(offset);
    pts.push(new THREE.Vector3(p.x + side.x, y, p.z + side.z));
  }
  const curve = new THREE.CatmullRomCurve3(pts, true, 'centripetal', 0.5);
  const m = new THREE.Mesh(new THREE.TubeGeometry(curve, 480, 0.07, 6, true), material);
  m.castShadow = false;
  m.receiveShadow = true;
  return m;
}

function tree(x: number, z: number, scale: number): THREE.Group {
  const g = new THREE.Group();
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.46, 3.2, 8), mat(C.trunk));
  trunk.position.y = 1.6;
  const crown = new THREE.Mesh(new THREE.SphereGeometry(2.5, 12, 9), mat(C.leaf));
  crown.position.y = 4.4;
  const crownTop = new THREE.Mesh(new THREE.SphereGeometry(1.6, 10, 8), mat(C.leafLight));
  crownTop.position.set(-0.5, 5.6, -0.4);
  [trunk, crown, crownTop].forEach((m) => {
    m.castShadow = true;
    m.receiveShadow = true;
  });
  g.add(trunk, crown, crownTop);
  g.position.set(x, 0, z);
  g.scale.setScalar(scale);
  g.rotation.y = Math.random() * Math.PI;
  return g;
}

export function buildWorld(scene: THREE.Scene): World {
  // ---------------------------------------------------------------- track
  const shape = [
    [62, 4], [54, 40], [24, 62], [-20, 60], [-54, 36],
    [-62, -6], [-42, -44], [-2, -60], [38, -44],
  ];
  const track = new Track(shape.map(([x, z]) => new THREE.Vector3(x, 0, z)));

  // ---------------------------------------------------------------- ground
  const ground = new THREE.Mesh(new THREE.CircleGeometry(190, 64), mat(C.grass));
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.06;
  ground.receiveShadow = true;
  scene.add(ground);

  for (const [x, z, r, col] of [
    [-70, 70, 46, C.grassLight],
    [80, -60, 40, C.grassLight],
    [10, 110, 52, C.grassDark],
  ] as [number, number, number, number][]) {
    const patch = new THREE.Mesh(new THREE.CircleGeometry(r, 32), mat(col));
    patch.rotation.x = -Math.PI / 2;
    patch.position.set(x, -0.04, z);
    patch.receiveShadow = true;
    scene.add(patch);
  }

  // hills behind, so the horizon is not a hard line
  for (const [x, z, s] of [[-120, -90, 1], [-60, -130, 0.8], [90, -110, 1.15], [140, 20, 0.9]] as number[][]) {
    const hill = new THREE.Mesh(new THREE.SphereGeometry(34 * s, 16, 10), mat(C.grassDark));
    hill.position.set(x, -14 * s, z);
    hill.scale.y = 0.55;
    hill.receiveShadow = true;
    scene.add(hill);
  }

  // ---------------------------------------------------------------- rails
  scene.add(ribbon(track, 1.9, 0.02, mat(C.ballast)));

  const sleeperGeo = new THREE.BoxGeometry(2.7, 0.16, 0.32);
  const sleepers = new THREE.InstancedMesh(sleeperGeo, mat(C.sleeper), 260);
  sleepers.receiveShadow = true;
  const dummy = new THREE.Object3D();
  for (let i = 0; i < 260; i++) {
    const d = (i / 260) * track.length;
    const p = track.positionAt(d);
    const t = track.tangentAt(d);
    dummy.position.set(p.x, 0.09, p.z);
    dummy.rotation.y = Math.atan2(t.x, t.z);
    dummy.updateMatrix();
    sleepers.setMatrixAt(i, dummy.matrix);
  }
  sleepers.instanceMatrix.needsUpdate = true;
  scene.add(sleepers);

  const railMat = new THREE.MeshStandardMaterial({ color: C.rail, roughness: 0.4, metalness: 0.5 });
  scene.add(rail(track, 0.72, 0.2, railMat));
  scene.add(rail(track, -0.72, 0.2, railMat));

  // ---------------------------------------------------------------- station
  const STOP_AT = 118;
  const stopPos = track.positionAt(STOP_AT);
  const stopTan = track.tangentAt(STOP_AT);
  const heading = Math.atan2(stopTan.x, stopTan.z);

  const station = new THREE.Group();
  station.position.copy(stopPos);
  station.rotation.y = heading;
  scene.add(station);

  // platform runs alongside on the right-hand side of travel
  const platform = new THREE.Mesh(new THREE.BoxGeometry(5.0, 0.95, 34), mat(C.stone));
  platform.position.set(4.6, 0.47, 0);
  platform.receiveShadow = true;
  platform.castShadow = true;
  station.add(platform);

  const edge = new THREE.Mesh(new THREE.BoxGeometry(0.5, 1.0, 34), mat(C.cream));
  edge.position.set(2.35, 0.5, 0);
  station.add(edge);

  const building = new THREE.Mesh(new THREE.BoxGeometry(4.2, 4.2, 12), mat(C.brick));
  building.position.set(6.6, 3.05, 0);
  building.castShadow = true;
  building.receiveShadow = true;
  station.add(building);

  const roof = new THREE.Mesh(new THREE.BoxGeometry(6.4, 0.5, 13.5), mat(C.roof));
  roof.position.set(6.2, 5.35, 0);
  roof.castShadow = true;
  station.add(roof);

  const canopy = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.28, 13.5), mat(C.roof));
  canopy.position.set(3.2, 5.0, 0);
  canopy.castShadow = true;
  station.add(canopy);
  for (const z of [-5, 0, 5]) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 4.1, 8), mat(C.metal));
    post.position.set(2.8, 2.9, z);
    station.add(post);
  }

  // name board — no text, just a coloured plate he learns the shape of
  const board = new THREE.Mesh(new THREE.BoxGeometry(0.2, 1.0, 4.2), mat(C.cream));
  board.position.set(4.4, 3.2, -1);
  station.add(board);

  // lamp that lights up on arrival
  const lampGlass = new THREE.Mesh(
    new THREE.SphereGeometry(0.38, 12, 10),
    new THREE.MeshStandardMaterial({ color: 0xfff0c4, emissive: 0xffc94a, emissiveIntensity: 0 }),
  );
  lampGlass.position.set(3.6, 4.1, 6.5);
  station.add(lampGlass);
  const lampPost = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 3.4, 8), mat(C.metal));
  lampPost.position.set(3.6, 2.6, 6.5);
  station.add(lampPost);

  // the stationmaster, and his flag
  const master = new THREE.Group();
  master.position.set(4.0, 0.95, 4.2);
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.34, 0.8, 4, 10), mat(0x2c4a6e));
  body.position.y = 0.78;
  body.castShadow = true;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.33, 12, 10), mat(0xe8b98f));
  head.position.y = 1.58;
  head.castShadow = true;
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.16, 12), mat(0x2b3a45));
  cap.position.y = 1.84;
  const flagArm = new THREE.Group();
  flagArm.position.set(-0.3, 1.3, 0);
  const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.1, 6), mat(C.trunk));
  stick.position.y = 0.55;
  const flag = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.5, 0.7), mat(0x4caf50));
  flag.position.set(0, 1.0, 0.36);
  flagArm.add(stick, flag);
  master.add(body, head, cap, flagArm);
  station.add(master);

  // waiting passengers
  const folk: THREE.Group[] = [];
  const coats = [0xb8577f, 0x4a7c59, 0xf0b23e, 0x6b6fb8];
  coats.forEach((colour, i) => {
    const g = new THREE.Group();
    const b = new THREE.Mesh(new THREE.CapsuleGeometry(0.3, 0.66, 4, 10), mat(colour));
    b.position.y = 0.66;
    b.castShadow = true;
    const h = new THREE.Mesh(new THREE.SphereGeometry(0.29, 12, 10), mat(0xe8b98f));
    h.position.y = 1.32;
    h.castShadow = true;
    g.add(b, h);
    g.position.set(5.4 + (i % 2) * 0.9, 0.95, -6 + i * 3.1);
    g.scale.setScalar(i === 2 ? 0.66 : 1); // one of them is small
    station.add(g);
    folk.push(g);
  });

  // ---------------------------------------------------------------- scenery
  const trees: [number, number, number][] = [
    [88, 26, 1.1], [96, -16, 0.9], [-88, 24, 1.2], [-82, -40, 1.0],
    [-20, 92, 1.15], [26, 96, 0.95], [64, 78, 1.05], [-58, 76, 0.85],
    [12, -88, 1.1], [-34, -84, 0.95], [78, -72, 1.0],
    [24, 18, 0.8], [-18, -14, 0.9], [-36, 22, 0.75],
  ];
  for (const [x, z, s] of trees) scene.add(tree(x, z, s));

  // a fence along one stretch, so there is something to measure speed against
  const fence = new THREE.Group();
  for (let i = 0; i < 26; i++) {
    const d = 190 + i * 2.6;
    const p = track.positionAt(d);
    const t = track.tangentAt(d);
    const side = new THREE.Vector3().crossVectors(t, UP).normalize().multiplyScalar(5.2);
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.16, 1.3, 0.16), mat(0x9e7b58));
    post.position.set(p.x + side.x, 0.65, p.z + side.z);
    post.castShadow = true;
    fence.add(post);
  }
  scene.add(fence);

  // ---------------------------------------------------------------- views
  const tracksideAnchors: THREE.Vector3[] = [];
  for (const d of [30, 96, 150, 214, 280, 330]) {
    const p = track.positionAt(d);
    const t = track.tangentAt(d);
    const side = new THREE.Vector3().crossVectors(t, UP).normalize().multiplyScalar(9.5);
    tracksideAnchors.push(new THREE.Vector3(p.x + side.x, 2.6, p.z + side.z));
  }

  const wide = {
    position: new THREE.Vector3(0, 78, 132),
    target: new THREE.Vector3(0, 0, -2),
  };

  // ---------------------------------------------------------------- state
  let arrivedAt = -99;
  let waiting = false;

  return {
    track,
    stops: [{ id: 'station', at: STOP_AT }],
    tracksideAnchors,
    wide,
    arrive() {
      waiting = true;
      arrivedAt = performance.now() / 1000;
    },
    depart() {
      waiting = false;
    },
    update(_dt, elapsed) {
      const since = elapsed - arrivedAt;
      const active = waiting && since >= 0;

      // lamp warms up, flag goes up, and the small one bounces
      const glow = THREE.MathUtils.clamp(active ? since * 2.2 : 0, 0, 1);
      (lampGlass.material as THREE.MeshStandardMaterial).emissiveIntensity = glow * 1.3;

      const raise = THREE.MathUtils.clamp(active ? since * 3 : 0, 0, 1);
      flagArm.rotation.z = -raise * 1.15 + (active ? Math.sin(elapsed * 6) * 0.09 * raise : 0);

      folk.forEach((f, i) => {
        const hop = active ? Math.max(0, Math.sin(elapsed * 4 + i * 1.3)) * 0.16 : 0;
        f.position.y = 0.95 + hop;
      });

      master.rotation.y = active ? Math.sin(elapsed * 1.6) * 0.18 : 0;
    },
  };
}
