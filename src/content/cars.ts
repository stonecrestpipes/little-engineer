import * as THREE from 'three';
import { mergeStatic, moving } from '../engine/merge';
import { C, mat } from './scenery';

/**
 * Things to pull.
 *
 * Deliberately nothing to do with them. There is no cargo to deliver and no
 * passenger who wants to get anywhere — a car is something he chose because he
 * liked it, and the only difference it makes is that there is more train behind
 * the engine. That is the whole of the feature, and it is on purpose: fetching
 * and delivering is exactly what he disliked in the game this idea came from.
 *
 * Built facing +z, like the engine, so the same code puts both on the rails.
 */

export type CarKind = 'coach' | 'open' | 'tank' | 'brake';

export interface CarSpec {
  id: string;
  /** Only ever used in code. Nothing in the game is labelled. */
  name: string;
  kind: CarKind;
  /** end to end over the buffers — what the spacing is worked out from */
  length: number;
  colour: number;
  trim: number;
  roof?: number;
}

export interface CarMesh {
  group: THREE.Group;
  wheels: THREE.Object3D[];
  spec: CarSpec;
}

export const CARS: CarSpec[] = [
  { id: 'coach-red', name: 'the red coach', kind: 'coach', length: 6.6, colour: 0xc0392b, trim: C.cream, roof: C.slate },
  { id: 'coach-green', name: 'the green coach', kind: 'coach', length: 6.6, colour: 0x3f7a52, trim: C.cream, roof: C.slate },
  { id: 'open', name: 'the open wagon', kind: 'open', length: 5.2, colour: 0x8a6a45, trim: 0x6b4a3e },
  { id: 'tank', name: 'the tank wagon', kind: 'tank', length: 5.6, colour: 0x4f7f9e, trim: 0x2b3a45 },
  { id: 'brake', name: 'the brake van', kind: 'brake', length: 4.8, colour: 0x6b4a3e, trim: C.cream, roof: C.slate },
];


const WHEEL_R = 0.42;
const GAUGE = 1.02;

