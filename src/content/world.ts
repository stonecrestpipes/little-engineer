import * as THREE from 'three';
import { Network, type Route } from '../engine/track';
import { Lines } from '../engine/junction';
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
import { buildWindmill } from './places/windmill';
import { buildLighthouse } from './places/lighthouse';

/** Somewhere the railway divides and he gets to choose. */
export interface Junction {
  id: 'farm' | 'coast';
  /** Which bit of the loop number this junction decides. */
  bit: number;
  /** How far round the points are, on a given loop. */
  pointsOn(line: number): number;
}

export interface World {
  /** Every way round, as one track whose points can be set before he reaches them. */
  track: Lines;
  junctions: Junction[];
  stops: Stop[];
  tracksideAnchors: THREE.Vector3[];
  /** Ground height anywhere on the map, and how far a point is from the rails. */
  groundAt(x: number, z: number): number;
  distanceToTrack(x: number, z: number): number;
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
 * closed curve, which is what made the branch line a content change.
 *
 * There are two branches. After The Farm, the main line bears left into the
 * tunnel and the branch carries straight on round the far side of the hill
 * to The Windmill, coming back in above the bridge. After The Harbour, the
 * main line bears left for home and the branch carries on along the sea wall
 * to The Lighthouse on the headland, coming back in up the west bank.
 *
 * Every combination is a whole loop from The Sheds, so there are four, and
 * the loop number's bits say which branches it takes — see
 * src/engine/junction.ts for why that matters.
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
  // Split where the coast line comes back in.
  westbank: [[-84, -64], [-95, -38]],
  westfield: [[-95, -38], [-96, -4], [-92, 34]],

  // The branch. Kept well out on the far side of the hill, where the ground
  // is nearly level, so laying it does not carve a canyon next to the tunnel.
  eastline: [[52, 84], [78, 74], [104, 76], [130, 70], [152, 54], [166, 30]],
  windmill: [[166, 30], [170, 4], [164, -20]],
  eastback: [[164, -20], [148, -34], [126, -36], [106, -40], [90, -56]],

  // The coast line, right along the water's edge, up round the headland and
  // back in to the west bank.
  coast: [[-36, -92], [-60, -94], [-86, -104], [-110, -102]],
  lighthouse: [[-110, -102], [-122, -88], [-118, -72]],
  coastback: [[-118, -72], [-108, -62], [-96.5, -51], [-95, -38]],
};

const TUNNEL_WAY = ['hillfoot', 'bore', 'descent'];
const WINDMILL_WAY = ['eastline', 'windmill', 'eastback'];
const HOME_WAY = ['shore', 'westbank'];
const COAST_WAY = ['coast', 'lighthouse', 'coastback'];

/** Loop number bits: which branches a loop takes. */
const BY_WINDMILL = 1;
const BY_LIGHTHOUSE = 2;

