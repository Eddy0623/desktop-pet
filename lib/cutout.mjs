// Background removal. rembg (best) → ImageMagick flood-fill (fallback) → copy as-is.
import fs from 'node:fs';
import { have, sh, shOut } from './util.mjs';

/**
 * Remove the background from `input`, writing a transparent PNG to `output`.
 * Returns the method used: 'rembg' | 'imagemagick' | 'none'.
 *
 * @param {string} input  source image path
 * @param {string} output destination PNG path
 * @param {{maxHeight?: number}} opts
 */
export function cutout(input, output, { maxHeight = 256 } = {}) {
  if (have('rembg')) {
    const r = sh(`rembg i ${JSON.stringify(input)} ${JSON.stringify(output)}`, { silent: false });
    if (r.status === 0 && fs.existsSync(output)) {
      normalizeSize(output, maxHeight);
      return 'rembg';
    }
    console.warn('cutout: rembg failed, falling back.');
  }

  if (have('convert')) {
    if (tryFloodFill(input, output)) {
      normalizeSize(output, maxHeight);
      return 'imagemagick';
    }
    console.warn('cutout: ImageMagick flood-fill failed, falling back.');
  }

  // Last resort: keep the original (still resized for consistency).
  fs.copyFileSync(input, output);
  normalizeSize(output, maxHeight);
  return 'none';
}

/** Flood-fill the background (corner color) to transparent. Handles IM6 ('matte') and IM7 ('alpha'). */
function tryFloodFill(input, output) {
  for (const op of ['alpha', 'matte']) {
    const cmd =
      `convert ${JSON.stringify(input)} -fuzz 25% -fill none ` +
      `-draw "${op} 0,0 floodfill" -fuzz 1% -trim +repage ${JSON.stringify(output)}`;
    const r = sh(cmd, { silent: true });
    if (r.status === 0 && fs.existsSync(output)) return true;
  }
  return false;
}

/** Downscale so height <= maxHeight, preserving aspect ratio (only if larger). */
function normalizeSize(file, maxHeight) {
  if (!have('convert')) return;
  const dim = shOut(`identify -format "%w %h" ${JSON.stringify(file)}`);
  const [w, h] = dim.split(/\s+/).map(Number);
  if (!w || !h || h <= maxHeight) return;
  const ratio = maxHeight / h;
  sh(`convert ${JSON.stringify(file)} -resize ${Math.round(w * ratio)}x${maxHeight}! ${JSON.stringify(file)}`, {
    silent: true,
  });
}
