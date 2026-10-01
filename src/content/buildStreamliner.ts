import * as THREE from 'three';
import type { EngineSpec } from './engines/spec';
import type { EngineMesh } from './buildEngine';
import { mergeStatic, moving } from '../engine/merge';

/**
 * The Orion Express — the one engine on this railway that is not a little
 * tank engine.
 *
 * A streamliner, after the stainless-steel trains of the nineteen-thirties:
 * one long fluted body with a shovel nose, a deep blue roof and skirt, the
 * wheels tucked away underneath, no rods and no chimney. It is here because
 * it is the opposite of everything else in the yard — from right across the
 * layout you can tell at a glance which engine is out, which is the whole
 * job an engine's silhouette has to do.
 *
 * It returns exactly what `buildEngine` returns, so nothing above this file
 * knows there are two kinds. `rods` is empty and nothing swings; `funnelTop`
 * is still answered, with a `smoke: false` spec keeping the steam away from
 * a roof that has no chimney on it.
 */
export function buildStreamliner(spec: EngineSpec, faceMap: THREE.Texture | null): EngineMesh {
  const c = spec.colour;
  const R = spec.dims.wheelRadius;
  const group = new THREE.Group();

  const solid = (colour: number, rough = 0.6, metal = 0.1) =>
    new THREE.MeshStandardMaterial({ color: colour, roughness: rough, metalness: metal });

  // Stainless steel: bright, smooth and a little bit mirror.
  const steel = solid(c.body, 0.3, 0.62);
  const flute = solid(c.bodyLight, 0.22, 0.75);
  const deep = solid(c.bodyDark, 0.5, 0.2);
  const trim = solid(c.trim, 0.5, 0.2);
  const dark = solid(c.metal, 0.6, 0.3);
  const glass = new THREE.MeshStandardMaterial({
    color: c.glass,
    roughness: 0.14,
    metalness: 0.2,
    transparent: true,
    opacity: 0.86,
  });

  const add = (geo: THREE.BufferGeometry, m: THREE.Material, x: number, y: number, z: number) => {
    const mesh = new THREE.Mesh(geo, m);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
    return mesh;
  };

  // --- the body -----------------------------------------------------------
  // Drawn as a side profile and extruded across, because the whole shape of
  // the thing is in that outline: the nose rakes forward from the skirt and
  // then back over the cab in one run.
  const side = new THREE.Shape();
  side.moveTo(-2.9, 0.62);
  side.lineTo(1.95, 0.62);
  side.lineTo(2.58, 1.1);
  side.lineTo(2.84, 1.95);
  side.lineTo(2.62, 2.74);
  side.lineTo(2.0, 3.28);
  side.lineTo(1.2, 3.5);
  side.lineTo(-2.9, 3.5);
  side.closePath();
  const shell = new THREE.ExtrudeGeometry(side, { depth: 2.34, bevelEnabled: false });
  shell.translate(0, 0, -1.17);
  // The extrusion runs across the engine, and the profile's own x is the way
  // it is going.
  shell.rotateY(-Math.PI / 2);
  add(shell, steel, 0, 0, 0);

  // Fluting: the horizontal ribs that say stainless steel and nothing else.
  for (const s of [-1, 1] as const) {
    for (const y of [1.28, 1.52, 1.76, 2.9, 3.14]) {
      add(new THREE.BoxGeometry(0.06, 0.12, 5.1), flute, s * 1.19, y, -0.35);
    }
  }

  // The roof and the skirt, in the deep colour.
  add(new THREE.BoxGeometry(2.42, 0.2, 4.2), deep, 0, 3.52, -0.8);
  for (const s of [-1, 1] as const) {
    add(new THREE.BoxGeometry(0.1, 0.52, 5.5), deep, s * 1.19, 0.86, -0.2);
  }
  // And one band at the waist, which is what makes it read as two colours.
  for (const s of [-1, 1] as const) {
    add(new THREE.BoxGeometry(0.08, 0.3, 5.3), trim, s * 1.2, 2.3, -0.3);
  }

  // --- the windows --------------------------------------------------------
  for (const s of [-1, 1] as const) {
    for (const z of [-2.2, -1.1, 0.1]) {
      add(new THREE.BoxGeometry(0.1, 0.72, 0.84), glass, s * 1.2, 2.62, z);
    }
  }

  // --- the face, set into the nose ----------------------------------------
  const ring = new THREE.CylinderGeometry(spec.dims.faceRadius + 0.1, spec.dims.faceRadius + 0.1, 0.18, 36);
  ring.rotateX(Math.PI / 2);
  add(ring, deep, 0, 1.96, 2.68);
  const faceMat = faceMap
    ? new THREE.MeshBasicMaterial({ map: faceMap, transparent: true, toneMapped: false })
    : new THREE.MeshBasicMaterial({ color: 0xf2ede4 });
  const face = new THREE.Mesh(new THREE.CircleGeometry(spec.dims.faceRadius, 44), faceMat);
  face.position.set(0, 1.96, 2.79);
  group.add(face);

  // The windscreen, wrapped over the top of the face.
  for (const s of [-1, 1] as const) {
    const pane = add(new THREE.BoxGeometry(1.0, 0.62, 0.1), glass, s * 0.52, 2.86, 2.28);
    pane.rotation.set(-0.5, s * 0.34, 0);
  }

  // The headlight, which glows with the evening like every other engine's.
  const lampGlass = new THREE.MeshStandardMaterial({
    color: 0xf6ecd0,
    emissive: 0xffd27a,
    emissiveIntensity: 0,
    roughness: 0.28,
  });
  add(new THREE.CylinderGeometry(0.2, 0.22, 0.26, 16).rotateX(Math.PI / 2), deep, 0, 3.18, 2.2);
  const lens = new THREE.Mesh(new THREE.CircleGeometry(0.15, 16), lampGlass);
  lens.position.set(0, 3.18, 2.345);
  group.add(lens);

  // A horn on the roof, where a chimney would be on anything else.
  for (const s of [-1, 1] as const) {
    add(new THREE.CylinderGeometry(0.1, 0.14, 0.5, 10).rotateX(Math.PI / 2), dark, s * 0.24, 3.66, 1.0);
  }

  // --- buffers, so it couples to the same cars as everything else ---------
  for (const z of [2.88, -3.0] as const) {
    add(new THREE.BoxGeometry(2.3, 0.4, 0.2), dark, 0, 0.78, z);
  }

  // --- wheels, in two trucks, mostly hidden behind the skirt --------------
  const wheels: THREE.Object3D[] = [];
  const tyre = new THREE.CylinderGeometry(R, R, 0.16, 22).rotateZ(Math.PI / 2);
  const rim = new THREE.CylinderGeometry(R * 0.62, R * 0.62, 0.18, 22).rotateZ(Math.PI / 2);
  for (const s of [-1, 1] as const) {
    for (const z of [2.0, 1.0, -1.7, -2.7]) {
      const pivot = new THREE.Group();
      pivot.position.set(s * spec.dims.wheelGauge, R, z);
      const t = new THREE.Mesh(tyre, dark);
      t.castShadow = true;
      const r = new THREE.Mesh(rim, trim);
      r.position.x = s * 0.02;
      pivot.add(t, r);
      group.add(pivot);
      wheels.push(pivot);
    }
  }

  group.traverse((o) => {
    if ((o as THREE.Mesh).isMesh) o.receiveShadow = true;
  });
  moving(face, lens, ...wheels);
  mergeStatic(group);

  return {
    spec,
    group,
    wheels,
    rods: [],
    face,
    // Nothing comes out of it, but everything that asks still gets an answer.
    funnelTop: new THREE.Vector3(0, 3.7, 1.0),
    lamp: lampGlass,
  };
}
