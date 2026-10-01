import * as THREE from 'three';
import type { EngineSpec } from './engines/spec';
import { mergeStatic, moving } from '../engine/merge';

export interface EngineMesh {
  spec: EngineSpec;
  group: THREE.Group;
  wheels: THREE.Object3D[];
  rods: { mesh: THREE.Object3D; baseY: number }[];
  face: THREE.Mesh;
  funnelTop: THREE.Vector3;
  /** The lamp glass on the smokebox, which glows as the evening comes in. */
  lamp: THREE.MeshStandardMaterial;
}

const CRANK = 0.33;

/**
 * The engine, built from boxes, cylinders and discs. No modelling tool, no
 * import pipeline — the proportions are numbers you can edit in this file.
 *
 * Stubby on purpose: barely twice as long as it is tall, wheels too big for
 * it, and the face is very nearly the full height of the body. Built facing
 * +Z; the train controller turns it to match the rails.
 */
export function buildEngine(spec: EngineSpec, faceMap: THREE.Texture | null): EngineMesh {
  const c = spec.colour;
  const R = spec.dims.wheelRadius;
  const kind = spec.kind ?? 'tank';
  const group = new THREE.Group();

  const solid = (colour: number, rough = 0.72) =>
    new THREE.MeshStandardMaterial({ color: colour, roughness: rough, metalness: 0.02 });

  const matBody = solid(c.body);
  const matBodyLight = solid(c.bodyLight);
  const matBodyDark = solid(c.bodyDark);
  const matTrim = solid(c.trim);
  const matMetal = solid(c.metal, 0.6);
  const matMetalLight = solid(c.metalLight, 0.55);
  const matBrass = new THREE.MeshStandardMaterial({ color: c.brass, roughness: 0.34, metalness: 0.55 });
  const matRim = solid(c.wheelRim, 0.6);
  const matGlass = new THREE.MeshStandardMaterial({ color: c.glass, roughness: 0.25, metalness: 0.1 });

  const add = (geo: THREE.BufferGeometry, mat: THREE.Material, x: number, y: number, z: number) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    m.castShadow = true;
    m.receiveShadow = true;
    group.add(m);
    return m;
  };

  // --- running plate and buffer beam ------------------------------------
  add(new THREE.BoxGeometry(2.46, 0.2, 5.5), matMetal, 0, 1.12, -0.05);
  add(new THREE.BoxGeometry(2.62, 0.52, 0.22), matTrim, 0, 1.2, 2.74);
  add(new THREE.BoxGeometry(2.62, 0.52, 0.22), matTrim, 0, 1.2, -2.66);
  for (const s of [-1, 1]) {
    const b = new THREE.CylinderGeometry(0.15, 0.15, 0.26, 16);
    b.rotateX(Math.PI / 2);
    add(b, matMetalLight, s * 0.86, 1.2, 2.9);
    add(b, matMetalLight, s * 0.86, 1.2, -2.82);
  }

  // --- boiler ------------------------------------------------------------
  const boiler = new THREE.CylinderGeometry(0.86, 0.86, 2.5, 28);
  boiler.rotateX(Math.PI / 2);
  add(boiler, matBody, 0, 2.02, 0.95);

  // a lighter crown so the flat shading still reads as round
  const crown = new THREE.CylinderGeometry(0.87, 0.87, 2.5, 28, 1, false, -0.9, 1.8);
  crown.rotateX(Math.PI / 2);
  add(crown, matBodyLight, 0, 2.02, 0.95);

  // --- where it carries its water ----------------------------------------
  // The one thing in an engine's outline that a four-year-old picks out at
  // fifty metres. A pair of side tanks, one tank draped over the top, or
  // nothing at all and a tender behind instead.
  if (kind === 'tank') {
    for (const s of [-1, 1]) {
      add(new THREE.BoxGeometry(0.44, 1.16, 2.3), matBody, s * 1.0, 1.92, 0.9);
      add(new THREE.BoxGeometry(0.46, 0.16, 2.3), matBodyLight, s * 1.0, 2.48, 0.9);
    }
  } else if (kind === 'saddle') {
    // Over the boiler and down both sides of it, open underneath — which is
    // what makes a saddle tank look like it is wearing its water.
    const saddle = new THREE.CylinderGeometry(1.06, 1.06, 2.4, 24, 1, true, Math.PI, Math.PI);
    saddle.rotateX(Math.PI / 2);
    add(saddle.clone(), matBody, 0, 2.0, 0.95);
    const top = new THREE.CylinderGeometry(1.07, 1.07, 2.4, 24, 1, true, -1.1, 2.2);
    top.rotateX(Math.PI / 2);
    add(top, matBodyLight, 0, 2.0, 0.95);
    // Capped at each end, so it is a tank and not a bent sheet.
    for (const z of [-0.25, 2.15]) {
      const cap = new THREE.CircleGeometry(1.06, 24, Math.PI, Math.PI);
      cap.rotateX(z > 1 ? 0 : Math.PI);
      add(cap, matBody, 0, 2.0, z);
    }
    const filler = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.26, 0.2, 12), matBrass);
    filler.position.set(0, 3.1, 1.6);
    group.add(filler);
  } else {
    // A tender engine: splashers over the big wheels where the tanks would be.
    for (const s of [-1, 1]) {
      for (const z of [1.42, -1.42]) {
        const splash = new THREE.CylinderGeometry(R + 0.16, R + 0.16, 0.34, 16, 1, false, 0, Math.PI);
        splash.rotateZ(Math.PI / 2);
        add(splash, matBody, s * 1.02, 1.24, z);
      }
      add(new THREE.BoxGeometry(0.3, 0.3, 4.2), matBodyLight, s * 1.02, 1.36, 0);
    }
  }

  // --- cab ---------------------------------------------------------------
  add(new THREE.BoxGeometry(2.3, 1.86, 1.66), matBody, 0, 2.24, -1.5);
  add(new THREE.BoxGeometry(2.62, 0.17, 1.98), matTrim, 0, 3.22, -1.5);
  add(new THREE.BoxGeometry(2.34, 0.1, 1.7), matBodyDark, 0, 3.1, -1.5);
  for (const s of [-1, 1]) {
    add(new THREE.BoxGeometry(0.06, 0.78, 0.82), matGlass, s * 1.14, 2.62, -1.2);
  }
  add(new THREE.BoxGeometry(1.5, 0.8, 0.06), matGlass, 0, 2.62, -2.3);

  // --- smokebox and face -------------------------------------------------
  const smokebox = new THREE.CylinderGeometry(0.95, 0.95, 0.42, 30);
  smokebox.rotateX(Math.PI / 2);
  add(smokebox, matBodyDark, 0, 2.02, 2.28);

  // The ring the face sits in.
  const ring = new THREE.CylinderGeometry(spec.dims.faceRadius + 0.11, spec.dims.faceRadius + 0.11, 0.16, 40);
  ring.rotateX(Math.PI / 2);
  add(ring, matBodyDark, 0, 2.02, 2.46);

  const faceGeo = new THREE.CircleGeometry(spec.dims.faceRadius, 48);
  const faceMat = faceMap
    ? new THREE.MeshBasicMaterial({ map: faceMap, transparent: true, toneMapped: false })
    : new THREE.MeshBasicMaterial({ color: 0xf2ede4 });
  const face = new THREE.Mesh(faceGeo, faceMat);
  face.position.set(0, 2.02, 2.552);
  group.add(face);

  // --- funnel, dome, safety valve ---------------------------------------
  // The chimney is the one piece of silhouette that differs between engines:
  // a tall bell mouth and a short stovepipe read as different engines from
  // right across the layout, where the colours have gone to mush.
  const funnelHeight = spec.shape?.funnelHeight ?? 0.92;
  const flare = spec.shape?.funnelFlare ?? 0.5;
  const FOOT = 2.86;
  const mouth = 0.26 + 0.12 * flare;
  add(
    new THREE.CylinderGeometry(mouth, 0.34, funnelHeight, 20),
    matMetal,
    0,
    FOOT + funnelHeight / 2,
    1.88,
  );
  const capR = mouth + 0.08 + 0.1 * flare;
  add(new THREE.CylinderGeometry(capR, capR, 0.18, 20), matMetal, 0, FOOT + funnelHeight + 0.09, 1.88);
  add(
    new THREE.CylinderGeometry(capR + 0.005, capR + 0.005, 0.05, 20),
    matMetalLight,
    0,
    FOOT + funnelHeight + 0.17,
    1.88,
  );
  add(new THREE.TorusGeometry(0.31, 0.055, 8, 20).rotateX(Math.PI / 2), matTrim, 0, FOOT + 0.26, 1.88);

  if (spec.shape?.dome !== false) {
    const dome = new THREE.SphereGeometry(0.42, 22, 14, 0, Math.PI * 2, 0, Math.PI / 2);
    add(dome, matBrass, 0, 2.74, 0.5);
  }
  add(new THREE.CylinderGeometry(0.11, 0.13, 0.2, 12), matBrass, 0, 2.86, -0.35);

  const lamp = add(new THREE.BoxGeometry(0.3, 0.34, 0.24), matBodyDark, 0, 3.02, 2.42);
  lamp.castShadow = false;
  const lampGlass = new THREE.MeshStandardMaterial({
    color: 0xf6ecd0,
    emissive: 0xffd27a,
    emissiveIntensity: 0,
    roughness: 0.3,
  });
  const lens = new THREE.Mesh(new THREE.CircleGeometry(0.12, 16), lampGlass);
  lens.position.set(0, 3.02, 2.545);
  group.add(lens);

  // --- wheels and rods ---------------------------------------------------
  const wheels: THREE.Object3D[] = [];
  const rods: { mesh: THREE.Object3D; baseY: number }[] = [];
  const axleZ = [1.42, 0, -1.42];

  const tyre = new THREE.CylinderGeometry(R, R, 0.17, 26);
  tyre.rotateZ(Math.PI / 2);
  const rimGeo = new THREE.CylinderGeometry(R * 0.72, R * 0.72, 0.19, 26);
  rimGeo.rotateZ(Math.PI / 2);
  const hubGeo = new THREE.CylinderGeometry(R * 0.2, R * 0.2, 0.22, 14);
  hubGeo.rotateZ(Math.PI / 2);

  for (const s of [-1, 1]) {
    for (const z of axleZ) {
      const pivot = new THREE.Group();
      pivot.position.set(s * spec.dims.wheelGauge, R, z);
      const t = new THREE.Mesh(tyre, matMetal);
      t.castShadow = true;
      const r = new THREE.Mesh(rimGeo, matRim);
      r.position.x = s * 0.02;
      const h = new THREE.Mesh(hubGeo, matBrass);
      h.position.x = s * 0.03;
      // crank pin, so the rod has something to be attached to
      const pin = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.26, 10).rotateZ(Math.PI / 2), matMetalLight);
      pin.position.set(s * 0.1, CRANK, 0);
      pivot.add(t, r, h, pin);
      group.add(pivot);
      wheels.push(pivot);
    }

    const rod = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.16, 3.1), matRim);
    rod.castShadow = true;
    rod.position.set(s * (spec.dims.wheelGauge + 0.12), R + CRANK, 0);
    group.add(rod);
    rods.push({ mesh: rod, baseY: R });
  }

  // --- the tender --------------------------------------------------------
  // Built behind the cab in the engine's own frame and then shifted along
  // with everything else, because what has to end up in the middle of the
  // vehicle is engine and tender together, not the engine on its own.
  const TENDER_BACK = -8.5;
  if (kind === 'tender') {
    const front = -3.5;
    const len = front - TENDER_BACK;
    const mid = (front + TENDER_BACK) / 2;
    add(new THREE.BoxGeometry(2.46, 0.2, len), matMetal, 0, 1.12, mid);
    add(new THREE.BoxGeometry(2.62, 0.52, 0.22), matTrim, 0, 1.2, TENDER_BACK + 0.1);
    for (const s of [-1, 1]) {
      const b = new THREE.CylinderGeometry(0.15, 0.15, 0.26, 16);
      b.rotateX(Math.PI / 2);
      add(b, matMetalLight, s * 0.86, 1.2, TENDER_BACK - 0.06);
    }
    // The body: sides, a back and a floor, open at the top with coal in it.
    for (const s of [-1, 1]) {
      add(new THREE.BoxGeometry(0.22, 1.9, len - 0.3), matBody, s * 1.12, 2.17, mid);
      add(new THREE.BoxGeometry(0.26, 0.16, len - 0.3), matBodyLight, s * 1.12, 3.05, mid);
    }
    add(new THREE.BoxGeometry(2.46, 1.9, 0.22), matBody, 0, 2.17, TENDER_BACK + 0.25);
    add(new THREE.BoxGeometry(2.46, 1.9, 0.22), matBodyDark, 0, 2.17, front - 0.2);
    add(new THREE.BoxGeometry(2.1, 0.18, len - 0.5), matMetal, 0, 1.3, mid);
    // Coal, heaped toward the back where the shovel does not reach.
    const coal = new THREE.MeshStandardMaterial({ color: 0x2e2a26, roughness: 0.98 });
    for (const [cz, cs] of [[-1.6, 1], [0.4, 0.78], [1.8, 0.6]] as number[][]) {
      add(new THREE.SphereGeometry(0.95 * cs, 10, 7), coal, 0, 1.6 + 0.3 * cs, mid + cz);
    }
    // And its own four wheels, smaller than the engine's.
    const tR = R * 0.62;
    const tTyre = new THREE.CylinderGeometry(tR, tR, 0.16, 20).rotateZ(Math.PI / 2);
    const tRim = new THREE.CylinderGeometry(tR * 0.66, tR * 0.66, 0.18, 20).rotateZ(Math.PI / 2);
    for (const s of [-1, 1]) {
      for (const z of [front - 1.3, TENDER_BACK + 1.5]) {
        const pivot = new THREE.Group();
        pivot.position.set(s * spec.dims.wheelGauge, tR, z);
        const t = new THREE.Mesh(tTyre, matMetal);
        t.castShadow = true;
        const r = new THREE.Mesh(tRim, matRim);
        r.position.x = s * 0.02;
        pivot.add(t, r);
        group.add(pivot);
        wheels.push(pivot);
      }
    }
  }

  // --- the number it carries ---------------------------------------------
  const number = spec.number === undefined ? null : paintNumber(spec, kind);
  if (number) {
    group.add(number);
    // Marked so the merge leaves the group itself in place: hiding the number
    // when a grown-up paints a name on means hiding this object, and a merge
    // that lifted its plates out to the root would hide nothing.
    moving(number);
  }

  // Engine and tender together have to sit centred on the vehicle, because
  // that is where `Consist` puts an object's origin. The engine alone runs
  // from the back buffer beam at -2.82 to the front one at 2.9; with a tender
  // behind it the whole thing runs from TENDER_BACK to 2.9, and the middle of
  // *that* is what has to end up at zero.
  const NOSE = 2.9;
  const shift = kind === 'tender' ? -(TENDER_BACK + NOSE) / 2 : 0;
  if (shift !== 0) for (const child of group.children) child.position.z += shift;

  group.traverse((o) => {
    if ((o as THREE.Mesh).isMesh) o.receiveShadow = true;
  });
  moving(face, lens, ...wheels, ...rods.map((r) => r.mesh));
  mergeStatic(group);

  return {
    spec,
    group,
    wheels,
    rods,
    face,
    funnelTop: new THREE.Vector3(0, FOOT + funnelHeight + 0.24, 1.88 + shift),
    lamp: lampGlass,
  };
}

