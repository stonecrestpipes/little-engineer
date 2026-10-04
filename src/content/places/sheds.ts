import * as THREE from 'three';
import { C, flat, mat, shadowed, smoothstep, tree } from '../scenery';
import { MAX_CARS } from '../roster';
import { ENGINES } from '../engines';
import { buildStation } from './station';
import { frameAt, isNear, localGround, railsNear, type Place, type PlaceContext } from './place';
import { moving } from '../../engine/merge';
import { Shunting } from '../../engine/shunting';

/**
 * The Sheds — red brick, home, and the roundhouse where he picks his engine.
 *
 * This is where he starts every time, so it is the one place that should look
 * like somewhere an engine belongs. The roundhouse is the whole of it: five
 * roads round a turntable, a door on each, and an engine asleep behind every
 * door but the one whose engine is out on the train.
 *
 * Standing still here, the doors come open by themselves, one after another,
 * and the turntable swings round to whichever is widest. Touching a door shuts
 * it again, or opens one he is impatient about. Touching the engine behind an
 * open door is how he picks it — and then he watches.
 *
 * **The swap.** His old engine pulls forward off its train and sets back down
 * the arrival road into its own place in the roundhouse. At the same moment
 * the new one comes out of its road, up the departure road past the platform,
 * and sets back onto the front of the train. Two roads rather than one is the
 * whole reason it takes twelve seconds instead of twenty: on one road the
 * second engine cannot start until the first has finished with it.
 *
 * It is the longest single thing in the game and it is meant to be — a thing
 * to watch rather than a menu. **Pressing green abandons it instantly** and
 * puts everything where it was going, because wanting to drive always wins.
 */

/** Where the turntable sits in the yard, and how the roads fan off it. */
const PIT = new THREE.Vector2(-19, 4);
const BAYS = 5;
/** Which way the middle road points, and how far the others spread from it. */
const FAN_BEARING = 235;
const FAN_SPREAD = 22.5;
/** The turntable pit. Nothing is drawn inside it but the turntable itself. */
const PIT_R = 8.6;

/**
 * Radius of the doors and of the back wall.
 *
 * **These two numbers and FAN_SPREAD have to agree with each other**, and for
 * a long time they did not. Five roads twenty-two and a half degrees apart are
 * only four and a quarter metres apart at a radius of eleven — and each bay
 * was being built as a seven-metre-wide box with its doorway piers three and a
 * half metres out from its own centre line. So every pier stood a metre inside
 * the next bay's doorway, every roof overlapped the two beside it, and the
 * whole shed read as a heap of brick boxes rather than a roundhouse.
 *
 * At fourteen metres the roads are five and a half metres apart, which is a
 * doorway with piers either side of it and nothing of its neighbour in it. The
 * back wall then has to go out far enough for the longest engine on the
 * railway — the tender one, at eleven and a half metres against everyone
 * else's six — to stand inside with the door shut behind it.
 */
const DOOR_R = 14;
const BACK_R = 30;
/** Where an engine of a given length stands: buffers just inside the door. */
const standsAt = (length: number): number => DOOR_R + 1.8 + length / 2;

/**
 * The two throat roads, each as a bearing off the turntable and a list of
 * radii along it, then the points that take it out to the running line.
 *
 * The tail points used to run *backwards*: the last radius on the arrival road
 * reached sixteen metres up the yard and the next point was at fifteen, so the
 * road doubled back on itself and the curve through it tied a knot. Every z
 * here increases, all the way out.
 */
const ARRIVAL = { bearing: 55, radii: [10, 15, 20], tail: [[-1, 18.5], [0, 24]], join: 24 };
const DEPARTURE = { bearing: 38, radii: [11, 18, 26], tail: [[-1.2, 29], [0, 34]], join: 34 };

/** How the stock moves, in metres a second. Setting back is always slower. */
const OUT = 8.5;
const BACK = 6;

const rad = THREE.MathUtils.degToRad;

/** A point `radius` out from the turntable on a given bearing. */
function off(bearing: number, radius: number): THREE.Vector2 {
  const a = rad(bearing);
  return new THREE.Vector2(PIT.x + Math.sin(a) * radius, PIT.y + Math.cos(a) * radius);
}

/** The bearing of roundhouse road `i`, in degrees. */
const bayBearing = (i: number): number => FAN_BEARING + (i - (BAYS - 1) / 2) * FAN_SPREAD;
/**
 * The bearing of the line between road `i-1` and road `i` — where the piers
 * and the dividing walls go. There is one more of these than there are roads,
 * and each one is shared by the two bays either side of it, which is the whole
 * difference between a roundhouse and five sheds standing on each other.
 */
const wallBearing = (i: number): number => bayBearing(0) + (i - 0.5) * FAN_SPREAD;

