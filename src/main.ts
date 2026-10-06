// Before anything else, including three.js: the browser may fire
// `beforeinstallprompt` as soon as the page starts and will not replay it for
// a listener that turned up late. src/ui/install.ts says why the page has to
// offer the install itself rather than leaving it to Chrome's menu.
import './ui/install';

import * as THREE from 'three';
import './ui/style.css';

import { Train } from './engine/train';
import { Consist } from './engine/consist';
import { CameraRig } from './engine/cameras';
import { Audio } from './engine/audio';
import { buildWorld, type Junction } from './content/world';
import { animateRunningGear } from './content/buildEngine';
import { buildRoster } from './content/roster';
import { CAR_WHEEL_RADIUS, loadable, loaded, setLoaded, turnCarWheels } from './content/cars';
import { ENGINES } from './content/engines';
import { mountControls } from './ui/controls';
import { watchForUpdates } from './ui/updates';
import { sayHello, say as speak } from './ui/greeting';
import { greetingFor, PHRASES } from './content/greeting';
import { mountCrane } from './ui/crane';
import type { CraneJob } from './content/places/crane';
import { setNameplate } from './content/buildEngine';
import { settings, tunedDriving } from './settings';
import { mountParentPanel } from './ui/parents';
import { keepAwake } from './ui/wakelock';
import { mountPoints } from './ui/points';
import { QualityGovernor } from './engine/quality';
import { Sky } from './engine/sky';
import { Flock } from './content/flock';
import { journal } from './journal';
import { trail } from './trail';
import { setEvening } from './content/places/station';

const now = () => performance.now() / 1000;

