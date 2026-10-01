import * as THREE from 'three';
import { C, flat, mat, person, shadowed, tree } from '../scenery';
import {
  clearOfRails,
  frameAt,
  isNear,
  localGround,
  railsNear,
  watching,
  type Place,
  type PlaceContext,
} from './place';
import { moving } from '../../engine/merge';

/**
 * The Ranch — out at the top of the woods branch, where the capybaras live.
 *
 * A long rail fence, a field, and a pool with capybaras in it and round it.
 * Whistle and every one of them turns its head and squeaks back, and the two
 * sitting in the water get up and wade.
 *
 * They are built out of the same handful of shapes as everything else: a
 * barrel on four stumps with a blunt square head. What makes a capybara read
 * as a capybara and not a sheep is the proportions — no neck to speak of, a
 * flat top to the muzzle, ears like two small coins, and no tail at all.
 */

/** Where the pool sits in the field, and how big. */
const POOL = { x: -21, z: 9, radius: 7.5 };

interface Capy {
  group: THREE.Group;
  head: THREE.Group;
  /** Sitting in the water rather than standing on the grass. */
  wading: boolean;
  rest: number;
  phase: number;
}

function capybara(): { group: THREE.Group; head: THREE.Group } {
  const group = new THREE.Group();
  const coat = mat(0x9c6b3f);
  const dark = mat(0x6d4725);

  // The barrel. Capybaras are mostly barrel.
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.46, 0.84, 4, 10), coat);
  body.rotation.z = Math.PI / 2;
  body.scale.set(1, 1, 0.88);
  body.position.y = 0.62;
  group.add(body);

  // Barely a neck, and a head that is nearly a brick.
  const head = new THREE.Group();
  head.position.set(0.76, 0.72, 0);
  const skull = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.42, 0.46), coat);
  skull.position.set(0.18, 0, 0);
  const muzzle = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.26, 0.34), dark);
  muzzle.position.set(0.52, -0.04, 0);
  head.add(skull, muzzle);
  for (const hand of [-1, 1] as const) {
    const ear = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.06, 8), dark);
    ear.rotation.x = Math.PI / 2;
    ear.position.set(0.02, 0.2, hand * 0.19);
    head.add(ear);
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.055, 6, 5), mat(0x2b2b2e));
    eye.position.set(0.3, 0.1, hand * 0.21);
    head.add(eye);
  }
  group.add(head);

  // Four stumps. Short enough that the barrel nearly touches the grass.
  for (const [lx, lz] of [[-0.4, -0.27], [0.42, -0.27], [-0.4, 0.27], [0.42, 0.27]]) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.13, 0.42, 6), dark);
    leg.position.set(lx, 0.21, lz);
    group.add(leg);
  }
  return { group, head };
}

