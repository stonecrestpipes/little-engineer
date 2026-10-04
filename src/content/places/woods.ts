import * as THREE from 'three';
import { UP, canopyTrees, conifers, facing, mat, pitchedRoof, shadowed, type Planting } from '../scenery';
import { dusk } from './station';
import { frameAt, isNear, localGround, type Place, type PlaceContext } from './place';
import { moving } from '../../engine/merge';

/**
 * The Woods — the long way round from the meadow, under the trees.
 *
 * There is no platform here and nothing to stop for. What there is, is a
 * tunnel of trees: the line runs for two hundred and twenty metres with the
 * canopy closed over the top of it, dark and green and close, and comes out
 * the other side. The woods run is longer than that — see CANOPY_RUN in
 * src/content/world.ts for why the trees stop before it does. It is the tunnel through the hill done with leaves instead
 * of brick, and it is the whole reason to take this branch.
 *
 * The canopy is held clear of the camera rather than closed round it — see
 * CANOPY_UNDERSIDE in src/content/scenery.ts and `duck` in
 * src/engine/cameras.ts. Planted lower, as it was, the chase shots spent the
 * whole run inside the leaves with the rails invisible, which is the opposite
 * of what the trees are for.
 *
 * Among the trees, three A-frame cabins with their lights on, and deer that
 * look up when he whistles and spring away through the wood.
 */

export interface WoodsContext extends PlaceContext {
  /** The run of track the canopy closes over. */
  from: number;
  to: number;
}

/**
 * How far out from the centre line the near trees stand.
 *
 * Far enough that a crown leaning in over the rails is over the *rails* and
 * not over the camera: these used to stand seven metres out and lean a crown
 * three metres wide to within a couple of metres of the four-foot, at a height
 * the follow shot travels at.
 */
const NEAR = 8.8;
const FAR = 15.5;

