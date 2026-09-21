import * as THREE from 'three';
import { UP } from './scenery';

/**
 * A flock of birds that goes up out of the fields beside the line when he
 * whistles — anywhere on the railway, not only at the places.
 *
 * Rationed: once it has gone up it will not go again for a while, so it stays
 * a surprise rather than becoming what the whistle always does. Everything
 * else still answers every time.
 */

const BIRDS = 9;
/** Seconds before another whistle can put a flock up. */
const REST = 9;
/** How long a flock is in the air before it has gone. */
const FLIGHT = 7;

interface Bird {
  group: THREE.Group;
  wings: THREE.Object3D[];
  vel: THREE.Vector3;
  turn: number;
  phase: number;
}

export class Flock {
  private readonly birds: Bird[] = [];
  private age = Infinity;
  private since = Infinity;

  constructor(scene: THREE.Scene) {
    const dark = new THREE.MeshStandardMaterial({ color: 0x3a3f47, roughness: 0.9 });
    const body = new THREE.SphereGeometry(0.22, 8, 6).scale(1, 0.8, 2.1);
    const wing = new THREE.BoxGeometry(0.95, 0.04, 0.42).translate(0.47, 0, 0);
    for (let i = 0; i < BIRDS; i++) {
      const group = new THREE.Group();
      group.add(new THREE.Mesh(body, dark));
      const wings: THREE.Object3D[] = [];
      for (const side of [-1, 1]) {
        const w = new THREE.Mesh(wing, dark);
        w.scale.x = side;
        group.add(w);
        wings.push(w);
      }
      group.visible = false;
      scene.add(group);
      this.birds.push({ group, wings, vel: new THREE.Vector3(), turn: 0, phase: Math.random() * 6 });
    }
  }

  /**
   * Put a flock up from the ground at `from`, flying away from `away`.
   * Returns false if it is still resting from the last time.
   */
  launch(from: THREE.Vector3, away: THREE.Vector3): boolean {
    if (this.since < REST) return false;
    this.since = 0;
    this.age = 0;
    const out = new THREE.Vector3();
    for (const b of this.birds) {
      b.group.position.set(
        from.x + (Math.random() - 0.5) * 7,
        from.y + 0.4 + Math.random() * 0.6,
        from.z + (Math.random() - 0.5) * 7,
      );
      out.copy(away).multiplyScalar(2.2 + Math.random() * 1.6);
      out.x += (Math.random() - 0.5) * 2;
      out.z += (Math.random() - 0.5) * 2;
      b.vel.set(out.x, 4.2 + Math.random() * 1.6, out.z);
      // The whole flock wheels the same way, a little each.
      b.turn = 0.35 + Math.random() * 0.2;
      b.group.visible = true;
      b.group.scale.setScalar(1);
    }
    return true;
  }

  update(dt: number, elapsed: number): void {
    this.since += dt;
    if (this.age >= FLIGHT) return;
    this.age += dt;
    const done = this.age >= FLIGHT;
    const fade = THREE.MathUtils.clamp((FLIGHT - this.age) / 1.5, 0, 1);
    const look = new THREE.Vector3();
    for (const b of this.birds) {
      if (done) {
        b.group.visible = false;
        continue;
      }
      // Climb hard at first, then level off and wheel round.
      b.vel.y += (0.6 - b.vel.y) * dt * 0.5;
      b.vel.applyAxisAngle(UP, b.turn * dt);
      b.group.position.addScaledVector(b.vel, dt);
      b.group.lookAt(look.copy(b.group.position).add(b.vel));
      const flap = Math.sin(elapsed * 17 + b.phase) * 0.75;
      b.wings[0].rotation.z = flap;
      b.wings[1].rotation.z = -flap;
      // Out of sight by shrinking into the distance rather than popping.
      b.group.scale.setScalar(0.2 + 0.8 * fade);
    }
  }
}
