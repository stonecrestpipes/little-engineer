import * as THREE from 'three';
import { C, COATS, mat, person, pitchedRoof, shadowed } from '../scenery';
import { moving } from '../../engine/merge';

/**
 * The part every station has: a platform, a canopy, a lamp, a stationmaster
 * with a flag, and people waiting.
 *
 * What makes each station itself — the sheds, the barn, the cranes — is added
 * by the place on top of this. The shared part is here because the arrival is
 * the most-repeated moment in the game and it should feel identical wherever
 * he stops, so that what differs is the place rather than the ritual.
 *
 * Built in the place's local frame: +z along the direction of travel, +x the
 * right-hand side of the train, which is the side the platform is on.
 */

export interface StationLook {
  wall: number;
  roof: number;
  /** the name board, which carries a colour rather than a word */
  board: number;
  length?: number;
  /** people waiting on the platform */
  waiting?: number;
  /**
   * Which side of the train the platform stands on: +1 is the right-hand side
   * and the default. The harbour wants -1 so the platform faces the water.
   */
  side?: 1 | -1;
}

export interface Station {
  group: THREE.Group;
  arrive(): void;
  depart(): void;
  update(elapsed: number): void;
  /** Everyone on the platform waves. Used when he whistles from the platform. */
  wave(): void;
}

/**
 * How far into the evening it is, 0 … 1, for every station at once. Set by
 * the sky each frame; stations light their lamps a little as it gets dark,
 * whether or not he has stopped there.
 */
let evening = 0;
export function setEvening(dusk: number): void {
  evening = dusk;
}

export function buildStation(look: StationLook): Station {
  const { wall, roof, board, length = 34, waiting = 4, side = 1 } = look;
  const group = new THREE.Group();
  /** Everything is built on the right-hand side and mirrored if need be. */
  const X = (x: number) => x * side;

  const platform = new THREE.Mesh(new THREE.BoxGeometry(5.0, 0.95, length), mat(C.stone));
  platform.position.set(X(4.6), 0.47, 0);
  group.add(platform);

  const edge = new THREE.Mesh(new THREE.BoxGeometry(0.5, 1.0, length), mat(C.cream));
  edge.position.set(X(2.35), 0.5, 0);
  group.add(edge);

  const building = new THREE.Mesh(new THREE.BoxGeometry(4.2, 4.0, 12), mat(wall));
  building.position.set(X(6.8), 2.95, 0);
  group.add(building);

  const gable = pitchedRoof(5.4, 13.2, 1.9, roof);
  gable.position.set(X(6.8), 4.95, 0);
  group.add(gable);

  const canopy = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.28, 13.5), mat(roof));
  canopy.position.set(X(3.3), 4.9, 0);
  group.add(canopy);
  for (const z of [-5.4, 0, 5.4]) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 4.0, 8), mat(C.metal));
    post.position.set(X(2.9), 2.85, z);
    group.add(post);
  }

  // A plate in the station's colour, not a word. He learns the shape of it.
  const plate = new THREE.Mesh(new THREE.BoxGeometry(0.2, 1.0, 4.2), mat(board));
  plate.position.set(X(4.35), 3.3, -1);
  group.add(plate);

  // The lamp comes up on arrival: the whole arrival in one object.
  const lampGlass = new THREE.Mesh(
    new THREE.SphereGeometry(0.38, 12, 10),
    new THREE.MeshStandardMaterial({ color: 0xfff0c4, emissive: 0xffc94a, emissiveIntensity: 0 }),
  );
  lampGlass.position.set(X(3.6), 4.1, length / 2 - 6);
  const lampPost = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 3.4, 8), mat(C.metal));
  lampPost.position.set(X(3.6), 2.6, length / 2 - 6);
  group.add(lampGlass, lampPost);

  // The stationmaster, and his flag.
  const master = new THREE.Group();
  master.position.set(X(4.0), 0.95, 4.2);
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.34, 0.8, 4, 10), mat(0x2c4a6e));
  body.position.y = 0.78;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.33, 12, 10), mat(0xe8b98f));
  head.position.y = 1.58;
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.16, 12), mat(0x2b3a45));
  cap.position.y = 1.84;
  const flagArm = new THREE.Group();
  flagArm.position.set(X(-0.3), 1.3, 0);
  const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.1, 6), mat(C.trunk));
  stick.position.y = 0.55;
  const flag = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.5, 0.7), mat(0x4caf50));
  flag.position.set(0, 1.0, 0.36);
  flagArm.add(stick, flag);
  master.add(body, head, cap, flagArm);
  group.add(master);

  // People waiting. One of them is small, because one of them always is.
  const folk: THREE.Group[] = [];
  for (let i = 0; i < waiting; i++) {
    const g = person(COATS[i % COATS.length], i === 2 ? 0.66 : 1);
    g.position.set(X(5.4 + (i % 2) * 0.9), 0.95, -length / 4 + i * 3.1);
    group.add(g);
    folk.push(g);
  }

  shadowed(group);
  moving(master, flagArm, ...folk);

  // One clock, and it is the one `update` is handed. Reading the wall clock
  // in here as well would work in the game and quietly disagree with it
  // anywhere the world is stepped by hand, which is how it gets tested.
  let clock = 0;
  let arrivedAt = -99;
  let waitingHere = false;
  let wavingUntil = -99;

  return {
    group,
    arrive() {
      waitingHere = true;
      arrivedAt = clock;
    },
    depart() {
      waitingHere = false;
    },
    wave() {
      wavingUntil = clock + 2.2;
    },
    update(elapsed) {
      clock = elapsed;
      const since = elapsed - arrivedAt;
      const active = waitingHere && since >= 0;

      const glow = Math.max(THREE.MathUtils.clamp(active ? since * 2.2 : 0, 0, 1), evening * 0.7);
      (lampGlass.material as THREE.MeshStandardMaterial).emissiveIntensity = glow * 1.3;

      const raise = THREE.MathUtils.clamp(active ? since * 3 : 0, 0, 1);
      flagArm.rotation.z = -raise * 1.15 + (active ? Math.sin(elapsed * 6) * 0.09 * raise : 0);

      const waving = elapsed < wavingUntil;
      folk.forEach((f, i) => {
        const hop = active || waving ? Math.max(0, Math.sin(elapsed * 4 + i * 1.3)) * 0.16 : 0;
        f.position.y = 0.95 + hop * (waving ? 1.9 : 1);
        f.rotation.z = waving ? Math.sin(elapsed * 9 + i) * 0.16 : 0;
      });

      master.rotation.y = active ? Math.sin(elapsed * 1.6) * 0.18 : 0;
    },
  };
}
