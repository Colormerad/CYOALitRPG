#!/usr/bin/env node
/**
 * Slice frames.png into 9-slice assets.
 *
 * Layout provided:
 * - Top: 4 frames of 48x48 (grid: 1 row x 4 cols)
 * - Middle: 6 rows x 7 cols of 32x32 frames
 * - Bottom: 8 rows x 13 cols of 24x24 frames
 *
 * Output structure (relative to project root):
 *   src/assets/frames/
 *     48/frame-<index>/{tl,t,tr,l,c,r,bl,b,br}.png
 *     32/frame-<index>/{...}.png
 *     24/frame-<index>/{...}.png
 *
 * Assumptions:
 * - No gutters between tiles. If there are gutters, adjust GUTTER.
 * - The image is tightly packed by the sizes above, in the stated order.
 *
 * Usage:
 *   node tools/slice-frames.mjs
 *
 * Requires devDependency: sharp
 */

import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const SRC_IMAGE = path.join(ROOT, 'src/assets/icons/frames.png');
const OUT_ROOT = path.join(ROOT, 'src/assets/frames');

// If your atlas has padding/gutters, set these:
const GUTTER = 0; // pixels between tiles

// Define the three bands as sequences
// You can specify absolute offsets for a band with offsetX/offsetY.
// If omitted, bands will be stacked top-to-bottom using measured heights.
const BANDS = [
  { size: 48, rows: 1, cols: 4 /*, offsetX: 0, offsetY: 0 */ },
  { size: 32, rows: 6, cols: 7, offsetX: 15, offsetY: 78 },
  // 24px band starts immediately after the 32px band: 78 + 6*32 = 270
  { size: 24, rows: 8, cols: 13, offsetY: 270 },
];

// 9-slice cut thickness relative to tile size. You can tweak per size if needed.
const SLICE_THICKNESS = {
  48: { t: 6, r: 6, b: 6, l: 6 },
  32: { t: 5, r: 5, b: 5, l: 5 },
  24: { t: 4, r: 4, b: 4, l: 4 },
};

// Optional per-frame extraction adjustments (applies to full tile only by default)
// Structure: { [bandSize]: { [frameIndex]: { dx?: number, dy?: number } } }
const ADJUST = {
  // band-wide defaults
  _bandDefault: {
    32: { dx: 1, dy: 2 },
  },
  // per-index overrides
  32: {
    0: { dx: 1, dy: 2 }, // explicit but same as default for clarity
  },
};

