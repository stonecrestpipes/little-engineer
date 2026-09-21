import * as THREE from 'three';
import './ui/style.css';

import { Train } from './engine/train';
import { Consist } from './engine/consist';
import { CameraRig } from './engine/cameras';
import { Audio } from './engine/audio';
import { buildWorld } from './content/world';
import { animateRunningGear } from './content/buildEngine';
import { buildRoster } from './content/roster';
import { CAR_WHEEL_RADIUS, turnCarWheels } from './content/cars';
import { ENGINES } from './content/engines';
import { mountControls } from './ui/controls';
import { watchForUpdates } from './ui/updates';
import { sayHello } from './ui/greeting';
import { greetingFor } from './content/greeting';
import { setNameplate } from './content/buildEngine';
import { settings, tunedDriving } from './settings';
import { mountParentPanel } from './ui/parents';
import { keepAwake } from './ui/wakelock';
import { mountPoints } from './ui/points';
import { QualityGovernor } from './engine/quality';

const SKY_TOP = 0x7fc8e6;
const SKY_LOW = 0xdcf0f4;

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

function skyDome(): THREE.Mesh {
  const c = document.createElement('canvas');
  c.width = 4;
  c.height = 256;
  const g = c.getContext('2d')!;
  const grad = g.createLinearGradient(0, 0, 0, 256);
  grad.addColorStop(0, '#' + SKY_TOP.toString(16).padStart(6, '0'));
  grad.addColorStop(0.72, '#c6e6f1');
  grad.addColorStop(1, '#' + SKY_LOW.toString(16).padStart(6, '0'));
  g.fillStyle = grad;
  g.fillRect(0, 0, 4, 256);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(520, 24, 16),
    new THREE.MeshBasicMaterial({ map: tex, side: THREE.BackSide, depthWrite: false, fog: false }),
  );
  mesh.renderOrder = -1;
  return mesh;
}

async function boot(): Promise<void> {
  // First thing, before anything slow: say hello to him by name. It runs
  // alongside the build below rather than delaying it.
  const bootEl = document.getElementById('boot')!;
  const helloEl = document.getElementById('boot-hello');
  const greeting = greetingFor(settings.get().childName);
  if (helloEl) helloEl.textContent = greeting;
  const hello = settings.get().greetingOn ? sayHello(greeting) : Promise.resolve();

  const canvas = document.getElementById('stage') as HTMLCanvasElement;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(SKY_LOW, 260, 640);
  scene.add(skyDome());

  const camera = new THREE.PerspectiveCamera(48, 1, 0.5, 1200);

  // --- light -------------------------------------------------------------
  scene.add(new THREE.HemisphereLight(0xdcf2ff, 0x6f9455, 1.05));
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
      audio.chime();
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

  // --- controls ----------------------------------------------------------
  let touched = false;
  const awake = keepAwake();
  const used = () => {
    touched = true;
    awake.touched();
    // The audio context can only be opened from inside a real gesture.
    audio.start();
  };
  const controls = mountControls({
    touched: used,
    throttle: (v) => train.setThrottle(v),
    whistle: () => {
      audio.whistle();
      world.whistle(trainState);
      for (let i = 0; i < 3; i++) emitPuff();
    },
    camera: () => rig.cycle(),
  });

  // --- the points ----------------------------------------------------------
  // Two arrows as he comes up to the junction after The Farm. Setting them is
  // only allowed while he is still short of it, which is also the only time
  // the arrows are on screen.
  const lines = world.track;
  const APPROACH = 70;
  const points = mountPoints({
    touched: used,
    choose(line) {
      if (lines.set(line, train.distance)) {
        points.mark(line);
        audio.chime();
      }
    },
  });
  let approaching = false;
  const watchPoints = () => {
    const head = train.distance;
    const before = lines.canSwitch(head);
    const on = settings.get().junctions;
    const near = on && before && lines.points - lines.wrap(head) <= APPROACH;
    // Every time round starts set for the main line, so the branch is always
    // something he chose rather than somewhere he was left.
    if ((near && !approaching) || (!on && before)) {
      lines.set(0, head);
      points.mark(0);
    }
    approaching = near;
    points.show(near);
  };

  mountParentPanel({
    opened: () => train.setThrottle(0),
    resetTrain: () => roster.reset(),
    status: () => ['Full detail', 'Shadows reduced', 'Shadows off'][quality.current],
  });

  // Touching the world itself, which only does anything in the yard: the
  // other engines and the spare cars are stood there, and he picks by
  // touching one. Everywhere else on the railway a tap does nothing at all.
  const picker = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  canvas.addEventListener('pointerdown', (e) => {
    used();
    ndc.set((e.clientX / window.innerWidth) * 2 - 1, -((e.clientY / window.innerHeight) * 2 - 1));
    picker.setFromCamera(ndc, camera);
    if (world.pick(picker, trainState)) audio.chime();
  });

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

    audio.setSpeed(train.speed);
    audio.update();

    rig.update(dt, train.distance, pos, fwd);
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
