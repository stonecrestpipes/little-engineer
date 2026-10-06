import * as THREE from 'three';
import { C, COATS, flat, mat, person, shadowed, tree } from '../scenery';
import { buildStation } from './station';
import { dusk } from './station';
import { clearOfRails, frameAt, isNear, localGround, railsNear, type Place, type PlaceContext } from './place';
import { buildCrane } from './crane';
import { moving } from '../../engine/merge';

/**
 * The City — the far end of the long way round, north-west of home.
 *
 * The only place on the railway with anything tall in it. Everywhere else is
 * one or two storeys and the tallest thing is a lighthouse; here there are
 * towers with lit windows, a street with cars on it, a rescue station with a
 * helicopter on the pad, and a building site with a crane that is slowly
 * putting up one more.
 *
 * Whistle and the rescue station answers: the siren goes, the helicopter's
 * rotor spins up and it lifts off the pad, and the tower crane swings round.
 * It is the loudest place in a quiet game, which is the point of it being at
 * the end of the longest branch.
 *
 * Built in the usual frame: +z along the direction of travel, +x the
 * right-hand side of the train. The station and the rescue yard are on +x;
 * the towers and the street are on -x.
 */

/** Window glass that lights up as the evening comes on. */
function litGlass(): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color: 0xbcd4e4,
    emissive: 0xffc94a,
    emissiveIntensity: 0,
    roughness: 0.3,
    metalness: 0.1,
  });
}

/** A tower: a slab with rows of windows punched down every face. */
function tower(
  width: number,
  depth: number,
  height: number,
  wall: number,
  glass: THREE.Material,
): THREE.Group {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), mat(wall));
  body.position.y = height / 2;
  g.add(body);

  // A flat roof with a parapet and a box of plant on top, which is most of
  // what makes a box read as a building rather than a box.
  const cap = new THREE.Mesh(new THREE.BoxGeometry(width + 0.7, 0.5, depth + 0.7), mat(C.slate));
  cap.position.y = height + 0.2;
  const plant = new THREE.Mesh(new THREE.BoxGeometry(width * 0.4, 1.4, depth * 0.4), mat(C.slate));
  plant.position.y = height + 1.1;
  g.add(cap, plant);

  // Windows: a band per floor, inset a hair so they catch their own shadow.
  const floors = Math.max(2, Math.floor((height - 2.4) / 3.4));
  for (let f = 0; f < floors; f++) {
    const y = 2.6 + f * 3.4;
    for (const [w, d, rot] of [
      [width * 0.82, 0.12, 0],
      [depth * 0.82, 0.12, Math.PI / 2],
    ] as number[][]) {
      for (const side of [-1, 1] as const) {
        const band = new THREE.Mesh(new THREE.BoxGeometry(w, 1.5, d), glass);
        band.rotation.y = rot;
        const out = (rot === 0 ? depth : width) / 2 + 0.03;
        band.position.set(rot === 0 ? 0 : side * out, y, rot === 0 ? side * out : 0);
        g.add(band);
      }
    }
  }
  return g;
}

/** A little car, for the street. Two boxes and four wheels. */
function car(colour: number): THREE.Group {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.9, 4.2), mat(colour));
  body.position.y = 0.82;
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.8, 2.0), mat(colour));
  cabin.position.set(0, 1.62, -0.2);
  const glass = new THREE.Mesh(new THREE.BoxGeometry(1.74, 0.5, 2.04), mat(0x9fc4d8, 0.3));
  glass.position.set(0, 1.74, -0.2);
  g.add(body, cabin, glass);
  for (const [x, z] of [[-0.95, 1.3], [0.95, 1.3], [-0.95, -1.3], [0.95, -1.3]]) {
    const w = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, 0.22, 10), mat(0x2b2b2e));
    w.rotation.z = Math.PI / 2;
    w.position.set(x, 0.38, z);
    g.add(w);
  }
  return shadowed(g);
}

