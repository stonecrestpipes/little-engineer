import * as THREE from 'three';
import { C, flat, mat, shadowed } from '../scenery';
import { frameAt, gapTo, localGround, type Place, type PlaceContext } from './place';
import { moving } from '../../engine/merge';

/**
 * The level crossing.
 *
 * Its whole job is to happen without him: the gates come down because a train
 * is coming, a car pulls up and waits, and when he has gone through, everything
 * goes back to how it was. He is never asked to do anything about it, and
 * nothing goes wrong if he stops on it and sits there whistling.
 */
export function buildCrossing(ctx: PlaceContext): Place {
  const group = frameAt(ctx.track, ctx.at);
  const ground = localGround(group, ctx.groundAt);

  // --------------------------------------------------------------- the road
  // Built as a strip that follows the ground, so it lies on the country
  // instead of slicing through it.
  const ROAD = 52;
  const HALF = 3.6;
  /**
   * Level with the rails right at the crossing, following the ground away from
   * it, so the road neither floats nor dives into the ballast. The car drives
   * on this too — a car at a fixed height would be buried by the first rise.
   */
  const roadY = (x: number): number => {
    const blend = Math.min(1, Math.max(0, (Math.abs(x) - 5) / 9));
    return ground(x, 0) * blend;
  };
  const pos: number[] = [];
  const idx: number[] = [];
  const steps = 40;
  for (let i = 0; i <= steps; i++) {
    const x = -ROAD / 2 + (ROAD * i) / steps;
    const y = roadY(x) + 0.04;
    pos.push(x, y, -HALF, x, y, HALF);
  }
  for (let i = 0; i < steps; i++) {
    const a = i * 2;
    idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
  }
  const roadGeo = new THREE.BufferGeometry();
  roadGeo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  roadGeo.setIndex(idx);
  roadGeo.computeVertexNormals();
  const road = new THREE.Mesh(roadGeo, mat(0x6f6a64, 0.95));
  road.receiveShadow = true;
  group.add(road);

  // planks between the rails, so the road reads as crossing them
  for (const z of [-1.5, 1.5]) {
    const plank = new THREE.Mesh(new THREE.BoxGeometry(7.4, 0.2, 1.1), mat(C.sleeper));
    plank.position.set(0, 0.22, z);
    group.add(plank);
  }

  // --------------------------------------------------------------- gates
  const stripe = mat(C.trim);
  const white = mat(C.white);
  const gates: THREE.Group[] = [];
  const lamps: THREE.Mesh[] = [];
  for (const [x, z] of [[6.5, -HALF - 0.6], [-6.5, HALF + 0.6]] as [number, number][]) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.26, 2.4, 8), mat(C.slate));
    post.position.set(x, 1.2, z);
    group.add(post);

    // The boom pivots about the top of its post, from straight up to across.
    const pivot = new THREE.Group();
    pivot.position.set(x, 2.3, z);
    const boom = new THREE.Group();
    for (let i = 0; i < 6; i++) {
      const seg = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.34, 1.3), i % 2 ? white : stripe);
      seg.position.z = (z > 0 ? -1 : 1) * (0.9 + i * 1.3);
      boom.add(seg);
    }
    pivot.add(boom);
    group.add(pivot);
    gates.push(pivot);

    const lamp = new THREE.Mesh(
      new THREE.SphereGeometry(0.24, 10, 8),
      new THREE.MeshStandardMaterial({ color: 0xd94a3a, emissive: 0xd94a3a, emissiveIntensity: 0 }),
    );
    lamp.position.set(x, 2.7, z);
    group.add(lamp);
    lamps.push(lamp);
  }

  // ----------------------------------------------------------- the car
  const car = new THREE.Group();
  car.position.set(20, 0, -1.7);
  car.rotation.y = -Math.PI / 2;
  const bodyLower = new THREE.Mesh(new THREE.BoxGeometry(4.2, 1.0, 1.9), mat(0x3f7fb5));
  bodyLower.position.y = 0.95;
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.9, 1.7), mat(0x2f6f96));
  cabin.position.set(-0.2, 1.85, 0);
  const glass = new THREE.Mesh(
    new THREE.BoxGeometry(2.0, 0.55, 1.75),
    new THREE.MeshStandardMaterial({ color: 0xbedfef, roughness: 0.2, metalness: 0.1 }),
  );
  glass.position.set(-0.2, 1.95, 0);
  car.add(bodyLower, cabin, glass);
  for (const [wx, wz] of [[1.3, 0.95], [1.3, -0.95], [-1.3, 0.95], [-1.3, -0.95]]) {
    const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.3, 12), mat(0x2b2b2b));
    wheel.rotation.x = Math.PI / 2;
    wheel.position.set(wx, 0.45, wz);
    car.add(wheel);
  }
  const driverArm = new THREE.Group();
  driverArm.position.set(-0.2, 2.05, 0.9);
  const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.11, 0.5, 3, 6), mat(0xe8b98f));
  arm.position.y = 0.3;
  driverArm.add(arm);
  car.add(driverArm);
  group.add(car);

  shadowed(group);
  flat(road);

  // ------------------------------------------------------------ behaviour
  /** 0 is up and out of the way, 1 is down across the road. */
  let down = 0;
  let ringing = false;
  /** The car drives one way down the road and comes round again. */
  const STOP_LINE = 8;
  let carX = 20;

  let clock = 0;
  let tooted = -99;

  moving(car, driverArm, ...gates);

  return {
    group,
    whistle(train) {
      // Whoever is driving the car toots back. Only when he is close enough
      // to be heard, and not on every single whistle.
      if (!(Math.abs(gapTo(ctx.track, train, ctx.at)) <= 60) || clock - tooted < 2.5) return;
      tooted = clock;
      ctx.audio.toot();
    },
    update(dt, elapsed, train) {
      clock = elapsed;
      // Positive while the crossing is still ahead of him, negative once he
      // has gone through it.
      const gap = gapTo(ctx.track, train, ctx.at);
      const coming = gap > 0 && gap < 85;
      const onIt = Math.abs(gap) <= 14;
      const justGone = gap < 0 && gap > -22;
      const want = coming || onIt || justGone ? 1 : 0;

      if (want === 1 && !ringing) {
        ringing = true;
        ctx.audio.bell(9);
      } else if (want === 0) {
        ringing = false;
      }

      down += THREE.MathUtils.clamp(want - down, -dt * 0.55, dt * 0.55);
      const angle = (1 - down) * (Math.PI / 2);
      gates.forEach((g, i) => {
        g.rotation.x = i === 0 ? -angle : angle;
        const flash = down > 0.05 ? (Math.sin(elapsed * 7 + i * Math.PI) > 0 ? 1 : 0.05) : 0;
        (lamps[i].material as THREE.MeshStandardMaterial).emissiveIntensity = flash * 1.6;
      });

      // The car drives along, pulls up short of the gates while they are down,
      // carries on once they lift, and comes round again a while later.
      carX -= 7 * dt;
      if (down > 0.15) carX = Math.max(carX, STOP_LINE);
      if (carX < -34) carX = 40;
      car.position.set(carX, roadY(carX), -1.7);

      // The driver waves while the engine is going past. Nothing asks for it.
      const waving = onIt || (gap < 0 && gap > -30);
      driverArm.rotation.z = waving ? Math.sin(elapsed * 10) * 0.7 - 0.5 : 0;
    },
  };
}
