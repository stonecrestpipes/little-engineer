import * as THREE from 'three';
import { C, mat, person, shadowed } from '../scenery';
import { WATER_LEVEL } from '../terrain';
import { frameAt, gapTo, isNear, watching, type Place, type PlaceContext } from './place';
import { moving } from '../../engine/merge';

/**
 * The Drawbridge — where the lighthouse line crosses the creek.
 *
 * It stands up, not down. With nothing coming it is open to the sky, and a
 * little boat putters through underneath; as he comes round the bend it rings
 * its bell and lowers itself for him, and once he is well past it goes back
 * up. So the thing he sees first is a bridge that is *in his way*, and the
 * thing he sees next is it getting out of it — which is a better thirty
 * seconds than a bridge that is simply there.
 *
 * It cannot fail and it cannot catch him out: the deck is down long before he
 * reaches it, and if he somehow arrives early it hurries. There is nothing to
 * do and nothing to get wrong, which is the rule for everything here.
 */

export interface DrawbridgeContext extends PlaceContext {
  from: number;
  to: number;
}

export function buildDrawbridge(ctx: DrawbridgeContext): Place {
  const group = frameAt(ctx.track, ctx.at);
  const half = (ctx.to - ctx.from) / 2;

  // ---------------------------------------------------------- the abutments
  // Stone at each end, carrying the rails up to the level of the deck.
  for (const end of [-1, 1] as const) {
    const pier = new THREE.Mesh(new THREE.BoxGeometry(7.2, 9, 5), mat(C.stoneDark));
    pier.position.set(0, -4.0, end * (half - 1.5));
    group.add(pier);
    const cap = new THREE.Mesh(new THREE.BoxGeometry(7.8, 0.5, 5.6), mat(C.stone));
    cap.position.set(0, 0.4, end * (half - 1.5));
    group.add(cap);
  }

  // The fixed approach decks, which never move.
  for (const end of [-1, 1] as const) {
    const deck = new THREE.Mesh(new THREE.BoxGeometry(5.4, 0.5, half - 4), mat(C.sleeper));
    deck.position.set(0, 0.1, (end * (half + 4)) / 2);
    group.add(deck);
  }

  // --------------------------------------------------------- the lifting span
  // Hinged at the near abutment and swinging up and away from him, so it is
  // out of the picture when it is up rather than filling it.
  const SPAN = half - 1.5;
  const hinge = new THREE.Group();
  hinge.position.set(0, 0.35, -(half - 4));
  const deck = new THREE.Mesh(new THREE.BoxGeometry(5.4, 0.45, SPAN * 1.6), mat(C.sleeper));
  deck.position.set(0, 0, (SPAN * 1.6) / 2);
  hinge.add(deck);
  const railMat = new THREE.MeshStandardMaterial({ color: C.rail, roughness: 0.4, metalness: 0.5 });
  for (const side of [-1, 1]) {
    const r = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.16, SPAN * 1.6), railMat);
    r.position.set(side * 0.72, 0.3, (SPAN * 1.6) / 2);
    hinge.add(r);
    // A lattice girder down each side, which is what says drawbridge.
    const girder = new THREE.Mesh(new THREE.BoxGeometry(0.22, 1.5, SPAN * 1.6), mat(C.trim));
    girder.position.set(side * 2.5, 0.9, (SPAN * 1.6) / 2);
    hinge.add(girder);
    for (let i = 0; i < 6; i++) {
      const brace = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.16, 2.2), mat(C.trim));
      brace.position.set(side * 2.5, 0.9, 1.4 + i * (SPAN * 1.6 - 2.4) / 5);
      brace.rotation.x = i % 2 ? 0.7 : -0.7;
      hinge.add(brace);
    }
  }
  group.add(hinge);
  shadowed(hinge);

  // ------------------------------------------------------------ the tower
  // The counterweight tower over the hinge, which is what makes the shape
  // read as a lifting bridge even while it is lying flat.
  const tower = new THREE.Group();
  tower.position.set(0, 0, -(half - 4));
  for (const side of [-1, 1] as const) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.6, 13, 0.6), mat(C.metal));
    leg.position.set(side * 3.4, 6.5, 0);
    tower.add(leg);
  }
  const yoke = new THREE.Mesh(new THREE.BoxGeometry(7.8, 0.7, 1.2), mat(C.metal));
  yoke.position.y = 13;
  tower.add(yoke);
  const weight = new THREE.Mesh(new THREE.BoxGeometry(5.6, 2.2, 2.2), mat(C.slate));
  weight.position.y = 11.6;
  tower.add(weight);
  group.add(tower);
  shadowed(tower);

  // ------------------------------------------------------------- the hut
  const hut = new THREE.Group();
  hut.position.set(7.5, 0, -(half - 1));
  const walls = new THREE.Mesh(new THREE.BoxGeometry(3.2, 3.2, 3.2), mat(C.cream));
  walls.position.y = 1.6;
  const roof = new THREE.Mesh(new THREE.BoxGeometry(3.8, 0.4, 3.8), mat(C.trim));
  roof.position.y = 3.4;
  const pane = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.2, 2.0), mat(0xbcdcf0, 0.3));
  pane.position.set(-1.6, 2.0, 0);
  hut.add(walls, roof, pane);
  group.add(hut);
  const keeper = person(0xe8a33d);
  keeper.position.set(6.4, 0.2, -(half - 4.5));
  keeper.rotation.y = -1.6;
  group.add(keeper);

  // -------------------------------------------------------------- the boat
  // Something to go under it, so the bridge is standing open for a reason.
  const boat = new THREE.Group();
  const hull = new THREE.Mesh(new THREE.CapsuleGeometry(0.9, 3.4, 4, 9), mat(0x3f7a52));
  hull.rotation.x = Math.PI / 2;
  hull.scale.set(0.8, 1, 1);
  hull.position.y = 0.3;
  const house = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.3, 1.6), mat(C.white));
  house.position.set(0, 1.4, -0.4);
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 6.4, 6), mat(C.trunk));
  mast.position.y = 3.4;
  boat.add(hull, house, mast);
  boat.position.set(0, WATER_LEVEL + 0.8, 0);
  group.add(boat);
  shadowed(boat);

  moving(hinge, keeper, boat);

  // ------------------------------------------------------------- behaviour
  /** 0 is flat and ready to drive over, 1 is standing right up. */
  let lift = 1;
  let clock = 0;
  let rang = -99;

  return {
    group,
    whistle(train) {
      // A whistle from a long way off puts the bell on early, which is the
      // only hint he ever gets that he is the reason it comes down.
      if (!isNear(ctx.track, train, ctx.at, 150) || clock - rang < 6) return;
      rang = clock;
      ctx.audio.bell(3, 0.5);
    },
    update(dt, elapsed, train) {
      clock = elapsed;

      // Down for him, up for the boat. Measured so it is flat well before he
      // gets to it, and goes back up only once he is properly clear.
      const gap = watching(train) ? Math.abs(gapTo(ctx.track, train, ctx.at)) : Infinity;
      const coming = gap < 110;
      if (coming && lift > 0 && clock - rang > 6) {
        rang = clock;
        ctx.audio.bell(4, 0.46);
      }
      // It hurries if he is nearly on it, which is the only way it can ever
      // be late, and it is never allowed to be.
      const rate = dt * (gap < 45 ? 1.4 : 0.42);
      lift += THREE.MathUtils.clamp((coming ? 0 : 1) - lift, -rate, rate);
      hinge.rotation.x = -lift * 1.28;
      weight.position.y = 11.6 - lift * 2.2;

      // The boat comes through while it is open and waits out of the way
      // while it is shut.
      const sail = ((elapsed * 0.08) % 1) * 2 - 1;
      boat.position.z = sail * 46;
      boat.position.x = lift > 0.6 ? 0 : 13;
      boat.position.y = WATER_LEVEL + 0.8 + Math.sin(elapsed * 1.1) * 0.12;
      boat.rotation.y = sail > 0 ? 0 : Math.PI;
      boat.rotation.z = Math.sin(elapsed * 0.9) * 0.04;

      keeper.rotation.z = lift > 0.05 && lift < 0.95 ? Math.sin(elapsed * 7) * 0.14 : 0;
    },
  };
}
