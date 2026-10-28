import type { InkMap } from './findQrSpot';

/** A rectangle in ink-map cells, edges inclusive. */
export type Box = { x0: number; y0: number; x1: number; y1: number };

/** A line of text on the page, with its box in ink-map cells. */
export type TextLine = { text: string; box: Box };

/** Words that say what kind of company it is, not which one. */
const COMPANY_SUFFIXES = new Set([
  'the',
  'pvt',
  'private',
  'ltd',
  'limited',
  'llp',
  'inc',
  'co',
  'corp',
]);

const words = (text: string) =>
  text
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
    .split(' ')
    .filter(Boolean);

/** The words that name the company: "Motherson Pvt. Ltd." → "motherson". */
export function companyWords(name: string): string {
  return words(name)
    .filter(word => !COMPANY_SUFFIXES.has(word))
    .join(' ');
}

/** Whether a line of the drawing names the company, as whole words. */
export function namesCompany(text: string, company: string): boolean {
  return (
    company !== '' && ` ${words(text).join(' ')} `.includes(` ${company} `)
  );
}

/**
 * Words further apart than this share of the text's height are separate
 * lines: a word space is narrower, a table's next column is wider.
 */
const WORD_GAP = 0.6;
/** Text this much taller or shorter is a different line, not the next word. */
const SIZE_STEP = 1.5;

const union = (a: Box, b: Box): Box => ({
  x0: Math.min(a.x0, b.x0),
  y0: Math.min(a.y0, b.y0),
  x1: Math.max(a.x1, b.x1),
  y1: Math.max(a.y1, b.y1),
});

const heightOf = (box: Box) => box.y1 - box.y0 + 1;

/** Whether `box` reads straight on from `last`: same row, size and line. */
function followsOn(last: Box, box: Box) {
  const [small, large] = [heightOf(last), heightOf(box)].sort((a, b) => a - b);
  const middle = (box.y0 + box.y1) / 2;
  return (
    large <= SIZE_STEP * small &&
    middle >= last.y0 &&
    middle <= last.y1 &&
    box.x0 - last.x1 <= WORD_GAP * small
  );
}

/**
 * Pieces of text joined into lines, left to right: words of one size, a
 * word space apart. Text along the same row in another column or cell
 * stays a line of its own.
 */
export function joinLines(pieces: TextLine[]): TextLine[] {
  const lines: (TextLine & { last: Box })[] = [];
  const byX = [...pieces].sort((a, b) => a.box.x0 - b.box.x0);
  for (const { text, box } of byX) {
    const line = lines.find(l => followsOn(l.last, box));
    if (line) {
      line.text += ` ${text}`;
      line.box = union(line.box, box);
      line.last = box;
    } else {
      lines.push({ text, box: { ...box }, last: box });
    }
  }
  return lines.map(({ text, box }) => ({ text, box }));
}

/** How much of a run must be ink for it to count as a ruled line. */
const RULE_SHARE = 0.9;
/** A cell bigger than this share of the page is the sheet, not a box. */
const MAX_CELL_SHARE = 0.1;
/** Address lines sit at most this many line heights under the name. */
const LINE_GAP = 1.5;
/** A name with its address: never more lines than this under it. */
const MAX_ADDRESS_LINES = 6;

function inkShare(
  map: InkMap,
  from: number,
  to: number,
  at: (i: number) => number,
) {
  let ink = 0;
  for (let i = from; i <= to; i++) {
    ink += map.ink[at(i)];
  }
  return ink / (to - from + 1);
}

const isRow = (map: InkMap, y: number, box: Box) =>
  inkShare(map, box.x0, box.x1, x => y * map.width + x) >= RULE_SHARE;

const isColumn = (map: InkMap, x: number, box: Box) =>
  inkShare(map, box.y0, box.y1, y => y * map.width + x) >= RULE_SHARE;

/** The first `index` from `start` stepping by `step` where `test` holds. */
function firstRule(
  start: number,
  end: number,
  step: 1 | -1,
  test: (i: number) => boolean,
) {
  for (let i = start; step > 0 ? i <= end : i >= end; i += step) {
    if (test(i)) {
      return i;
    }
  }
  return null;
}

/**
 * The ruled box around `box` (a title block cell), inside its lines: the
 * company's logo and address share the cell with its name. Null when no
 * box closes it in, or the box is a large part of the page.
 */
export function enclosingCell(map: InkMap, box: Box): Box | null {
  const top = firstRule(box.y0 - 1, 0, -1, y => isRow(map, y, box));
  const bottom = firstRule(box.y1 + 1, map.height - 1, 1, y =>
    isRow(map, y, box),
  );
  const left = firstRule(box.x0 - 1, 0, -1, x => isColumn(map, x, box));
  const right = firstRule(box.x1 + 1, map.width - 1, 1, x =>
    isColumn(map, x, box),
  );
  if (top === null || bottom === null || left === null || right === null) {
    return null;
  }
  const cell = { x0: left + 1, y0: top + 1, x1: right - 1, y1: bottom - 1 };
  const area = (cell.x1 - cell.x0 + 1) * (cell.y1 - cell.y0 + 1);
  return area > MAX_CELL_SHARE * map.width * map.height ? null : cell;
}

/** The name's line and the address lines straight under it. */
function nameAndAddress(lines: TextLine[], index: number): Box {
  let block = lines[index].box;
  const lineHeight = block.y1 - block.y0 + 1;
  const below = lines
    .filter(line => line.box.y0 > block.y1 - lineHeight / 2)
    .sort((a, b) => a.box.y0 - b.box.y0);
  for (const line of below.slice(0, MAX_ADDRESS_LINES)) {
    const gap = line.box.y0 - block.y1;
    const overlaps = line.box.x0 <= block.x1 && line.box.x1 >= block.x0;
    if (gap > LINE_GAP * lineHeight || !overlaps) {
      break;
    }
    block = union(block, line.box);
  }
  return block;
}

/**
 * Where the company's details are on a page, to blank before printing: the
 * title block cell holding its name (logo and address too), or else the
 * name's line with the address under it.
 */
export function companyAreas(
  map: InkMap,
  lines: TextLine[],
  company: string,
): Box[] {
  const name = companyWords(company);
  return lines.flatMap((line, i) =>
    namesCompany(line.text, name)
      ? [enclosingCell(map, line.box) ?? nameAndAddress(lines, i)]
      : [],
  );
}

/** Marks `boxes` as blank paper on the map, so the QR may use them. */
export function clearInk(map: InkMap, boxes: Box[]): InkMap {
  const ink = map.ink.slice();
  for (const { x0, y0, x1, y1 } of boxes) {
    for (let y = Math.max(0, y0); y <= Math.min(map.height - 1, y1); y++) {
      const row = y * map.width;
      ink.fill(0, row + Math.max(0, x0), row + Math.min(map.width - 1, x1) + 1);
    }
  }
  return { ...map, ink };
}