export function buildCity(ctx: PlaceContext): Place {
  const group = frameAt(ctx.track, ctx.at);
  const ground = localGround(group, ctx.groundAt);
  const glass = litGlass();

  const station = buildStation({
    wall: 0xb9c0c5,
    roof: 0x3f5a6e,
    board: 0xe0a93b,
    length: 30,
    waiting: 5,
  });
  group.add(station.group);

  // -------------------------------------------------------------- the paving
  // Laid first, so everything else stands on it. A city on grass is a set of
  // boxes in a field; what makes it a city is that the ground has been built
  // on too.
  const paved: THREE.Mesh[] = [];
  const pave = (x: number, z: number, w: number, l: number, colour = 0x8e9398) => {
    const slab = new THREE.Mesh(new THREE.BoxGeometry(w, 0.12, l), mat(colour, 0.95));
    slab.position.set(x, ground(x, z) + 0.06, z);
    group.add(slab);
    paved.push(slab);
    return slab;
  };
  pave(-27, -4, 32, 62);
  pave(22, -4, 30, 36);
  pave(26, 18, 22, 22);

  // ------------------------------------------------------------ the towers
  // Seven of them, deliberately uneven: a skyline is a shape rather than a
  // row, and the one thing a four-year-old reads instantly is "that one is
  // taller than the others".
  const walls = [0x9aa4ad, 0x8a94a0, 0xc2b7a4, 0x7f8c99, 0xb0a596, 0x95a3ad, 0xa89d8c];
  const blocks: [number, number, number, number][] = [
    [-19, -24, 9, 15],
    [-20, -11, 8, 23],
    [-21, 2, 10, 12],
    [-20, 15, 8, 19],
    [-33, -18, 11, 27],
    [-35, -3, 10, 17],
    [-34, 12, 12, 21],
  ];
  blocks.forEach(([x, z, w, h], i) => {
    const t = tower(w, w * 0.9, h, walls[i % walls.length], glass);
    t.position.set(x, ground(x, z), z);
    t.rotation.y = (i % 2 ? 0.06 : -0.05);
    group.add(t);
  });

  // The street between the two rows, and cars parked along it.
  const street = new THREE.Mesh(new THREE.BoxGeometry(7, 0.1, 58), mat(0x4e5357, 0.95));
  street.position.set(-26.5, 0.19, -4);
  group.add(street);
  for (let i = 0; i < 9; i++) {
    const dash = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.06, 2.6), mat(0xd8d2c4, 0.9));
    dash.position.set(-26.5, 0.26, -28 + i * 6);
    group.add(dash);
    paved.push(dash);
  }
  for (let i = 0; i < 6; i++) {
    const c = car(COATS[i % COATS.length]);
    c.position.set(-26.5 + (i % 2 ? 1.8 : -1.8), 0.1, -26 + i * 9);
    c.rotation.y = i % 2 ? 0 : Math.PI;
    group.add(c);
  }
  for (let i = 0; i < 5; i++) {
    const p = person(COATS[(i + 2) % COATS.length], i === 1 ? 0.7 : 1);
    p.position.set(-22.5, 0.1, -20 + i * 11);
    p.rotation.y = 1.5;
    group.add(p);
  }

  // ---------------------------------------------------- the rescue station
  // A long shed with three bays, a control tower that can see the whole city,
  // and a pad on the roof of the yard. Red and white, because that is what
  // rescue is, everywhere, to everybody.
  const rescue = new THREE.Group();
  rescue.position.set(24, 0, -4);
  const RESCUE_W = 13;
  const RESCUE_L = 22;
  const shed = new THREE.Mesh(new THREE.BoxGeometry(RESCUE_W, 7.5, RESCUE_L), mat(C.white));
  shed.position.y = 3.75;
  const stripe = new THREE.Mesh(new THREE.BoxGeometry(RESCUE_W + 0.2, 1.4, RESCUE_L + 0.2), mat(C.trim));
  stripe.position.y = 5.6;
  const roof = new THREE.Mesh(new THREE.BoxGeometry(RESCUE_W + 1, 0.5, RESCUE_L + 1), mat(C.slate));
  roof.position.y = 7.6;
  rescue.add(shed, stripe, roof);

  // Three bays facing the station, each with its door up and a dark mouth.
  for (let i = 0; i < 3; i++) {
    const z = -7 + i * 7;
    const mouth = new THREE.Mesh(
      new THREE.BoxGeometry(0.3, 5.0, 5.0),
      new THREE.MeshStandardMaterial({ color: 0x22201e, roughness: 1 }),
    );
    mouth.position.set(-RESCUE_W / 2 - 0.1, 2.5, z);
    const lintel = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.9, 5.6), mat(C.trim));
    lintel.position.set(-RESCUE_W / 2 - 0.1, 5.4, z);
    rescue.add(mouth, lintel);
  }

  // The control tower, with a glazed top that lights up with everything else.
  const mast = new THREE.Mesh(new THREE.BoxGeometry(5, 15, 5), mat(C.white));
  mast.position.set(3, 7.5, -13);
  const cab = new THREE.Mesh(new THREE.BoxGeometry(7, 3.4, 7), glass);
  cab.position.set(3, 16.7, -13);
  const brim = new THREE.Mesh(new THREE.BoxGeometry(8, 0.5, 8), mat(C.trim));
  brim.position.set(3, 18.6, -13);
  rescue.add(mast, cab, brim);
  group.add(rescue);

  // The apron the vehicles stand on, and the pad beyond it.
  const apron = new THREE.Mesh(new THREE.BoxGeometry(14, 0.1, 30), mat(0x6c7175, 0.95));
  apron.position.set(13.5, 0.05, -4);
  group.add(apron);

  const pad = new THREE.Mesh(new THREE.CylinderGeometry(7, 7, 0.22, 24), mat(0x4f5559, 0.95));
  pad.position.set(28, 0.11, 18);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(5, 0.28, 6, 28), mat(C.white));
  ring.rotation.x = Math.PI / 2;
  ring.position.set(28, 0.24, 18);
  group.add(pad, ring);

  // ------------------------------------------------------- the helicopter
  const heli = new THREE.Group();
  heli.position.set(28, 0.3, 18);
  const hull = new THREE.Mesh(new THREE.CapsuleGeometry(1.5, 2.2, 5, 12), mat(C.trim));
  hull.rotation.z = Math.PI / 2;
  hull.scale.set(1, 1, 0.92);
  hull.position.y = 2.0;
  const nose = new THREE.Mesh(new THREE.SphereGeometry(1.35, 12, 10), glass);
  nose.position.set(2.3, 2.1, 0);
  const boom = new THREE.Mesh(new THREE.BoxGeometry(5.4, 0.55, 0.55), mat(C.white));
  boom.position.set(-4.4, 2.4, 0);
  const fin = new THREE.Mesh(new THREE.BoxGeometry(0.4, 1.9, 0.3), mat(C.trim));
  fin.position.set(-6.8, 3.1, 0);
  heli.add(hull, nose, boom, fin);
  for (const side of [-1, 1] as const) {
    const skid = new THREE.Mesh(new THREE.BoxGeometry(4.0, 0.18, 0.18), mat(0x39434a));
    skid.position.set(0, 0.2, side * 1.2);
    const strut = new THREE.Mesh(new THREE.BoxGeometry(0.16, 1.0, 0.16), mat(0x39434a));
    strut.position.set(0, 0.7, side * 1.2);
    heli.add(skid, strut);
  }
  const rotor = new THREE.Group();
  rotor.position.set(0, 3.9, 0);
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.5, 8), mat(0x39434a));
  rotor.add(hub);
  for (let i = 0; i < 4; i++) {
    const blade = new THREE.Mesh(new THREE.BoxGeometry(9.5, 0.1, 0.55), mat(0x39434a));
    blade.rotation.y = (i / 4) * Math.PI * 2;
    rotor.add(blade);
  }
  heli.add(rotor);
  const tailRotor = new THREE.Group();
  tailRotor.position.set(-7.0, 3.1, 0.3);
  for (let i = 0; i < 2; i++) {
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.1, 2.6, 0.3), mat(0x39434a));
    blade.rotation.z = (i / 2) * Math.PI;
    tailRotor.add(blade);
  }
  heli.add(tailRotor);
  group.add(heli);

  // ---------------------------------------------------- the rescue vehicles
  /** A square-shouldered truck: cab, body, six wheels. */
  const truck = (colour: number, bodyHeight: number): THREE.Group => {
    const g = new THREE.Group();
    const cab = new THREE.Mesh(new THREE.BoxGeometry(2.4, 2.2, 2.4), mat(colour));
    cab.position.set(0, 1.5, 2.6);
    const screen = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.9, 0.12), mat(0x9fc4d8, 0.3));
    screen.position.set(0, 1.9, 3.78);
    const body = new THREE.Mesh(new THREE.BoxGeometry(2.4, bodyHeight, 5.0), mat(colour));
    body.position.set(0, 1.0 + bodyHeight / 2, -1.2);
    const bar = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.3, 0.4), mat(0x3f8ed8));
    bar.position.set(0, 2.75, 2.6);
    g.add(cab, screen, body, bar);
    for (const z of [2.6, -0.6, -2.6]) {
      for (const side of [-1, 1] as const) {
        const w = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.3, 10), mat(0x2b2b2e));
        w.rotation.z = Math.PI / 2;
        w.position.set(side * 1.25, 0.5, z);
        g.add(w);
      }
    }
    return g;
  };

  const fire = truck(C.trim, 1.9);
  // The ladder, which is the whole reason a four-year-old can name it.
  const ladder = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.2, 6.4), mat(0xd8d2c4));
  ladder.position.set(0, 3.1, -1.2);
  fire.add(ladder);
  fire.position.set(13, 0.1, -11);
  fire.rotation.y = -Math.PI / 2;
  group.add(fire);

  const tow = truck(0xe8a33d, 1.2);
  const boomArm = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 4.6), mat(0x39434a));
  boomArm.position.set(0, 2.6, -2.6);
  boomArm.rotation.x = -0.3;
  tow.add(boomArm);
  tow.position.set(13, 0.1, 4);
  tow.rotation.y = -Math.PI / 2;
  group.add(tow);

  // ----------------------------------------------------- the building site
  // One more tower going up, at the end of the street. Hoardings round it, a
  // digger, a dumper, and a crane that swings all day.
  const site = new THREE.Group();
  site.position.set(-27, 0, 31);
  const SLABS = 4;
  for (let f = 0; f < SLABS; f++) {
    const slab = new THREE.Mesh(new THREE.BoxGeometry(11, 0.5, 11), mat(0xb8b2a6));
    slab.position.y = 0.4 + f * 3.4;
    site.add(slab);
    if (f === SLABS - 1) continue;
    for (const [cx, cz] of [[-4.6, -4.6], [4.6, -4.6], [-4.6, 4.6], [4.6, 4.6], [0, 0]]) {
      const col = new THREE.Mesh(new THREE.BoxGeometry(0.8, 3.4, 0.8), mat(0xc4beb0));
      col.position.set(cx, 2.35 + f * 3.4, cz);
      site.add(col);
    }
  }
  // Scaffolding up one face, which is what says "being built" rather than
  // "knocked down".
  for (let i = 0; i < 5; i++) {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 13, 5), mat(0xd8a43d));
    pole.position.set(6.2, 6.5, -5.2 + i * 2.6);
    site.add(pole);
  }
  for (let i = 0; i < 4; i++) {
    const deck = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.12, 11), mat(0x9e7b58));
    deck.position.set(6.2, 2.2 + i * 3.4, 0);
    site.add(deck);
  }
  // Hoardings, in a square with a way in.
  for (const [hx, hz, len, turn] of [
    [0, -11, 22, 0],
    [0, 11, 22, 0],
    [-11, 0, 22, Math.PI / 2],
  ] as number[][]) {
    const board = new THREE.Mesh(new THREE.BoxGeometry(len, 2.4, 0.2), mat(0x3f7a52));
    board.position.set(hx, 1.2, hz);
    board.rotation.y = turn;
    site.add(board);
  }
  group.add(site);

  // The crane: a mast, a jib with a counterweight, and a hook on a cable.
  const crane = new THREE.Group();
  crane.position.set(-27, 0, 31);
  const craneMast = new THREE.Mesh(new THREE.BoxGeometry(1.6, 26, 1.6), mat(0xe8c33d));
  craneMast.position.y = 13;
  crane.add(craneMast);
  const slew = new THREE.Group();
  slew.position.y = 26;
  const jib = new THREE.Mesh(new THREE.BoxGeometry(26, 1.0, 1.0), mat(0xe8c33d));
  jib.position.x = 7;
  const counter = new THREE.Mesh(new THREE.BoxGeometry(3.4, 2.0, 2.0), mat(0x5a5f63));
  counter.position.x = -6.5;
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(2.0, 1.8, 1.8), mat(C.white));
  cabin.position.set(1.4, -1.2, 0);
  slew.add(jib, counter, cabin);
  const cable = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 14, 5), mat(0x39434a));
  cable.position.set(15, -7, 0);
  const hook = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.2, 1.2), mat(0x5a5f63));
  hook.position.set(15, -14.4, 0);
  slew.add(cable, hook);
  crane.add(slew);
  group.add(crane);

  // A digger and a dumper on the site, because the crane is too far up to be
  // the thing he watches.
  const digger = new THREE.Group();
  const tracks = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.9, 2.6), mat(0x39434a));
  tracks.position.y = 0.45;
  const house = new THREE.Mesh(new THREE.BoxGeometry(2.6, 2.0, 2.4), mat(0xe8c33d));
  house.position.y = 1.9;
  digger.add(tracks, house);
  const arm = new THREE.Group();
  arm.position.set(1.2, 2.2, 0);
  const upper = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.5, 0.5), mat(0xe8c33d));
  upper.position.set(1.6, 0.9, 0);
  upper.rotation.z = 0.7;
  const fore = new THREE.Mesh(new THREE.BoxGeometry(3.0, 0.45, 0.45), mat(0xe8c33d));
  fore.position.set(3.6, 0.3, 0);
  fore.rotation.z = -0.5;
  const bucket = new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.0, 1.4), mat(0x5a5f63));
  bucket.position.set(4.9, -0.6, 0);
  arm.add(upper, fore, bucket);
  digger.add(arm);
  digger.position.set(-34, 0, 22);
  digger.rotation.y = 0.9;
  group.add(digger);

  const dumper = truck(0xe8a33d, 1.6);
  dumper.position.set(-20, 0.1, 24);
  dumper.rotation.y = 2.3;
  group.add(dumper);

  // Trees down the street and round the edge of the paving, so the city has
  // an edge rather than simply stopping.
  for (const [tx, tz, ts] of [
    [-13.5, -30, 0.7], [-13.5, -14, 0.65], [-13.5, 2, 0.7], [-13.5, 18, 0.62],
    [-43, -26, 0.95], [-44, -8, 1.05], [-43, 8, 0.9], [-41, 22, 1.0],
    [16, 20, 0.85], [8, 34, 0.95], [-8, -30, 0.9],
  ] as number[][]) {
    group.add(tree(tx, ground(tx, tz), tz, ts));
  }

  // --------------------------------------------------------- street lamps
  // Along the platform and the street, skipping anything that would stand in
  // the four-foot.
  const rails = railsNear(group, ctx.track, ctx.at, 60);
  const lamps: THREE.Mesh[] = [];
  for (const [lx, lz] of [
    [-13, -22], [-13, -6], [-13, 10], [-13, 26],
    [12, -20], [12, 10], [20, 14],
  ] as number[][]) {
    if (clearOfRails(rails, lx, lz) < 5) continue;
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 6, 7), mat(C.metal));
    post.position.set(lx, ground(lx, lz) + 3, lz);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.42, 10, 8), glass);
    head.position.set(lx, ground(lx, lz) + 6.2, lz);
    group.add(post, head);
    lamps.push(head);
  }

  shadowed(group);
  for (const slab of paved) flat(slab);
  flat(street);
  flat(apron);
  flat(pad);
  moving(heli, rotor, tailRotor, slew, arm);

  // ------------------------------------------------------------- behaviour
  let clock = 0;
  let answered = -99;
  // ------------------------------------------------- the crane he can work
  // The tower crane above is scenery: twenty-six metres up and swinging over
  // the slabs, it was never going to load a wagon. This is a mobile one down
  // at track level, brought round from the site to the station end to work
  // the railway — which is why it stands here rather than in the middle of
  // the slabs. It cannot be over there and over the train at the same time,
  // and the train is the one that matters: he stops at the platform.
  //
  // The street side, because the platform and the station building have the
  // whole of the other one — and ten metres rather than the harbour's
  // fourteen, because the near row of towers starts sixteen metres out and a
  // longer jib would sweep straight through one of them.
  const loader = buildCrane(ctx, group, { along: -7.4, side: -1, liftY: 1.5, reach: 10 });
  group.add(loader.group);

  /** Counts down from a whistle: the siren, the rotor and the lift-off. */
  let scramble = 0;
  let spin = 0;

  return {
    group,
    stop: { id: 'city', at: ctx.at },
    crane: loader,
    settle() {
      loader.settle();
    },
    arrive() {
      station.arrive();
    },
    depart() {
      station.depart();
    },
    whistle(train) {
      if (!isNear(ctx.track, train, ctx.at, 90)) return;
      scramble = 1;
      if (clock - answered > 4) {
        answered = clock;
        ctx.audio.siren();
      }
      if (isNear(ctx.track, train, ctx.at, 30)) station.wave();
    },
    update(dt, elapsed) {
      clock = elapsed;
      scramble = Math.max(0, scramble - dt * 0.14);

      // The rotor takes a moment to wind up and a long time to wind down,
      // which is most of what makes a helicopter read as a helicopter.
      spin += ((scramble > 0.05 ? 1 : 0) - spin) * dt * 0.9;
      rotor.rotation.y += spin * 26 * dt;
      tailRotor.rotation.x += spin * 40 * dt;
      // It only leaves the pad once the rotor is properly up to speed.
      const lift = Math.max(0, spin - 0.55) / 0.45;
      heli.position.y = 0.3 + lift * 9;
      heli.rotation.z = -lift * 0.14;
      heli.rotation.y = lift * Math.sin(elapsed * 0.5) * 0.3;

      // The crane swings all day whatever he does; it is scenery that moves
      // rather than an answer to anything.
      slew.rotation.y = Math.sin(elapsed * 0.11) * 0.9;
      arm.rotation.z = Math.sin(elapsed * 0.5) * 0.22;
      loader.update(dt);

      // Every window and every lamp in the city comes up together as it gets
      // dark, which is the one moment this place is better than the country.
      const night = dusk();
      glass.emissiveIntensity = night * 1.9;
      for (const lamp of lamps) {
        (lamp.material as THREE.MeshStandardMaterial).emissiveIntensity = night * 1.9;
      }

      station.update(elapsed);
    },
  };
}
