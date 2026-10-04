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
  CANOPY_UNDERSIDE,
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
  /** The underside of the leaf cover at a point, or 0 where there is none. */
  canopyAt(x: number, z: number): number;
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
 * The main line runs: The Sheds → across the meadow and over the level
 * crossing → The Farm → down the hillside and through the tunnel → over the
 * river and along to The Harbour → back round the shore to The Sheds. Seven
 * hundred and fifty metres, under two minutes at full steam.
 *
 * Every piece of it is a named segment of the network rather than part of one
 * closed curve, which is what makes a branch line a content change. The main
 * line's own segments are all cut from one continuous curve, though, so no two
 * of them can disagree about where they meet.
 *
 * There are four branches, and each one swings out to the *outside* of the
 * bend the main line is taking at that point, which is what brings it back
 * facing the way the line is going. After The Sheds the branch carries
 * straight on to The City while the main line turns across the meadow. After
 * the meadow it goes up through the woods and round past the capybaras at the
 * ranch. After The Farm it runs round the far side of the hill to The
 * Windmill instead of through the tunnel. And after The Harbour it carries on
 * along the sea wall to The Lighthouse on the headland.
 *
 * Every combination is a whole loop from The Sheds, so there are sixteen of
 * them, from seven hundred and fifty metres to a little over two kilometres,
 * and the loop number's bits say which branches it takes — see
 * src/engine/junction.ts for why that matters.
 *
 * **Every junction is at least a hundred and twenty-five metres from the next
 * one**, and the home platform is sixty-six metres from the first of them.
 * That is not decoration: the arrows asking him which way to go come up nine
 * seconds before the points, and two junctions closer together than that
 * would put the next question on screen before he had seen the last answer
 * happen.
 */

/**
 * Where the railway goes.
 *
 * **These numbers are generated, not drawn.** The main line is one closed
 * curve cut into named pieces, so no two main-line segments can disagree about
 * where they meet. Each branch is a *lobe* built out of exact circular arcs
 * and straights, in this order: run on alongside the main line, turn away,
 * straight out, half a circle round the far end, straight back, turn in, and
 * run on alongside the main line again.
 *
 * Three things fall out of building them that way rather than by hand, and
 * between them they are the whole reason the turns read as turns.
 *
 * 1. *The radius is not a choice.* The far end of a lobe turns a half circle,
 *    so its two straights are exactly anti-parallel and can only slide the far
 *    end along their own line — the sideways distance between leaving the main
 *    line and rejoining it has to be made up by the arcs alone. Every arc
 *    scales with its radius, so the radius is simply whatever closes that gap.
 *    **A gentler curve on a branch means putting its junctions further apart,
 *    and nothing else will do it.** That is why the main line is 1,100 metres
 *    rather than the 642 it started at.
 *
 * 2. *A branch leaves and rejoins on the main line's own heading*, running
 *    straight alongside it for twenty metres at each end before any of the
 *    turning starts. That is what a set of points looks like, and it is also
 *    what lets the curve through the joint be worked out at all: a segment
 *    takes its shape at a joint from its neighbour, and a branch already
 *    turning as it arrives cannot be shaped by the line it is joining.
 *
 * 3. *Every curve is eased on and off* rather than switched on, the way a real
 *    railway spirals into a bend. Not only for looks: the rails are a spline
 *    through these points, and a spline cannot represent a step change in
 *    curvature. Where a dead straight met a constant-radius arc it overshot,
 *    and the sharpest place on a branch was that overshoot rather than the
 *    curve it was drawn for — fifty-metre arcs measuring thirty through the
 *    join.
 *
 * The sharpest curve anywhere on the sixteen ways round is now about
 * thirty-three metres, and most of the railway is well over forty. It was one
 * metre twenty when his son first said a corner did not look right: the woods
 * branch used to come back onto the main line *facing backwards*, and the
 * rails doubled through themselves to turn it round.
 *
 * Checked at startup in a development build — see `checkCurves` below.
 */
