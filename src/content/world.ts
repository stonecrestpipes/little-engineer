import * as THREE from 'three';
import { Network, type Route, type Track } from '../engine/track';
import type { Stop } from '../engine/train';
import type { Audio } from '../engine/audio';
import type { Roster } from './roster';
import { buildTerrain, distanceToPath } from './terrain';
import {
  C,
  UP,
  broadleaves,
  conifers,
  fenceAlong,
  mat,
  rail,
  ribbon,
  sleepers,
  type Planting,
} from './scenery';
import type { Place, PlaceContext, TrainState } from './places/place';
import { buildSheds } from './places/sheds';
import { buildCrossing } from './places/crossing';
import { buildFarm } from './places/farm';
import { buildTunnel } from './places/tunnel';
import { buildBridge } from './places/bridge';
import { buildHarbour } from './places/harbour';

export interface World {
  track: Track;
  stops: Stop[];
  tracksideAnchors: THREE.Vector3[];
  wide: { position: THREE.Vector3; target: THREE.Vector3 };
  arrive(stop: Stop): void;
  depart(stop: Stop): void;
  whistle(train: TrainState): void;
  update(dt: number, elapsed: number, train: TrainState): void;
  /** He touched the world rather than a button. True if anywhere acted on it. */
  pick(ray: THREE.Raycaster, train: TrainState): boolean;
}

/**
 * The railway, and the places on it.
 *
 * The loop runs: The Sheds → across the meadow and over the level crossing →
 * The Farm → up the hillside and through the tunnel → down to the river and
 * over the bridge → The Harbour → back along the shore to The Sheds. About
 * 600 metres, a minute and a half at full lever.
 *
 * Every piece of it is a named segment of the network rather than part of one
 * closed curve, which is what makes a branch line a content change later.
 */

const SEGMENTS: Record<string, number[][]> = {
  sheds: [[-92, 34], [-88, 56], [-78, 74]],
  meadow: [[-78, 74], [-56, 88], [-28, 96], [-2, 98]],
  farm: [[-2, 98], [26, 94], [52, 84]],
  hillfoot: [[52, 84], [78, 68], [96, 46]],
  bore: [[96, 46], [106, 22], [108, -4]],
  descent: [[108, -4], [104, -32], [90, -56]],
  rivermouth: [[90, -56], [66, -72], [44, -82], [20, -88]],
  harbour: [[20, -88], [-8, -94], [-36, -92]],
  shore: [[-36, -92], [-64, -84], [-84, -64]],
  westbank: [[-84, -64], [-95, -38], [-96, -4], [-92, 34]],
};

const ORDER = Object.keys(SEGMENTS);

/** From the pond in the middle of the loop, out under the bridge, to the sea. */
const RIVER: [number, number][] = [
  [20, -18],
  [26, -36],
  [40, -58],
  [55, -78],
  [64, -104],
  [72, -150],
];

