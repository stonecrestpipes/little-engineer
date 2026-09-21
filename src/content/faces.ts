import * as THREE from 'three';

/**
 * Engine faces, drawn in code.
 *
 * Every engine after the first one has its face drawn here rather than loaded,
 * which means a new engine is a handful of numbers and nothing to licence,
 * nothing to download and nothing to keep out of a public repository. It is
 * also the only way to get a face that matches the engine it is on: the same
 * function draws a sleepy one and a cheeky one.
 *
 * Drawn into a square and mapped onto the face disc, which crops it to a
 * circle — so the corners are never seen and do not need to be right.
 */

export interface FaceSpec {
  /** the flat colour of the face itself */
  skin: number;
  /** eyes, brows and mouth are all this colour */
  ink?: number;
  /**
   * Where the brows sit and which way they slope. Positive tilts the inner
   * ends up, which reads as kind; negative reads as determined.
   */
  browTilt?: number;
  browHeight?: number;
  /** how far apart the eyes are, as a fraction of the face */
  eyeSpacing?: number;
  eyeSize?: number;
  /** where the pupils are looking, -1 to 1 */
  gaze?: [number, number];
  /** 1 is a broad grin, 0 is a straight line, negative is a pout */
  smile?: number;
  /** an open mouth rather than a drawn line */
  openMouth?: boolean;
  cheeks?: number;
  freckles?: boolean;
}

const SIZE = 512;

const hex = (c: number): string => '#' + c.toString(16).padStart(6, '0');

/** Mixes toward white, for highlights and blushes. */
function lighten(colour: number, amount: number): string {
  const c = new THREE.Color(colour).lerp(new THREE.Color(0xffffff), amount);
  return '#' + c.getHexString();
}

export function drawFace(spec: FaceSpec): THREE.Texture {
  const {
    skin,
    ink = 0x2f2a26,
    browTilt = 0.18,
    browHeight = 0.3,
    eyeSpacing = 0.23,
    eyeSize = 0.115,
    gaze = [0, 0.05],
    smile = 0.7,
    openMouth = false,
    cheeks = 0.55,
    freckles = false,
  } = spec;

  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = SIZE;
  const g = canvas.getContext('2d')!;
  const u = (v: number) => v * SIZE;

  // --- the face itself ----------------------------------------------------
  g.fillStyle = hex(skin);
  g.fillRect(0, 0, SIZE, SIZE);

  // A little shading down one side and under the chin, so a flat disc still
  // reads as a rounded thing.
  const shade = g.createRadialGradient(u(0.38), u(0.34), u(0.1), u(0.5), u(0.5), u(0.62));
  shade.addColorStop(0, 'rgba(255,255,255,0.42)');
  shade.addColorStop(0.55, 'rgba(255,255,255,0)');
  shade.addColorStop(1, 'rgba(60,45,35,0.22)');
  g.fillStyle = shade;
  g.fillRect(0, 0, SIZE, SIZE);

  // --- cheeks -------------------------------------------------------------
  if (cheeks > 0) {
    for (const side of [-1, 1]) {
      const blush = g.createRadialGradient(
        u(0.5 + side * 0.28),
        u(0.6),
        0,
        u(0.5 + side * 0.28),
        u(0.6),
        u(0.15),
      );
      blush.addColorStop(0, `rgba(226,122,112,${0.5 * cheeks})`);
      blush.addColorStop(1, 'rgba(226,122,112,0)');
      g.fillStyle = blush;
      g.fillRect(0, 0, SIZE, SIZE);
    }
  }

  // --- eyes ---------------------------------------------------------------
  const eyeY = 0.43;
  for (const side of [-1, 1]) {
    const cx = u(0.5 + side * eyeSpacing);
    const cy = u(eyeY);

    g.fillStyle = '#fbf8f2';
    g.beginPath();
    g.ellipse(cx, cy, u(eyeSize), u(eyeSize * 1.12), 0, 0, Math.PI * 2);
    g.fill();
    g.strokeStyle = hex(ink);
    g.lineWidth = u(0.012);
    g.stroke();

    const pupilR = u(eyeSize * 0.52);
    const px = cx + u(eyeSize * 0.34) * gaze[0];
    const py = cy + u(eyeSize * 0.4) * gaze[1];
    g.fillStyle = hex(ink);
    g.beginPath();
    g.arc(px, py, pupilR, 0, Math.PI * 2);
    g.fill();

    // The highlight is what makes it look alive rather than drawn.
    g.fillStyle = 'rgba(255,255,255,0.92)';
    g.beginPath();
    g.arc(px - pupilR * 0.35, py - pupilR * 0.4, pupilR * 0.34, 0, Math.PI * 2);
    g.fill();
  }

  // --- brows --------------------------------------------------------------
  g.strokeStyle = hex(ink);
  g.lineWidth = u(0.034);
  g.lineCap = 'round';
  for (const side of [-1, 1]) {
    const inner = u(0.5 + side * (eyeSpacing - eyeSize * 0.9));
    const outer = u(0.5 + side * (eyeSpacing + eyeSize * 1.05));
    const innerY = u(browHeight - browTilt * 0.1);
    const outerY = u(browHeight + browTilt * 0.1);
    g.beginPath();
    g.moveTo(inner, innerY);
    g.quadraticCurveTo((inner + outer) / 2, Math.min(innerY, outerY) - u(0.035), outer, outerY);
    g.stroke();
  }

  // --- mouth --------------------------------------------------------------
  const mouthY = u(0.68);
  const half = u(0.17);
  if (openMouth) {
    g.fillStyle = hex(ink);
    g.beginPath();
    g.moveTo(u(0.5) - half, mouthY);
    g.quadraticCurveTo(u(0.5), mouthY + u(0.19 * Math.max(0.35, smile)), u(0.5) + half, mouthY);
    g.quadraticCurveTo(u(0.5), mouthY + u(0.05), u(0.5) - half, mouthY);
    g.fill();
    // a tongue, because a four-year-old will find it
    g.fillStyle = '#d8756e';
    g.beginPath();
    g.ellipse(u(0.5), mouthY + u(0.1 * Math.max(0.35, smile)), u(0.07), u(0.045), 0, 0, Math.PI * 2);
    g.fill();
  } else {
    g.lineWidth = u(0.032);
    g.beginPath();
    g.moveTo(u(0.5) - half, mouthY - u(0.02 * smile));
    g.quadraticCurveTo(u(0.5), mouthY + u(0.2 * smile), u(0.5) + half, mouthY - u(0.02 * smile));
    g.stroke();
  }

  if (freckles) {
    g.fillStyle = lighten(ink, 0.45);
    for (const side of [-1, 1]) {
      for (let i = 0; i < 3; i++) {
        g.beginPath();
        g.arc(u(0.5 + side * (0.24 + i * 0.035)), u(0.57 + (i % 2) * 0.035), u(0.011), 0, Math.PI * 2);
        g.fill();
      }
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}
