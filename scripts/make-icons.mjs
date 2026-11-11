/**
 * Draws the app icons: the engine, in the series' pixel-art style, on navy.
 *
 * Brand guide §05: each game's icon is its hero sprite, centred on navy
 * #0B0F2A, scaled by a whole number, and kept inside the central 80% circle so
 * Android's maskable crop never clips it. The siblings copy their mask out of
 * the game's own sprite data. This game has no sprite data to copy — it is
 * built in three.js and its engines are geometry, not pixels — so the mask
 * lives here, and here only. It is the one piece of pixel art in the project.
 *
 * What it draws: the small tank engine in profile, facing the way he drives,
 * with a puff drifting back off the funnel. Five flat colours and a 1px
 * #05070F outline, which is the guide's whole rule for a sprite. Nothing is
 * loaded from a file, so the icons cannot drift out of the repo's control the
 * way the last pair did.
 *
 * Run: npm run icons
 */
import { writeFileSync } from 'node:fs';
import { encodePNG } from './png.mjs';

const NAVY = 0x0b0f2a;
const OUTLINE = 0x05070f;
const PAL = {
  h: 0x4ad4ff, // hull: the series' hero cyan
  a: 0x2f7fe0, // trim: running plate, cab roof, funnel cap
  c: 0x0b2a44, // the dark of a cab window and a smokebox front
  d: 0x29758c, // h darkened 45%, as the sibling renderers do it: wheels
  e: 0x8ff7ff, // the glow aqua, and nothing here but steam
};

const ENGINE = [
  '.......eee...aaaaa....',
  '......eeeee...hhh.....',
  '..aaaaaaaa.e..hhh.....',
  '..hcccccch....hhh.....',
  '..hcccccch.hhhhhhh....',
  '..hhhhhhhhhhhhhhhhhh..',
  '..hhhhhhhhhhhhcccccc..',
  '..hhhhhhhhhhhhcccccc..',
  '..hhhhhhhhhhhhcccccc..',
  '..hhhhhhhhhhhhcccccc..',
  '.aaaaaaaaaaaaaaaaaaaa.',
  '..dddd..dddd...ddd....',
  '..dddd..dddd...ddd....',
  '...dd....dd.....d.....',
];

/**
 * The mask with its 1px outline, as [x, y, colour] pixels on a padded grid.
 * The outline is 8-neighbour: the funnel's corners and the gaps between the
 * wheels are single-pixel steps, and a 4-neighbour outline lets the navy leak
 * through them.
 */
function pixels(mask) {
  const w = mask[0].length + 2;
  const h = mask.length + 2;
  const at = (x, y) => {
    const ch = mask[y]?.[x];
    return ch && ch !== '.' ? ch : null;
  };
  const pts = [];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const mx = x - 1;
      const my = y - 1;
      const r = at(mx, my);
      if (r) {
        pts.push([x, y, PAL[r]]);
        continue;
      }
      let touches = false;
      for (let dy = -1; dy <= 1 && !touches; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if ((dx || dy) && at(mx + dx, my + dy)) { touches = true; break; }
        }
      }
      if (touches) pts.push([x, y, OUTLINE]);
    }
  }
  return { w, h, pts };
}

/** Largest whole scale whose every pixel corner stays inside a circle of radius safe x size. */
function render(size, sprite, safe) {
  let k = 1;
  for (let t = 1; t < 64; t++) {
    const ox = (size - sprite.w * t) / 2;
    const oy = (size - sprite.h * t) / 2;
    const far = Math.max(...sprite.pts.flatMap(([x, y]) => [[x, y], [x + 1, y + 1], [x + 1, y], [x, y + 1]]
      .map(([cx, cy]) => Math.hypot(ox + cx * t - size / 2, oy + cy * t - size / 2))));
    if (far > safe * size) break;
    k = t;
  }
  const buf = Buffer.alloc(size * size * 4);
  const put = (x, y, c) => {
    const i = (y * size + x) * 4;
    buf[i] = (c >> 16) & 255; buf[i + 1] = (c >> 8) & 255; buf[i + 2] = c & 255; buf[i + 3] = 255;
  };
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) put(x, y, NAVY);
  const ox = Math.floor((size - sprite.w * k) / 2);
  const oy = Math.floor((size - sprite.h * k) / 2);
  for (const [x, y, c] of sprite.pts) for (let j = 0; j < k; j++) for (let i = 0; i < k; i++) put(ox + x * k + i, oy + y * k + j, c);
  return encodePNG(size, size, buf);
}

const engine = pixels(ENGINE);
// All three keep to the 80% circle, so the maskable 512 is the plain one
// again. That is deliberate: a launcher that rounds the plain icon anyway —
// and the tablet's does — would otherwise shave the wheels off the ends of
// the running plate. The third file stays because the manifest names it, and
// the manifest is the installed app's identity (see *Hosting* in the README).
for (const size of [192, 512]) writeFileSync(`public/icons/icon-${size}.png`, render(size, engine, 0.4));
writeFileSync('public/icons/icon-maskable-512.png', render(512, engine, 0.4));
console.log('icons written');
