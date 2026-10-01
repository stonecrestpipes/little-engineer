import * as THREE from 'three';
import { Network, type Route } from '../engine/track';
import { Lines } from '../engine/junction';
import { mergeStatic } from '../engine/merge';
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
import { frameAt, type Place, type PlaceContext, type TrainState } from './places/place';
import { buildSheds } from './places/sheds';
import { buildCrossing } from './places/crossing';
import { buildFarm } from './places/farm';
import { buildTunnel } from './places/tunnel';
import { buildBridge } from './places/bridge';
import { buildHarbour } from './places/harbour';
import { buildWindmill } from './places/windmill';
import { buildLighthouse } from './places/lighthouse';
import { buildWoods } from './places/woods';
import { buildRanch } from './places/ranch';
import { buildCity } from './places/city';
import { buildDrawbridge } from './places/drawbridge';

/** Somewhere the railway divides and he gets to choose. */
export interface Junction {
  id: 'woods' | 'farm' | 'coast' | 'city';
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
  /** Looking into the yard at The Sheds, where he picks his train. */
  yardView: { position: THREE.Vector3; target: THREE.Vector3 };
  arrive(stop: Stop): void;
  depart(stop: Stop): void;
  whistle(train: TrainState): void;
  update(dt: number, elapsed: number, train: TrainState): void;
  /** He touched the world rather than a button. True if anywhere acted on it. */
  pick(ray: THREE.Raycaster, train: TrainState): boolean;
  /** True while somewhere is moving his engine itself — the yard, shunting. */
  shunting(): boolean;
  /** Finish any shunt at once, because he has asked to drive. */
  settle(): void;
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
  farm: [[-2, 98], [26, 94], [40, 90]],
  // A short run between where the woods branch comes back in and where the
  // windmill branch goes out, so the two sets of arrows are never on screen
  // at the same moment.
  farmend: [[40, 90], [52, 84]],
  hillfoot: [[52, 84], [78, 68], [96, 46]],
  bore: [[96, 46], [106, 22], [108, -4]],
  descent: [[108, -4], [104, -32], [90, -56]],
  rivermouth: [[90, -56], [66, -72], [44, -82], [20, -88]],
  harbour: [[20, -88], [-8, -94], [-36, -92]],
  shore: [[-36, -92], [-64, -84], [-84, -64]],
  // Split where the coast line comes back in.
  westbank: [[-84, -64], [-95, -38]],
  westfield: [[-95, -38], [-96, -4], [-94, 16], [-92, 34]],

  // The windmill branch. Kept well out on the far side of the hill, where the
  // ground is nearly level, so laying it does not carve a canyon next to the
  // tunnel.
  eastline: [[52, 84], [78, 74], [104, 76], [130, 70], [152, 54], [166, 30]],
  windmill: [[166, 30], [170, 4], [164, -20]],
  eastback: [[164, -20], [148, -34], [126, -36], [106, -40], [90, -56]],

  // The coast line, right along the water's edge, out round the headland and
  // back in to the west bank.
  //
  // The headland leg is deliberately long, and deliberately straight for its
  // last forty metres. A station is thirty-four metres of straight platform
  // built in one frame, so putting one on a curve lays it across its own
  // rails — which is exactly what used to happen here, and is the reason the
  // building by the lighthouse sat in the middle of the track.
  coast: [[-36, -92], [-62, -96], [-88, -106], [-112, -110]],
  lighthouse: [[-112, -110], [-132, -106], [-142, -92], [-142, -74], [-138, -56]],
  coastback: [[-138, -56], [-128, -58], [-116, -60], [-106, -56], [-99, -48], [-95, -38]],

  // The woods, north of the meadow: a long way round through the forest and
  // out across the ranch, instead of the short run past The Farm. The longest
  // branch on the railway and the only one that is entirely inland.
  woods: [[-2, 98], [2, 122], [14, 142], [34, 152]],
  ranch: [[34, 152], [60, 154], [84, 146]],
  woodsback: [[84, 146], [98, 128], [92, 110], [70, 97], [40, 90]],

  // And the city, away north-west, instead of the run across the meadow.
  //
  // It leaves where the main line is already swinging from north-east to
  // east, so carrying straight on north is the fork rather than a turn out of
  // one. That matters more than it sounds: a branch that leaves a straight
  // line at forty-five degrees does not read as a railway at all.
  //
  // `cityrun` is two equal legs on one bearing — forty-five metres dead
  // straight — because the city has a platform and a platform is a straight
  // thing. The long way back round is deliberately wide: the tightest curve
  // on it is about twenty-three metres, which is the same as the headland.
  citynorth: [[-78, 74], [-66, 90], [-68, 110], [-84, 128], [-106, 138]],
  cityrun: [[-106, 138], [-129, 147], [-152, 156]],
  cityback: [
    [-152, 156], [-164, 174], [-160, 194], [-140, 206], [-114, 206],
    [-88, 194], [-62, 172], [-44, 146], [-30, 124], [-18, 108], [-2, 98],
  ],
};