export function buildRanch(ctx: PlaceContext): Place {
  const group = frameAt(ctx.track, ctx.at);
  const ground = localGround(group, ctx.groundAt);

  // ------------------------------------------------------------- the field
  const field = new THREE.Mesh(new THREE.CircleGeometry(30, 28), mat(0x9bd069, 0.95));
  field.rotation.x = -Math.PI / 2;
  field.position.set(-22, 0.06, 0);
  group.add(field);

  // A rail fence right round it — with a gap where the railway runs through,
  // which is where the circle and the line cross twice. A fence laid straight
  // across the four-foot is the first thing anybody notices.
  const rails = railsNear(group, ctx.track, ctx.at, 70);
  const posts = new THREE.Group();
  const N = 40;
  for (let i = 0; i < N; i++) {
    const a = (i / N) * Math.PI * 2;
    const x = -22 + Math.cos(a) * 29;
    const z = Math.sin(a) * 29;
    if (clearOfRails(rails, x, z) < 9) continue;
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.2, 1.5, 0.2), mat(0x9e7b58));
    post.position.set(x, ground(x, z) + 0.75, z);
    posts.add(post);
    // The rail reaches toward the next post, so a missing post leaves a gap
    // rather than a rail running off into the air.
    const next = ((i + 1) / N) * Math.PI * 2;
    const nx = -22 + Math.cos(next) * 29;
    const nz = Math.sin(next) * 29;
    if (clearOfRails(rails, nx, nz) < 9) continue;
    const span = Math.hypot(nx - x, nz - z);
    for (const h of [0.7, 1.18]) {
      const bar = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.14, span), mat(0x9e7b58));
      bar.position.set((x + nx) / 2, ground(x, z) + h, (z + nz) / 2);
      bar.rotation.y = Math.atan2(nx - x, nz - z);
      posts.add(bar);
    }
  }
  group.add(posts);

  // ------------------------------------------------------------- the pool
  // Shallow, and the surface sits a little above the field rather than being
  // sunk into it: the ground here is one levelled patch of terrain and there
  // is nothing to dig a hole in. Standing in it, a capybara is in water up to
  // its belly, which is where a capybara likes to be.
  const water = new THREE.Mesh(
    new THREE.CircleGeometry(POOL.radius, 22),
    new THREE.MeshStandardMaterial({
      color: C.water,
      roughness: 0.18,
      metalness: 0.12,
      transparent: true,
      opacity: 0.78,
    }),
  );
  water.rotation.x = -Math.PI / 2;
  water.position.set(POOL.x, 0.34, POOL.z);
  group.add(water);
  const bank = new THREE.Mesh(new THREE.RingGeometry(POOL.radius, POOL.radius + 2.2, 22), mat(C.sand, 0.95));
  bank.rotation.x = -Math.PI / 2;
  bank.position.set(POOL.x, 0.1, POOL.z);
  group.add(bank);

  // ------------------------------------------------------------ the herd
  const herd: Capy[] = [];
  const spots: [number, number, boolean][] = [
    [POOL.x - 2.4, POOL.z + 1.2, true],
    [POOL.x + 1.8, POOL.z - 2.0, true],
    [POOL.x + 7.4, POOL.z + 4.6, false],
    [POOL.x + 10.5, POOL.z - 3.2, false],
    [POOL.x - 6.8, POOL.z - 6.4, false],
    [POOL.x + 3.0, POOL.z + 9.8, false],
    [POOL.x - 9.5, POOL.z + 6.2, false],
    [POOL.x + 13.0, POOL.z + 9.0, false],
  ];
  for (const [x, z, wading] of spots) {
    const { group: c, head } = capybara();
    const rest = ground(x, z);
    c.position.set(x, rest, z);
    c.rotation.y = Math.random() * Math.PI * 2;
    group.add(c);
    herd.push({ group: c, head, wading, rest, phase: Math.random() * Math.PI * 2 });
  }

  // Someone to keep them, and a few trees for shade.
  const keeper = person(0x4a7c59);
  const kx = -4;
  const kz = -14;
  keeper.position.set(kx, ground(kx, kz), kz);
  keeper.rotation.y = -1.9;
  group.add(keeper);
  for (const [x, z, s] of [[-40, -16, 1.15], [-34, 20, 1.0], [-10, 24, 0.9]]) {
    group.add(tree(x, ground(x, z), z, s));
  }

  shadowed(group);
  flat(field);
  flat(bank);
  water.castShadow = false;
  water.receiveShadow = false;
  moving(keeper, ...herd.map((c) => c.group), ...herd.map((c) => c.head));

  // ------------------------------------------------------------ behaviour
  let clock = 0;
  let lookUntil = -99;
  let answered = -99;
  const look = new THREE.Vector3();

  return {
    group,
    whistle(train) {
      if (!isNear(ctx.track, train, ctx.at, 75)) return;
      lookUntil = clock + 3.8;
      if (clock - answered > 0.7) {
        answered = clock;
        ctx.audio.squeak();
      }
    },
    update(_dt, elapsed, train) {
      clock = elapsed;
      const looking = elapsed < lookUntil;

      // Where the engine is, in this place's own frame, so a head that comes
      // up comes up pointing at him rather than at nothing. Only asked for
      // while he is actually on a line that runs past here: off it his
      // distance is NaN, and a NaN handed to the curve throws.
      const here = looking && watching(train);
      if (here) {
        ctx.track.positionAt(train.distance, look);
        group.worldToLocal(look);
      }

      for (const c of herd) {
        // Heads turn toward the train and tip up; otherwise down in the grass.
        if (here) {
          const want = Math.atan2(look.x - c.group.position.x, look.z - c.group.position.z);
          let turn = want - c.group.rotation.y;
          while (turn > Math.PI) turn -= Math.PI * 2;
          while (turn < -Math.PI) turn += Math.PI * 2;
          c.group.rotation.y += turn * 0.06;
        }
        c.head.rotation.z += ((looking ? 0.22 : -0.45) - c.head.rotation.z) * 0.12;

        // The two standing in the pool heave themselves up out of it, which
        // is the best bit.
        const standing = looking && c.wading ? 0.3 : 0;
        const bob = looking ? Math.abs(Math.sin(elapsed * 4.4 + c.phase)) * 0.07 : 0;
        c.group.position.y += (c.rest + standing + bob - c.group.position.y) * 0.16;
        c.group.rotation.z = looking ? Math.sin(elapsed * 6 + c.phase) * 0.05 : 0;
      }
      keeper.rotation.z = looking ? Math.sin(elapsed * 7) * 0.12 : 0;
    },
  };
}
