// Assemble per-state frame images (idle_*.png, walk_*.png) into a sprite sheet + JSON manifest.
import fs from 'node:fs';
import path from 'node:path';
import { have, sh, shOut } from './util.mjs';

const STATES = ['idle', 'walk'];

/**
 * Build a sprite sheet from a directory of frames named `<state>_<n>.png`.
 * Row 0 = idle, row 1 = walk. Short rows are padded (repeat last frame) so the
 * grid is rectangular. Writes `outPng` and a `outJson` manifest the renderer reads.
 *
 * @param {string} frameDir directory with idle_0.png … walk_3.png
 * @param {string} outPng   destination sprite sheet png
 * @param {string} outJson  destination manifest json
 */
export function buildSpritesheet(frameDir, outPng, outJson) {
  if (!have('montage') && !have('convert')) {
    throw new Error('ImageMagick (montage/convert) is required to build sprite sheets.');
  }
  if (!fs.existsSync(frameDir)) {
    throw new Error(`Frames directory not found: ${frameDir}`);
  }

  const perState = {};
  for (const s of STATES) {
    const re = new RegExp(`^${s}_\\d+\\.png$`, 'i');
    const files = fs
      .readdirSync(frameDir)
      .filter((f) => re.test(f))
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
    if (files.length) perState[s] = files.map((f) => path.join(frameDir, f));
  }

  const stateNames = STATES.filter((s) => perState[s]);
  if (!stateNames.length) {
    throw new Error(
      `No frames found in ${frameDir}. Name files like idle_0.png, idle_1.png, walk_0.png …`
    );
  }

  const cols = Math.max(...stateNames.map((s) => perState[s].length));
  const rows = stateNames.length;

  // Cell size = largest frame, so every frame fits without cropping.
  let cw = 0;
  let ch = 0;
  for (const s of stateNames) {
    for (const f of perState[s]) {
      const d = shOut(`identify -format "%w %h" ${JSON.stringify(f)}`);
      const [w, h] = d.split(/\s+/).map(Number);
      if (w > cw) cw = w;
      if (h > ch) ch = h;
    }
  }

  // Order images row-major, padding short rows by repeating the last frame.
  const ordered = [];
  const indices = {};
  stateNames.forEach((s, rowIdx) => {
    indices[s] = { row: rowIdx, frames: perState[s].map((_, i) => i) };
    for (let c = 0; c < cols; c++) {
      const f = perState[s][Math.min(c, perState[s].length - 1)];
      ordered.push(f);
    }
  });

  const list = ordered.map((f) => JSON.stringify(f)).join(' ');
  const r = sh(
    `montage ${list} -tile ${cols}x${rows} -geometry ${cw}x${ch}+0+0 -background none ${JSON.stringify(outPng)}`,
    { silent: false }
  );
  if (r.status !== 0 || !fs.existsSync(outPng)) {
    throw new Error('montage failed to build the sprite sheet.');
  }

  const manifest = {
    cols,
    rows,
    frameW: cw,
    frameH: ch,
    fps: 8,
    states: indices,
  };
  fs.writeFileSync(outJson, JSON.stringify(manifest, null, 2));
  return manifest;
}
