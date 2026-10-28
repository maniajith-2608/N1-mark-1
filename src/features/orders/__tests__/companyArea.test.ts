import {
  clearInk,
  companyAreas,
  companyWords,
  joinLines,
  namesCompany,
  type Box,
  type TextLine,
} from '../drawingStamp/companyArea';
import type { InkMap } from '../drawingStamp/findQrSpot';

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

const box = (x0: number, y0: number, x1: number, y1: number): Box => ({
  x0,
  y0,
  x1,
  y1,
});
const line = (text: string, b: Box): TextLine => ({ text, box: b });

/** A 200×100 sheet: its frame, and a title block cell at (120..180, 60..90). */
const sheet = page(
  200,
  100,
  (x, y) =>
    x === 0 ||
    y === 0 ||
    x === 199 ||
    y === 99 ||
    ((x === 120 || x === 180) && y >= 60 && y <= 90) ||
    ((y === 60 || y === 90) && x >= 120 && x <= 180),
);

test('the company is named by its words, not its legal form', () => {
  expect(companyWords('Motherson Pvt. Ltd.')).toBe('motherson');
  expect(companyWords('The Tata Steel Limited')).toBe('tata steel');
  expect(companyWords('A&B Engineering Co')).toBe('a and b engineering');
  expect(companyWords(' ')).toBe('');
});

test('a line names the company only as whole words', () => {
  const name = companyWords('Motherson');
  expect(
    namesCompany('MOTHERSON AUTOMOTIVE TECHNOLOGY & ENGINEERING', name),
  ).toBe(true);
  expect(namesCompany('MOTHERSONS', name)).toBe(false);
  expect(namesCompany('anything', '')).toBe(false);
  expect(
    namesCompany('A & B ENGINEERING', companyWords('A&B Engineering')),
  ).toBe(true);
});

test('words a space apart join; other columns and sizes stay apart', () => {
  const lines = joinLines([
    line('ENGINEERING', box(140, 70, 160, 74)),
    line('MOTHERSON', box(121, 70, 138, 74)),
    // The next table column along the same row.
    line('1000', box(170, 70, 178, 74)),
    // Bigger text right after: a heading, not the next word.
    line('BMMECC57838', box(162, 66, 168, 78)),
  ]);
  expect(lines.map(l => l.text)).toEqual([
    'MOTHERSON ENGINEERING',
    'BMMECC57838',
    '1000',
  ]);
  expect(lines[0].box).toEqual(box(121, 70, 160, 74));
});

test('the company’s title block cell is blanked, logo and address too', () => {
  const lines = [
    line('MOTHERSON AUTOMOTIVE', box(125, 75, 170, 78)),
    line('Survey no 172', box(125, 80, 160, 83)),
    line('Drawing number', box(10, 75, 60, 78)),
  ];
  expect(companyAreas(sheet, lines, 'Motherson Pvt Ltd')).toEqual([
    box(121, 61, 179, 89),
  ]);
  expect(companyAreas(sheet, lines, 'Someone Else')).toEqual([]);
  expect(companyAreas(sheet, lines, '')).toEqual([]);
});

test('outside a cell, the name and the address lines under it go', () => {
  const lines = [
    line('MOTHERSON AUTOMOTIVE', box(20, 20, 70, 24)),
    line('Survey no 172', box(20, 26, 60, 30)),
    line('Kanchipuram 602105', box(20, 32, 64, 36)),
    // Far below: not the address.
    line('NOTE 1', box(20, 60, 40, 64)),
  ];
  // The frame closes the page in, but it's the sheet, not a cell.
  expect(companyAreas(sheet, lines, 'Motherson')).toEqual([
    box(20, 20, 70, 36),
  ]);
});

test('blanked areas count as paper', () => {
  const map = clearInk(sheet, [box(120, 60, 180, 90), box(195, 95, 250, 120)]);
  expect(map.ink[75 * 200 + 120]).toBe(0);
  expect(map.ink[99 * 200 + 199]).toBe(0);
  expect(map.ink[0]).toBe(1);
  // The page drawn is left as it was.
  expect(sheet.ink[75 * 200 + 120]).toBe(1);
});