/**
 * The number, painted on both sides of whatever that engine has got there —
 * its tanks, its saddle, or its tender.
 *
 * Deliberately big, deliberately plain, and in the engine's own trim colour
 * on a disc so it reads against any livery. It is not text and he is not
 * being asked to read it; it is a shape that belongs to one engine, the way
 * the face is.
 */
function paintNumber(spec: EngineSpec, kind: string): THREE.Group {
  const S = 256;
  const c = document.createElement('canvas');
  c.width = c.height = S;
  const g = c.getContext('2d')!;
  const hex = (n: number) => '#' + n.toString(16).padStart(6, '0');
  g.clearRect(0, 0, S, S);
  g.fillStyle = hex(spec.colour.trim);
  g.beginPath();
  g.arc(S / 2, S / 2, S / 2 - 8, 0, Math.PI * 2);
  g.fill();
  g.lineWidth = 10;
  g.strokeStyle = 'rgba(255,255,255,0.75)';
  g.stroke();
  g.fillStyle = hex(spec.colour.bodyDark);
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.font = `700 ${Math.round(S * 0.62)}px Fredoka, 'Trebuchet MS', system-ui, sans-serif`;
  g.fillText(String(spec.number), S / 2, S / 2 + S * 0.04);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  const mat = new THREE.MeshStandardMaterial({ map: tex, transparent: true, roughness: 0.6 });

  // Where there is something flat to paint it on, for each kind of engine.
  const where =
    kind === 'tender'
      ? { x: 1.25, y: 2.3, z: -6.0, size: 1.3 }
      : kind === 'saddle'
        ? { x: 1.19, y: 2.12, z: -1.5, size: 1.0 }
        : { x: 1.226, y: 1.92, z: 0.9, size: 0.96 };

  const plates = new THREE.Group();
  plates.name = 'number';
  const geo = new THREE.PlaneGeometry(where.size, where.size);
  for (const s of [-1, 1]) {
    const plate = new THREE.Mesh(geo, mat);
    plate.position.set(s * where.x, where.y, where.z);
    plate.rotation.y = (s * Math.PI) / 2;
    plate.receiveShadow = true;
    plates.add(plate);
  }
  return plates;
}

