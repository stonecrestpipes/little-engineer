import * as THREE from 'three';
import { C, mat, pitchedRoof, shadowed, tree } from '../scenery';
import { buildStation } from './station';
import { frameAt, isNear, localGround, type Place, type PlaceContext } from './place';

/**
 * The Sheds — red brick, and home.
 *
 * This is where he starts every time, so it is the one place that should look
 * like somewhere the engine belongs. Its signature is the shed doors: they
 * swing open as he sets off and close again once he has gone, which makes
 * leaving feel like being let out rather than like a button press.
 *
 * Phase 6 puts a road into that shed and lets him choose what to pull. The
 * doors are built to be driven through when that happens.
 */
export function buildSheds(ctx: PlaceContext): Place {
  const group = frameAt(ctx.track, ctx.at);
  const ground = localGround(group, ctx.groundAt);
  const station = buildStation({ wall: C.brick, roof: C.roof, board: C.brickDark, waiting: 4 });
  group.add(station.group);

  // ------------------------------------------------------------- the shed
  const shed = new THREE.Group();
  shed.position.set(-16, 0, 0);
  const SHED_W = 13;
  const SHED_L = 18;

  const walls = new THREE.Mesh(new THREE.BoxGeometry(SHED_W, 7.2, SHED_L), mat(C.brick));
  walls.position.y = 3.6;
  shed.add(walls);

  const roof = pitchedRoof(SHED_W + 1.4, SHED_L + 1.2, 3.0, C.slate);
  roof.position.y = 7.2;
  shed.add(roof);

  // Two doors across the middle of the face nearest the rails, each hinged at
  // its outer edge and swinging out toward the track.
  const DOOR = 5.0;
  const doors: THREE.Group[] = [];
  for (const sign of [-1, 1] as const) {
    const hinge = new THREE.Group();
    hinge.position.set(SHED_W / 2 + 0.05, 0, sign * DOOR);
    const leaf = new THREE.Mesh(new THREE.BoxGeometry(0.3, 5.6, DOOR), mat(C.roof));
    leaf.position.set(0, 2.8, -sign * DOOR * 0.5);
    const brace = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.24, DOOR * 0.94), mat(C.stoneDark));
    brace.position.set(0, 3.4, -sign * DOOR * 0.5);
    hinge.add(leaf, brace);
    shed.add(hinge);
    doors.push(hinge);
  }

  // A dark mouth behind the doors, so an open shed reads as a way in.
  const mouth = new THREE.Mesh(
    new THREE.BoxGeometry(0.2, 5.6, DOOR * 2),
    new THREE.MeshStandardMaterial({ color: 0x2a2320, roughness: 1 }),
  );
  mouth.position.set(SHED_W / 2 - 0.1, 2.8, 0);
  shed.add(mouth);

  group.add(shed);

  // -------------------------------------------------------- water tower
  const tower = new THREE.Group();
  tower.position.set(11.5, 0, -13);
  const tank = new THREE.Mesh(new THREE.CylinderGeometry(2.4, 2.4, 3.2, 14), mat(C.metal));
  tank.position.y = 6.4;
  const lid = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 2.6, 0.3, 14), mat(C.slate));
  lid.position.y = 8.1;
  const spout = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 3.4, 8), mat(C.slate));
  spout.position.set(-2.6, 5.6, 0);
  spout.rotation.z = Math.PI / 2.4;
  tower.add(tank, lid, spout);
  for (const [lx, lz] of [[-1.7, -1.7], [1.7, -1.7], [-1.7, 1.7], [1.7, 1.7]]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.34, 4.8, 0.34), mat(C.trunk));
    leg.position.set(lx, 2.4, lz);
    tower.add(leg);
  }
  group.add(tower);

  // ------------------------------------------------------------- around it
  const coal = new THREE.Mesh(new THREE.ConeGeometry(3.2, 2.4, 9), mat(0x3b3630, 0.98));
  coal.position.set(-7, 1.1, 14);
  group.add(coal);

  for (const [x, z, s] of [[-26, 22, 1.1], [-24, -20, 0.95], [16, 20, 1.0], [22, -24, 1.15]]) {
    group.add(tree(x, ground(x, z), z, s));
  }

  shadowed(group);

  // ------------------------------------------------------------ behaviour
  let clock = 0;
  let open = 0;
  let want = 0;
  let closeAt = Infinity;

  return {
    group,
    stop: { id: 'sheds', at: ctx.at },
    arrive() {
      station.arrive();
      want = 0;
      closeAt = Infinity;
    },
    depart() {
      station.depart();
      // Open as he pulls away, and stay open until he is well clear.
      want = 1;
      closeAt = clock + 9;
    },
    whistle(train) {
      if (isNear(ctx.track, train, ctx.at, 30)) station.wave();
    },
    update(dt, elapsed) {
      clock = elapsed;
      if (elapsed > closeAt) want = 0;
      // Doors are heavy: they move at their own pace whatever he does.
      open += THREE.MathUtils.clamp(want - open, -dt * 0.42, dt * 0.42);
      const angle = open * 1.55;
      doors[0].rotation.y = angle;
      doors[1].rotation.y = -angle;
      station.update(elapsed);
    },
  };
}
