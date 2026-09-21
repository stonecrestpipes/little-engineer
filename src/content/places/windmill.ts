import * as THREE from 'three';
import { C, mat, person, shadowed, tree } from '../scenery';
import { buildStation } from './station';
import { frameAt, isNear, localGround, type Place, type PlaceContext } from './place';

/**
 * The Windmill — out on the branch line, round the far side of the hill.
 *
 * Only reached by choosing it at the points after The Farm, so it is the one
 * place on the railway he has to decide to go to. Its signature is the sails:
 * they turn slowly all the time, and a whistle whirls them round with a rush
 * of air, and the sunflowers in front all nod along.
 */
export function buildWindmill(ctx: PlaceContext): Place {
  const group = frameAt(ctx.track, ctx.at);
  const ground = localGround(group, ctx.groundAt);
  const station = buildStation({
    wall: C.white,
    roof: 0x9e4a3c,
    board: 0xe8b830,
    length: 26,
    waiting: 3,
  });
  group.add(station.group);

  // ------------------------------------------------------------ the mill
  const mill = new THREE.Group();
  const mx = 20;
  const mz = 8;
  mill.position.set(mx, ground(mx, mz) - 0.3, mz);
  // Turned to face a point back down the line, so the sails are seen full on
  // from the engine coming in and from the follow view behind it, not edge
  // on. The sails' face is the mill's -x, so that is what is aimed.
  {
    const toward = group.worldToLocal(ctx.track.positionAt(ctx.at - 35));
    mill.rotation.y = Math.atan2(toward.z - mz, -(toward.x - mx));
  }
  const tower = new THREE.Mesh(new THREE.CylinderGeometry(2.3, 3.4, 11, 8), mat(C.white));
  tower.position.y = 5.5;
  const band = new THREE.Mesh(new THREE.CylinderGeometry(2.45, 2.45, 0.5, 8), mat(C.trim));
  band.position.y = 10.8;
  const cap = new THREE.Mesh(new THREE.ConeGeometry(2.9, 3.0, 8), mat(0x9e4a3c));
  cap.position.y = 12.5;
  const door = new THREE.Mesh(new THREE.BoxGeometry(0.2, 2.4, 1.4), mat(C.roof));
  door.position.set(-3.25, 1.2, 0);
  const window1 = new THREE.Mesh(new THREE.BoxGeometry(0.2, 1.0, 0.8), mat(0x2b3a45));
  window1.position.set(-2.75, 6.5, 0);
  mill.add(tower, band, cap, door, window1);

  // The sails face the railway, so he sees them go round rather than edge-on.
  const sails = new THREE.Group();
  sails.position.set(-3.3, 11.2, 0);
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.7, 12).rotateZ(Math.PI / 2), mat(C.metal));
  sails.add(hub);
  const wood = mat(C.trunk);
  const cloth = mat(0xf4ecd8);
  for (let i = 0; i < 4; i++) {
    const arm = new THREE.Group();
    arm.rotation.x = (i * Math.PI) / 2;
    const stock = new THREE.Mesh(new THREE.BoxGeometry(0.22, 7.6, 0.3), wood);
    stock.position.y = 4.0;
    const sail = new THREE.Mesh(new THREE.BoxGeometry(0.12, 5.6, 1.7), cloth);
    sail.position.set(-0.05, 4.8, 0.95);
    arm.add(stock, sail);
    sails.add(arm);
  }
  mill.add(sails);
  group.add(mill);

  // ------------------------------------------------------- the sunflowers
  interface Flower {
    head: THREE.Group;
    phase: number;
  }
  const flowers: Flower[] = [];
  const FACE_UP = -0.7;
  const stalkMat = mat(0x4e8f3e);
  const petalMat = mat(0xf2c230);
  const middleMat = mat(0x6b4a2a);
  for (let i = 0; i < 18; i++) {
    const x = 9 + (i % 6) * 2.2 + Math.random() * 0.8;
    const z = -16 + Math.floor(i / 6) * 2.6 + Math.random() * 0.8;
    const f = new THREE.Group();
    const h = 2.2 + Math.random() * 0.7;
    const stalk = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, h, 5), stalkMat);
    stalk.position.y = h / 2;
    const head = new THREE.Group();
    head.position.y = h;
    // Facing the railway and tipped up to the sky, so the faces show from
    // above and from an engine coming in, rather than as sticks.
    head.rotation.y = -0.5;
    const petals = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.62, 0.08, 12).rotateZ(Math.PI / 2), petalMat);
    const middle = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.12, 10).rotateZ(Math.PI / 2), middleMat);
    middle.position.x = -0.05;
    head.add(petals, middle);
    f.add(stalk, head);
    f.position.set(x, ground(x, z), z);
    group.add(f);
    flowers.push({ head, phase: Math.random() * Math.PI * 2 });
  }

  // the miller, by his door
  const miller = person(0xe4d8be);
  miller.position.set(mx - 5, ground(mx - 5, mz + 2), mz + 2);
  miller.rotation.y = -Math.PI / 2;
  group.add(miller);

  for (const [x, z, s] of [[30, -10, 1.1], [34, 20, 0.95], [-16, 14, 1.05], [-18, -12, 0.9]]) {
    group.add(tree(x, ground(x, z), z, s));
  }

  shadowed(group);

  // ------------------------------------------------------------ behaviour
  let clock = 0;
  /** Extra spin from a whistle, which dies away by itself. */
  let gust = 0;
  let whooshed = -99;
  let nodUntil = -99;

  return {
    group,
    stop: { id: 'windmill', at: ctx.at },
    arrive() {
      station.arrive();
    },
    depart() {
      station.depart();
    },
    whistle(train) {
      if (!isNear(ctx.track, train, ctx.at, 80)) return;
      gust = Math.min(gust + 5, 7);
      nodUntil = clock + 3;
      if (clock - whooshed > 1.4) {
        whooshed = clock;
        ctx.audio.whoosh();
      }
      if (isNear(ctx.track, train, ctx.at, 28)) station.wave();
    },
    update(dt, elapsed) {
      clock = elapsed;
      gust *= Math.exp(-dt * 0.7);
      sails.rotation.x += (0.45 + gust) * dt;

      const nodding = elapsed < nodUntil;
      for (const f of flowers) {
        const target =
          FACE_UP + (nodding ? Math.sin(elapsed * 7 + f.phase) * 0.35 : Math.sin(elapsed * 0.8 + f.phase) * 0.05);
        f.head.rotation.z += (target - f.head.rotation.z) * 0.2;
      }
      miller.rotation.z = nodding ? Math.sin(elapsed * 8) * 0.14 : 0;
      station.update(elapsed);
    },
  };
}