export function buildWorld(scene: THREE.Scene, audio: Audio, roster: Roster): World {
  // ---------------------------------------------------------------- track
  const net = new Network();
  for (const [id, pts] of Object.entries(SEGMENTS)) {
    net.add(id, pts.map(([x, z]) => new THREE.Vector3(x, 0, z)));
  }
  net.chain(ORDER, true);
  const route: Route = net.route(ORDER.map((segment) => ({ segment })));

  /** The middle of a named segment, in metres along the route. */
  const middleOf = (id: string): number => route.startOf(id) + net.get(id).length / 2;

  // Where the rails leave the ground: through the hill, and over the water.
  const TUNNEL_HALF = 19;
  const tunnelAt = middleOf('bore');
  const tunnel = { from: tunnelAt - TUNNEL_HALF, to: tunnelAt + TUNNEL_HALF };

  // The bridge goes wherever the river actually is, found rather than guessed.
  const bridgeAt = (() => {
    const from = route.startOf('rivermouth');
    const span = net.get('rivermouth').length;
    const p = new THREE.Vector3();
    let best = from;
    let bestGap = Infinity;
    for (let d = from; d <= from + span; d += 0.5) {
      route.positionAt(d, p);
      const gap = distanceToPath(RIVER, p.x, p.z);
      if (gap < bestGap) {
        bestGap = gap;
        best = d;
      }
    }
    return best;
  })();
  const BRIDGE_HALF = 17;
  const bridge = { from: bridgeAt - BRIDGE_HALF, to: bridgeAt + BRIDGE_HALF };

  // The yard beside The Sheds wants to be flat ground rather than country,
  // since a siding and a line of stock stand on it.
  const shedsAt = middleOf('sheds');
  const yard = (() => {
    const p = route.positionAt(shedsAt);
    const t = route.tangentAt(shedsAt);
    const side = new THREE.Vector3().crossVectors(t, UP).normalize();
    return { x: p.x - side.x * 12.5, z: p.z - side.z * 12.5, radius: 24 };
  })();

  // -------------------------------------------------------------- terrain
  const terrain = buildTerrain(route, {
    freeSpans: [bridge],
    river: RIVER,
    riverDepth: 11,
    riverWidth: 7,
    hills: [
      // the one the tunnel goes through, sat squarely on the line
      { x: 107, z: 16, radius: 66, height: 18 },
      // and the far ones, so the horizon is not a hard edge
      { x: -168, z: 58, radius: 96, height: 24 },
      { x: 40, z: 168, radius: 88, height: 19 },
      { x: -150, z: -150, radius: 84, height: 21 },
      { x: 186, z: -96, radius: 78, height: 17 },
    ],
    ponds: [
      // the pond the river comes from
      { x: 20, z: -12, radius: 28, depth: 9 },
      // and the harbour basin, dug in behind the quay
      { x: -8, z: -118, radius: 42, depth: 12 },
    ],
    flats: [yard],
    shore: -100,
    deep: -128,
    seaDepth: 15,
  });
  scene.add(terrain.ground, terrain.water);

  // ---------------------------------------------------------------- rails
  scene.add(ribbon(route, 1.9, 0.02, mat(C.ballast)));
  scene.add(sleepers(route));
  const railMat = new THREE.MeshStandardMaterial({ color: C.rail, roughness: 0.4, metalness: 0.5 });
  scene.add(rail(route, 0.72, 0.2, railMat));
  scene.add(rail(route, -0.72, 0.2, railMat));

  // --------------------------------------------------------------- places
  const context = (at: number): PlaceContext => ({
    track: route,
    audio,
    roster,
    groundAt: terrain.heightAt,
    at,
  });

  const places: Place[] = [
    buildSheds(context(shedsAt)),
    buildCrossing(context(middleOf('meadow'))),
    buildFarm(context(middleOf('farm'))),
    buildTunnel({ ...context(tunnelAt), ...tunnel }),
    buildBridge({ ...context(bridgeAt), ...bridge, river: RIVER }),
    buildHarbour(context(middleOf('harbour'))),
  ];
  for (const place of places) scene.add(place.group);

  const stops = places.flatMap((p) => (p.stop ? [p.stop] : []));
  const byStop = new Map<string, Place>();
  for (const p of places) if (p.stop) byStop.set(p.stop.id, p);

  const harbourAt = middleOf('harbour');

  // -------------------------------------------------------------- scenery
  // Trees stand on the real ground, so they follow the hills and stop at the
  // waterline instead of wading out to sea. Conifers take the high ground,
  // which is most of what makes the hillside read as higher.
  const wood: Planting[] = [];
  const hillside: Planting[] = [];
  const taken: [number, number][] = [];
  for (let i = 0; i < 420; i++) {
    const a = (i / 300) * Math.PI * 2 + Math.random() * 0.3;
    const r = 26 + Math.random() * 190;
    const x = Math.cos(a) * r + (Math.random() - 0.5) * 30;
    const z = Math.sin(a) * r * 0.95 + (Math.random() - 0.5) * 30;
    const y = terrain.heightAt(x, z);
    // Not in the water, not on the railway, not in the yard, and not on top
    // of each other. A tree standing in the four-foot is funny exactly once.
    if (y < -1.5 || y > 26) continue;
    if (terrain.distanceToTrack(x, z) < 12) continue;
    if (distanceToPath(RIVER, x, z) < 13) continue;
    if ((x - yard.x) ** 2 + (z - yard.z) ** 2 < (yard.radius + 8) ** 2) continue;
    if (taken.some(([px, pz]) => (px - x) ** 2 + (pz - z) ** 2 < 100)) continue;
    taken.push([x, z]);
    const turn = Math.random() * Math.PI;
    if (y > 8) hillside.push({ x, y, z, turn, scale: 0.8 + Math.random() * 0.5 });
    else wood.push({ x, y, z, turn, scale: 0.75 + Math.random() * 0.55 });
  }
  scene.add(broadleaves(wood), conifers(hillside));

  // A fence along the meadow, so there is something to measure speed against.
  const meadowFrom = route.startOf('meadow');
  scene.add(fenceAlong(route, meadowFrom + 8, meadowFrom + 62, 6.4));
  scene.add(fenceAlong(route, meadowFrom + 8, meadowFrom + 62, -6.4));

  // ----------------------------------------------------------------- views
  const tracksideAnchors: THREE.Vector3[] = [];
  const p = new THREE.Vector3();
  const t = new THREE.Vector3();
  const side = new THREE.Vector3();
  for (let i = 0; i < 9; i++) {
    const d = (i / 9) * route.length + 14;
    // Not inside the tunnel, where the shot would be a wall.
    if (route.ahead(tunnel.from - 8, d) < TUNNEL_HALF * 2 + 16) continue;
    route.positionAt(d, p);
    route.tangentAt(d, t);
    side.crossVectors(t, UP).normalize().multiplyScalar(10.5);
    const x = p.x + side.x;
    const z = p.z + side.z;
    tracksideAnchors.push(new THREE.Vector3(x, Math.max(0, terrain.heightAt(x, z)) + 2.7, z));
  }

  const wide = {
    position: new THREE.Vector3(6, 200, 262),
    target: new THREE.Vector3(6, 0, 28),
  };

  return {
    track: route,
    stops,
    tracksideAnchors,
    wide,
    arrive(stop) {
      byStop.get(stop.id)?.arrive?.();
    },
    depart(stop) {
      byStop.get(stop.id)?.depart?.();
    },
    whistle(train) {
      for (const place of places) place.whistle?.(train);
    },
    pick(ray, train) {
      for (const place of places) if (place.pick?.(ray, train)) return true;
      return false;
    },
    update(dt, elapsed, train) {
      for (const place of places) place.update?.(dt, elapsed, train);

      // What the countryside sounds like from where he is.
      const nearWater = Math.max(
        1 - Math.abs(route.delta(train.distance, harbourAt)) / 95,
        1 - Math.abs(route.delta(train.distance, bridgeAt)) / 70,
        0,
      );
      audio.setAmbience({ water: nearWater, birds: 0.85 - nearWater * 0.55 });
    },
  };
}
