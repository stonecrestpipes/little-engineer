import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

/**
 * Fewer draw calls, same picture.
 *
 * Everything on the railway is built from dozens of small boxes and
 * cylinders, which is what makes it easy to edit — and every one of them is a
 * draw call, twice over once shadows are counted. This bakes every part that
 * never moves into one mesh per material, after building, so the source stays
 * in small editable pieces and the tablet draws a handful of meshes instead.
 *
 * Anything that moves must be marked with `moving()` before this runs. A
 * marked object keeps its own place in the scene and moves as before; the
 * fixed parts inside it are merged in turn, relative to it. So a part that
 * moves inside something else that moves — a sheep's neck, a gull's wings —
 * must be marked as well. Forgetting to mark something does not break the
 * game, it just stops that thing moving, which is easy to spot and fix.
 */

/** Mark objects that animate, so `mergeStatic` leaves them alone. */
export function moving(...objects: THREE.Object3D[]): void {
  for (const o of objects) o.userData.moves = true;
}

const KEEP = ['position', 'normal', 'uv'];

export function mergeStatic(root: THREE.Object3D): void {
  root.updateMatrixWorld(true);
  const toRoot = new THREE.Matrix4().copy(root.matrixWorld).invert();

  const buckets = new Map<string, { material: THREE.Material; cast: boolean; receive: boolean; meshes: THREE.Mesh[] }>();
  /** Moving things found inside, each merged on its own afterwards. */
  const inner: THREE.Object3D[] = [];
  const visit = (o: THREE.Object3D) => {
    if (o !== root && o.userData.moves) {
      inner.push(o);
      return;
    }
    const m = o as THREE.Mesh;
    // The root itself stays put even when it is a mesh: it is what moves.
    if (
      o !== root &&
      m.isMesh &&
      !(m as unknown as THREE.InstancedMesh).isInstancedMesh &&
      !Array.isArray(m.material) &&
      m.visible &&
      m.geometry.index !== null &&
      KEEP.every((k) => m.geometry.getAttribute(k))
    ) {
      const key = `${m.material.uuid}|${m.castShadow}|${m.receiveShadow}`;
      let b = buckets.get(key);
      if (!b) {
        b = { material: m.material, cast: m.castShadow, receive: m.receiveShadow, meshes: [] };
        buckets.set(key, b);
      }
      b.meshes.push(m);
    }
    for (const child of o.children) visit(child);
  };
  visit(root);

  const local = new THREE.Matrix4();
  for (const { material, cast, receive, meshes } of buckets.values()) {
    if (meshes.length < 2) continue;
    const parts = meshes.map((m) => {
      const g = new THREE.BufferGeometry();
      for (const k of KEEP) g.setAttribute(k, m.geometry.getAttribute(k).clone());
      g.setIndex(m.geometry.index!.clone());
      return g.applyMatrix4(local.multiplyMatrices(toRoot, m.matrixWorld));
    });
    const merged = mergeGeometries(parts, false);
    if (!merged) continue;
    const mesh = new THREE.Mesh(merged, material);
    mesh.castShadow = cast;
    mesh.receiveShadow = receive;
    mesh.userData.merged = meshes.length;
    root.add(mesh);
    for (const m of meshes) m.removeFromParent();
  }

  for (const o of inner) mergeStatic(o);
}
