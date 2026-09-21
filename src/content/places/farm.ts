import * as THREE from 'three';
import { C, flat, mat, person, pitchedRoof, shadowed, tree } from '../scenery';
import { buildStation } from './station';
import { frameAt, isNear, localGround, type Place, type PlaceContext } from './place';

/**
 * The Farm — green, a barn, hay, and sheep.
 *
 * Its signature is the sheep: whistle anywhere near and every head comes up at
 * once and they answer. This is the one place that rewards the thing he does
 * most, so it is worth more than it looks — it is the first time the world
 * talks back rather than just reacting.
 */
export function buildFarm(ctx: PlaceContext): Place {
  const group = frameAt(ctx.track, ctx.at);
  const ground = localGround(group, ctx.groundAt);
  const station = buildStation({
    wall: C.cream,
    roof: C.farmGreen,
    board: C.farmGreen,
    length: 26,
    waiting: 3,
  });
  group.add(station.group);

  // ---------------------------------------------------------------- barn
  const barn = new THREE.Group();
  barn.position.set(-19, 0, 6);
  barn.rotation.y = -0.22;
  const walls = new THREE.Mesh(new THREE.BoxGeometry(11, 5.4, 15), mat(C.trim));
  walls.position.y = 2.7;
  const barnRoof = pitchedRoof(12.4, 16, 3.4, C.slate);
  barnRoof.position.y = 5.4;
  const barnDoor = new THREE.Mesh(new THREE.BoxGeometry(0.2, 4.0, 5.0), mat(C.cream));
  barnDoor.position.set(5.55, 2.0, 0);
  barn.add(walls, barnRoof, barnDoor);
  group.add(barn);

  // Hay, stacked and loose, set back from the rails: the trackside camera
  // stands about ten metres out and a bale any nearer fills the shot.
  for (const [x, z, r] of [[-15, -9, 0], [-15, -7.1, 0], [-15, -8.05, 1]] as number[][]) {
    const bale = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 1.7, 12), mat(C.hay));
    bale.rotation.z = Math.PI / 2;
    bale.position.set(x, 0.9 + r * 1.75, z);
    group.add(bale);
  }
  const field = new THREE.Mesh(new THREE.CircleGeometry(17, 24), mat(C.hay, 0.95));
  field.rotation.x = -Math.PI / 2;
  field.position.set(-24, 0.06, -18);
  group.add(field);

  // ------------------------------------------------------------- the sheep
  interface Sheep {
    group: THREE.Group;
    neck: THREE.Group;
    phase: number;
  }
  const flock: Sheep[] = [];
  const wool = mat(0xf2efe6);
  const face = mat(0x3c3833);
  for (let i = 0; i < 7; i++) {
    const s = new THREE.Group();
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.62, 10, 8), wool);
    body.scale.set(1.35, 0.95, 1);
    body.position.y = 0.78;
    const neck = new THREE.Group();
    neck.position.set(0.78, 0.9, 0);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.27, 9, 7), face);
    head.position.set(0.24, 0, 0);
    const ear = new THREE.Mesh(new THREE.SphereGeometry(0.1, 6, 5), face);
    ear.position.set(0.1, 0.16, 0.22);
    neck.add(head, ear);
    s.add(body, neck);
    for (const [lx, lz] of [[-0.5, -0.32], [0.5, -0.32], [-0.5, 0.32], [0.5, 0.32]]) {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.62, 5), face);
      leg.position.set(lx, 0.31, lz);
      s.add(leg);
    }
    const x = -30 + (i % 4) * 5.4 + Math.random() * 2;
    const z = -26 + Math.floor(i / 4) * 6 + Math.random() * 3;
    s.position.set(x, ground(x, z), z);
    s.rotation.y = Math.random() * Math.PI * 2;
    group.add(s);
    flock.push({ group: s, neck, phase: Math.random() * Math.PI * 2 });
  }

  // the farmer, leaning on the fence
  const farmer = person(0x6b4a3e);
  const fx = -13;
  const fz = -13;
  farmer.position.set(fx, ground(fx, fz), fz);
  farmer.rotation.y = 1.2;
  group.add(farmer);

  for (const [x, z, s] of [[-38, 10, 1.15], [20, -24, 0.95], [26, 16, 1.05]]) {
    group.add(tree(x, ground(x, z), z, s));
  }

  shadowed(group);
  flat(field);

  // ------------------------------------------------------------ behaviour
  let clock = 0;
  /** Heads stay up for a moment after a whistle, then go back to the grass. */
  let lookUntil = -99;
  let answered = -99;

  return {
    group,
    stop: { id: 'farm', at: ctx.at },
    arrive() {
      station.arrive();
    },
    depart() {
      station.depart();
    },
    whistle(train) {
      if (!isNear(ctx.track, train, ctx.at, 70)) return;
      lookUntil = clock + 3.4;
      // One answer per whistle, and never a pile-up if he hammers it.
      if (clock - answered > 0.6) {
        answered = clock;
        ctx.audio.bleat();
      }
      if (isNear(ctx.track, train, ctx.at, 28)) station.wave();
    },
    update(_dt, elapsed) {
      clock = elapsed;
      const looking = elapsed < lookUntil;
      for (const s of flock) {
        // Grazing is head down and still; looking up is head up and a shuffle.
        const target = looking ? 0.95 : -0.55;
        s.neck.rotation.z += (target - s.neck.rotation.z) * 0.14;
        s.group.position.y +=
          ((looking ? Math.abs(Math.sin(elapsed * 5 + s.phase)) * 0.09 : 0) +
            ground(s.group.position.x, s.group.position.z) -
            s.group.position.y) *
          0.2;
      }
      farmer.rotation.z = looking ? Math.sin(elapsed * 8) * 0.14 : 0;
      station.update(elapsed);
    },
  };
}