/** Rails and ballast following a path of points, for a road that is not a route. */
function roadAlong(points: THREE.Vector2[], closed = false): THREE.Group {
  const g = new THREE.Group();
  const curve = new THREE.CatmullRomCurve3(
    points.map((p) => new THREE.Vector3(p.x, 0, p.y)),
    closed,
    'centripetal',
    0.5,
  );
  const n = Math.max(16, Math.round(curve.getLength() / 1.2));

  // Ballast, as a ribbon two metres either side of the centre line.
  const pos: number[] = [];
  const idx: number[] = [];
  const at = new THREE.Vector3();
  const ahead = new THREE.Vector3();
  const side = new THREE.Vector3();
  for (let i = 0; i <= n; i++) {
    curve.getPointAt(i / n, at);
    curve.getTangentAt(i / n, ahead);
    side.crossVectors(ahead, new THREE.Vector3(0, 1, 0)).normalize().multiplyScalar(1.8);
    pos.push(at.x - side.x, 0.06, at.z - side.z, at.x + side.x, 0.06, at.z + side.z);
  }
  for (let i = 0; i < n; i++) {
    const a = i * 2;
    idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
  }
  const bed = new THREE.BufferGeometry();
  bed.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  bed.setIndex(idx);
  bed.computeVertexNormals();
  const ballast = new THREE.Mesh(bed, mat(C.ballast));
  ballast.receiveShadow = true;
  g.add(ballast);

  // And the two rails, as tubes offset either side.
  const railMat = new THREE.MeshStandardMaterial({ color: C.rail, roughness: 0.4, metalness: 0.5 });
  for (const offset of [-0.72, 0.72]) {
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i <= n; i++) {
      curve.getPointAt(i / n, at);
      curve.getTangentAt(i / n, ahead);
      side.crossVectors(ahead, new THREE.Vector3(0, 1, 0)).normalize().multiplyScalar(offset);
      pts.push(new THREE.Vector3(at.x + side.x, 0.2, at.z + side.z));
    }
    const line = new THREE.CatmullRomCurve3(pts, closed, 'centripetal', 0.5);
    const r = new THREE.Mesh(new THREE.TubeGeometry(line, n * 2, 0.07, 5, closed), railMat);
    r.receiveShadow = true;
    g.add(r);
  }
  return g;
}

/**
 * A yard road: a straight for stock to stand on, a stop block at the platform
 * end of it, and a lead at the other end curving out onto the running line.
 *
 * **The lead is the part that was missing.** Both of these used to be a bare
 * straight with a block at one end and nothing whatever at the other — two
 * lengths of rail lying in the grass, joined to no railway, with the spare
 * cars standing on them. Rails have to come from somewhere.
 */
function yardRoad(x: number, blockAt: number, straightTo: number, lead: THREE.Vector2[]): THREE.Group {
  const g = roadAlong([new THREE.Vector2(x, blockAt), new THREE.Vector2(x, straightTo), ...lead]);
  // Sleepers along the straight, where the stock stands and they show.
  const count = Math.max(2, Math.round(Math.abs(blockAt - straightTo) / 1.5));
  const ties = new THREE.InstancedMesh(new THREE.BoxGeometry(2.7, 0.16, 0.32), mat(C.sleeper), count);
  const dummy = new THREE.Object3D();
  for (let i = 0; i < count; i++) {
    dummy.position.set(x, 0.12, blockAt + ((straightTo - blockAt) * i) / (count - 1));
    dummy.updateMatrix();
    ties.setMatrixAt(i, dummy.matrix);
  }
  ties.instanceMatrix.needsUpdate = true;
  g.add(ties);
  const block = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.7, 0.5), mat(C.trim));
  block.position.set(x, 0.48, blockAt);
  g.add(block);
  return shadowed(g);
}

