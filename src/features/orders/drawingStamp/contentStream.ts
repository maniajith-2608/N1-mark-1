/**
 * Just enough of a PDF content stream reader to find operators and where
 * they sit in the bytes, so blocks can be cut out without rewriting the rest.
 */

/** One operator with its operands, and its byte span (operands included). */
export type ContentOp = {
  op: string;
  /** Raw operand text: numbers, names, strings, arrays and dicts as written. */
  operands: string[];
  start: number;
  end: number;
};

const WHITESPACE = new Set([0x00, 0x09, 0x0a, 0x0c, 0x0d, 0x20]);
const DELIMITERS = new Set([
  0x28, 0x29, 0x3c, 0x3e, 0x5b, 0x5d, 0x7b, 0x7d, 0x2f, 0x25,
]);

const isWhite = (b: number) => WHITESPACE.has(b);
const isRegular = (b: number) => !isWhite(b) && !DELIMITERS.has(b);

const text = (bytes: Uint8Array, from: number, to: number) => {
  let out = '';
  for (let i = from; i < to; i++) {
    out += String.fromCharCode(bytes[i]);
  }
  return out;
};

/** End (exclusive) of a literal string starting at its "(". */
function literalEnd(bytes: Uint8Array, at: number): number {
  let depth = 0;
  for (let i = at; i < bytes.length; i++) {
    const b = bytes[i];
    if (b === 0x5c) {
      i++; // An escaped character, whatever it is.
    } else if (b === 0x28) {
      depth++;
    } else if (b === 0x29 && --depth === 0) {
      return i + 1;
    }
  }
  return bytes.length;
}

/** End (exclusive) of the bracketed value at `at`: [..] or <<..>>. */
function nestedEnd(bytes: Uint8Array, at: number): number {
  let depth = 0;
  for (let i = at; i < bytes.length; ) {
    const b = bytes[i];
    if (b === 0x28) {
      i = literalEnd(bytes, i);
      continue;
    }
    if (b === 0x25) {
      while (i < bytes.length && bytes[i] !== 0x0a && bytes[i] !== 0x0d) {
        i++;
      }
      continue;
    }
    if (b === 0x5b || (b === 0x3c && bytes[i + 1] === 0x3c)) {
      depth++;
      i += b === 0x5b ? 1 : 2;
    } else if (b === 0x5d || (b === 0x3e && bytes[i + 1] === 0x3e)) {
      depth--;
      i += b === 0x5d ? 1 : 2;
      if (depth === 0) {
        return i;
      }
    } else if (b === 0x3c) {
      // A hex string inside.
      while (i < bytes.length && bytes[i] !== 0x3e) {
        i++;
      }
      i++;
    } else {
      i++;
    }
  }
  return bytes.length;
}

/**
 * After an inline image's ID: the end (exclusive) of its closing EI, found
 * as "EI" between whitespace (the image data is binary).
 */
function inlineImageEnd(bytes: Uint8Array, at: number): number {
  for (let i = at + 1; i + 1 < bytes.length; i++) {
    if (
      bytes[i] === 0x45 &&
      bytes[i + 1] === 0x49 &&
      isWhite(bytes[i - 1]) &&
      (i + 2 >= bytes.length || !isRegular(bytes[i + 2]))
    ) {
      return i + 2;
    }
  }
  return bytes.length;
}

/** Every operator in the stream, in order. */
export function readContentOps(bytes: Uint8Array): ContentOp[] {
  const ops: ContentOp[] = [];
  let operands: string[] = [];
  let opStart = -1;
  let i = 0;
  while (i < bytes.length) {
    const b = bytes[i];
    if (isWhite(b)) {
      i++;
      continue;
    }
    if (b === 0x25) {
      while (i < bytes.length && bytes[i] !== 0x0a && bytes[i] !== 0x0d) {
        i++;
      }
      continue;
    }
    const start = i;
    if (opStart < 0) {
      opStart = start;
    }
    let end: number;
    if (b === 0x28) {
      end = literalEnd(bytes, i);
    } else if (b === 0x5b || (b === 0x3c && bytes[i + 1] === 0x3c)) {
      end = nestedEnd(bytes, i);
    } else if (b === 0x3c) {
      end = i + 1;
      while (end < bytes.length && bytes[end] !== 0x3e) {
        end++;
      }
      end++;
    } else if (b === 0x2f) {
      end = i + 1;
      while (end < bytes.length && isRegular(bytes[end])) {
        end++;
      }
    } else if (isRegular(b)) {
      end = i;
      while (end < bytes.length && isRegular(bytes[end])) {
        end++;
      }
      const word = text(bytes, start, end);
      if (
        !/^[+-]?(\d+\.?\d*|\.\d+)$/.test(word) &&
        word !== 'true' &&
        word !== 'false' &&
        word !== 'null'
      ) {
        // An operator.
        if (word === 'ID') {
          end = inlineImageEnd(bytes, end);
        }
        ops.push({ op: word, operands, start: opStart, end });
        operands = [];
        opStart = -1;
        i = end;
        continue;
      }
    } else {
      // A stray delimiter (">", ")", "{", "}"): skip it.
      end = i + 1;
    }
    operands.push(text(bytes, start, end));
    i = end;
  }
  return ops;
}

/** The bytes without the given [start, end) spans. */
export function cutSpans(
  bytes: Uint8Array,
  spans: { start: number; end: number }[],
): Uint8Array {
  const sorted = [...spans].sort((a, b) => a.start - b.start);
  const parts: Uint8Array[] = [];
  let at = 0;
  for (const { start, end } of sorted) {
    if (start > at) {
      parts.push(bytes.subarray(at, start));
    }
    at = Math.max(at, end);
  }
  parts.push(bytes.subarray(at));
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length + 1, 0));
  let o = 0;
  for (const p of parts) {
    out.set(p, o);
    o += p.length;
    out[o++] = 0x0a; // Keeps the operators either side apart.
  }
  return out;
}