/** Spin the wheels and swing the coupling rods to match distance travelled. */
export function animateRunningGear(mesh: EngineMesh, angle: number): void {
  for (const w of mesh.wheels) w.rotation.x = -angle;
  for (const { mesh: rod, baseY } of mesh.rods) {
    rod.position.y = baseY + CRANK * Math.cos(angle);
    rod.position.z = CRANK * Math.sin(angle);
  }
}

/**
 * Paint a name on both side tanks, or take it off again with a blank string.
 * The only text anywhere in the game, and only if a grown-up has typed one in.
 */
export function setNameplate(mesh: EngineMesh, text: string): void {
  const old = mesh.group.getObjectByName('nameplate');
  if (old) {
    mesh.group.remove(old);
    old.traverse((o) => {
      const m = o as THREE.Mesh;
      if (!m.isMesh) return;
      m.geometry.dispose();
      const mat = m.material as THREE.MeshStandardMaterial;
      mat.map?.dispose();
      mat.dispose();
    });
  }
  // The number lives where a nameplate goes, so one hides the other. Nothing
  // on an engine's side is ever two things at once.
  const number = mesh.group.getObjectByName('number');
  const name = text.trim();
  if (number) number.visible = !name;
  if (!name) return;

  const W = 512;
  const H = 150;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const g = c.getContext('2d')!;
  const brass = mesh.spec.colour.brass.toString(16).padStart(6, '0');
  g.fillStyle = '#' + brass;
  g.beginPath();
  g.roundRect(4, 4, W - 8, H - 8, 34);
  g.fill();
  g.lineWidth = 8;
  g.strokeStyle = 'rgba(60,40,10,0.55)';
  g.stroke();
  g.fillStyle = '#2b2012';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  let size = 104;
  do {
    g.font = `700 ${size}px Fredoka, 'Trebuchet MS', system-ui, sans-serif`;
    size -= 4;
  } while (g.measureText(name).width > W - 70 && size > 30);
  g.fillText(name, W / 2, H / 2 + 6);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  const mat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.45, metalness: 0.3 });
  const geo = new THREE.PlaneGeometry(1.86, 0.54);

  const plates = new THREE.Group();
  plates.name = 'nameplate';
  for (const s of [-1, 1]) {
    const p = new THREE.Mesh(geo, mat);
    // Just proud of the tank side, and turned so it reads from outside.
    p.position.set(s * 1.226, 1.9, 0.9);
    p.rotation.y = (s * Math.PI) / 2;
    p.receiveShadow = true;
    plates.add(p);
  }
  mesh.group.add(plates);
}
