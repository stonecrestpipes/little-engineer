import * as THREE from 'three';
import { C, flat, mat, pitchedRoof, shadowed, tree } from '../scenery';
import { MAX_CARS } from '../roster';
import { buildStation } from './station';
import { frameAt, isNear, localGround, type Place, type PlaceContext } from './place';

/**
 * The Sheds — red brick, home, and the yard where he picks his train.
 *
 * This is where he starts every time, so it is the one place that should look
 * like somewhere the engine belongs. Two things happen here and nowhere else:
 * the shed doors swing open as he sets off, and the whole roster of engines and
 * cars stands in the yard where he can reach it.
 *
 * Choosing is done by touching the thing itself. There is no panel, no list and
 * no menu: the other engines stand on a siding, and tapping one puts him in it
 * and puts his old one where that was. Tapping a car couples it up; tapping one
 * already coupled up takes it off again. It only works while he is standing
 * still in the yard, so nothing can be changed by a stray thumb out on the
 * railway.
 */

/** How far out from the running line the two yard roads sit. */
const ENGINE_ROAD = -8.5;
const CAR_ROAD = -15;

/** A short length of siding: ballast, sleepers and two rails, all straight. */
function siding(x: number, halfLength: number): THREE.Group {
  const g = new THREE.Group();

  const bed = new THREE.Mesh(new THREE.BoxGeometry(3.8, 0.12, halfLength * 2), mat(C.ballast));
  bed.position.set(x, 0.07, 0);
  g.add(bed);

  const count = Math.round((halfLength * 2) / 1.5);
  const ties = new THREE.InstancedMesh(new THREE.BoxGeometry(2.7, 0.16, 0.32), mat(C.sleeper), count);
  const dummy = new THREE.Object3D();
  for (let i = 0; i < count; i++) {
    dummy.position.set(x, 0.12, -halfLength + (i * halfLength * 2) / (count - 1));
    dummy.updateMatrix();
    ties.setMatrixAt(i, dummy.matrix);
  }
  ties.instanceMatrix.needsUpdate = true;
  g.add(ties);

  const railMat = new THREE.MeshStandardMaterial({ color: C.rail, roughness: 0.4, metalness: 0.5 });
  for (const side of [-1, 1]) {
    const r = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.15, halfLength * 2), railMat);
    r.position.set(x + side * 0.72, 0.23, 0);
    g.add(r);
  }

  // A stop block at each end, so the road obviously goes nowhere.
  for (const end of [-1, 1]) {
    const block = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.7, 0.5), mat(C.trim));
    block.position.set(x, 0.48, end * halfLength);
    g.add(block);
  }
  return shadowed(g);
}

