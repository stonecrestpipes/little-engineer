import * as THREE from 'three';
import type { EngineSpec } from './engines/thomas';

export interface EngineMesh {
  group: THREE.Group;
  wheels: THREE.Object3D[];
  rods: { mesh: THREE.Object3D; baseY: number }[];
  face: THREE.Mesh;
  funnelTop: THREE.Vector3;
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

  // --- side tanks --------------------------------------------------------
  for (const s of [-1, 1]) {
    add(new THREE.BoxGeometry(0.44, 1.16, 2.3), matBody, s * 1.0, 1.92, 0.9);
    add(new THREE.BoxGeometry(0.46, 0.16, 2.3), matBodyLight, s * 1.0, 2.48, 0.9);
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
  add(new THREE.CylinderGeometry(0.29, 0.34, 0.92, 20), matMetal, 0, 3.32, 1.88);
  add(new THREE.CylinderGeometry(0.4, 0.4, 0.18, 20), matMetal, 0, 3.84, 1.88);
  add(new THREE.CylinderGeometry(0.405, 0.405, 0.05, 20), matMetalLight, 0, 3.92, 1.88);
  add(new THREE.TorusGeometry(0.31, 0.055, 8, 20).rotateX(Math.PI / 2), matTrim, 0, 3.12, 1.88);

  const dome = new THREE.SphereGeometry(0.42, 22, 14, 0, Math.PI * 2, 0, Math.PI / 2);
  add(dome, matBrass, 0, 2.74, 0.5);
  add(new THREE.CylinderGeometry(0.11, 0.13, 0.2, 12), matBrass, 0, 2.86, -0.35);

  const lamp = add(new THREE.BoxGeometry(0.3, 0.34, 0.24), matBodyDark, 0, 3.02, 2.42);
  lamp.castShadow = false;

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

  group.traverse((o) => {
    if ((o as THREE.Mesh).isMesh) o.receiveShadow = true;
  });

  return { group, wheels, rods, face, funnelTop: new THREE.Vector3(0, 3.98, 1.88) };
}

/** Spin the wheels and swing the coupling rods to match distance travelled. */
export function animateRunningGear(mesh: EngineMesh, angle: number): void {
  for (const w of mesh.wheels) w.rotation.x = -angle;
  for (const { mesh: rod, baseY } of mesh.rods) {
    rod.position.y = baseY + CRANK * Math.cos(angle);
    rod.position.z = CRANK * Math.sin(angle);
  }
}
