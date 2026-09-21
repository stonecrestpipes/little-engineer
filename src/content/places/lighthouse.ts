import * as THREE from 'three';
import { C, mat, person, rock, shadowed } from '../scenery';
import { buildStation } from './station';
import { frameAt, isNear, localGround, type Place, type PlaceContext } from './place';

/**
 * The Lighthouse — out along the sea wall from The Harbour, on the headland.
 *
 * The second place he has to choose to go to. Red and white, with a lamp that
 * turns all the time and gulls wheeling round the top of it. Whistle and the
 * foghorn answers, the lamp flares and spins, and the gulls scatter wider.
 */

/** Where the tower stands, on the high ground of the headland. */
const HEADLAND = new THREE.Vector3(-136, 0, -98);

export function buildLighthouse(ctx: PlaceContext): Place {
  const group = frameAt(ctx.track, ctx.at);
  const ground = localGround(group, ctx.groundAt);
  const station = buildStation({
    wall: C.white,
    roof: 0x2f6f96,
    board: 0xd9573f,
    length: 24,
    waiting: 3,
  });
  group.add(station.group);

  // ---------------------------------------------------------------- tower
  const at = group.worldToLocal(HEADLAND.clone());
  const base = ground(at.x, at.z);
  const tower = new THREE.Group();
  tower.position.set(at.x, base - 0.4, at.z);

  const H = 16;
  const stripes = 5;
  for (let i = 0; i < stripes; i++) {
    const h = H / stripes;
    const r0 = 2.9 - (i / stripes) * 1.0;
    const r1 = 2.9 - ((i + 1) / stripes) * 1.0;
    const band = new THREE.Mesh(new THREE.CylinderGeometry(r1, r0, h, 20), mat(i % 2 ? C.white : C.trim));
    band.position.y = h * i + h / 2;
    tower.add(band);
  }
  const gallery = new THREE.Mesh(new THREE.CylinderGeometry(2.5, 2.5, 0.3, 20), mat(0x2b3a45));
  gallery.position.y = H + 0.15;
  const glass = new THREE.MeshStandardMaterial({
    color: 0xfff6d8,
    emissive: 0xffd66b,
    emissiveIntensity: 0.4,
    roughness: 0.2,
  });
  const lantern = new THREE.Mesh(new THREE.CylinderGeometry(1.3, 1.3, 2.0, 12), glass);
  lantern.position.y = H + 1.3;
  const roof = new THREE.Mesh(new THREE.ConeGeometry(1.7, 1.6, 12), mat(C.trim));
  roof.position.y = H + 3.1;
  tower.add(gallery, lantern, roof);

  // The beam: two long pale cones back to back, turning round the lantern.
  const beamMat = new THREE.MeshBasicMaterial({
    color: 0xfff1b8,
    transparent: true,
    opacity: 0.16,
    depthWrite: false,
    side: THREE.DoubleSide,
    fog: false,
  });
  const beam = new THREE.Group();
  beam.position.y = H + 1.3;
  for (const s of [-1, 1]) {
    const cone = new THREE.Mesh(new THREE.ConeGeometry(3.2, 34, 16, 1, true), beamMat);
    cone.rotation.z = (s * Math.PI) / 2;
    cone.position.x = -s * 17;
    beam.add(cone);
  }
  tower.add(beam);

  // the keeper's cottage, and the keeper
  const cottage = new THREE.Group();
  cottage.position.set(4.5, 0, 5);
  const walls = new THREE.Mesh(new THREE.BoxGeometry(4.5, 3, 5), mat(C.white));
  walls.position.y = 1.5;
  const cap = new THREE.Mesh(new THREE.BoxGeometry(5, 0.5, 5.6), mat(0x2f6f96));
  cap.position.y = 3.2;
  cottage.add(walls, cap);
  tower.add(cottage);
  group.add(tower);

  const keeper = person(0x2f6f96);
  const kx = at.x + 3;
  const kz = at.z - 4;
  keeper.position.set(kx, ground(kx, kz), kz);
  // Looking back toward the railway.
  keeper.rotation.y = Math.atan2(-kx, -kz);
  group.add(keeper);

  // Rocks round the foot of the headland, where the sea comes in.
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2;
    const x = at.x + Math.cos(a) * (9 + Math.random() * 5);
    const z = at.z + Math.sin(a) * (9 + Math.random() * 5);
    group.add(rock(x, ground(x, z), z, 0.9 + Math.random() * 1.1));
  }

  shadowed(group);
  beam.traverse((o) => {
    o.castShadow = false;
    o.receiveShadow = false;
  });

  // ------------------------------------------------------------------ gulls
  interface Gull {
    bird: THREE.Group;
    wings: THREE.Object3D[];
    angle: number;
    radius: number;
    height: number;
    speed: number;
  }
  const gulls: Gull[] = [];
  const white = mat(0xf4f1e8);
  const grey = mat(0x9aa4ad);
  for (let i = 0; i < 4; i++) {
    const bird = new THREE.Group();
    bird.add(new THREE.Mesh(new THREE.SphereGeometry(0.25, 8, 6).scale(1, 0.8, 2), white));
    const wings: THREE.Object3D[] = [];
    for (const side of [-1, 1]) {
      const w = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.04, 0.4).translate(0.55, 0, 0), grey);
      w.scale.x = side;
      bird.add(w);
      wings.push(w);
    }
    tower.add(bird);
    gulls.push({
      bird,
      wings,
      angle: (i / 4) * Math.PI * 2,
      radius: 7 + i * 1.6,
      height: H + 3 + i * 1.2,
      speed: 0.35 + i * 0.05,
    });
  }

  // ------------------------------------------------------------ behaviour
  let clock = 0;
  /** Extra from a whistle: a brighter, faster lamp and wider gulls. */
  let flare = 0;
  let answered = -99;
  const ahead = new THREE.Vector3();

  return {
    group,
    stop: { id: 'lighthouse', at: ctx.at },
    arrive() {
      station.arrive();
    },
    depart() {
      station.depart();
    },
    whistle(train) {
      if (!isNear(ctx.track, train, ctx.at, 90)) return;
      flare = 1;
      // One answer at a time; the foghorn is long and would pile up.
      if (clock - answered > 3.2) {
        answered = clock;
        ctx.audio.foghorn();
      }
      if (isNear(ctx.track, train, ctx.at, 28)) station.wave();
    },
    update(dt, elapsed) {
      clock = elapsed;
      flare = Math.max(0, flare - dt * 0.3);
      beam.rotation.y += (0.5 + flare * 2.5) * dt;
      glass.emissiveIntensity = 0.4 + flare * 1.6 + Math.max(0, Math.sin(beam.rotation.y * 2)) * 0.3;
      beamMat.opacity = 0.14 + flare * 0.2;

      for (const g of gulls) {
        g.angle += g.speed * (1 + flare) * dt;
        const r = g.radius * (1 + flare * 0.6);
        g.bird.position.set(Math.cos(g.angle) * r, g.height + Math.sin(elapsed * 0.7 + g.radius) * 0.8, Math.sin(g.angle) * r);
        // Facing along the circle they are flying round.
        ahead.set(-Math.sin(g.angle), 0, Math.cos(g.angle)).add(g.bird.position);
        g.bird.lookAt(tower.localToWorld(ahead));
        const flap = Math.sin(elapsed * (flare > 0.1 ? 14 : 4) + g.radius) * 0.5;
        g.wings[0].rotation.z = flap;
        g.wings[1].rotation.z = -flap;
      }

      keeper.rotation.z = flare > 0.3 ? Math.sin(elapsed * 8) * 0.14 : 0;
      station.update(elapsed);
    },
  };
}