export function buildSheds(ctx: PlaceContext): Place {
  const group = frameAt(ctx.track, ctx.at);
  const ground = localGround(group, ctx.groundAt);
  const station = buildStation({ wall: C.brick, roof: C.roof, board: C.brickDark, waiting: 4 });
  group.add(station.group);

  // ----------------------------------------------------------- the ground
  const apron = new THREE.Mesh(new THREE.CircleGeometry(12, 28), mat(C.stoneDark, 0.95));
  apron.rotation.x = -Math.PI / 2;
  apron.position.set(PIT.x, 0.02, PIT.y);
  group.add(apron);

  // -------------------------------------------------------- the yard roads
  //
  // Two sets of points are being kept apart here, and keeping them apart is
  // what stopped the middle of the yard looking like a plate of spaghetti.
  //
  // *Where the rails are drawn* starts at the rim of the turntable pit, because
  // there are no rails across a turntable pit — the turntable is what carries
  // them. All seven roads used to be drawn from four metres out, which is five
  // metres inside a pit eight and a half metres across, so seven ballast
  // ribbons crossed each other over the pit floor and poked up through it.
  //
  // *Where the stock travels* does go through the middle, because that is what
  // riding the turntable looks like. `throat` and `outOfRoad` below are the
  // travelling version; these are the drawn one.
  const throat = (spec: typeof ARRIVAL, from: number): THREE.Vector2[] => [
    off(spec.bearing, from),
    ...spec.radii.filter((r) => r > from).map((r) => off(spec.bearing, r)),
    ...spec.tail.map(([x, z]) => new THREE.Vector2(x, z)),
  ];
  group.add(roadAlong(throat(ARRIVAL, PIT_R)), roadAlong(throat(DEPARTURE, PIT_R)));

  for (let i = 0; i < BAYS; i++) {
    group.add(roadAlong([off(bayBearing(i), PIT_R), off(bayBearing(i), BACK_R - 1.5)]));
  }

  // ------------------------------------------------------- the roundhouse
  //
  // One building, not five. The bays are wedges of the same fan: they share
  // the walls between them, they share one roof, and the doorways are holes in
  // one curved front rather than five separate fronts standing on each other.
  //
  // Built the other way — a box per road — it could not be made to work at any
  // size, because a box is the same width at the back as at the front and a
  // fan is not. Every neighbouring pair either overlapped by three metres at
  // the doors or left daylight between them at the back wall, and for a long
  // time it did both at once.
  const H = 8.2;
  /** How far up the doorway opening goes. */
  const HEAD = 6.4;
  /** Half the width of a pier, measured along the arc. */
  const PIER = 0.5;

  /**
   * A slab covering the whole fan between two radii — the roof.
   *
   * Built as one piece of geometry rather than one box per road: a box per
   * road is what notched the roofline like a saw at the back and stacked the
   * eaves three deep at the front.
   */
  function fanSlab(inner: number, outer: number, base: number, thick: number): THREE.Mesh {
    const FACETS = BAYS * 3;
    const from = wallBearing(0);
    const to = wallBearing(BAYS);
    const pos: number[] = [];
    const idx: number[] = [];
    const push = (p: THREE.Vector2, y: number) => {
      pos.push(p.x, y, p.y);
      return pos.length / 3 - 1;
    };
    const quad = (a: number, b: number, c: number, d: number) => idx.push(a, b, c, a, c, d);
    // Four corners per facet edge: inner and outer, top and bottom.
    const ring: number[][] = [];
    for (let i = 0; i <= FACETS; i++) {
      const b = from + ((to - from) * i) / FACETS;
      const pi = off(b, inner);
      const po = off(b, outer);
      ring.push([push(pi, base + thick), push(po, base + thick), push(po, base), push(pi, base)]);
    }
    for (let i = 0; i < FACETS; i++) {
      const [ai, ao, aob, aib] = ring[i];
      const [bi, bo, bob, bib] = ring[i + 1];
      quad(ai, ao, bo, bi); // the top of it
      quad(aib, bib, bob, aob); // and the underside
      quad(ao, aob, bob, bo); // the eaves at the back
      quad(ai, bi, bib, aib); // and at the front
    }
    // The two ends of the fan.
    const [fi, fo, fob, fib] = ring[0];
    const [li, lo, lob, lib] = ring[FACETS];
    quad(fi, fib, fob, fo);
    quad(li, lo, lob, lib);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setIndex(idx);
    geo.computeVertexNormals();
    return new THREE.Mesh(geo, mat(C.slate));
  }

  // The walls between the roads, each one shared by the two bays either side.
  for (let i = 0; i <= BAYS; i++) {
    const b = wallBearing(i);
    const depth = BACK_R - DOOR_R;
    const wall = new THREE.Mesh(new THREE.BoxGeometry(0.45, H, depth), mat(C.brick));
    const mid = off(b, DOOR_R + depth / 2);
    wall.position.set(mid.x, H / 2, mid.y);
    wall.rotation.y = rad(b);
    group.add(wall);

    // And the pier standing on the end of it, in the front of the building.
    const pier = new THREE.Mesh(new THREE.BoxGeometry(PIER * 2, H, 1.7), mat(C.brickDark));
    const atDoor = off(b, DOOR_R + 0.5);
    pier.position.set(atDoor.x, H / 2, atDoor.y);
    pier.rotation.y = rad(b);
    group.add(pier);
  }

  // The back wall, as one facet per bay. At this radius the roads are nearly
  // ten metres apart, so the facets meet rather than overlapping.
  const BACK_SPAN = 2 * BACK_R * Math.sin(rad(FAN_SPREAD / 2)) + 0.5;
  for (let i = 0; i < BAYS; i++) {
    const b = bayBearing(i);
    const back = new THREE.Mesh(new THREE.BoxGeometry(BACK_SPAN, H, 0.55), mat(C.brick));
    const p = off(b, BACK_R - 0.3);
    back.position.set(p.x, H / 2, p.y);
    back.rotation.y = rad(b);
    group.add(back);
  }

  // One roof over the whole fan, oversailing the doors by a little.
  const roof = fanSlab(DOOR_R - 1.1, BACK_R + 0.5, H + 0.1, 0.55);
  group.add(roof);

  /** The two leaves of each road's door, hinged at opposite piers. */
  const bayDoors: THREE.Group[][] = [];
  for (let i = 0; i < BAYS; i++) {
    const bay = new THREE.Group();
    bay.position.set(PIT.x, 0, PIT.y);
    bay.rotation.y = rad(bayBearing(i));

    // Inside the bay, +z is out along its own road. The doorway is as wide as
    // the gap between the two piers either side of it, which is what the roads
    // leave at this radius rather than a number picked by hand.
    const span = 2 * DOOR_R * Math.sin(rad(FAN_SPREAD / 2));
    const GAP = span - PIER * 2;

    // Over the doorway, between its two piers.
    const lintel = new THREE.Mesh(new THREE.BoxGeometry(GAP + 0.4, H - HEAD, 1.7), mat(C.brickDark));
    lintel.position.set(0, HEAD + (H - HEAD) / 2, DOOR_R + 0.5);
    bay.add(lintel);

    // The dark of the shed, right at the back of it, so the engine standing in
    // between is a shape against it rather than a shape against daylight.
    const dark = new THREE.Mesh(
      new THREE.BoxGeometry(BACK_SPAN - 1.2, H - 0.6, 0.2),
      new THREE.MeshStandardMaterial({ color: 0x241f1c, roughness: 1 }),
    );
    dark.position.set(0, (H - 0.6) / 2, BACK_R - 0.9);
    bay.add(dark);

    // The door: two leaves, each hinged at its own pier and folding back *into*
    // the bay, where they come to rest against the walls either side.
    //
    // Outward is where they used to swing, and outward does not fit. The
    // doorways are five and a half metres apart and four and a half wide, so a
    // leaf swung out stands more than a metre across the next road's doorway —
    // in front of the engine asleep behind it. Inward there is room, because a
    // bay is twice as wide at the back as it is at the door.
    const pair: THREE.Group[] = [];
    for (const side of [-1, 1] as const) {
      const hinge = new THREE.Group();
      hinge.position.set((side * GAP) / 2, 0, DOOR_R + 0.05);
      const leaf = new THREE.Mesh(new THREE.BoxGeometry(GAP / 2, HEAD - 0.3, 0.26), mat(C.roof));
      leaf.position.set((-side * GAP) / 4, (HEAD - 0.3) / 2, 0);
      const brace = new THREE.Mesh(new THREE.BoxGeometry(GAP * 0.44, 0.26, 0.4), mat(C.stoneDark));
      brace.position.set((-side * GAP) / 4, HEAD * 0.62, 0.12);
      hinge.add(leaf, brace);
      bay.add(hinge);
      pair.push(hinge);
    }
    bayDoors.push(pair);

    group.add(bay);
  }

  // ---------------------------------------------------------- the turntable
  const pit = new THREE.Mesh(new THREE.CylinderGeometry(8.6, 8.6, 0.5, 28), mat(0x6a6256, 0.95));
  pit.position.set(PIT.x, -0.16, PIT.y);
  group.add(pit);
  const deck = new THREE.Group();
  deck.position.set(PIT.x, 0.1, PIT.y);
  const beam = new THREE.Mesh(new THREE.BoxGeometry(3.0, 0.45, 16.4), mat(C.metal));
  beam.position.y = 0.22;
  deck.add(beam);
  for (const side of [-1, 1]) {
    const r = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.16, 16.4), mat(C.rail, 0.4));
    r.position.set(side * 0.72, 0.52, 0);
    deck.add(r);
    const girder = new THREE.Mesh(new THREE.BoxGeometry(0.22, 1.1, 15.4), mat(C.trim));
    girder.position.set(side * 1.55, 1.0, 0);
    deck.add(girder);
  }
  group.add(deck);

  // ------------------------------------------------------ the shunting yard
  //
  // The running line as the yard sees it, so a road can be led onto it. The
  // line curves through here, so where it actually is at a given distance back
  // is asked rather than assumed — assuming it was straight is what would put
  // a turnout a few metres to one side of the rails it is supposed to join.
  const rails = railsNear(group, ctx.track, ctx.at, 140, 4);
  const railAt = (z: number): THREE.Vector2 =>
    rails.reduce((best, p) => (Math.abs(p.y - z) < Math.abs(best.y - z) ? p : best), rails[0]);
  /**
   * A lead from a road at `x` out onto the running line, easing across
   * between two distances back along it. Smoothstepped rather than straight,
   * so it leaves the siding and meets the line parallel to each and bends in
   * the middle — which is the shape of a turnout.
   */
  const leadOnto = (x: number, from: number, to: number): THREE.Vector2[] => {
    const out: THREE.Vector2[] = [];
    for (let z = from - 5; z >= to; z -= 5) {
      const rail = railAt(z);
      out.push(new THREE.Vector2(x + (rail.x - x) * smoothstep(from, to, z), z));
    }
    return out;
  };

  // Where the spare cars stand: behind the platform, clear of both throats
  // and of the nearest roundhouse road, and far enough over that the whole
  // line of them is in the yard shot rather than out at the edge of it. The
  // block is at the platform end and the lead runs back down the line.
  group.add(yardRoad(-13, -1, -49, leadOnto(-13, -49, -92)));
  // And the pilot's own road, so the little engine has somewhere to work that
  // is not on top of the rake it is working. It sits between the spare cars
  // and the running line, and comes off it nearer in, so the two turnouts are
  // a yard throat rather than one on top of the other.
  group.add(yardRoad(-6, -18, -42, leadOnto(-6, -42, -76)));

  // --------------------------------------------------------- the yard pilot
  // A little four-wheeled saddle tank that lives in the yard and never leaves
  // it. He cannot drive it and it is not in the roundhouse: it is one of the
  // things that is simply *going on* while he is here, like the cranes at the
  // harbour and the sails on the windmill. It shuffles up and down its road
  // all day, and when he takes a car it runs down to where that car was
  // standing and whistles, because something put it on the train.
  const pilot = new THREE.Group();
  const pilotGreen = mat(0x2f6b3d);
  const pilotIron = mat(0x2b3139, 0.6);
  {
    const plate = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.18, 3.6), pilotIron);
    plate.position.y = 0.82;
    pilot.add(plate);
    for (const end of [-1, 1] as const) {
      const beam = new THREE.Mesh(new THREE.BoxGeometry(2.24, 0.42, 0.18), mat(C.trim));
      beam.position.set(0, 0.88, end * 1.84);
      pilot.add(beam);
    }
    const boiler = new THREE.Mesh(new THREE.CylinderGeometry(0.58, 0.58, 2.0, 20), pilotIron);
    boiler.rotateX(Math.PI / 2);
    boiler.position.set(0, 1.56, 0.62);
    pilot.add(boiler);
    // The saddle over it, which is what makes a pilot a pilot.
    const saddle = new THREE.Mesh(
      new THREE.CylinderGeometry(0.76, 0.76, 1.8, 18, 1, true, Math.PI, Math.PI),
      pilotGreen,
    );
    saddle.rotateX(Math.PI / 2);
    saddle.position.set(0, 1.56, 0.66);
    pilot.add(saddle);
    const cab = new THREE.Mesh(new THREE.BoxGeometry(1.86, 1.5, 1.3), pilotGreen);
    cab.position.set(0, 1.72, -0.95);
    const cabRoof = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.14, 1.5), mat(C.slate));
    cabRoof.position.set(0, 2.52, -0.95);
    pilot.add(cab, cabRoof);
    const chimney = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.26, 0.7, 12), pilotIron);
    chimney.position.set(0, 2.38, 1.5);
    const dome = new THREE.Mesh(new THREE.SphereGeometry(0.26, 14, 9, 0, Math.PI * 2, 0, Math.PI / 2), mat(0xdaa738));
    dome.position.set(0, 2.1, 0.5);
    pilot.add(chimney, dome);
    for (const side of [-1, 1] as const) {
      for (const z of [0.95, -0.75]) {
        const w = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.14, 16).rotateZ(Math.PI / 2), pilotIron);
        w.position.set(side * 0.86, 0.42, z);
        const r = new THREE.Mesh(new THREE.CylinderGeometry(0.27, 0.27, 0.16, 16).rotateZ(Math.PI / 2), mat(C.trim));
        r.position.set(side * 0.88, 0.42, z);
        pilot.add(w, r);
      }
    }
  }
  pilot.name = 'pilot';
  group.add(pilot);
  shadowed(pilot);

  // -------------------------------------------------------- the water tower
  const tower = new THREE.Group();
  tower.position.set(11.5, 0, -20);
  const tank = new THREE.Mesh(new THREE.CylinderGeometry(2.4, 2.4, 3.2, 14), mat(C.metal));
  tank.position.y = 6.4;
  const lid = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 2.6, 0.3, 14), mat(C.slate));
  lid.position.y = 8.1;
  tower.add(tank, lid);
  for (const [lx, lz] of [[-1.7, -1.7], [1.7, -1.7], [-1.7, 1.7], [1.7, 1.7]]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.34, 4.8, 0.34), mat(C.trunk));
    leg.position.set(lx, 2.4, lz);
    tower.add(leg);
  }
  // The spout swings down over whatever is standing under it, and lifts again.
  const spoutArm = new THREE.Group();
  spoutArm.position.set(-1.9, 5.9, 0);
  const spout = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.3, 4.4, 8), mat(C.slate));
  spout.position.set(-2.2, 0, 0);
  spout.rotation.z = Math.PI / 2;
  const nozzle = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.9, 8), mat(C.metal));
  nozzle.position.set(-4.3, -0.35, 0);
  spoutArm.add(spout, nozzle);
  tower.add(spoutArm);
  group.add(tower);

  // ------------------------------------------------------------- around it
  const coal = new THREE.Mesh(new THREE.ConeGeometry(3.2, 2.4, 9), mat(0x3b3630, 0.98));
  coal.position.set(-3, 1.1, 26);
  group.add(coal);

  for (const [x, z, s] of [[-44, 32, 1.1], [-34, -32, 0.95], [16, 28, 1.0], [22, -34, 1.15]]) {
    group.add(tree(x, ground(x, z), z, s));
  }

  shadowed(group);
  flat(apron);

  // ------------------------------------------------- where everything parks
  // The stock stands in the yard in world coordinates, because the meshes
  // belong to the roster and are shared with the running line.
  group.updateMatrixWorld();
  const yaw = group.rotation.y;
  /** A point in the yard's own frame, in world space. */
  const at = (p: THREE.Vector2): THREE.Vector3 => group.localToWorld(new THREE.Vector3(p.x, 0, p.y));
  const parkAt = (object: THREE.Object3D, p: THREE.Vector2, turn: number): void => {
    object.position.copy(at(p));
    object.rotation.set(0, yaw + turn, 0);
  };

  /** Which road each engine lives on, settled once and never changed. */
  const roadOf = new Map<string, number>();
  ENGINES.forEach((spec, i) => roadOf.set(spec.id, i % BAYS));
  // One slot per car, spaced by more than the longest of them. Fewer slots
  // than cars would stand two of them in the same place.
  const CAR_SLOTS = [-45, -37.8, -30.6, -23.4, -16.2, -9, -4];

  /** Everything standing in the yard right now, and what it is. */
  let parked: {
    object: THREE.Object3D;
    engine?: string;
    car?: string;
    /** which roundhouse road it lives on, or which siding slot it stands at */
    road?: number;
    slot?: number;
    y: number;
  }[] = [];

  /** The engine swap, which holds his engine and stops the train placing it. */
  const shunting = new Shunting();

  function park(): void {
    parked = [];
    for (const mesh of ctx.roster.spareEngines()) {
      const road = roadOf.get(mesh.spec.id) ?? 0;
      // Anything the shunt is driving is where the shunt says it is.
      if (shunting.holds(mesh.group)) continue;
      const stand = standsAt(mesh.spec.dims.length ?? 6);
      parkAt(mesh.group, off(bayBearing(road), stand), rad(bayBearing(road)) + Math.PI);
      parked.push({ object: mesh.group, engine: mesh.spec.id, road, y: mesh.group.position.y });
    }
    ctx.roster.spareCars().forEach((mesh, i) => {
      if (shunting.holds(mesh.group)) return;
      const slot = CAR_SLOTS[i % CAR_SLOTS.length];
      parkAt(mesh.group, new THREE.Vector2(-13, slot), 0);
      parked.push({ object: mesh.group, car: mesh.spec.id, slot, y: mesh.group.position.y });
    });
  }
  park();
  ctx.roster.onChange(park);

  // ------------------------------------------------------------- the paths
  /** The running line, from here to there, as a list of world points. */
  const onTrack = (from: number, to: number): THREE.Vector3[] => {
    const out: THREE.Vector3[] = [];
    const step = to > from ? 4 : -4;
    for (let d = from; step > 0 ? d < to : d > to; d += step) out.push(ctx.track.positionAt(d));
    out.push(ctx.track.positionAt(to));
    return out;
  };

  /**
   * Out of road `i` as far as the middle of the turntable, in world space.
   *
   * This one *does* run into the pit, right to the centre, because the next
   * leg of every shunt starts there: the engine rides the table round. The
   * rails drawn on the ground stop at the rim — see the yard roads above.
   */
  const outOfRoad = (road: number, length: number) =>
    [standsAt(length), DOOR_R - 1.5, 2].map((r) => at(off(bayBearing(road), r)));
  /** A throat road, in world space, running out from the middle of the table. */
  const throatWorld = (spec: typeof ARRIVAL) => throat(spec, 2).map(at);

  // ------------------------------------------------------------ behaviour
  let clock = 0;
  /** How far open each door is, 0…1, and where it is heading. */
  const open = new Array<number>(BAYS).fill(0);
  const want = new Array<number>(BAYS).fill(0);
  /** True while he is standing still here, which is when the yard is live. */
  let inTheYard = false;
  /** The road the turntable is lined up with. */
  let deckRoad = Math.floor(BAYS / 2);
  /** Set while a swap is running; nothing else in the yard answers a touch. */
  let swapping = false;

  /** When the yard last whistled back, and when each engine's hop is due. */
  let answered = -99;
  const hopAt = new Map<string, number>();

  moving(...bayDoors.flat(), deck, spoutArm, pilot);

  // ------------------------------------------------------- the pilot's day
  // Up and down its own road, with a pause at each end. Driven by hand rather
  // than by `Shunting`, and for a reason: everything that machinery moves is a
  // child of the scene and its paths are in world coordinates, and the pilot
  // belongs to the yard's own frame. Handing it a world path put it through
  // the yard's transform twice and left the engine seventy metres out in a
  // field. A straight run along one siding does not need a curve anyway.
  const PILOT_ROAD: [number, number] = [-39, -21];
  const PILOT_X = -6;
  /** Where it is on its road, where it is going, and how long it is standing. */
  let pilotZ = PILOT_ROAD[0];
  let pilotWant = PILOT_ROAD[1];
  let pilotSpeed = 3.2;
  let pilotStand = 2;
  pilot.position.set(PILOT_X, 0, pilotZ);

  /** It ran down to where that car was standing, and said so. */
  const pilotFetched = (slot: number): void => {
    pilotWant = THREE.MathUtils.clamp(slot + 6, PILOT_ROAD[0] - 6, PILOT_ROAD[1]);
    pilotSpeed = 5.5;
    pilotStand = 0;
    ctx.audio.answer(1040, 0.1);
  };

  function workTheYard(dt: number): void {
    if (pilotStand > 0) {
      pilotStand -= dt;
      return;
    }
    const gap = pilotWant - pilotZ;
    if (Math.abs(gap) < 0.2) {
      // Arrived: stand a moment, then set off for whichever end it is not at.
      pilotZ = pilotWant;
      pilotWant = Math.abs(pilotZ - PILOT_ROAD[0]) < Math.abs(pilotZ - PILOT_ROAD[1])
        ? PILOT_ROAD[1]
        : PILOT_ROAD[0];
      pilotSpeed = 3.2;
      pilotStand = 2.5 + Math.random() * 4;
      return;
    }
    const step = Math.sign(gap) * Math.min(Math.abs(gap), pilotSpeed * dt);
    pilotZ += step;
    pilot.position.z = pilotZ;
    // It turns round rather than sliding backwards, the way a pilot does.
    pilot.rotation.y = step > 0 ? 0 : Math.PI;
  }

  /**
   * The whole swap, as two journeys that happen at once.
   *
   * Everything is worked out here, at the moment he touches it, because every
   * one of these paths starts or ends wherever his train is actually standing
   * rather than wherever the platform is.
   */
  function swap(toId: string, from: number): void {
    const outgoing = ctx.roster.engine;
    const road = roadOf.get(toId);
    const home = roadOf.get(outgoing.spec.id);
    if (road === undefined || home === undefined || outgoing.spec.id === toId) return;

    swapping = true;
    const here = ctx.track.wrap(from);
    const inJoin = ctx.at + ARRIVAL.join;
    const outJoin = ctx.at + DEPARTURE.join;
    want[road] = 1;
    want[home] = 1;

    // The new engine is his from this moment, so everything that reads the
    // roster — the driving, the whistle, the face — is already the new one's.
    // It simply is not on the rails yet, which is what `busy` tells the world.
    const incoming = ctx.roster.byId(toId);
    ctx.roster.chooseEngine(toId);

    // --- the old one: forward off its train, then back into its own road
    shunting.start({
      object: outgoing.group,
      path: onTrack(here, inJoin),
      speed: OUT,
      arrived() {
        shunting.start({
          object: outgoing.group,
          path: [...onTrack(inJoin, inJoin - 6), ...throatWorld(ARRIVAL).reverse(), ...outOfRoad(home, outgoing.spec.dims.length ?? 6).reverse()],
          speed: BACK,
          facing: -1,
          wait: 0.4,
          arrived() {
            want[home] = 0;
            park();
          },
        });
      },
    });

    // --- and the new one, out past the platform and back onto the train
    shunting.start({
      object: incoming.group,
      path: [...outOfRoad(road, incoming.spec.dims.length ?? 6), ...throatWorld(DEPARTURE), ...onTrack(outJoin - 8, outJoin)],
      speed: OUT,
      // Long enough for its door to be properly out of the way.
      wait: 1.1,
      arrived() {
        want[road] = 0;
        shunting.start({
          object: incoming.group,
          path: onTrack(outJoin, here),
          speed: BACK,
          facing: 1,
          wait: 0.4,
          arrived() {
            swapping = false;
            ctx.audio.clank();
            park();
          },
        });
      },
    });
  }

  return {
    group,
    stop: { id: 'sheds', at: ctx.at },
    busy() {
      // Only while his *engine* is off the rails. The pilot is always doing
      // something, and the train must not wait on it.
      return shunting.busy;
    },
    settle() {
      if (!shunting.busy) return;
      shunting.finish();
      swapping = false;
      park();
    },
    arrive() {
      station.arrive();
    },
    depart() {
      station.depart();
    },
    whistle(train) {
      if (isNear(ctx.track, train, ctx.at, 30)) station.wave();
      // The engines asleep in the roundhouse whistle back, one after another,
      // each in its own voice. Not every time, or it becomes a racket.
      if (!isNear(ctx.track, train, ctx.at, 60) || clock - answered < 3) return;
      answered = clock;
      ctx.roster.spareEngines().forEach((engine, i) => {
        ctx.audio.answer(engine.spec.audio.whistleHz, 0.45 + i * 0.55);
        hopAt.set(engine.spec.id, clock + 0.45 + i * 0.55);
      });
    },
    pick(ray, train) {
      if (!inTheYard || swapping) return false;

      // The stock first, and the doors not at all.
      //
      // An engine answers a touch whether or not the door happens to be in
      // the way — the ray is tested against the engine itself, not against
      // what is in front of it — but it only *comes out* once its door is
      // properly open. Touching a shut one opens it, which is the whole of
      // "open the door, then pick the engine" and needs no second control.
      // Testing the doors first meant a leaf standing open across the next
      // road quietly ate the touch meant for the engine behind it.
      for (const item of parked) {
        if (ray.intersectObject(item.object, true).length === 0) continue;
        if (item.engine) {
          if (item.road !== undefined && open[item.road] < 0.6) {
            want[item.road] = 1;
            return true;
          }
          swap(item.engine, train.distance);
        } else if (item.car && ctx.roster.toggleCar(item.car)) {
          ctx.audio.clank();
          pilotFetched(item.slot ?? PILOT_ROAD[0]);
        }
        return true;
      }
      // And a car already coupled up: tap it to take it off again.
      for (const car of ctx.roster.cars) {
        if (ray.intersectObject(car.group, true).length === 0) continue;
        if (ctx.roster.toggleCar(car.spec.id)) {
          ctx.audio.clank();
          pilotFetched(PILOT_ROAD[0]);
        }
        return true;
      }
      return false;
    },
    update(dt, elapsed, train) {
      clock = elapsed;
      shunting.update(dt);
      workTheYard(dt);
      station.update(elapsed);

      inTheYard = !train.moving && isNear(ctx.track, train, ctx.at, 26);

      // Standing here, the roundhouse wakes up: the doors come open one after
      // another rather than all at once, which is most of why it is worth
      // watching. Driving away shuts them again.
      if (!swapping) {
        for (let i = 0; i < BAYS; i++) {
          const asleep = !parked.some((p) => p.road === i);
          want[i] = inTheYard && !asleep ? 1 : 0;
        }
      }
      for (let i = 0; i < BAYS; i++) {
        // Doors are heavy, and each one is a little slower than the last.
        const rate = dt * (0.44 - i * 0.04);
        open[i] += THREE.MathUtils.clamp(want[i] - open[i], -rate, rate);
        // Negative swings a leaf inward, into the bay. See the doors above.
        bayDoors[i][0].rotation.y = -open[i] * 1.5;
        bayDoors[i][1].rotation.y = open[i] * 1.5;
      }

      // The turntable lines up with whichever road is widest open, and turns
      // to it at its own unhurried pace.
      let widest = deckRoad;
      for (let i = 0; i < BAYS; i++) if (open[i] > open[widest] + 0.01) widest = i;
      deckRoad = widest;
      let turn = rad(bayBearing(deckRoad)) - deck.rotation.y;
      while (turn > Math.PI) turn -= Math.PI * 2;
      while (turn < -Math.PI) turn += Math.PI * 2;
      deck.rotation.y += THREE.MathUtils.clamp(turn, -dt * 0.5, dt * 0.5);

      // The water tower swings its spout down over whatever is standing under
      // it, and lifts it again when nothing is.
      const under = !train.moving && Math.abs(ctx.track.delta(train.distance, ctx.at - 20)) < 7;
      spoutArm.rotation.z += ((under ? -0.55 : 0) - spoutArm.rotation.z) * dt * 1.8;

      // While he is standing here, everything he could touch breathes gently.
      // It stops the moment he sets off, and while a swap is running.
      const full = ctx.roster.cars.length >= MAX_CARS;
      const live = inTheYard && !swapping;
      parked.forEach((item, i) => {
        const invite =
          live && !(item.car && full) && (item.road === undefined || open[item.road] > 0.6);
        let lift = invite ? Math.max(0, Math.sin(elapsed * 2.2 + i * 0.7)) * 0.16 : 0;
        // An engine that has just whistled back gives a little hop with it.
        const hop = item.engine ? elapsed - (hopAt.get(item.engine) ?? -99) : -1;
        if (hop > 0 && hop < 0.5) lift += Math.sin((hop / 0.5) * Math.PI) * 0.35;
        item.object.position.y = item.y + lift;
      });
    },
  };
}
