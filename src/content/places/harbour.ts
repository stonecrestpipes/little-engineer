import * as THREE from 'three';
import { C, COATS, mat, person, shadowed } from '../scenery';
import { WATER_LEVEL } from '../terrain';
import { buildStation } from './station';
import { frameAt, isNear, type Place, type PlaceContext } from './place';
import { moving } from '../../engine/merge';

/**
 * The Harbour — blue, boats, cranes, and the sea behind it.
 *
 * Its signature is the answer: whistle here and a boat sounds its horn back,
 * lower and slower than his. Two whistles having a conversation is the whole
 * idea, and it costs one sound and one moving funnel.
 *
 * The platform is on the seaward side here rather than the usual one, so the
 * water is what he is looking at while he stands.
 */
export function buildHarbour(ctx: PlaceContext): Place {
  const group = frameAt(ctx.track, ctx.at);
  const station = buildStation({
    wall: C.harbourBlue,
    roof: C.slate,
    board: C.water,
    length: 30,
    waiting: 4,
    side: -1,
  });
  group.add(station.group);

  // The quay: a stone edge standing out of the water, seaward of the platform.
  const quay = new THREE.Mesh(new THREE.BoxGeometry(9, 5.2, 46), mat(C.stoneDark));
  quay.position.set(-16, -2.4, 0);
  group.add(quay);
  const kerb = new THREE.Mesh(new THREE.BoxGeometry(9.6, 0.4, 46), mat(C.cream));
  kerb.position.set(-16, 0.2, 0);
  group.add(kerb);

  // --------------------------------------------------------------- cranes
  const cranes: THREE.Group[] = [];
  for (const z of [-13, 11]) {
    const crane = new THREE.Group();
    crane.position.set(-14.5, 0.7, z);
    const base = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.8, 0.8, 10), mat(C.slate));
    base.position.y = 0.4;
    const swing = new THREE.Group();
    swing.position.y = 0.8;
    const mast = new THREE.Mesh(new THREE.BoxGeometry(1.1, 9, 1.1), mat(C.trim));
    mast.position.y = 4.5;
    const jib = new THREE.Mesh(new THREE.BoxGeometry(11, 0.7, 0.7), mat(C.trim));
    jib.position.set(-4, 8.6, 0);
    jib.rotation.z = 0.16;
    const cab = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.8, 2.2), mat(C.cream));
    cab.position.set(1.4, 2.2, 0);
    const cable = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 5.4, 5), mat(0x2b3a45));
    cable.position.set(-8.6, 5.9, 0);
    const hook = new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.1, 1.1), mat(C.metal));
    hook.position.set(-8.6, 2.9, 0);
    swing.add(mast, jib, cab, cable, hook);
    crane.add(base, swing);
    group.add(crane);
    cranes.push(swing);
  }

  // ---------------------------------------------------------------- boats
  interface Boat {
    group: THREE.Group;
    funnel: THREE.Mesh;
    phase: number;
    bob: number;
  }
  const boats: Boat[] = [];
  const hullColours = [C.trim, 0x2f6f96, 0x4a7c59];
  for (let i = 0; i < 3; i++) {
    const b = new THREE.Group();
    const hull = new THREE.Mesh(new THREE.CapsuleGeometry(1.5, 5.4, 4, 10), mat(hullColours[i]));
    hull.rotation.z = Math.PI / 2;
    hull.scale.set(1, 1, 0.72);
    hull.position.y = 0.4;
    const deck = new THREE.Mesh(new THREE.BoxGeometry(5.2, 0.3, 2.6), mat(C.cream));
    deck.position.y = 1.3;
    const house = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.9, 2.2), mat(C.white));
    house.position.set(-0.6, 2.35, 0);
    const funnel = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.48, 1.9, 10), mat(C.brick));
    funnel.position.set(0.9, 2.9, 0);
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 4.4, 6), mat(C.trunk));
    mast.position.set(-2.4, 3.4, 0);
    b.add(hull, deck, house, funnel, mast);
    // Far enough out that the quay wall does not hide them. The land stands
    // about four metres above the water, so anything moored right against the
    // wall is out of sight from every camera the game actually uses.
    b.position.set(-33 - i * 6, WATER_LEVEL + 1.0, -19 + i * 18);
    b.rotation.y = 0.12 - i * 0.16;
    group.add(b);
    boats.push({ group: b, funnel, phase: i * 2.1, bob: b.position.y });
  }

  // ----------------------------------------------------------- the Badger
  // The car ferry, lying alongside the quay: black hull, white decks, one big
  // funnel. She is four times the size of anything else on the water here,
  // which is the point of her — she is the one thing on this map that is a
  // real ship from a real place rather than an invented one.
  const badger = new THREE.Group();
  badger.position.set(-30, WATER_LEVEL, 2);
  const L = 34;
  const BEAM = 8.4;

  const black = mat(0x22262b);
  const white = mat(0xf0ece2);
  const hull = new THREE.Mesh(new THREE.BoxGeometry(BEAM, 4.6, L), black);
  hull.position.y = 1.4;
  badger.add(hull);
  // A raked bow, so she is not simply a brick.
  const bow = new THREE.Mesh(new THREE.CylinderGeometry(BEAM / 2, BEAM / 2, 4.6, 16, 1, false, -Math.PI / 2, Math.PI), black);
  bow.position.set(0, 1.4, L / 2);
  badger.add(bow);
  const boot = new THREE.Mesh(new THREE.BoxGeometry(BEAM + 0.2, 0.5, L + 0.2), mat(C.trim));
  boot.position.y = 3.5;
  badger.add(boot);
  // The car deck, open at the stern where the trains and lorries drive on.
  const carDeck = new THREE.Mesh(new THREE.BoxGeometry(BEAM, 0.4, L), white);
  carDeck.position.y = 3.9;
  badger.add(carDeck);
  for (const side of [-1, 1] as const) {
    const bulwark = new THREE.Mesh(new THREE.BoxGeometry(0.4, 3.2, L - 6), white);
    bulwark.position.set((side * BEAM) / 2, 5.6, 1);
    badger.add(bulwark);
  }
  // Two decks of superstructure, set back from the bow.
  const house = new THREE.Mesh(new THREE.BoxGeometry(BEAM - 1.4, 3.0, 15), white);
  house.position.set(0, 7.6, -2);
  const upper = new THREE.Mesh(new THREE.BoxGeometry(BEAM - 2.6, 2.6, 10), white);
  upper.position.set(0, 10.4, -1);
  const bridgeHouse = new THREE.Mesh(new THREE.BoxGeometry(BEAM - 2.0, 2.2, 4.2), white);
  bridgeHouse.position.set(0, 12.8, 2.4);
  badger.add(house, upper, bridgeHouse);
  for (const side of [-1, 1] as const) {
    for (let i = 0; i < 6; i++) {
      const port = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.7, 1.0), mat(0x2b3a45, 0.4));
      port.position.set((side * (BEAM - 1.4)) / 2, 7.8, -8 + i * 2.6);
      badger.add(port);
    }
    // Lifeboats under their davits, which is most of what says "ship".
    for (const z of [-5, 1]) {
      const lifeboat = new THREE.Mesh(new THREE.CapsuleGeometry(0.5, 2.2, 3, 7), mat(0xe8a33d));
      lifeboat.rotation.x = Math.PI / 2;
      lifeboat.position.set((side * (BEAM - 1.2)) / 2, 9.6, z);
      badger.add(lifeboat);
    }
  }
  // The funnel: tall, upright and black-topped.
  const funnelBody = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.7, 5.2, 16), white);
  funnelBody.position.set(0, 14.2, -3.5);
  const funnelCap = new THREE.Mesh(new THREE.CylinderGeometry(1.52, 1.52, 1.4, 16), black);
  funnelCap.position.set(0, 17.5, -3.5);
  badger.add(funnelBody, funnelCap);
  const foremast = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 9, 6), white);
  foremast.position.set(0, 18, 3);
  badger.add(foremast);

  group.add(badger);
  shadowed(badger);

  // The gangway and the mooring lines, so she reads as tied up rather than
  // parked.
  const gangway = new THREE.Mesh(new THREE.BoxGeometry(8, 0.3, 2.2), mat(0x9e7b58));
  gangway.position.set(-22.5, 3.4, -4);
  gangway.rotation.z = -0.08;
  group.add(gangway);

  // a few bollards, and someone fishing off the end
  for (const z of [-20, -6, 8, 20]) {
    const bollard = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.42, 0.9, 8), mat(C.slate));
    bollard.position.set(-19.5, 1.15, z);
    group.add(bollard);
  }
  const fisher = person(COATS[4]);
  fisher.position.set(-19, 0.7, -24);
  fisher.rotation.y = -1.4;
  group.add(fisher);

  shadowed(group);

  // ------------------------------------------------------------ behaviour
  let clock = 0;
  let hornAt = -99;
  let answered = -99;

  moving(...cranes, ...boats.map((b) => b.group), ...boats.map((b) => b.funnel), badger);

  return {
    group,
    stop: { id: 'harbour', at: ctx.at },
    arrive() {
      station.arrive();
    },
    depart() {
      station.depart();
    },
    whistle(train) {
      if (!isNear(ctx.track, train, ctx.at, 60)) return;
      // The Badger takes a moment to answer, the way a big thing does.
      if (clock - answered > 1.6) {
        answered = clock;
        hornAt = clock + 0.75;
        ctx.audio.horn(0.75);
      }
      if (isNear(ctx.track, train, ctx.at, 28)) station.wave();
    },
    update(_dt, elapsed) {
      clock = elapsed;
      for (const b of boats) {
        b.group.position.y = b.bob + Math.sin(elapsed * 0.9 + b.phase) * 0.18;
        b.group.rotation.z = Math.sin(elapsed * 0.7 + b.phase) * 0.035;
        b.group.rotation.x = Math.cos(elapsed * 0.55 + b.phase) * 0.03;
      }
      // She is far too big to bob, but she breathes.
      badger.position.y = WATER_LEVEL + Math.sin(elapsed * 0.4) * 0.07;
      badger.rotation.z = Math.sin(elapsed * 0.33) * 0.008;

      // The near boat lifts its funnel a little as it sounds off.
      const since = elapsed - hornAt;
      const blast = since > 0 && since < 1.8 ? Math.sin((since / 1.8) * Math.PI) : 0;
      boats[0].funnel.scale.setScalar(1 + blast * 0.12);
      cranes.forEach((c, i) => {
        c.rotation.y = Math.sin(elapsed * 0.18 + i * 2) * 0.32;
      });
      station.update(elapsed);
    },
  };
}