// Env controls
const SLICE_MODE = process.env.SLICE_MODE || 'full+parts'; // 'full-only' or 'full+parts'
const BAND_FILTER = (process.env.SLICE_BANDS || '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean)
  .map(s => Number(s));
const ONLY_RC = (process.env.SLICE_ONLY_RC || '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean)
  .map(s => Number(s)); // [row, col] zero-based
const ONLY_R = ONLY_RC[0];
const ONLY_C = ONLY_RC[1];
const SLICE_EQUAL_NINE = /^(1|true)$/i.test(String(process.env.SLICE_EQUAL_NINE || ''));

async function ensureDir(dir) {
  await fs.promises.mkdir(dir, { recursive: true });
}

async function main() {
  if (!fs.existsSync(SRC_IMAGE)) {
    console.error(`frames.png not found at ${SRC_IMAGE}`);
    process.exit(1);
  }

  const img = sharp(SRC_IMAGE);
  const meta = await img.metadata();

  console.log(`Loaded frames.png: ${meta.width}x${meta.height}`);

  let yCursor = 0; // y start of current band (used only when no explicit offsetY)

  for (const band of BANDS) {
    const { size, rows, cols, offsetX, offsetY } = band;
    if (BAND_FILTER.length && !BAND_FILTER.includes(size)) {
      continue; // skip bands not requested
    }
    const outBandDir = path.join(OUT_ROOT, String(size));
    await ensureDir(outBandDir);

    // Verify band height fits
    const bandHeight = rows * size + (rows - 1) * GUTTER;

    let index = 0; // frame index within this band
    for (let r = 0; r < rows; r++) {
      let xCursor = 0; // x start for this row (used only when no explicit offsetX)
      for (let c = 0; c < cols; c++) {
        if (ONLY_RC.length === 2 && (r !== ONLY_R || c !== ONLY_C)) {
          xCursor += size + GUTTER;
          continue;
        }
        const baseX = (typeof offsetX === 'number') ? offsetX : 0;
        const baseY = (typeof offsetY === 'number') ? offsetY : yCursor;
        const x = baseX + (typeof offsetX === 'number' ? c * (size + GUTTER) : xCursor);
        const y = baseY + r * (size + GUTTER);

        console.log(`Band ${size}px -> index ${index} (r${r},c${c}) @ (${x},${y}) w=${size} h=${size}`);
        await sliceTile({ img, size, x, y, outDir: path.join(outBandDir, `frame-${index}`), meta, band, r, c, index });
        index++;

        xCursor += size + GUTTER;
      }
    }

    if (typeof offsetY !== 'number') {
      yCursor += bandHeight + GUTTER; // advance to next band start only when not absolute-positioned
    }
    console.log(`Done band ${size}px -> ${index} frames`);
  }

  console.log('All frames sliced successfully. Output in src/assets/frames');
}

function within(meta, rect) {
  return (
    rect.left >= 0 && rect.top >= 0 &&
    rect.width > 0 && rect.height > 0 &&
    rect.left + rect.width <= meta.width &&
    rect.top + rect.height <= meta.height
  );
}

async function sliceTile({ img, size, x, y, outDir, meta, band, r, c, index }) {
  await ensureDir(outDir);

  // Regions for 9-slice
  const w = size;
  const h = size;

  let regions;
  if (SLICE_EQUAL_NINE) {
    // Compute integer thirds that sum to size (symmetrical corners): [a, b, a]
    const a = Math.floor(size / 3);
    const b = size - 2 * a; // ensures a + b + a === size
    const c = a;
    const x1 = x + a;
    const x2 = x + a + b;
    const y1 = y + a;
    const y2 = y + a + b;
    regions = {
      tl: { left: x,  top: y,  width: a, height: a },
      t:  { left: x1, top: y,  width: b, height: a },
      tr: { left: x2, top: y,  width: c, height: a },

      l:  { left: x,  top: y1, width: a, height: b },
      c:  { left: x1, top: y1, width: b, height: b },
      r:  { left: x2, top: y1, width: c, height: b },

      bl: { left: x,  top: y2, width: a, height: c },
      b:  { left: x1, top: y2, width: b, height: c },
      br: { left: x2, top: y2, width: c, height: c },
    };
  }

  if (!regions) {
    const slices = SLICE_THICKNESS[size];
    if (!slices) throw new Error(`No slice thickness configured for size ${size}`);
    // Avoid shadowing row index 'r' param by renaming slice sides
    const { t: sTop, r: sRight, b: sBottom, l: sLeft } = slices;

    regions = {
      tl: { left: x, top: y, width: sLeft, height: sTop },
      t:  { left: x + sLeft, top: y, width: w - sLeft - sRight, height: sTop },
      tr: { left: x + w - sRight, top: y, width: sRight, height: sTop },

      l:  { left: x, top: y + sTop, width: sLeft, height: h - sTop - sBottom },
      c:  { left: x + sLeft, top: y + sTop, width: w - sLeft - sRight, height: h - sTop - sBottom },
      r:  { left: x + w - sRight, top: y + sTop, width: sRight, height: h - sTop - sBottom },

      bl: { left: x, top: y + h - sBottom, width: sLeft, height: sBottom },
      b:  { left: x + sLeft, top: y + h - sBottom, width: w - sLeft - sRight, height: sBottom },
      br: { left: x + w - sRight, top: y + h - sBottom, width: sRight, height: sBottom },
    };
  }

  // Validate rectangles
  const bandDefault = (ADJUST._bandDefault && ADJUST._bandDefault[band.size]) || { dx: 0, dy: 0 };
  const perIndex = (ADJUST[band.size] && ADJUST[band.size][index]) || {};
  const adj = { dx: bandDefault.dx || 0, dy: bandDefault.dy || 0, ...perIndex };
  const fullRect = { left: x + (adj.dx || 0), top: y + (adj.dy || 0), width: w, height: h };
  const allRects = { full: fullRect, ...regions };
  for (const [key, rect] of Object.entries(allRects)) {
    if (!within(meta, rect)) {
      throw new Error(
        `Out of bounds @ band ${band.size}px index ${index} (r${r},c${c}) part ${key}: ${JSON.stringify(rect)} within ${meta.width}x${meta.height}`
      );
    }
  }

  // Always write full tile
  console.log(`  extracting full: ${JSON.stringify(fullRect)}`);
  await img.clone().extract(fullRect).toFile(path.join(outDir, `full.png`));

  if (SLICE_MODE === 'full-only') {
    return; // skip the 9-slice parts
  }

  await Promise.all(
    Object.entries(regions).map(async ([key, rect]) => {
      const outFile = path.join(outDir, `${key}.png`);
      await img.clone().extract(rect).toFile(outFile);
    })
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