/** The segments of loop `n`, from The Sheds round to The Sheds. */
const loopOf = (n: number): string[] => [
  'sheds', 'meadow', 'farm',
  ...(n & BY_WINDMILL ? WINDMILL_WAY : TUNNEL_WAY),
  'rivermouth', 'harbour',
  ...(n & BY_LIGHTHOUSE ? COAST_WAY : HOME_WAY),
  'westfield',
];
const MAIN_LINE = 0;

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
  // The main line is chained first, so where a branch joins on it is the
  // main line's neighbour that shapes the curve through the joint.
  net.chain(loopOf(MAIN_LINE), true);
  net.chain(WINDMILL_WAY);
  net.chain(COAST_WAY);
  net.join({ segment: 'farm', end: 'end' }, { segment: 'eastline', end: 'start' });
  net.join({ segment: 'eastback', end: 'end' }, { segment: 'rivermouth', end: 'start' });
  net.join({ segment: 'harbour', end: 'end' }, { segment: 'coast', end: 'start' });
  net.join({ segment: 'coastback', end: 'end' }, { segment: 'westfield', end: 'start' });
  const loops: Route[] = [0, 1, 2, 3].map((n) => net.route(loopOf(n).map((segment) => ({ segment }))));
  const route = loops[MAIN_LINE];
  /** Just the branches, for laying rails and shaping the ground. */
  const branches: Route[] = [WINDMILL_WAY, COAST_WAY].map((way) =>
    net.route(way.map((segment) => ({ segment })), false),
  );

  const lines = new Lines(loops);
  const convert = (at: number, from: number, to: number) => lines.convert(at, from, to);
  const junctions: Junction[] = (
    [
      { id: 'farm', bit: BY_WINDMILL, main: 'hillfoot', branch: 'eastline' },
      { id: 'coast', bit: BY_LIGHTHOUSE, main: 'shore', branch: 'coast' },
    ] as const
  ).map(({ id, bit, main, branch }) => ({
    id,
    bit,
    pointsOn: (line: number) => loops[line].startOf(line & bit ? branch : main),
  }));

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
  const terrain = buildTerrain([route, ...branches], {
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
  // A hair above the main line's ballast, so the two do not flicker where
  // they overlap at the points.
  for (const branch of branches) {
    scene.add(ribbon(branch, 1.9, 0.026, mat(C.ballast)));
    scene.add(sleepers(branch));
    scene.add(rail(branch, 0.72, 0.2, railMat, false));
    scene.add(rail(branch, -0.72, 0.2, railMat, false));
  }

  // --------------------------------------------------------------- places
  const context = (at: number, track: Route = route): PlaceContext => ({
    track,
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
  // Each branch place is built on a loop that takes its branch.
  const onLoop = new Map<Place, number>();
  const branchPlace = (build: (c: PlaceContext) => Place, segment: string, line: number) => {
    const loop = loops[line];
    const place = build(context(loop.startOf(segment) + net.get(segment).length / 2, loop));
    onLoop.set(place, line);
    places.push(place);
  };
  branchPlace(buildWindmill, 'windmill', BY_WINDMILL);
  branchPlace(buildLighthouse, 'lighthouse', BY_LIGHTHOUSE);
  for (const place of places) scene.add(place.group);
  const lineOf = (p: Place) => onLoop.get(p) ?? MAIN_LINE;

  // Each stop's distance is read live, in terms of whichever line the engine
  // is on now. A stop on the other line reads NaN and is never arrived at.
  const stops: Stop[] = places.flatMap((p) => {
    if (!p.stop) return [];
    const { id, at } = p.stop;
    const line = lineOf(p);
    return [
      {
        id,
        get at() {
          return convert(at, line, lines.line);
        },
      },
    ];
  });
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
  const anchorAt = (track: Route, d: number) => {
    track.positionAt(d, p);
    track.tangentAt(d, t);
    side.crossVectors(t, UP).normalize().multiplyScalar(10.5);
    const x = p.x + side.x;
    const z = p.z + side.z;
    tracksideAnchors.push(new THREE.Vector3(x, Math.max(0, terrain.heightAt(x, z)) + 2.7, z));
  };
  for (let i = 0; i < 9; i++) {
    const d = (i / 9) * route.length + 14;
    // Not inside the tunnel, where the shot would be a wall.
    if (route.ahead(tunnel.from - 8, d) < TUNNEL_HALF * 2 + 16) continue;
    anchorAt(route, d);
  }
  for (const branch of branches) {
    for (const f of [0.22, 0.5, 0.8]) anchorAt(branch, f * branch.length);
  }

  /**
   * The engine as each place sees it: measured along that place's own line,
   * or NaN while he is on rails that line does not share. Rebuilt in place
   * every frame rather than allocated.
   */
  const seen = loops.map(() => ({ distance: 0, speed: 0, moving: false }));
  const as = (place: Place, train: TrainState): TrainState => {
    const line = lineOf(place);
    const v = seen[line];
    v.distance = convert(train.distance, lines.line, line);
    v.speed = train.speed;
    v.moving = train.moving;
    return v;
  };

  // Centred a little east of the loop, so the branch round the far side of
  // the hill is in the picture as well and not hiding behind the lever.
  const wide = {
    position: new THREE.Vector3(22, 200, 262),
    target: new THREE.Vector3(22, 0, 28),
  };

  return {
    track: lines,
    junctions,
    stops,
    groundAt: terrain.heightAt,
    distanceToTrack: terrain.distanceToTrack,
    tracksideAnchors,
    wide,
    arrive(stop) {
      byStop.get(stop.id)?.arrive?.();
    },
    depart(stop) {
      byStop.get(stop.id)?.depart?.();
    },
    whistle(train) {
      for (const place of places) place.whistle?.(as(place, train));
    },
    pick(ray, train) {
      for (const place of places) if (place.pick?.(ray, as(place, train))) return true;
      return false;
    },
    update(dt, elapsed, train) {
      for (const place of places) place.update?.(dt, elapsed, as(place, train));

      // What the countryside sounds like from where he is. Out on the branch
      // there is no water anywhere near, which NaN rightly reads as.
      const onMain = convert(train.distance, lines.line, MAIN_LINE);
      const nearWater = Number.isNaN(onMain)
        ? 0
        : Math.max(
            1 - Math.abs(route.delta(onMain, harbourAt)) / 95,
            1 - Math.abs(route.delta(onMain, bridgeAt)) / 70,
            0,
          );
      audio.setAmbience({ water: nearWater, birds: 0.85 - nearWater * 0.55 });
    },
  };
}