const FARM_WAY = ['farm'];
const WOODS_WAY = ['woods', 'ranch', 'woodsback'];
const TUNNEL_WAY = ['hillfoot', 'bore', 'descent'];
const WINDMILL_WAY = ['eastline', 'windmill', 'eastback'];
const HOME_WAY = ['shore', 'westbank'];
const COAST_WAY = ['coast', 'lighthouse', 'coastback'];
const MEADOW_WAY = ['meadow'];
const CITY_WAY = ['citynorth', 'cityrun', 'cityback'];

/**
 * Loop number bits: which branches a loop takes. Four junctions, so sixteen
 * whole loops — which costs almost nothing, because a loop is a list of
 * references to the same segments everything else is built from.
 */
const BY_WOODS = 1;
const BY_WINDMILL = 2;
const BY_LIGHTHOUSE = 4;
const BY_CITY = 8;

/**
 * The segments of loop `n`, from The Sheds round to The Sheds.
 *
 * Every loop passes every junction, in the same order. That is not a style
 * choice: `Lines` can only move between loops while they are still running
 * over the same rails, and the arrows ask a route where its points are — so a
 * loop that skipped a junction would have nowhere to put the question.
 */
const loopOf = (n: number): string[] => [
  'sheds',
  ...(n & BY_CITY ? CITY_WAY : MEADOW_WAY),
  ...(n & BY_WOODS ? WOODS_WAY : FARM_WAY),
  'farmend',
  ...(n & BY_WINDMILL ? WINDMILL_WAY : TUNNEL_WAY),
  'rivermouth', 'harbour',
  ...(n & BY_LIGHTHOUSE ? COAST_WAY : HOME_WAY),
  'westfield',
];
const LOOPS = 16;
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
  for (const way of [WOODS_WAY, WINDMILL_WAY, COAST_WAY, CITY_WAY]) net.chain(way);
  net.join({ segment: 'meadow', end: 'end' }, { segment: 'woods', end: 'start' });
  net.join({ segment: 'cityback', end: 'end' }, { segment: 'woods', end: 'start' });
  net.join({ segment: 'woodsback', end: 'end' }, { segment: 'farmend', end: 'start' });
  net.join({ segment: 'farmend', end: 'end' }, { segment: 'eastline', end: 'start' });
  net.join({ segment: 'eastback', end: 'end' }, { segment: 'rivermouth', end: 'start' });
  net.join({ segment: 'harbour', end: 'end' }, { segment: 'coast', end: 'start' });
  net.join({ segment: 'coastback', end: 'end' }, { segment: 'westfield', end: 'start' });
  net.join({ segment: 'sheds', end: 'end' }, { segment: 'citynorth', end: 'start' });
  net.join({ segment: 'cityback', end: 'end' }, { segment: 'farm', end: 'start' });
  const loops: Route[] = Array.from({ length: LOOPS }, (_, n) =>
    net.route(loopOf(n).map((segment) => ({ segment }))),
  );
  const route = loops[MAIN_LINE];
  /** Just the branches, for laying rails and shaping the ground. */
  const branches: Route[] = [WOODS_WAY, WINDMILL_WAY, COAST_WAY, CITY_WAY].map((way) =>
    net.route(way.map((segment) => ({ segment })), false),
  );

  const lines = new Lines(loops);
  const convert = (at: number, from: number, to: number) => lines.convert(at, from, to);
  const junctions: Junction[] = (
    [
      { id: 'woods', bit: BY_WOODS, main: 'farm', branch: 'woods' },
      { id: 'farm', bit: BY_WINDMILL, main: 'hillfoot', branch: 'eastline' },
      { id: 'coast', bit: BY_LIGHTHOUSE, main: 'shore', branch: 'coast' },
      { id: 'city', bit: BY_CITY, main: 'meadow', branch: 'citynorth' },
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

  // The creek the lighthouse line crosses, and the drawbridge over it. It is
  // on a branch, which is new: free spans used to work only on the main line
  // because every sample off it reported a distance outside every span.
  const COAST_LINE = 3;
  const DRAW_HALF = 13;
  const drawAt = 24;
  const draw = { line: COAST_LINE, from: drawAt - DRAW_HALF, to: drawAt + DRAW_HALF };

  // The yard beside The Sheds wants to be flat ground rather than country,
  // since a siding and a line of stock stand on it.
  //
  // It sits on the engine's left, which in a place's own frame is negative x
  // (see frameAt) — and cross(tangent, up) points the other way, at positive
  // x. Getting that backwards put the flat patch 27 metres the wrong side of
  // the line, where it flattened open country and left the sidings on the
  // ground the terrain happened to give them.
  /** The middle of a named segment on a branch loop, in metres along it. */
  const middleOfOn = (line: number, id: string) =>
    loops[line].startOf(id) + net.get(id).length / 2;

  /** A patch of level ground beside a line, `out` metres off to its left. */
  const patchBeside = (line: number, at: number, out: number, radius: number, blend: number) => {
    const loop = loops[line];
    const p = loop.positionAt(at);
    const t = loop.tangentAt(at);
    // cross(tangent, up) points at the place frame's negative x — the engine's
    // left — which is the side everything out here is built on.
    const side = new THREE.Vector3().crossVectors(t, UP).normalize();
    return { x: p.x + side.x * out, z: p.z + side.z * out, radius, blend };
  };

  // The ranch wants level ground. The field, the pool, the bank round it and
  // the fence are every one of them a flat thing, and a flat thing laid on a
  // hillside is a buried thing.
  const ranchAt = middleOfOn(BY_WOODS, 'ranch');
  const ranchField = patchBeside(BY_WOODS, ranchAt, 22, 30, 18);

  // And so does the city, for the same reason and more of it: streets, a
  // yard full of rescue vehicles and a building site are all flat things.
  const cityAt = middleOfOn(BY_CITY, 'cityrun');
  const cityGround = { ...patchBeside(BY_CITY, cityAt, 0, 46, 26) };

  const shedsAt = middleOf('sheds');
  const yard = (() => {
    const p = route.positionAt(shedsAt);
    const t = route.tangentAt(shedsAt);
    const side = new THREE.Vector3().crossVectors(t, UP).normalize();
    // Wide enough for the whole roundhouse fan and both throat roads, which
    // reach a good thirty metres off the running line.
    return { x: p.x + side.x * 17, z: p.z + side.z * 17, radius: 36 };
  })();

  // -------------------------------------------------------------- terrain
  const terrain = buildTerrain([route, ...branches], {
    freeSpans: [bridge, draw],
    river: RIVER,
    riverDepth: 11,
    riverWidth: 7,
    hills: [
      // the one the tunnel goes through, sat squarely on the line
      { x: 107, z: 16, radius: 66, height: 18 },
      // and the far ones, so the horizon is not a hard edge. These sit beyond
      // the new branches rather than under them: a hill the railway is laid
      // through is a cutting the railway has to be dug out of, and the woods
      // and the city branches both used to run straight into one.
      { x: -258, z: 104, radius: 112, height: 28 },
      { x: 26, z: 236, radius: 96, height: 22 },
      { x: -150, z: -150, radius: 84, height: 21 },
      // the point the lighthouse stands on, out beyond the end of the branch
      { x: -168, z: -94, radius: 40, height: 11 },
      { x: 186, z: -96, radius: 78, height: 17 },
      // low rising ground north of the meadow, for the woods to climb into
      { x: 10, z: 148, radius: 74, height: 9 },
    ],
    ponds: [
      // the pond the river comes from
      { x: 20, z: -12, radius: 28, depth: 9 },
      // and the harbour basin, dug in behind the quay
      { x: -8, z: -118, radius: 42, depth: 12 },
      // the creek under the drawbridge, which runs out into the sea
      { x: -55, z: -97, radius: 25, depth: 11 },
    ],
    // The city stands on level ground, the way a city does.
    flats: [yard, ranchField, cityGround],
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
  const branchPlace = (
    build: (c: PlaceContext) => Place,
    segment: string,
    line: number,
    /** How far along the segment it stands. The middle, unless it needs to
        be somewhere the rails are straighter than that. */
    where = 0.5,
  ) => {
    const loop = loops[line];
    const place = build(context(loop.startOf(segment) + net.get(segment).length * where, loop));
    onLoop.set(place, line);
    places.push(place);
  };
  branchPlace(buildWindmill, 'windmill', BY_WINDMILL);
  branchPlace(buildLighthouse, 'lighthouse', BY_LIGHTHOUSE, 0.76);
  branchPlace(buildRanch, 'ranch', BY_WOODS);
  branchPlace(buildCity, 'cityrun', BY_CITY);

  // The drawbridge is a length of railway rather than a point on it, like the
  // tunnel and the river bridge, so it is given its span as well as its
  // middle — measured on the loop that takes the coast, since that is the
  // only way round that crosses the creek at all.
  {
    const loop = loops[BY_LIGHTHOUSE];
    const base = loop.startOf('coast');
    const place = buildDrawbridge({
      ...context(base + drawAt, loop),
      from: base + draw.from,
      to: base + draw.to,
    });
    onLoop.set(place, BY_LIGHTHOUSE);
    places.push(place);
  }

  // The woods are the one place that is a length of railway rather than a
  // point on it: the canopy has to close over the whole run or it is just
  // trees. It gets the span as well as the middle, the way the tunnel does.
  {
    const loop = loops[BY_WOODS];
    const from = loop.startOf('woods');
    const to = from + net.get('woods').length;
    const place = buildWoods({ ...context((from + to) / 2, loop), from, to });
    onLoop.set(place, BY_WOODS);
    places.push(place);
  }
  for (const place of places) {
    mergeStatic(place.group);
    scene.add(place.group);
  }
  const lineOf = (p: Place) => onLoop.get(p) ?? MAIN_LINE;

  // A station is thirty-four metres of straight platform built in one frame.
  // Put one where the rails bend and it lays itself across them, which is how
  // the building by the lighthouse came to be standing in the middle of the
  // track. Caught here, at build time, rather than by somebody noticing it in
  // a screenshot three weeks later.
  if (import.meta.env.DEV) {
    const PLATFORM = 36;
    const mid = new THREE.Vector3();
    const fwd = new THREE.Vector3();
    const here = new THREE.Vector3();
    for (const place of places) {
      if (!place.stop) continue;
      const line = loops[lineOf(place)];
      line.positionAt(place.stop.at, mid);
      line.tangentAt(place.stop.at, fwd);
      let worst = 0;
      for (let d = -PLATFORM / 2; d <= PLATFORM / 2; d += 1.5) {
        line.positionAt(place.stop.at + d, here).sub(mid);
        worst = Math.max(worst, here.addScaledVector(fwd, -here.dot(fwd)).length());
      }
      // A gentle bend under a platform reads fine — the slab is low and the
      // building on it is only twelve metres long. This is looking for the
      // case where the rails leave the platform altogether and come back
      // through the far end of it.
      if (worst > 3.2) {
        console.warn(
          `world: the platform at ${place.stop.id} is on a curve — over its own ` +
            `length the rails stray ${worst.toFixed(1)} m from the straight line it is built on`,
        );
      }
    }
  }

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
  /** Where the scattered countryside stops, because a place stands there. */
  const keepClear = [
    { x: ranchField.x, z: ranchField.z, radius: ranchField.radius + 6 },
    // Tighter than the levelled ground it stands on: the city plants its own
    // street trees, and the wood should come right up to the edge of it.
    { x: cityGround.x, z: cityGround.z, radius: 40 },
  ];
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
    // Nor in the ranch's field, where the capybaras are, nor on the city's
    // level ground. Both of those plant themselves.
    if (keepClear.some((k) => (k.x - x) ** 2 + (k.z - z) ** 2 < k.radius ** 2)) continue;
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

  // Far enough out to hold the whole railway now that there are four branches
  // on it: the woods away north, the city away west, the windmill east and the
  // headland south-west. Centred a touch east and north of the main loop so
  // none of them is hiding behind the driving buttons.
  const wide = {
    position: new THREE.Vector3(8, 250, 300),
    target: new THREE.Vector3(8, 0, 34),
  };

  /**
   * Looking into the yard: from over the platform end, three-quarters on, so
   * the roundhouse fan is spread across the frame with the turntable in front
   * of it and the car siding running away to the near side.
   *
   * Square on to the roundhouse would hide four roads behind the fifth. From
   * here every door is in the clear, every spare car is in the clear, and his
   * own train is at the platform in the middle of it — which is the whole job
   * this shot has to do, because it is the only time the stock is ever big
   * enough to pick out from under his own thumb.
   *
   * The rig swings round to this by itself whenever he is standing still at
   * The Sheds.
   */
  const yardView = (() => {
    const frame = frameAt(route, shedsAt);
    frame.updateMatrixWorld();
    const at = (x: number, y: number, z: number) => {
      const v = frame.localToWorld(new THREE.Vector3(x, 0, z));
      v.y = Math.max(0, terrain.heightAt(v.x, v.z)) + y;
      return v;
    };
    // From beyond the far end of the platform, looking back down the yard:
    // the roundhouse fan spread across the frame with the turntable in front
    // of it, his own train at the platform, and the car siding running away
    // behind. Looking the other way would put the city on the skyline
    // straight behind the shed, which is a busy thing to pick an engine out of.
    return { position: at(16, 28, 26), target: at(-22, 3.5, -8) };
  })();

  return {
    track: lines,
    junctions,
    stops,
    groundAt: terrain.heightAt,
    distanceToTrack: terrain.distanceToTrack,
    tracksideAnchors,
    wide,
    yardView,
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
    shunting() {
      return places.some((p) => p.busy?.() === true);
    },
    settle() {
      for (const place of places) place.settle?.();
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