const SEGMENTS: Record<string, number[][]> = {
  // ---- the main line, which is one continuous curve cut into named pieces,
  // so no two of these can disagree about where they meet.
  sheds: [
    [-148, 10], [-145.4, 28.8], [-143.5, 47.7], [-141.2, 66.6], [-137.2, 85.1],
    [-130.5, 102.9],
  ],
  meadow: [
    [-130.5, 102.9], [-120.6, 121.5], [-107.7, 138.2], [-91.8, 152], [-73.9, 163.2],
    [-55, 172.6], [-35.4, 180.5], [-15.1, 186.2], [5.8, 187.9], [26.5, 183.9],
  ],
  farm: [
    [26.5, 183.9], [46.4, 176.8], [66.2, 169.5], [86.2, 162.7], [105.7, 154.7],
    [124, 144.1], [140.7, 131.2], [155.2, 115.9], [165.9, 97.8], [172.9, 77.9],
  ],
  farmend: [[172.9, 77.9], [177.4, 53.3], [177.6, 28.4]],
  hillfoot: [[177.6, 28.4], [175.5, 3.5], [172.1, -21.3]],
  bore: [[172.1, -21.3], [166, -45.5], [155.8, -68.3]],
  descent: [[155.8, -68.3], [143.5, -87.1], [128.1, -103.5], [110, -116.8], [90.4, -127.8]],
  rivermouth: [
    [90.4, -127.8], [69.7, -136.6], [48.2, -143.1], [26.3, -148.2], [4.1, -151.8],
  ],
  harbour: [[4.1, -151.8], [-14.2, -153.9], [-32.4, -155.8], [-50.6, -157.7]],
  shore: [
    [-50.6, -157.7], [-69.6, -158.3], [-88.5, -156.5], [-107.1, -152.6], [-123.6, -143.5],
    [-135.6, -128.9],
  ],
  westbank: [
    [-135.6, -128.9], [-144.9, -112.3], [-152.1, -94.7], [-157, -76.4], [-158.9, -57.5],
    [-158.1, -38.5],
  ],
  westfield: [[-158.1, -38.5], [-154.6, -13.9], [-148, 10]],

  // ---- the city, away north-west. `cityrun` is the straight coming back
  // from the far end of the lobe, which is where the platform stands.
  citynorth: [
    [-130.5, 102.9], [-125.7, 113.8], [-120.9, 124.8], [-116.8, 136], [-115.1, 147.8],
    [-116.3, 159.7], [-120.4, 170.8], [-127, 180.8], [-134.8, 189.8], [-142.8, 198.7],
    [-150.8, 207.5], [-158.9, 216.4], [-166.9, 225.3], [-174.9, 234.1], [-182.9, 243],
    [-190.9, 251.9], [-198.7, 260.9], [-205.9, 270.4], [-211.9, 280.8], [-215.9, 292],
    [-217.2, 303.9], [-215.4, 315.6], [-210.6, 326.5], [-203.1, 335.8], [-193.4, 342.8],
    [-182.3, 347.1], [-170.5, 348.3], [-158.7, 346.4], [-147.7, 341.8], [-137.8, 335.1],
    [-128.9, 327.2], [-120.6, 318.5],
  ],
  cityrun: [
    [-120.6, 318.5], [-112.6, 309.7], [-104.6, 300.8], [-96.6, 291.9], [-88.6, 283.1],
    [-80.6, 274.2], [-72.6, 265.3], [-64.6, 256.5], [-56.6, 247.6], [-48.5, 238.7],
    [-40.5, 229.9], [-32.5, 221], [-24.5, 212.1],
  ],
  cityback: [
    [-24.5, 212.1], [-16.4, 203.3], [-7.2, 195.8], [3.7, 190.8], [15.1, 187.3],
    [26.5, 183.9],
  ],

  // ---- the woods and the ranch, north-east: out through the forest, round
  // the top, and back down the straight the capybaras graze beside.
  woods: [
    [26.5, 183.9], [38, 180.4], [49.4, 177], [61.1, 174.6], [73, 175], [84.4, 178.6],
    [94.4, 185.1], [102.8, 193.6], [110.6, 202.7], [118.4, 211.7], [126.2, 220.8],
    [134, 229.8], [141.8, 238.9], [149.6, 247.9], [157.4, 257], [165.2, 266.1],
    [173, 275.1], [180.9, 284.1], [189.5, 292.4], [199.1, 299.5], [209.9, 304.5],
    [221.7, 306.4], [233.5, 304.9], [244.4, 300], [253.4, 292.3], [259.9, 282.3],
    [263.2, 270.8], [263.1, 258.9], [259.8, 247.4], [254.2, 236.9], [247.2, 227.2],
    [239.6, 218],
  ],
  ranch: [
    [239.6, 218], [231.8, 209], [223.9, 199.9], [216.1, 190.8], [208.3, 181.8],
    [200.5, 172.7], [192.7, 163.7], [184.9, 154.6], [177.1, 145.5],
  ],
  woodsback: [
    [177.1, 145.5], [170.3, 135.8], [166, 124.7], [164.9, 112.8], [166.8, 101],
    [169.8, 89.5], [172.9, 77.9],
  ],

  // ---- the windmill, out round the far side of the hill.
  eastline: [
    [177.6, 28.4], [177, 16.3], [176.4, 4.3], [176.9, -7.7], [180.2, -19.2], [186.4, -29.5],
    [195.3, -37.6], [205.6, -43.8], [216.3, -49.2], [227.1, -54.7], [237.8, -60.1],
    [248.5, -65.6], [259.3, -71], [270, -76.5], [280.7, -81.9], [291.4, -87.5],
    [301.7, -93.7], [311.2, -101.1], [318.9, -110.3], [324.1, -121.1], [325.9, -133],
    [324.3, -144.9], [319.3, -155.8], [311.4, -164.8], [301.3, -171.2], [289.7, -174.4],
    [277.7, -174.4], [266, -171.8], [254.7, -167.4], [243.9, -162.2],
  ],
  windmill: [
    [243.9, -162.2], [233.2, -156.8], [222.4, -151.3], [211.7, -145.8], [201, -140.4],
    [190.2, -134.9], [179.5, -129.5], [168.8, -124], [158, -118.6],
  ],
  eastback: [
    [158, -118.6], [147, -113.8], [135.2, -111.7], [123.2, -112.9], [112, -117.1],
    [101.2, -122.4], [90.4, -127.8],
  ],

  // ---- the coast: out along the sea wall, round the headland, and back up
  // the west bank past the lighthouse.
  coast: [
    [-50.6, -157.7], [-62.5, -158.7], [-74.3, -159.8], [-86, -161.9], [-96.8, -166.6],
    [-105.9, -174.2], [-112.7, -183.9], [-117.5, -194.8], [-121.7, -205.9], [-126, -216.9],
    [-130.3, -228], [-134.7, -239], [-140, -249.7], [-146.7, -259.5], [-155.3, -267.6],
    [-165.8, -273.2], [-177.4, -275.5], [-189.2, -274.4], [-200.1, -270], [-209.3, -262.5],
    [-216.1, -252.8], [-219.7, -241.5], [-220.2, -229.7], [-218.4, -218], [-215, -206.6],
    [-210.8, -195.4],
  ],
  lighthouse: [
    [-210.8, -195.4], [-206.5, -184.4], [-202.3, -173.3], [-198, -162.2], [-193.7, -151.1],
    [-189.4, -140], [-185.2, -128.9], [-180.9, -117.9], [-176.6, -106.8], [-172.3, -95.7],
    [-168, -84.6], [-163.8, -73.5],
  ],
  coastback: [[-163.8, -73.5], [-160.4, -62.2], [-159.2, -50.4], [-158.1, -38.5]],
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
  [40, -18],
  [44, -45],
  [48, -75],
  [52, -105],
  [55, -140],
  [58, -185],
  [62, -250],
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
  net.join({ segment: 'woodsback', end: 'end' }, { segment: 'farmend', end: 'start' });
  net.join({ segment: 'farmend', end: 'end' }, { segment: 'eastline', end: 'start' });
  net.join({ segment: 'eastback', end: 'end' }, { segment: 'rivermouth', end: 'start' });
  net.join({ segment: 'harbour', end: 'end' }, { segment: 'coast', end: 'start' });
  net.join({ segment: 'coastback', end: 'end' }, { segment: 'westfield', end: 'start' });
  net.join({ segment: 'sheds', end: 'end' }, { segment: 'citynorth', end: 'start' });
  // The main line first, both times: a joined end takes its curve from
  // whatever was joined on first, and what should shape the end of the city
  // branch is the line it is rejoining, not the branch that leaves the same
  // joint a few metres off to one side.
  net.join({ segment: 'cityback', end: 'end' }, { segment: 'farm', end: 'start' });
  net.join({ segment: 'cityback', end: 'end' }, { segment: 'woods', end: 'start' });
  const loops: Route[] = Array.from({ length: LOOPS }, (_, n) =>
    net.route(loopOf(n).map((segment) => ({ segment }))),
  );
  const route = loops[MAIN_LINE];
  /** Just the branches, for laying rails and shaping the ground. */
  const branches: Route[] = [WOODS_WAY, WINDMILL_WAY, COAST_WAY, CITY_WAY].map((way) =>
    net.route(way.map((segment) => ({ segment })), false),
  );

  // A curve this railway should never have. Checked on every one of the
  // sixteen ways round, at startup, in a development build — because the way
  // this goes wrong is silent: the rails still join up, the train still
  // follows them, and the only symptom is a four-year-old saying a corner is
  // not realistic. Which is exactly how the one-metre-twenty hairpin where the
  // woods branch used to rejoin the main line survived as long as it did.
  if (import.meta.env.DEV) {
    const TIGHTEST = 28;
    const STEP = 1.5;
    const a = new THREE.Vector3();
    const b = new THREE.Vector3();
    for (let n = 0; n < LOOPS; n++) {
      const loop = loops[n];
      let worst = Infinity;
      let where = 0;
      for (let d = 0; d < loop.length; d += 1) {
        loop.tangentAt(loop.wrap(d - STEP), a);
        loop.tangentAt(loop.wrap(d + STEP), b);
        const swing = a.angleTo(b);
        const radius = swing < 1e-6 ? Infinity : (2 * STEP) / swing;
        if (radius < worst) {
          worst = radius;
          where = d;
        }
      }
      if (worst < TIGHTEST) {
        console.warn(
          `world: loop ${n} turns through a radius of ${worst.toFixed(1)} m at ` +
            `${where.toFixed(0)} m, on ${loop.where(where).segment} — anything under ` +
            `${TIGHTEST} m reads as a corner rather than a curve`,
        );
      }
    }
  }

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
  // The sea wall out to the headland is over open water from about ninety
  // metres along the coast segment to a hundred and sixty-five. The drawbridge
  // goes in the deepest part of that, so there is water under it rather than
  // the causeway the corridor would otherwise lay.
  const COAST_LINE = 3;
  const DRAW_HALF = 16;
  const drawAt = 118;
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

  // The home platform sits a third of the way along The Sheds rather than in
  // the middle of it, which puts sixty-odd metres of railway between it and
  // the city's points instead of twenty. Two seconds was never enough time to
  // see an arrow, decide, and reach for it.
  const shedsAt = route.startOf('sheds') + net.get('sheds').length * 0.3;
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
      // The one the tunnel goes through, sat squarely on the bore. Kept clear
      // of the windmill junction fifty metres up the line, so the branch
      // leaves across level ground rather than out of a cutting.
      { x: 166, z: -46, radius: 42, height: 18 },
      // The headland the coast line loops round. It has to stand well clear of
      // the water: the sea reaches sixteen metres down out here, and without a
      // point to run round the lighthouse branch would be a causeway over open
      // sea for two hundred metres.
      { x: -210, z: -250, radius: 105, height: 28 },
      // Rising ground north-east of the woods, for the forest to climb toward.
      { x: 150, z: 400, radius: 150, height: 18 },
      // And the far ones, so the horizon is not a hard edge. Every one of
      // these sits beyond the end of every branch: a hill the railway is laid
      // through is a cutting the railway has to be dug out of.
      { x: -440, z: 200, radius: 200, height: 36 },
      { x: 60, z: 560, radius: 210, height: 36 },
      { x: 540, z: 120, radius: 200, height: 34 },
      { x: 480, z: -380, radius: 190, height: 30 },
      { x: -200, z: -500, radius: 180, height: 28 },
      { x: -460, z: -220, radius: 180, height: 30 },
    ],
    ponds: [
      // the pond the river comes from, in the middle of the loop
      { x: 40, z: -10, radius: 38, depth: 9 },
      // the harbour basin, dug in behind the quay and open to the sea
      { x: -30, z: -210, radius: 70, depth: 13 },
    ],
    // The yard, the ranch's field and the city all want level ground.
    flats: [yard, ranchField, cityGround],
    shore: -185,
    deep: -250,
    seaDepth: 16,
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
  // Every one of these stands in the middle of its branch's straight — that is
  // what the middle named piece of a branch is for, and why the cuts fall
  // where they do. See SEGMENTS.
  branchPlace(buildWindmill, 'windmill', BY_WINDMILL);
  branchPlace(buildLighthouse, 'lighthouse', BY_LIGHTHOUSE);
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
    // The canopy covers the middle of the woods run rather than all of it.
    // The whole segment is three hundred and seventy metres, and three hundred
    // and seventy metres of closed canopy is the better part of a minute in
    // the green half-dark — long enough to stop being a tunnel of trees and
    // start being the only thing there is. Capped, it is a stretch he goes
    // into and comes out of.
    const CANOPY_RUN = 220;
    const loop = loops[BY_WOODS];
    const whole = net.get('woods').length;
    const middle = loop.startOf('woods') + whole / 2;
    const half = Math.min(whole, CANOPY_RUN) / 2;
    const from = middle - half;
    const to = middle + half;
    const place = buildWoods({ ...context(middle, loop), from, to });
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
  /**
   * How far a trunk has to stand off the rails.
   *
   * A broadleaf's crown is two and a half metres across the middle before it
   * is scaled, so a tree twelve metres off the line reaches to within nine of
   * it — and nine metres is squarely between a trackside camera and the train
   * it is pointing at. Everything scattered now stands back far enough that
   * the rails are never behind a tree.
   */
  const CLEAR_OF_RAILS = 19;
  /** How far the countryside reaches, which is past the end of every branch. */
  const COUNTRY = 430;
  const taken: [number, number][] = [];
  for (let i = 0; i < 1100; i++) {
    const a = (i / 600) * Math.PI * 2 + Math.random() * 0.3;
    const r = 26 + Math.random() * COUNTRY;
    const x = Math.cos(a) * r + (Math.random() - 0.5) * 40;
    const z = Math.sin(a) * r * 0.95 + (Math.random() - 0.5) * 40 + 40;
    const y = terrain.heightAt(x, z);
    // Not in the water, not on the railway, not in the yard, and not on top
    // of each other. A tree standing in the four-foot is funny exactly once.
    if (y < -1.5 || y > 26) continue;
    if (terrain.distanceToTrack(x, z) < CLEAR_OF_RAILS) continue;
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

  /**
   * The underside of the leaf cover, which exists only over the woods.
   *
   * Taken from the run of rails the canopy was planted along rather than from
   * the trees themselves: the trees are instanced and their positions are the
   * woods' own business, and all the camera needs to know is where the roof
   * is. Measured generously wide, because a crown leans in a long way.
   */
  const canopyLine: [number, number][] = (() => {
    const loop = loops[BY_WOODS];
    const from = loop.startOf('woods');
    const to = from + net.get('woods').length;
    const out: [number, number][] = [];
    const q = new THREE.Vector3();
    for (let d = from - 6; d <= to + 6; d += 6) {
      loop.positionAt(loop.wrap(d), q);
      out.push([q.x, q.z]);
    }
    return out;
  })();
  /** How far either side of the woods line the crowns reach. */
  const CANOPY_REACH = 15;
  const canopyAt = (x: number, z: number): number =>
    distanceToPath(canopyLine, x, z) < CANOPY_REACH ? CANOPY_UNDERSIDE : 0;

  // A fence along the meadow, so there is something to measure speed against.
  const meadowFrom = route.startOf('meadow');
  scene.add(fenceAlong(route, meadowFrom + 8, meadowFrom + 62, 6.4));
  scene.add(fenceAlong(route, meadowFrom + 8, meadowFrom + 62, -6.4));

  // ----------------------------------------------------------------- views
  /**
   * Low shots beside the rails, for the trackside view.
   *
   * Each one is picked on the side of the line that is clear: a shot ten
   * metres off the track with a tree nine metres off it is a shot of a tree,
   * which is what the trackside view had become in half the places it chose.
   * Both hands are tried, and then both a little further out; if the only
   * thing to be found is a thicket, that length of line simply gets no shot.
   */
  const tracksideAnchors: THREE.Vector3[] = [];
  const p = new THREE.Vector3();
  const t = new THREE.Vector3();
  const side = new THREE.Vector3();
  /** How far a trunk has to be from a camera for the shot to be of the train. */
  const SHOT_CLEAR = 7;
  const clearOfTrees = (x: number, z: number): boolean =>
    !taken.some(([px, pz]) => (px - x) ** 2 + (pz - z) ** 2 < SHOT_CLEAR ** 2);

  const anchorAt = (track: Route, d: number): void => {
    track.positionAt(d, p);
    track.tangentAt(d, t);
    side.crossVectors(t, UP).normalize();
    for (const out of [10.5, -10.5, 14, -14]) {
      const x = p.x + side.x * out;
      const z = p.z + side.z * out;
      const ground = terrain.heightAt(x, z);
      // Not in the water, and not inside a tree.
      if (ground < -1) continue;
      if (!clearOfTrees(x, z)) continue;
      tracksideAnchors.push(new THREE.Vector3(x, Math.max(0, ground) + 2.7, z));
      return;
    }
  };
  // More of them than there used to be, because there is a great deal more
  // railway: one about every sixty metres of main line, and three on each
  // branch.
  const SHOTS = 17;
  for (let i = 0; i < SHOTS; i++) {
    const d = (i / SHOTS) * route.length + 14;
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

  // Far enough out, and steeply enough down, to hold the whole railway: five
  // hundred and fifty metres across and six hundred deep, with the city away
  // north, the woods and the ranch north-east, the windmill east and the
  // headland south-west.
  //
  // Steeply matters as much as far. Flatter shots fit it too, but only by
  // pushing the near and far ends of the railway out to the corners of the
  // frame — which is exactly where the driving buttons are. From up here the
  // whole thing sits inside the middle three-quarters.
  const wide = {
    position: new THREE.Vector3(53, 820, 500),
    target: new THREE.Vector3(53, 0, 50),
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
    canopyAt,
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
