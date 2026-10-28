/** A page drawn small, one cell per pixel: 1 where there is ink. */
export type InkMap = { width: number; height: number; ink: Uint8Array };

/** Where the QR goes, in cells from the top left. */
export type QrSpot = {
  x: number;
  y: number;
  size: number;
  /** False: no blank area fits, so it covers the least ink it can. */
  clear: boolean;
};

export type QrSpotOptions = {
  /** QR side (quiet zone included) to aim for, in cells. */
  preferred: number;
  /** Smallest side that still scans from paper, in cells. */
  min: number;
  /** Blank cells kept between the QR and any ink. */
  gap: number;
  /** Cells along each edge left alone: printer margins and sheet frames. */
  margin: number;
};

/** Luminance below this (0–255) counts as ink; paper is near white. */
export const INK_THRESHOLD = 230;

/** RGBA pixels (as a canvas gives them) → ink map. Transparent is paper. */
export function inkMapFromPixels(
  rgba: ArrayLike<number>,
  width: number,
  height: number,
): InkMap {
  const ink = new Uint8Array(width * height);
  for (let i = 0; i < ink.length; i++) {
    const p = i * 4;
    const alpha = rgba[p + 3] / 255;
    // Over white paper: a faint pixel stays light.
    const luminance =
      255 * (1 - alpha) +
      alpha * (0.299 * rgba[p] + 0.587 * rgba[p + 1] + 0.114 * rgba[p + 2]);
    ink[i] = luminance < INK_THRESHOLD ? 1 : 0;
  }
  return { width, height, ink };
}

const isBlocked = (map: InkMap, margin: number, x: number, y: number) =>
  x < margin ||
  y < margin ||
  x >= map.width - margin ||
  y >= map.height - margin ||
  map.ink[y * map.width + x] === 1;

/**
 * The largest blank square on the page (margins count as ink), by the
 * classic dynamic programme: each cell holds the side of the biggest blank
 * square ending there. Two rows are enough.
 */
function largestBlankSquare(map: InkMap, margin: number) {
  const { width, height } = map;
  let previous = new Uint16Array(width);
  let current = new Uint16Array(width);
  let best = { x: 0, y: 0, side: 0 };
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (isBlocked(map, margin, x, y)) {
        current[x] = 0;
      } else if (x === 0 || y === 0) {
        current[x] = 1;
      } else {
        current[x] = 1 + Math.min(previous[x], current[x - 1], previous[x - 1]);
      }
      if (current[x] > best.side) {
        best = {
          x: x - current[x] + 1,
          y: y - current[x] + 1,
          side: current[x],
        };
      }
    }
    [previous, current] = [current, previous];
  }
  return best;
}

/**
 * Where a `side`-cell square covers the least ink, inside the margins: the
 * fallback for a page with no blank area big enough, such as a ruled form.
 */
function leastInkSquare(map: InkMap, margin: number, side: number) {
  const { width, height } = map;
  // Summed-area table, one row and column larger than the map.
  const stride = width + 1;
  const sums = new Uint32Array(stride * (height + 1));
  for (let y = 0; y < height; y++) {
    let row = 0;
    for (let x = 0; x < width; x++) {
      row += map.ink[y * width + x];
      sums[(y + 1) * stride + x + 1] = sums[y * stride + x + 1] + row;
    }
  }
  const inkIn = (x: number, y: number) =>
    sums[(y + side) * stride + x + side] -
    sums[y * stride + x + side] -
    sums[(y + side) * stride + x] +
    sums[y * stride + x];
  // A map too small for the margins still gets a square inside it.
  const first = (length: number) => Math.min(margin, length - side);
  const last = (length: number) =>
    Math.max(first(length), length - margin - side);
  let best = { x: first(width), y: first(height), ink: Infinity };
  for (let y = first(height); y <= last(height); y++) {
    for (let x = first(width); x <= last(width); x++) {
      const ink = inkIn(x, y);
      if (ink < best.ink) {
        best = { x, y, ink };
      }
    }
  }
  return best;
}

/**
 * Finds room for the QR: centred in the page's largest blank square, as big
 * as `preferred` when that fits and no smaller than `min`. With no blank
 * square that big, it takes the `min` square that covers the least ink
 * (`clear` false: it prints on a white backing).
 */
export function findQrSpot(map: InkMap, options: QrSpotOptions): QrSpot {
  const { preferred, min, gap, margin } = options;
  const blank = largestBlankSquare(map, margin);
  const room = blank.side - 2 * gap;
  if (room >= min) {
    const size = Math.min(preferred, room);
    const offset = Math.floor((blank.side - size) / 2);
    return { x: blank.x + offset, y: blank.y + offset, size, clear: true };
  }
  const side = Math.min(min, map.width, map.height);
  const { x, y } = leastInkSquare(map, margin, side);
  return { x, y, size: side, clear: false };
}