export function buildSheds(ctx: PlaceContext): Place {
  const group = frameAt(ctx.track, ctx.at);
  const ground = localGround(group, ctx.groundAt);
  const station = buildStation({ wall: C.brick, roof: C.roof, board: C.brickDark, waiting: 4 });
  group.add(station.group);

  // ------------------------------------------------------------- the shed
  const shed = new THREE.Group();
  shed.position.set(-28, 0, 0);
  const SHED_W = 13;
  const SHED_L = 18;

  const walls = new THREE.Mesh(new THREE.BoxGeometry(SHED_W, 7.2, SHED_L), mat(C.brick));
  walls.position.y = 3.6;
  shed.add(walls);

  const roof = pitchedRoof(SHED_W + 1.4, SHED_L + 1.2, 3.0, C.slate);
  roof.position.y = 7.2;
  shed.add(roof);

  // Two doors across the middle of the face nearest the yard, each hinged at
  // its outer edge and swinging out.
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

  // ---------------------------------------------------------- the yard
  const apron = new THREE.Mesh(new THREE.BoxGeometry(20, 0.12, 48), mat(C.stoneDark, 0.95));
  apron.position.set(-12.5, 0.02, 0);
  group.add(apron);

  group.add(siding(ENGINE_ROAD, 17));
  group.add(siding(CAR_ROAD, 21));

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
  coal.position.set(-22, 1.1, 16);
  group.add(coal);

  for (const [x, z, s] of [[-38, 28, 1.1], [-34, -26, 0.95], [16, 24, 1.0], [22, -28, 1.15]]) {
    group.add(tree(x, ground(x, z), z, s));
  }

  shadowed(group);
  flat(apron);

  // --------------------------------------------------- parking the spares
  // The stock stands in the yard in world coordinates, because the meshes
  // belong to the roster and are shared with the running line.
  group.updateMatrixWorld();
  const yaw = group.rotation.y;
  const world = new THREE.Vector3();
  const parkAt = (object: THREE.Object3D, x: number, z: number): void => {
    group.localToWorld(world.set(x, 0, z));
    object.position.copy(world);
    object.rotation.set(0, yaw, 0);
  };

  const ENGINE_SLOTS = [-11, 0, 11, 22];
  const CAR_SLOTS = [-16, -8, 0, 8, 16];
  /** Everything standing in the yard right now, and what it is. */
  let parked: { object: THREE.Object3D; engine?: string; car?: string; y: number }[] = [];

  function park(): void {
    parked = [];
    ctx.roster.spareEngines().forEach((mesh, i) => {
      parkAt(mesh.group, ENGINE_ROAD, ENGINE_SLOTS[i % ENGINE_SLOTS.length]);
      parked.push({ object: mesh.group, engine: mesh.spec.id, y: mesh.group.position.y });
    });
    ctx.roster.spareCars().forEach((mesh, i) => {
      parkAt(mesh.group, CAR_ROAD, CAR_SLOTS[i % CAR_SLOTS.length]);
      parked.push({ object: mesh.group, car: mesh.spec.id, y: mesh.group.position.y });
    });
  }
  park();
  ctx.roster.onChange(park);

  // ------------------------------------------------------------ behaviour
  let clock = 0;
  let open = 0;
  let want = 0;
  let closeAt = Infinity;
  /** True while he is standing still here, which is when the yard is live. */
  let inTheYard = false;

  /** When the yard last whistled back, and when each engine's hop is due. */
  let answered = -99;
  const hopAt = new Map<string, number>();

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
      // The engines standing in the yard whistle back, one after another,
      // each in its own voice. Not every time, or it becomes a racket.
      if (!isNear(ctx.track, train, ctx.at, 60) || clock - answered < 3) return;
      answered = clock;
      ctx.roster.spareEngines().forEach((engine, i) => {
        ctx.audio.answer(engine.spec.audio.whistleHz, 0.45 + i * 0.55);
        hopAt.set(engine.spec.id, clock + 0.45 + i * 0.55);
      });
    },
    pick(ray) {
      if (!inTheYard) return false;
      // The stock standing in the yard: tap an engine to drive it, a car to
      // couple it up.
      for (const item of parked) {
        if (ray.intersectObject(item.object, true).length === 0) continue;
        if (item.engine) ctx.roster.chooseEngine(item.engine);
        else if (item.car) ctx.roster.toggleCar(item.car);
        return true;
      }
      // And a car already coupled up: tap it to take it off again.
      for (const car of ctx.roster.cars) {
        if (ray.intersectObject(car.group, true).length === 0) continue;
        ctx.roster.toggleCar(car.spec.id);
        return true;
      }
      return false;
    },
    update(dt, elapsed, train) {
      clock = elapsed;
      if (elapsed > closeAt) want = 0;
      // Doors are heavy: they move at their own pace whatever he does.
      open += THREE.MathUtils.clamp(want - open, -dt * 0.42, dt * 0.42);
      const angle = open * 1.55;
      doors[0].rotation.y = angle;
      doors[1].rotation.y = -angle;
      station.update(elapsed);

      inTheYard = !train.moving && isNear(ctx.track, train, ctx.at, 26);

      // While he is standing here, everything he could touch breathes gently.
      // Besides the halo on the lever it is the only invitation in the game,
      // and it stops the moment he sets off.
      const full = ctx.roster.cars.length >= MAX_CARS;
      parked.forEach((item, i) => {
        // A yard that is full up stops inviting a fourth car.
        const live = inTheYard && !(item.car && full);
        let lift = live ? Math.max(0, Math.sin(elapsed * 2.2 + i * 0.7)) * 0.16 : 0;
        // An engine that has just whistled back gives a little hop with it.
        const hop = item.engine ? elapsed - (hopAt.get(item.engine) ?? -99) : -1;
        if (hop > 0 && hop < 0.5) lift += Math.sin((hop / 0.5) * Math.PI) * 0.35;
        item.object.position.y = item.y + lift;
      });
    },
  };
}