export function buildCar(spec: CarSpec): CarMesh {
  const group = new THREE.Group();
  const wheels: THREE.Object3D[] = [];
  const L = spec.length;

  const body = mat(spec.colour);
  const trim = mat(spec.trim);
  const roofMat = mat(spec.roof ?? C.slate);
  const iron = mat(0x39434a, 0.6);
  const glass = new THREE.MeshStandardMaterial({ color: 0xc8e6ef, roughness: 0.25, metalness: 0.1 });

  const add = (geo: THREE.BufferGeometry, m: THREE.Material, x: number, y: number, z: number) => {
    const mesh = new THREE.Mesh(geo, m);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
    return mesh;
  };

  // --- underframe, buffers and wheels, which every car has ----------------
  add(new THREE.BoxGeometry(2.24, 0.26, L - 0.5), iron, 0, 0.94, 0);
  for (const end of [-1, 1]) {
    add(new THREE.BoxGeometry(2.4, 0.42, 0.2), trim, 0, 0.98, (end * (L - 0.3)) / 2);
    for (const side of [-1, 1]) {
      const buffer = new THREE.CylinderGeometry(0.13, 0.13, 0.24, 12).rotateX(Math.PI / 2);
      add(buffer, iron, side * 0.78, 0.98, (end * (L + 0.1)) / 2);
    }
  }

  const tyre = new THREE.CylinderGeometry(WHEEL_R, WHEEL_R, 0.15, 20).rotateZ(Math.PI / 2);
  const rim = new THREE.CylinderGeometry(WHEEL_R * 0.66, WHEEL_R * 0.66, 0.17, 20).rotateZ(Math.PI / 2);
  for (const side of [-1, 1]) {
    for (const z of [L * 0.29, -L * 0.29]) {
      const pivot = new THREE.Group();
      pivot.position.set(side * GAUGE, WHEEL_R, z);
      const t = new THREE.Mesh(tyre, iron);
      t.castShadow = true;
      const r = new THREE.Mesh(rim, trim);
      r.position.x = side * 0.02;
      pivot.add(t, r);
      group.add(pivot);
      wheels.push(pivot);
    }
  }

  // --- and then whatever kind of car it is --------------------------------
  switch (spec.kind) {
    case 'coach': {
      add(new THREE.BoxGeometry(2.3, 2.1, L - 0.7), body, 0, 2.15, 0);
      add(new THREE.BoxGeometry(2.4, 0.2, L - 0.7), trim, 0, 2.6, 0);
      // The roof is the arch and nothing else: a flat slab as well leaves a
      // second roof hanging above the first.
      const arch = new THREE.CylinderGeometry(1.24, 1.24, L - 0.4, 18, 1, false, 0.32, Math.PI - 0.64);
      arch.rotateX(Math.PI / 2);
      const roof = add(arch, roofMat, 0, 2.06, 0);
      roof.scale.y = 0.85;
      // windows down each side, and one at each end
      const count = Math.max(3, Math.round((L - 1.6) / 1.35));
      for (const side of [-1, 1]) {
        for (let i = 0; i < count; i++) {
          const z = -(L - 2.1) / 2 + (i * (L - 2.1)) / (count - 1);
          add(new THREE.BoxGeometry(0.08, 0.86, 0.94), glass, side * 1.17, 2.42, z);
        }
      }
      add(new THREE.BoxGeometry(1.3, 0.8, 0.08), glass, 0, 2.42, -(L - 0.7) / 2);
      break;
    }

    case 'open': {
      const H = 1.5;
      add(new THREE.BoxGeometry(2.3, 0.18, L - 0.7), body, 0, 1.12, 0);
      for (const side of [-1, 1]) add(new THREE.BoxGeometry(0.16, H, L - 0.7), body, side * 1.07, 1.12 + H / 2, 0);
      for (const end of [-1, 1]) add(new THREE.BoxGeometry(2.3, H, 0.16), trim, 0, 1.12 + H / 2, (end * (L - 0.7)) / 2);
      // a load of logs, which is scenery rather than cargo
      for (let i = 0; i < 5; i++) {
        const log = new THREE.CylinderGeometry(0.3, 0.32, L - 1.4, 9);
        log.rotateX(Math.PI / 2);
        add(log, mat(C.trunk), -0.66 + (i % 3) * 0.66, 1.5 + Math.floor(i / 3) * 0.56, 0);
      }
      break;
    }

    case 'tank': {
      const barrel = new THREE.CylinderGeometry(1.06, 1.06, L - 1.1, 22);
      barrel.rotateX(Math.PI / 2);
      add(barrel, body, 0, 2.12, 0);
      for (const end of [-1, 1]) {
        const cap = new THREE.SphereGeometry(1.06, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2);
        cap.rotateX((end * Math.PI) / 2);
        add(cap, trim, 0, 2.12, (end * (L - 1.1)) / 2);
      }
      add(new THREE.CylinderGeometry(0.34, 0.34, 0.3, 14), trim, 0, 3.26, 0.2);
      add(new THREE.BoxGeometry(2.2, 0.8, 0.7), trim, 0, 1.45, 0);
      break;
    }

    case 'brake': {
      add(new THREE.BoxGeometry(2.3, 2.0, L - 2.0), body, 0, 2.1, -0.5);
      add(new THREE.BoxGeometry(2.46, 0.26, L - 1.7), roofMat, 0, 3.2, -0.5);
      for (const side of [-1, 1]) {
        add(new THREE.BoxGeometry(0.08, 0.8, 0.9), glass, side * 1.17, 2.4, -0.5);
      }
      // the veranda at one end, with a rail to lean on
      add(new THREE.BoxGeometry(2.3, 0.14, 1.5), trim, 0, 1.14, (L - 1.6) / 2);
      for (const side of [-1, 1]) {
        add(new THREE.CylinderGeometry(0.06, 0.06, 1.0, 8), iron, side * 1.05, 1.66, (L - 1.0) / 2);
      }
      add(new THREE.BoxGeometry(2.2, 0.1, 0.1), iron, 0, 2.14, (L - 1.0) / 2);
      add(new THREE.CylinderGeometry(0.14, 0.16, 0.6, 10), iron, 0.7, 3.5, -1.2);
      break;
    }
  }

  moving(...wheels);
  mergeStatic(group);
  return { group, wheels, spec };
}

/** Turn a car's wheels. The angle is worked out from the distance travelled. */
export function turnCarWheels(car: CarMesh, angle: number): void {
  for (const w of car.wheels) w.rotation.x = -angle;
}

export const CAR_WHEEL_RADIUS = WHEEL_R;
