import * as THREE from 'three';
import './ui/style.css';

import { Train } from './engine/train';
import { Consist } from './engine/consist';
import { CameraRig } from './engine/cameras';
import { Audio } from './engine/audio';
import { buildWorld, type Junction } from './content/world';
import { animateRunningGear } from './content/buildEngine';
import { buildRoster } from './content/roster';
import { CAR_WHEEL_RADIUS, turnCarWheels } from './content/cars';
import { ENGINES } from './content/engines';
import { mountControls } from './ui/controls';
import { watchForUpdates } from './ui/updates';
import { sayHello, say as speak } from './ui/greeting';
import { greetingFor, PHRASES } from './content/greeting';
import { setNameplate } from './content/buildEngine';
import { settings, tunedDriving } from './settings';
import { mountParentPanel } from './ui/parents';
import { keepAwake } from './ui/wakelock';
import { mountPoints } from './ui/points';
import { QualityGovernor } from './engine/quality';
import { Sky } from './engine/sky';
import { Flock } from './content/flock';
import { journal } from './journal';
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

  const camera = new THREE.PerspectiveCamera(48, 1, 0.5, 1200);

  // --- light -------------------------------------------------------------
  const hemi = new THREE.HemisphereLight(0xdcf2ff, 0x6f9455, 1.05);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xfff3d8, 1.5);
  // Fixed over the whole railway rather than following the engine. Following
  // it swings the shadow direction as he drives and drags the edge of the
  // shadow map across the fields, which reads as grey patches on the grass.
  sun.position.set(-190, 260, 158);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.near = 60;
  sun.shadow.camera.far = 700;
  // Wide enough to take in the whole layout, so shadows never stop at a line.
  const S = 215;
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

  train.on((e) => {
    if (e.type === 'arrived') {
      world.arrive(e.stop);
      journal.stopped(e.stop.id);
      audio.chime();
      // A long breath out as it comes to rest.
      audio.sigh();
      for (let i = 0; i < 5; i++) emitPuff();
    } else {
      world.depart(e.stop);
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
      train.setThrottle(v);
      // Setting off from the shot of the whole railway, where the train is a
      // speck: come down to it, so pressing green is visibly a thing he did
      // to his train rather than to nothing in particular.
      if (v > 0) rig.toTrain();
    },
    reverse: (on) => {
      train.setReverse(on);
      if (on) journal.reversed();
    },
    say: (which) => speak(PHRASES[which] ?? PHRASES[0], settings.get().volume),
    whistle: () => {
      audio.whistle();
      journal.whistled();
      world.whistle(trainState);
      startle();
      for (let i = 0; i < 3; i++) emitPuff();
    },
    camera: () => {
      rig.cycle();
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
  const APPROACH = 70;
  /** The junction whose arrows are showing, if any. */
  let current: Junction | null = null;
  /** The loop that differs from this one only in which way `j` goes. */
  const via = (j: Junction, branch: boolean) => (lines.line & ~j.bit) | (branch ? j.bit : 0);
  const points = mountPoints({
    touched: used,
    choose(way) {
      if (current && lines.set(via(current, way === 1), train.distance)) {
        points.mark(way);
        audio.chime();
      }
    },
  });
  const wasBefore = new Map<string, boolean>();
  const watchPoints = () => {
    const head = lines.wrap(train.distance);
    const on = settings.get().junctions;
    let showing: Junction | null = null;
    for (const j of world.junctions) {
      const at = j.pointsOn(lines.line);
      const before = head < at;
      // Just went over the points: note which way, for the grown-ups' scrapbook.
      if (wasBefore.get(j.id) && !before) journal.turned(j.id, lines.line & j.bit ? 1 : 0);
      wasBefore.set(j.id, before);
      const near = on && before && at - head <= APPROACH;
      // Every time round starts set for the main line, so a branch is always
      // somewhere he chose rather than somewhere he was left.
      if ((near && current !== j) || (!on && before)) lines.set(via(j, false), head);
      if (near) showing = j;
    }
    if (showing !== current) {
      current = showing;
      points.show(current ? current.id : null);
    }
    if (current) points.mark(lines.line & current.bit ? 1 : 0);
  };

  mountParentPanel({
    opened: () => controls.letGo(),
    resetTrain: () => roster.reset(),
    status: () => ['Full detail', 'Shadows reduced', 'Shadows off'][quality.current],
  });

  // Touching the world itself, which only does anything in the yard: the
  // other engines and the spare cars are stood there, and he picks by
  // touching one. Everywhere else on the railway a tap does nothing at all.
  //
  // Dragging instead of tapping swings the view round. That is the only way to
  // get a proper look at a yard the driving buttons are sat on top of, and it
  // is deliberately the same finger doing the same thing a little further: a
  // press that stays put picks, a press that travels looks.
  const picker = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  /** Travel further than this and it was a look, not a pick. Thumbs drift. */
  const DRAG = 16;
  let look: { id: number; fromX: number; fromY: number; x: number; y: number; far: number } | null = null;

  canvas.addEventListener('pointerdown', (e) => {
    used();
    look = { id: e.pointerId, fromX: e.clientX, fromY: e.clientY, x: e.clientX, y: e.clientY, far: 0 };
    rig.dragging = true;
    try {
      canvas.setPointerCapture(e.pointerId);
    } catch {
      /* no capture available; the drag still works over the canvas itself */
    }
  });

  canvas.addEventListener('pointermove', (e) => {
    if (look === null || look.id !== e.pointerId) return;
    const dx = e.clientX - look.x;
    const dy = e.clientY - look.y;
    look.x = e.clientX;
    look.y = e.clientY;
    look.far = Math.max(look.far, Math.hypot(e.clientX - look.fromX, e.clientY - look.fromY));
    if (look.far > DRAG) rig.nudge(dx, dy);
  });

  const endLook = (e: PointerEvent, mayPick: boolean): void => {
    if (look === null || look.id !== e.pointerId) return;
    const tapped = look.far <= DRAG;
    look = null;
    rig.dragging = false;
    if (!mayPick || !tapped) return;
    ndc.set((e.clientX / window.innerWidth) * 2 - 1, -((e.clientY / window.innerHeight) * 2 - 1));
    picker.setFromCamera(ndc, camera);
    const had = roster.cars.length;
    if (!world.pick(picker, trainState)) return;
    audio.chime();
    if (roster.cars.length !== had) journal.coupled();
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
    watchPoints();
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

    consist.place(roster.vehicles(), train.distance);
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
      scene,
      camera,
      renderer,
      THREE,
    };
  }

  // Pushed updates land the next time he opens the app, never mid-journey.
  watchForUpdates({ inUse: () => touched || train.moving });

  // --- in we go ----------------------------------------------------------
  controls.show();
  // The railway is already running behind the loading screen; it lifts when
  // the hello has been said, or straight away if the device will not say it.
  await hello;
  bootEl.classList.add('gone');
  window.setTimeout(() => bootEl.remove(), 500);
}

void boot();
