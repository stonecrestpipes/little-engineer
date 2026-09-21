import * as THREE from 'three';
import type { Quality } from '../settings';

/**
 * How much the tablet is asked to draw, and stepping it down if it cannot.
 *
 * The layout has only been measured on a desktop. Rather than guess what the
 * tablet can hold, 'auto' starts at the top and watches: if frames are slow
 * for a few seconds of real play it steps down one tier, and never back up in
 * the same session, so the picture does not keep changing under him.
 *
 * Tiers, cheapest last:
 *   0  sharp (up to 1.5× pixels), 2048 shadows
 *   1  1× pixels, 1024 shadows
 *   2  1× pixels, no shadows at all
 */

const TIERS = [
  { pixelRatio: 1.5, shadow: 2048, shadows: true },
  { pixelRatio: 1, shadow: 1024, shadows: true },
  { pixelRatio: 1, shadow: 1024, shadows: false },
] as const;

/** Ignore the first few seconds: shaders are still compiling. */
const SETTLE_S = 6;
/** Measure over this long before deciding anything. */
const WINDOW_S = 4;
/** Averaging slower than this steps down a tier. */
const SLOW_FPS = 46;

export class QualityGovernor {
  private tier = 0;
  private mode: Quality = 'auto';
  private elapsed = 0;
  private frames = 0;
  private windowTime = 0;

  constructor(
    private readonly renderer: THREE.WebGLRenderer,
    private readonly sun: THREE.DirectionalLight,
    private readonly resize: () => void,
  ) {}

  get current(): number {
    return this.tier;
  }

  setMode(mode: Quality): void {
    if (mode === this.mode && this.elapsed > 0) return;
    this.mode = mode;
    // 'auto' starts over from the top; the others are fixed.
    this.apply(mode === 'low' ? 2 : 0);
    this.frames = 0;
    this.windowTime = 0;
  }

  /** Every frame, with the real (unclamped) time since the last one. */
  sample(dt: number): void {
    this.elapsed += dt;
    if (this.mode !== 'auto' || this.tier >= TIERS.length - 1) return;
    if (this.elapsed < SETTLE_S || document.visibilityState !== 'visible') return;
    // A frame this long was a stall (a tab switch, a lock screen), not slowness.
    if (dt > 0.25) return;

    this.frames++;
    this.windowTime += dt;
    if (this.windowTime < WINDOW_S) return;
    const fps = this.frames / this.windowTime;
    this.frames = 0;
    this.windowTime = 0;
    if (fps < SLOW_FPS) this.apply(this.tier + 1);
  }

  private apply(tier: number): void {
    this.tier = tier;
    const t = TIERS[tier];
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, t.pixelRatio));
    this.resize();

    if (this.sun.castShadow !== t.shadows) this.sun.castShadow = t.shadows;
    if (this.sun.shadow.mapSize.x !== t.shadow) {
      this.sun.shadow.mapSize.set(t.shadow, t.shadow);
      // The map is rebuilt at the new size on the next render.
      this.sun.shadow.map?.dispose();
      this.sun.shadow.map = null;
    }
  }
}