/** A soft round blob, for steam. Cheaper and kinder than loading a sprite. */
function puffTexture(): THREE.Texture {
  const c = document.createElement('canvas');
  c.width = c.height = 96;
  const g = c.getContext('2d')!;
  const grad = g.createRadialGradient(48, 48, 2, 48, 48, 46);
  grad.addColorStop(0, 'rgba(255,255,255,0.95)');
  grad.addColorStop(0.55, 'rgba(250,252,253,0.55)');
  grad.addColorStop(1, 'rgba(250,252,253,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 96, 96);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

async function boot(): Promise<void> {
  // First thing, before anything slow: say hello to him by name. It runs
  // alongside the build below rather than delaying it.
  const bootEl = document.getElementById('boot')!;
  const helloEl = document.getElementById('boot-hello');
  // With the hello switched off, the loading screen does not show it either.
  const greetingOn = settings.get().greetingOn;
  const greeting = greetingFor(settings.get().childName);
  if (helloEl && greetingOn) helloEl.textContent = greeting;
  const hello = greetingOn ? sayHello(greeting) : Promise.resolve();

  const canvas = document.getElementById('stage') as HTMLCanvasElement;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();

  // The far plane has to clear the sky dome from the wide shot, which looks
  // down on a railway six hundred metres deep from nine hundred metres away.
  const camera = new THREE.PerspectiveCamera(48, 1, 0.5, 3200);

  // --- light -------------------------------------------------------------
  const hemi = new THREE.HemisphereLight(0xdcf2ff, 0x6f9455, 1.05);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xfff3d8, 1.5);
  // Fixed over the whole railway rather than following the engine. Following
  // it swings the shadow direction as he drives and drags the edge of the
  // shadow map across the fields, which reads as grey patches on the grass.
  sun.position.set(-350, 470, 310);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.near = 60;
  sun.shadow.camera.far = 1300;
  // Wide enough to take in the whole layout, so shadows never stop at a line.
  // The railway reaches from the headland out to the ranch, which is a good
  // deal further than it used to.
  const S = 350;
  sun.shadow.camera.left = -S;
  sun.shadow.camera.right = S;
  sun.shadow.camera.top = S;
  sun.shadow.camera.bottom = -S;
  sun.shadow.bias = -0.0012;
  sun.shadow.normalBias = 0.05;
  scene.add(sun, sun.target);
  // The dome, the fog and both lights, slowly round from day to dusk.
  const sky = new Sky(scene, hemi, sun);

  // --- the train, the world, and everything he can choose from -----------
  // Audio is built before the world because the places take it: the sheep,
  // the boat and the crossing bell all belong to the world rather than to the
  // engine. It is retuned below to whichever engine he last drove.
  const audio = new Audio(ENGINES[0].audio);
  const roster = await buildRoster(scene, renderer.capabilities.getMaxAnisotropy());
  const world = buildWorld(scene, audio, roster);

  const train = new Train(world.track, roster.engine.spec.driving, world.stops);
  // start just short of the home platform
  train.distance = world.track.wrap(world.stops[0].at - 40);
  const consist = new Consist(world.track);

  const rig = new CameraRig(camera, world.track, {
    wide: world.wide,
    tracksideAnchors: world.tracksideAnchors,
    yard: world.yardView,
    groundAt: world.groundAt,
    canopyAt: world.canopyAt,
  });

  /**
   * Whatever he picked in the yard drives, sounds and handles like itself,
   * adjusted by whatever the grown-ups have set.
   */
  const takeEngine = () => {
    train.retune(tunedDriving(roster.engine.spec.driving, settings.get()));
    audio.retune(roster.engine.spec.audio);
  };
  roster.onChange(takeEngine);
  takeEngine();

  const painted = new Map<string, string>();
  const applySettings = () => {
    const s = settings.get();
    takeEngine();
    audio.setVolume(s.volume);
    roster.useOriginalFaces(s.originalFace);
    for (const spec of ENGINES) {
      const text = s.nameplates[spec.id] ?? spec.nameplate;
      if (painted.get(spec.id) === text) continue;
      painted.set(spec.id, text);
      setNameplate(roster.byId(spec.id), text);
    }
  };
  settings.onChange(applySettings);
  applySettings();

  /** Handed to the world every frame; the places read it, nothing writes it. */
  const trainState = { distance: 0, speed: 0, moving: false };

  // Every beat in the trail is stamped with where the train was when it
  // happened, which is what turns "he pressed red" into "he pressed red
  // coming into The Harbour". The trail asks; nothing here has to remember to
  // tell it.
  trail.watch(() => ({ m: trainState.distance, v: trainState.speed }));
  trail.mark('open', `v${__VERSION__}`);

  train.on((e) => {
    if (e.type === 'arrived') {
      world.arrive(e.stop);
      journal.stopped(e.stop.id);
      trail.mark('arrive', e.stop.id);
      audio.chime();
      // A long breath out as it comes to rest.
      audio.sigh();
      for (let i = 0; i < 5; i++) emitPuff();
    } else {
      world.depart(e.stop);
      trail.mark('depart', e.stop.id);
    }
  });

  // --- steam -------------------------------------------------------------
  const puffMat = new THREE.SpriteMaterial({
    map: puffTexture(),
    transparent: true,
    depthWrite: false,
    fog: true,
  });
  const PUFFS = 26;
  const puffs: { sprite: THREE.Sprite; life: number; vel: THREE.Vector3 }[] = [];
  for (let i = 0; i < PUFFS; i++) {
    const s = new THREE.Sprite(puffMat.clone());
    s.visible = false;
    scene.add(s);
    puffs.push({ sprite: s, life: 0, vel: new THREE.Vector3() });
  }
  let puffNext = 0;
  let puffTimer = 0;

  const funnelWorld = new THREE.Vector3();
  function emitPuff(): void {
    // The Orion Express does not burn coal, so nothing comes off its roof.
    if (roster.engine.spec.shape?.smoke === false) return;
    const p = puffs[puffNext];
    puffNext = (puffNext + 1) % PUFFS;
    const engine = roster.engine;
    engine.group.localToWorld(funnelWorld.copy(engine.funnelTop));
    p.sprite.position.copy(funnelWorld);
    p.sprite.visible = true;
    p.life = 1;
    p.vel.set((Math.random() - 0.5) * 0.7, 2.4 + Math.random() * 0.9, (Math.random() - 0.5) * 0.7);
  }

  // --- birds -------------------------------------------------------------
  // A whistle out in the country puts a flock up from the field beside the
  // line, on whichever side is dry ground. Not from inside the tunnel.
  const flock = new Flock(scene);
  const startle = () => {
    const pos = world.track.positionAt(train.distance);
    const fwd = world.track.tangentAt(train.distance);
    if (world.groundAt(pos.x, pos.z) > 3) return; // under the hill
    const away = new THREE.Vector3().crossVectors(fwd, THREE.Object3D.DEFAULT_UP).normalize();
    for (const side of Math.random() < 0.5 ? [1, -1] : [-1, 1]) {
      const from = pos.clone().addScaledVector(away, side * 16).addScaledVector(fwd, 10);
      from.y = world.groundAt(from.x, from.z);
      // Not out of the water, and not off the other line's rails.
      if (from.y < -1 || world.distanceToTrack(from.x, from.z) < 6) continue;
      if (flock.launch(from, away.clone().multiplyScalar(side))) audio.flock();
      return;
    }
  };

  // --- controls ----------------------------------------------------------
  let touched = false;
  const awake = keepAwake();
  const used = () => {
    touched = true;
    awake.touched();
    journal.played();
    // The audio context can only be opened from inside a real gesture.
    audio.start();
  };
  /** True once he has chosen a view himself, until he next drives away. */
  let hisView = false;
  const controls = mountControls({
    touched: used,
    throttle: (v) => {
      // Asking to drive always wins: whatever the yard is in the middle of,
      // it puts everything where it was going and gets out of the way.
      world.settle();
      train.setThrottle(v);
      // Setting off from the shot of the whole railway, where the train is a
      // speck: come down to it, so pressing green is visibly a thing he did
      // to his train rather than to nothing in particular.
      if (v > 0) rig.toTrain();
    },
    reverse: (on) => {
      if (on) world.settle();
      train.setReverse(on);
      if (on) journal.reversed();
    },
    say: (which) => {
      trail.mark('say', String(which));
      speak(PHRASES[which] ?? PHRASES[0], settings.get().volume);
    },
    whistle: () => {
      audio.whistle();
      journal.whistled();
      trail.mark('whistle');
      world.whistle(trainState);
      startle();
      for (let i = 0; i < 3; i++) emitPuff();
    },
    camera: () => {
      trail.mark('camera', rig.cycle());
      hisView = true;
    },
  });

  // Which build this is, for whoever picks the tablet up. Not for him: it
  // cannot be pressed and he cannot read it.
  const stamp = document.getElementById('version');
  if (stamp) stamp.textContent = `v${__VERSION__} · ${__BUILD__.slice(5)}`;

  // --- the points ----------------------------------------------------------
  // Two arrows as he comes up to a junction: after The Farm, and after The
  // Harbour. Setting the points is only allowed while he is still short of
  // them, which is also the only time the arrows are on screen.
  const lines = world.track;
  /**
   * How long before the points the arrows come up, in seconds of running
   * rather than metres of railway.
   *
   * Seventy metres was the same seventy metres whether he was pottering or
   * flat out, which meant the question arrived in ten seconds on the first
   * notch and in seven at full steam — and seven seconds is not long enough to
   * see an arrow, work out which picture is which, and get a thumb to it.
   * Timing it instead gives him the same think at every speed.
   */
  const THINKING_TIME = 9;
  /** However slowly he is going, and however fast: a floor and a ceiling. */
  const NEAREST = 50;
  const FURTHEST = 115;
  /**
   * And a breath after one set of points before the next set is asked about.
   *
   * Two junctions can be a hundred and thirty metres apart and the approach
   * can be a hundred and fifteen, so without this the next question would be
   * on screen before he had finished watching the last answer happen. He gets
   * to see where he chose to go before being asked again.
   */
  const BREATH = 2.2;
  let lastChoice = -99;
  /** The junction whose arrows are showing, if any. */
  let current: Junction | null = null;
  /** The loop that differs from this one only in which way `j` goes. */
  const via = (j: Junction, branch: boolean) => (lines.line & ~j.bit) | (branch ? j.bit : 0);
  const points = mountPoints({
    touched: used,
    choose(way) {
      // Marked whether or not the points will take it, because an arrow he
      // pressed that did nothing is the more interesting of the two.
      trail.mark('points', `${current ? current.id : 'none'}:${way}`);
      if (current && lines.set(via(current, way === 1), train.distance)) {
        points.mark(way);
        audio.chime();
      }
    },
  });
  // --------------------------------------------------------------- the crane
  //
  // The first car that a crane can do anything with. He is free to put the
  // open wagon anywhere in the rake, or to leave it off altogether: the hook
  // comes down where the first car stands, so this is forgiving on purpose
  // rather than insisting the wagon be coupled next to the engine.
  const wagon = () => roster.cars.find(loadable) ?? null;

  /**
   * How far behind the stop that wagon's middle sits, so the crane can aim.
   *
   * Worked out from the rake rather than assumed, because the engine in front
   * of it is anything from a six-metre tank engine to the tender engine at
   * nearly twelve, which moves the first car by the better part of three.
   */
  const wagonBack = (): number | undefined => {
    const i = roster.cars.findIndex(loadable);
    if (i < 0) return undefined;
    // vehicles[0] is the engine, so the nth car is the (n+1)th vehicle. The
    // sign flips: offsets count backwards, the crane's `along` is negative.
    return -consist.offsets(roster.vehicles())[i + 1];
  };

  /**
   * What the crane here would do if he pressed it now, or null for no crane
   * and nothing to press.
   *
   * `lift` is the answer for a train with no open wagon in it. The crane
   * still works — that is the thing he asked for — it just has nowhere to put
   * the bundle down, so it carries it over the train and back.
   */
  const craneJob = (): CraneJob | null => {
    const here = world.craneAt(trainState);
    if (!here || here.busy()) return null;
    const car = wagon();
    if (!car) return 'lift';
    return loaded(car) ? 'unload' : 'load';
  };

  const craneButton = mountCrane({
    touched: used,
    work(job) {
      const here = world.craneAt(trainState);
      if (!here) return;
      const car = wagon();
      // The load changes hands at the bottom of the drop, not now: the crane
      // calls these when the hook actually gets there.
      const started = here.start(
        job,
        {
          fromTrain() {
            if (car) setLoaded(car, false);
          },
          toTrain() {
            if (car) setLoaded(car, true);
          },
        },
        wagonBack(),
      );
      if (!started) return;
      trail.mark('crane', job);
      // Gone for the length of the lift, so a second press cannot queue one.
      craneButton.show(null);
    },
  });

  const wasBefore = new Map<string, boolean>();
  const watchPoints = (clock: number) => {
    const head = lines.wrap(train.distance);
    const on = settings.get().junctions;
    // Far enough ahead to be a question rather than a surprise, at whatever
    // speed he is actually doing.
    const approach = THREE.MathUtils.clamp(train.speed * THINKING_TIME, NEAREST, FURTHEST);
    const settling = clock - lastChoice < BREATH;
    // Not while he is standing still. The city's points are twenty metres off
    // the end of The Sheds, so the arrows used to come up over the middle of
    // the yard — over the turntable, the roundhouse doors and the spare cars,
    // which are the whole of what he is looking at while he is standing there.
    // Arrows are for choosing where to go; if he is not going, he does not
    // need them, and they are back the moment he presses green.
    const standing = !train.moving;
    let showing: Junction | null = null;
    let soonest = Infinity;
    for (const j of world.junctions) {
      const at = j.pointsOn(lines.line);
      const before = head < at;
      // Just went over the points: note which way, for the grown-ups' scrapbook,
      // and start the breath before the next question.
      if (wasBefore.get(j.id) && !before) {
        const way = lines.line & j.bit ? 1 : 0;
        journal.turned(j.id, way);
        trail.mark('through', `${j.id}:${way}`);
        lastChoice = clock;
      }
      wasBefore.set(j.id, before);
      const gap = at - head;
      const near = on && before && gap <= approach && !standing && !settling;
      // Every time round starts set for the main line, so a branch is always
      // somewhere he chose rather than somewhere he was left.
      if ((near && current !== j) || (!on && before)) lines.set(via(j, false), head);
      // The one he is about to reach, not merely the last one in the list.
      // With four junctions two of them can be inside the approach at once,
      // and showing the far one would be asking him the wrong question.
      if (near && gap < soonest) {
        soonest = gap;
        showing = j;
      }
    }
    if (showing !== current) {
      current = showing;
      points.show(current ? current.id : null);
      // The crane button lives in the same row, so it stands aside while a
      // junction is being offered. Choosing which way to go is the more
      // urgent of the two: the points are about to go past either way.
      document.body.classList.toggle('points-up', current !== null);
    }
    if (current) points.mark(lines.line & current.bit ? 1 : 0);
  };

  /** Offer the crane, or take the offer away. Cheap enough to ask every frame. */
  const watchCrane = () => craneButton.show(craneJob());

  // Pushed updates land the next time he opens the app, never mid-journey —
  // and the grown-ups' panel can ask for one on purpose.
  const updates = watchForUpdates({ inUse: () => touched || train.moving });

  mountParentPanel({
    opened: () => controls.letGo(),
    resetTrain: () => roster.reset(),
    status: () => ['Full detail', 'Shadows reduced', 'Shadows off'][quality.current],
    checkForUpdate: () => updates.checkNow(),
  });

  // Touching the world itself, which only does anything in the yard: the
  // other engines and the spare cars are stood there, and he picks by
  // touching one. Everywhere else on the railway a tap does nothing at all.
  //
  // Dragging instead of tapping swings the view round. That is the only way to
  // get a proper look at a yard the driving buttons are sat on top of, and it
  // is deliberately the same finger doing the same thing a little further: a
  // press that stays put picks, a press that travels looks.
  //
  // And two fingers pinch, in every view there is: nearer and further off.
  // Which finger is which never matters and neither does where on the screen
  // they are — only how far apart they are and which way that is changing — so
  // there is no wrong way to do it.
  const picker = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  /** Travel further than this and it was a look, not a pick. Thumbs drift. */
  const DRAG = 16;
  /** Every finger on the canvas now, so the second one can start a pinch. */
  const fingers = new Map<number, { x: number; y: number }>();
  let look: { id: number; fromX: number; fromY: number; x: number; y: number; far: number } | null = null;
  /** How far apart they were when the pinch last moved, in pixels. */
  let apart = 0;
  /** And how far apart they were when it began, so the trail can say which way. */
  let pinchFrom = 0;
  /** Closer than this and the ratio between them is noise. */
  const PINCH_FLOOR = 24;

  /** How far apart the first two fingers are. */
  const spread = (): number => {
    const [a, b] = [...fingers.values()];
    return Math.hypot(a.x - b.x, a.y - b.y);
  };

  canvas.addEventListener('pointerdown', (e) => {
    used();
    fingers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    try {
      canvas.setPointerCapture(e.pointerId);
    } catch {
      /* no capture available; the drag still works over the canvas itself */
    }
    rig.dragging = true;
    if (fingers.size >= 2) {
      // A second finger means this was never a tap and is no longer a drag:
      // one finger of a pinch travels a long way, and letting it swing the
      // view at the same time makes the whole gesture feel like a fight.
      look = null;
      apart = fingers.size === 2 ? spread() : 0;
      pinchFrom = apart;
      return;
    }
    look = { id: e.pointerId, fromX: e.clientX, fromY: e.clientY, x: e.clientX, y: e.clientY, far: 0 };
  });

  canvas.addEventListener('pointermove', (e) => {
    const finger = fingers.get(e.pointerId);
    if (finger === undefined) return;
    finger.x = e.clientX;
    finger.y = e.clientY;

    if (fingers.size >= 2) {
      // Three fingers is a four-year-old leaning on the screen. Hold still
      // rather than guessing which two of them he meant.
      if (fingers.size > 2) return;
      const now = spread();
      if (apart > PINCH_FLOOR && now > PINCH_FLOOR) rig.pinch(now / apart);
      apart = now;
      return;
    }

    if (look === null || look.id !== e.pointerId) return;
    const dx = e.clientX - look.x;
    const dy = e.clientY - look.y;
    look.x = e.clientX;
    look.y = e.clientY;
    look.far = Math.max(look.far, Math.hypot(e.clientX - look.fromX, e.clientY - look.fromY));
    if (look.far > DRAG) rig.nudge(dx, dy);
  });

  const endLook = (e: PointerEvent, mayPick: boolean): void => {
    const was = fingers.size;
    // Measured before the finger that is lifting is forgotten, or there is
    // nothing left to measure between.
    const closed = was === 2 ? spread() : 0;
    fingers.delete(e.pointerId);
    rig.dragging = fingers.size > 0;

    if (was >= 2) {
      // Coming off a pinch. Whatever is still down is not a tap and not a
      // drag: the next gesture starts from a clean press.
      if (was === 2 && pinchFrom > PINCH_FLOOR && closed > PINCH_FLOOR) {
        trail.mark('pinch', closed > pinchFrom ? 'in' : 'out');
      }
      look = null;
      apart = fingers.size === 2 ? spread() : 0;
      pinchFrom = apart;
      return;
    }
    if (look === null || look.id !== e.pointerId) return;
    const tapped = look.far <= DRAG;
    const far = Math.round(look.far);
    look = null;
    if (!tapped) {
      trail.mark('look', String(far));
      return;
    }
    if (!mayPick) return;
    ndc.set((e.clientX / window.innerWidth) * 2 - 1, -((e.clientY / window.innerHeight) * 2 - 1));
    picker.setFromCamera(ndc, camera);
    const had = roster.cars.length;
    const drove = roster.engine.spec.id;
    if (!world.pick(picker, trainState)) {
      // He touched the world and the world did nothing. Away from the yard
      // that is the game working as designed — but it is also the only record
      // of where he expects something to answer, which is the whole reason
      // this is worth keeping. `m` says where on the railway he was standing.
      trail.mark('nothing');
      return;
    }
    audio.chime();
    if (roster.cars.length !== had) {
      journal.coupled();
      trail.mark('yard', roster.cars.length > had ? 'car on' : 'car off');
    } else if (roster.engine.spec.id !== drove) {
      trail.mark('yard', roster.engine.spec.id);
    } else {
      trail.mark('yard', 'something');
    }
  };
  canvas.addEventListener('pointerup', (e) => endLook(e, true));
  canvas.addEventListener('pointercancel', (e) => endLook(e, false));

  // --- standing at home ----------------------------------------------------
  // Whenever he is stopped in the yard the view turns to face it, so the spare
  // engines and cars are big and in the clear rather than behind his thumb.
  // Pressing the camera button says he would rather look at something else,
  // and that holds until he drives away.
  const shedsStop = world.stops.find((s) => s.id === 'sheds');
  /** Matches the range over which the yard itself will answer a touch. */
  const YARD_RANGE = 26;
  // Backing up counts as still being in the yard: shunting is what reverse is
  // for, and throwing the view back out to the whole railway the moment he
  // touches R would take away the very thing he is aiming at. Pulling forward
  // is leaving, and that does give the view back.
  const inTheYard = (): boolean =>
    shedsStop !== undefined &&
    (!train.moving || train.reversing) &&
    Math.abs(world.track.delta(train.distance, shedsStop.at)) < YARD_RANGE;

  // --- frame loop --------------------------------------------------------
  const pos = new THREE.Vector3();
  const fwd = new THREE.Vector3();
  let last = now();

  function resize(): void {
    const w = window.innerWidth;
    const h = window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  window.addEventListener('resize', resize);

  // Sets the pixel ratio and shadow size, and steps them down if the tablet
  // turns out not to hold sixty frames with everything on.
  const quality = new QualityGovernor(renderer, sun, resize);
  quality.setMode(settings.get().quality);
  settings.onChange((s) => quality.setMode(s.quality));

  renderer.setAnimationLoop(() => {
    const t = now();
    quality.sample(t - last);
    // Clamp: coming back from a locked screen must not teleport the train.
    const dt = Math.min(0.05, t - last);
    last = t;

    train.update(dt);
    journal.drove(roster.engine.spec.id, train.speed * dt);
    watchPoints(t);
    watchCrane();
    trainState.distance = train.distance;
    trainState.speed = train.speed;
    trainState.moving = train.moving;

    const engine = roster.engine;
    const wheelRadius = engine.spec.dims.wheelRadius;
    const angle = train.advanceWheels(wheelRadius, dt);
    animateRunningGear(engine, angle);
    // Smaller wheels turn faster over the same ground, and the cars' are
    // smaller again, so each is worked out from the distance travelled.
    const carAngle = (angle * wheelRadius) / CAR_WHEEL_RADIUS;
    const cars = roster.cars;
    for (const car of cars) turnCarWheels(car, carAngle);

    // While the yard has his engine out on a road of its own, it places it;
    // the cars still stand where the train is, which is where they were left.
    consist.place(roster.vehicles(), train.distance, world.shunting() ? 1 : 0);
    world.track.positionAt(train.distance, pos);
    world.track.tangentAt(train.distance, fwd);

    // steam, paced by speed
    puffTimer -= dt;
    if (train.moving && puffTimer <= 0) {
      emitPuff();
      puffTimer = THREE.MathUtils.clamp(1.1 / (train.speed + 0.6), 0.07, 0.5);
    }
    for (const p of puffs) {
      if (p.life <= 0) continue;
      p.life -= dt * 0.8;
      if (p.life <= 0) {
        p.sprite.visible = false;
        continue;
      }
      p.sprite.position.addScaledVector(p.vel, dt);
      p.vel.y *= 1 - dt * 0.4;
      const grow = 0.85 + (1 - p.life) * 2.4;
      p.sprite.scale.setScalar(grow);
      (p.sprite.material as THREE.SpriteMaterial).opacity = Math.min(1, p.life * 1.6) * 0.5;
    }

    sky.update(dt, settings.get().dayNight);
    setEvening(sky.dusk);
    for (const spec of ENGINES) roster.byId(spec.id).lamp.emissiveIntensity = sky.dusk * 2.2;
    flock.update(dt, t);

    audio.setSpeed(train.speed);
    audio.update();

    const home = inTheYard();
    if (!home) hisView = false;
    rig.showYard(home && !hisView);
    rig.update(dt, train.distance, pos, fwd, train.moving, consist.length(roster.vehicles()));
    world.update(dt, t, trainState);
    controls.reflect({ moving: train.moving, atStop: train.atStop !== null });

    renderer.render(scene, camera);
  });

  // Dev-only handle, so the driving can be exercised without waiting for
  // real time to pass. Stripped from production builds.
  if (import.meta.env.DEV) {
    (window as { LE?: unknown }).LE = {
      train,
      rig,
      world,
      audio,
      roster,
      quality,
      sky,
      flock,
      consist,
      trail,
      scene,
      camera,
      renderer,
      THREE,
    };
  }

  // --- in we go ----------------------------------------------------------
  controls.show();
  // The railway is already running behind the loading screen; it lifts when
  // the hello has been said, or straight away if the device will not say it.
  await hello;
  bootEl.classList.add('gone');
  window.setTimeout(() => bootEl.remove(), 500);
}

void boot();
