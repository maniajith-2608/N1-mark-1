import {
  findQrSpot,
  inkMapFromPixels,
  type InkMap,
} from '../drawingStamp/findQrSpot';

/** A blank page with ink wherever `inked(x, y)` says. */
const page = (
  width: number,
  height: number,
  inked: (x: number, y: number) => boolean = () => false,
): InkMap => {
  const ink = new Uint8Array(width * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      ink[y * width + x] = inked(x, y) ? 1 : 0;
    }
  }
  return { width, height, ink };
};

const inkUnder = (map: InkMap, x0: number, y0: number, side: number) => {
  let count = 0;
  for (let y = y0; y < y0 + side; y++) {
    for (let x = x0; x < x0 + side; x++) {
      count += map.ink[y * map.width + x];
    }
  }
  return count;
};

const options = { preferred: 20, min: 10, gap: 2, margin: 3 };

test('a blank page: the preferred size, inside the margins', () => {
  // Centred in the first largest blank square (54 cells, from 3, 3).
  const spot = findQrSpot(page(100, 60), options);
  expect(spot).toEqual({ x: 20, y: 20, size: 20, clear: true });
});

test('goes in the largest blank area, clear of ink by the gap', () => {
  // Ink fills the page except a 30-cell square at the bottom right.
  const map = page(100, 60, (x, y) => !(x >= 65 && y >= 25 && y < 55));
  const spot = findQrSpot(map, { ...options, margin: 0 });
  expect(spot.clear).toBe(true);
  expect(spot.size).toBe(20);
  expect(inkUnder(map, spot.x - 2, spot.y - 2, spot.size + 4)).toBe(0);
  expect(spot.x).toBeGreaterThanOrEqual(65 + 2);
  expect(spot.y).toBeGreaterThanOrEqual(25 + 2);
});

test('shrinks to fit a smaller blank area, but not below the minimum', () => {
  // A 16-cell blank square: 12 cells of room once the gap is kept.
  const map = page(60, 60, (x, y) => !(x >= 10 && x < 26 && y >= 10 && y < 26));
  expect(findQrSpot(map, { ...options, margin: 0 })).toEqual({
    x: 12,
    y: 12,
    size: 12,
    clear: true,
  });
});

test('margins count as ink: the sheet edge is never used', () => {
  // Blank only in a band along the left edge, inside the margin.
  const map = page(100, 60, x => x >= 3);
  const spot = findQrSpot(map, options);
  expect(spot.clear).toBe(false);
});

test('a page with no room: the minimum size where it covers least ink', () => {
  // A ruled form: a grid every 8 cells, with only columns in one area.
  const map = page(
    100,
    60,
    (x, y) => x % 8 === 0 || (y % 8 === 0 && !(x > 60 && y > 30)),
  );
  const spot = findQrSpot(map, options);
  expect(spot).toMatchObject({ size: 10, clear: false });
  expect(spot.x).toBeGreaterThan(50);
  expect(spot.y).toBeGreaterThan(20);
  expect(spot.x + spot.size).toBeLessThanOrEqual(100 - 3);
  expect(spot.y + spot.size).toBeLessThanOrEqual(60 - 3);
});

test('a page smaller than the code still gets a square on it', () => {
  const spot = findQrSpot(
    page(8, 8, () => true),
    options,
  );
  expect(spot).toEqual({ x: 0, y: 0, size: 8, clear: false });
});

test('pixels: dark is ink, white and transparent are paper', () => {
  const rgba = [
    ...[0, 0, 0, 255], // black
    ...[255, 255, 255, 255], // white
    ...[0, 0, 0, 0], // transparent
    ...[128, 128, 128, 255], // grey
    ...[250, 250, 250, 255], // near white
    ...[0, 0, 0, 20], // faint
  ];
  expect(Array.from(inkMapFromPixels(rgba, 6, 1).ink)).toEqual([
    1, 0, 0, 1, 0, 0,
  ]);
});
