import * as THREE from 'three';
import type { Track } from './track';

/**
 * The train as a line of vehicles on the rails.
 *
 * Each one is put where the track is that many metres behind the engine, and
 * turned to face along it — so going round a curve articulates properly rather
 * than dragging a rigid stick. Knows nothing about engines, coaches or what
 * anything looks like: a vehicle is an object with a length.
 */

export interface Vehicle {
  object: THREE.Object3D;
  /** end to end over the buffers */
  length: number;
}

/** Buffers touching, near enough. */
const COUPLING = 0.36;

export class Consist {
  private readonly at = new THREE.Vector3();
  private readonly ahead = new THREE.Vector3();
  private readonly look = new THREE.Vector3();

  constructor(private readonly track: Track) {}

  /**
   * How far behind the engine each vehicle's middle sits. The first is always
   * zero: the engine is where the train is.
   */
  offsets(vehicles: Vehicle[]): number[] {
    const out: number[] = [];
    let back = 0;
    vehicles.forEach((v, i) => {
      if (i > 0) back += (vehicles[i - 1].length + v.length) / 2 + COUPLING;
      out.push(back);
    });
    return out;
  }

  /** Place the whole train, given where the engine has got to. */
  place(vehicles: Vehicle[], distance: number): void {
    const offsets = this.offsets(vehicles);
    for (let i = 0; i < vehicles.length; i++) {
      const d = this.track.wrap(distance - offsets[i]);
      this.track.positionAt(d, this.at);
      this.track.tangentAt(d, this.ahead);
      vehicles[i].object.position.copy(this.at);
      vehicles[i].object.lookAt(this.look.copy(this.at).add(this.ahead));
    }
  }

  /** How long the whole train is, end to end. */
  length(vehicles: Vehicle[]): number {
    if (vehicles.length === 0) return 0;
    const offsets = this.offsets(vehicles);
    return offsets[offsets.length - 1] + (vehicles[0].length + vehicles[vehicles.length - 1].length) / 2;
  }
}