export function buildWoods(ctx: WoodsContext): Place {
  const group = frameAt(ctx.track, ctx.at);
  const ground = localGround(group, ctx.groundAt);
  group.updateMatrixWorld();

  // ------------------------------------------------------- the tree tunnel
  // Walked along the rails rather than placed by hand: the branch curves, and
  // a canopy laid out in straight lines would open up on every bend — which is
  // exactly where it most needs to be closed.
  const canopy: Planting[] = [];
  const behind: Planting[] = [];
  const world = new THREE.Vector3();
  const along = new THREE.Vector3();
  const side = new THREE.Vector3();
  const local = new THREE.Vector3();

  const SPACING = 6;
  const steps = Math.max(2, Math.round((ctx.to - ctx.from) / SPACING));
  for (let i = 0; i <= steps; i++) {
    const d = ctx.from + ((ctx.to - ctx.from) * i) / steps;
    ctx.track.positionAt(d, world);
    ctx.track.tangentAt(d, along);
    side.crossVectors(along, UP).normalize();
    // Staggered side to side, so the crowns interleave overhead instead of
    // meeting in pairs and leaving a gap between every pair.
    for (const hand of [-1, 1] as const) {
      const jitter = (i % 2 === 0 ? 0 : SPACING / 2) * (hand === 1 ? 1 : -1);
      for (const [out, into] of [[NEAR, canopy], [FAR, behind]] as [number, Planting[]][]) {
        const wobble = out + (Math.random() - 0.5) * 2.2;
        const x = world.x + side.x * hand * wobble + along.x * jitter;
        const z = world.z + side.z * hand * wobble + along.z * jitter;
        group.worldToLocal(local.set(x, 0, z));
        into.push({
          x: local.x,
          y: ground(local.x, local.z),
          z: local.z,
          scale: (into === canopy ? 0.9 : 1.05) + Math.random() * 0.3,
          // The near ones lean in over the rails; the ones behind stand up.
          turn:
            into === canopy
              ? facing(local.x, local.z, ...worldToLocalXZ(group, world))
              : Math.random() * Math.PI,
        });
      }
    }
  }
  group.add(canopyTrees(canopy), conifers(behind));

  // ------------------------------------------------------------ the cabins
  // A-frames, which are the one building that is all roof: a pitched roof
  // standing on the ground is the whole shape, and it reads from a long way
  // off as somewhere somebody lives in a wood.
  const windows = new THREE.MeshStandardMaterial({
    color: 0xfff0c4,
    emissive: 0xffc94a,
    emissiveIntensity: 0.55,
    roughness: 0.4,
  });
  const cabins: THREE.Group[] = [];
  for (const [cx, cz, turn, size] of [
    [-19, -14, 0.5, 1],
    [-26, 6, -0.3, 0.85],
    [19, 16, 2.4, 0.95],
  ] as number[][]) {
    const cabin = new THREE.Group();
    const W = 6.2 * size;
    const L = 7.4 * size;
    const H = 6.6 * size;
    const shell = pitchedRoof(W, L, H, 0x6b4a3e);
    cabin.add(shell);
    // The gable end: a dark triangle of wall, a door and a lit window above.
    const face = new THREE.Shape();
    face.moveTo(-W / 2, 0);
    face.lineTo(W / 2, 0);
    face.lineTo(0, H);
    face.closePath();
    const wall = new THREE.Mesh(new THREE.ShapeGeometry(face), mat(0x4a3a30));
    wall.position.set(0, 0, L / 2 + 0.04);
    cabin.add(wall);
    const door = new THREE.Mesh(new THREE.BoxGeometry(1.1 * size, 2.1 * size, 0.14), mat(0x2f6f96));
    door.position.set(0, 1.05 * size, L / 2 + 0.14);
    const pane = new THREE.Mesh(new THREE.BoxGeometry(1.5 * size, 1.1 * size, 0.14), windows);
    pane.position.set(0, 3.6 * size, L / 2 + 0.14);
    cabin.add(door, pane);
    // A little deck out front, because every A-frame has one.
    const deck = new THREE.Mesh(new THREE.BoxGeometry(W, 0.22, 2.4 * size), mat(0x8d6e4e));
    deck.position.set(0, 0.11, L / 2 + 1.2 * size);
    cabin.add(deck);
    cabin.position.set(cx, ground(cx, cz), cz);
    cabin.rotation.y = turn;
    group.add(cabin);
    cabins.push(cabin);
  }

  // -------------------------------------------------------------- the deer
  interface Deer {
    group: THREE.Group;
    neck: THREE.Group;
    home: THREE.Vector3;
    phase: number;
  }
  const deer: Deer[] = [];
  const coat = mat(0xa87a4e);
  const dark = mat(0x5e4630);
  for (const [dx, dz, turn] of [
    [-13, 22, 1.1],
    [-9, 26, 1.9],
    [16, -19, -0.6],
  ] as number[][]) {
    const d = new THREE.Group();
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.42, 0.95, 4, 9), coat);
    body.rotation.z = Math.PI / 2;
    body.position.y = 1.1;
    const neck = new THREE.Group();
    neck.position.set(0.62, 1.28, 0);
    const throat = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.22, 0.86, 7), coat);
    throat.position.y = 0.4;
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.26, 9, 7), coat);
    head.scale.set(1.4, 0.95, 0.95);
    head.position.set(0.17, 0.86, 0);
    const muzzle = new THREE.Mesh(new THREE.SphereGeometry(0.11, 7, 6), dark);
    muzzle.position.set(0.5, 0.82, 0);
    neck.add(throat, head, muzzle);
    // Antlers: two forked sticks, which is all a four-year-old needs to see.
    for (const hand of [-1, 1] as const) {
      for (const [tilt, len] of [[0.5, 0.7], [1.0, 0.45]] as number[][]) {
        const prong = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, len, 5), dark);
        prong.position.set(0.05, 1.12 + len / 2.4, hand * 0.14);
        prong.rotation.x = -hand * tilt;
        neck.add(prong);
      }
    }
    d.add(body, neck);
    for (const [lx, lz] of [[-0.46, -0.26], [0.46, -0.26], [-0.46, 0.26], [0.46, 0.26]]) {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.06, 1.1, 5), dark);
      leg.position.set(lx, 0.55, lz);
      d.add(leg);
    }
    d.position.set(dx, ground(dx, dz), dz);
    d.rotation.y = turn;
    group.add(d);
    deer.push({ group: d, neck, home: d.position.clone(), phase: Math.random() * Math.PI * 2 });
  }

  shadowed(group);
  moving(...cabins, ...deer.map((d) => d.group), ...deer.map((d) => d.neck));

  // ------------------------------------------------------------- behaviour
  let clock = 0;
  /** Heads up, then a bound or two away through the trees, then back. */
  let startledAt = -99;
  let answered = -99;

  return {
    group,
    whistle(train) {
      if (!isNear(ctx.track, train, ctx.at, 80)) return;
      startledAt = clock;
      if (clock - answered > 2.4) {
        answered = clock;
        ctx.audio.owl();
      }
    },
    update(_dt, elapsed) {
      clock = elapsed;
      const since = elapsed - startledAt;
      // Four seconds: a second with their heads up, then three bounding.
      const up = since >= 0 && since < 4;
      const bound = since > 0.9 && since < 4 ? Math.sin(((since - 0.9) / 3.1) * Math.PI) : 0;
      for (const d of deer) {
        const want = up ? 0.1 : -0.8;
        d.neck.rotation.z += (want - d.neck.rotation.z) * 0.12;
        // Away from the line, and back again when it has all gone quiet.
        const away = 7 * bound;
        d.group.position.x = d.home.x + Math.sin(d.phase) * away;
        d.group.position.z = d.home.z + Math.cos(d.phase) * away;
        d.group.position.y =
          ground(d.group.position.x, d.group.position.z) +
          (bound > 0 ? Math.abs(Math.sin(elapsed * 7 + d.phase)) * 0.42 : 0);
      }
      // The lamps in the cabins come up as the evening does, from the same
      // one number every lit window on the map reads.
      windows.emissiveIntensity = 0.3 + dusk() * 1.5;
    },
  };
}

/** A world point in a group's own frame, as the pair `facing` wants. */
function worldToLocalXZ(group: THREE.Group, world: THREE.Vector3): [number, number] {
  const v = group.worldToLocal(world.clone());
  return [v.x, v.z];
}
