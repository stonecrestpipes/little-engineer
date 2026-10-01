import type { DrivingSpec } from '../../engine/train';
import type { AudioSpec } from '../../engine/audio';
import type { FaceSpec } from '../faces';

/**
 * One engine, as data. Nothing in src/engine/ knows this file exists.
 *
 * Adding an engine means copying one of the files beside this one and changing
 * numbers — the colours, how it drives, what its whistle is tuned to, and what
 * its face looks like. No new systems, no new artwork, nothing to download.
 */
export interface EngineSpec {
  id: string;
  /**
   * What shape of engine to build, which is the thing a four-year-old reads
   * from right across the layout — long before the colour and long, long
   * before any name:
   *
   * - `tank`      side tanks either side of the boiler. The default.
   * - `saddle`    one tank draped over the boiler like a saddle. Squat.
   * - `tender`    no tanks at all, and a separate tender behind it.
   * - `streamliner`  the Orion Express, and nothing else.
   */
  kind?: 'tank' | 'saddle' | 'tender' | 'streamliner';
  /**
   * The number painted on its side.
   *
   * Numerals are not reading. He cannot read a word and will not try, but he
   * knows the *shape* of a number on the side of an engine the way he knows
   * the shape of a face — which is exactly why real engines carry them.
   */
  number?: number;
  /** Only ever used in code. Nothing in the game is labelled. */
  name: string;
  /** blank until he names it; the only text anywhere in the game */
  nameplate: string;
  /** A face drawn in code. Every engine but the first has one. */
  face?: FaceSpec;
  /** Or a face loaded from a file, which only the first engine still uses. */
  faceTexture?: string;
  /**
   * An original drawn face offered in place of `faceTexture`, chosen in the
   * grown-ups' panel. Once it is the one in use, the file can be deleted.
   */
  originalFace?: FaceSpec;
  colour: {
    body: number;
    bodyLight: number;
    bodyDark: number;
    trim: number;
    metal: number;
    metalLight: number;
    brass: number;
    wheelRim: number;
    glass: number;
  };
  dims: {
    wheelRadius: number;
    wheelGauge: number;
    faceRadius: number;
    /** End to end over the buffers. Defaults to a tank engine's six metres. */
    length?: number;
  };
  /** Small differences in silhouette, so they are not all the same engine. */
  shape?: {
    /** False for anything that does not burn coal. No steam from the roof. */
    smoke?: boolean;
    /** how tall the chimney stands */
    funnelHeight?: number;
    /** 0 is a plain stovepipe, 1 is a wide bell mouth */
    funnelFlare?: number;
    /** the brass dome on top of the boiler */
    dome?: boolean;
  };
  driving: DrivingSpec;
  audio: AudioSpec;
}
