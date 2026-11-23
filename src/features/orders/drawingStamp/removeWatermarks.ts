import {
  PDFArray,
  PDFDict,
  PDFDocument,
  PDFName,
  PDFNumber,
  PDFRawStream,
  PDFRef,
  PDFString,
  PDFHexString,
  decodePDFRawStream,
  type PDFContext,
  type PDFObject,
} from 'pdf-lib';
import { cutSpans, readContentOps, type ContentOp } from './contentStream';

/**
 * Takes watermarks out of a PDF drawing ("Preliminary", "Draft", a company's
 * name or short form across the sheet), so they never reach the shop floor.
 * Only the watermark itself is cut from the file: the drawing's lines, text
 * and pictures stay exactly as drawn, even where the watermark crossed them.
 *
 * What counts as a watermark:
 * - marked as one by the tool that added it: a /Watermark annotation, an
 *   /Artifact /Watermark block, a watermark layer (optional content), or an
 *   Acrobat watermark form;
 * - large text set at a slant (not along or across the sheet), which
 *   drawings use for nothing else.
 *
 * Watermarks turned into outlines or baked into a picture can't be told
 * apart from the drawing, so they stay.
 */

type Matrix = [number, number, number, number, number, number];
const IDENTITY: Matrix = [1, 0, 0, 1, 0, 0];

/** Slanted text this far off the sheet's axes (degrees) can be a watermark. */
const SLANT_DEGREES = 3;
/** Slanted text at least this tall (points) is a watermark… */
const WATERMARK_MIN_PT = 18;
/** …or this share of the sheet's shorter side, on large sheets. */
const WATERMARK_SHEET_SHARE = 0.025;

const TEXT_SHOWS = new Set(['Tj', 'TJ', "'", '"']);

const multiply = (m: Matrix, n: Matrix): Matrix => [
  m[0] * n[0] + m[1] * n[2],
  m[0] * n[1] + m[1] * n[3],
  m[2] * n[0] + m[3] * n[2],
  m[2] * n[1] + m[3] * n[3],
  m[4] * n[0] + m[5] * n[2] + n[4],
  m[4] * n[1] + m[5] * n[3] + n[5],
];

const toMatrix = (operands: string[]): Matrix | null => {
  const n = operands.slice(-6).map(Number);
  return n.length === 6 && n.every(Number.isFinite) ? (n as Matrix) : null;
};

const name = (value: PDFObject | undefined) =>
  value instanceof PDFName ? value.decodeText() : '';

const textOf = (value: PDFObject | undefined) =>
  value instanceof PDFString || value instanceof PDFHexString
    ? value.decodeText()
    : '';

class WatermarkRemover {
  private readonly visited = new Set<string>();
  changed = false;

  constructor(private readonly context: PDFContext) {}

  private dict(value: PDFObject | undefined): PDFDict | undefined {
    const found = value && this.context.lookup(value);
    return found instanceof PDFDict ? found : undefined;
  }

  private get(dict: PDFDict | undefined, key: string) {
    return dict ? this.context.lookup(dict.get(PDFName.of(key))) : undefined;
  }

  /** A layer named or used as a watermark. */
  isWatermarkLayer(value: PDFObject | undefined): boolean {
    const layer = this.dict(value);
    if (!layer) {
      return false;
    }
    const type = name(this.get(layer, 'Type'));
    if (type === 'OCMD') {
      const ocgs = this.get(layer, 'OCGs');
      const list =
        ocgs instanceof PDFArray ? ocgs.asArray() : ocgs ? [ocgs] : [];
      return list.length > 0 && list.every(l => this.isWatermarkLayer(l));
    }
    const element = this.dict(
      this.get(this.dict(this.get(layer, 'Usage')), 'PageElement'),
    );
    return (
      /watermark/i.test(textOf(this.get(layer, 'Name'))) ||
      name(this.get(element, 'Subtype')) === 'WM'
    );
  }

  /** Acrobat's watermark form: PieceInfo /ADBE_CompoundType /Private /Watermark. */
  private isWatermarkForm(form: PDFDict): boolean {
    const compound = this.dict(
      this.get(this.dict(this.get(form, 'PieceInfo')), 'ADBE_CompoundType'),
    );
    return name(this.get(compound, 'Private')) === 'Watermark';
  }

  /** Whether a BDC starts a watermark block. */
  private isWatermarkBlock(op: ContentOp, resources: PDFDict | undefined) {
    const [tag = '', props = ''] = op.operands;
    if (tag === '/Artifact' && /\/Subtype\s*\/Watermark\b/.test(props)) {
      return true;
    }
    if (tag === '/OC' && props.startsWith('/')) {
      const properties = this.dict(this.get(resources, 'Properties'));
      return this.isWatermarkLayer(
        properties?.get(PDFName.of(decodeName(props))),
      );
    }
    return false;
  }

  /**
   * The content without its watermarks, or null when it has none. Forms it
   * draws are cleaned in place as they are met.
   */
  cleanContent(
    bytes: Uint8Array,
    resources: PDFDict | undefined,
    start: Matrix,
    minPt: number,
  ): Uint8Array | null {
    const ops = readContentOps(bytes);
    const spans: { start: number; end: number }[] = [];
    const marked: { start: number; cut: boolean }[] = [];
    const saved: Matrix[] = [];
    let ctm = start;
    let textStart = -1;
    let textCut = false;
    let tm: Matrix = IDENTITY;
    let fontSize = 0;
    const xObjects = this.dict(this.get(resources, 'XObject'));

    for (const op of ops) {
      switch (op.op) {
        case 'q':
          saved.push(ctm);
          break;
        case 'Q':
          ctm = saved.pop() ?? ctm;
          break;
        case 'cm': {
          const m = toMatrix(op.operands);
          ctm = m ? multiply(m, ctm) : ctm;
          break;
        }
        case 'BMC':
          marked.push({ start: op.start, cut: false });
          break;
        case 'BDC':
          marked.push({
            start: op.start,
            cut: this.isWatermarkBlock(op, resources),
          });
          break;
        case 'EMC': {
          const block = marked.pop();
          if (block?.cut) {
            spans.push({ start: block.start, end: op.end });
          }
          break;
        }
        case 'BT':
          textStart = op.start;
          textCut = false;
          tm = IDENTITY;
          break;
        case 'Tm':
          tm = toMatrix(op.operands) ?? tm;
          break;
        case 'Tf':
          fontSize = Math.abs(Number(op.operands[1]) || 0);
          break;
        case 'ET':
          if (textCut && textStart >= 0) {
            spans.push({ start: textStart, end: op.end });
          }
          textStart = -1;
          break;
        case 'Do': {
          const ref = xObjects?.get(
            PDFName.of(decodeName(op.operands[0] ?? '')),
          );
          const form = ref && this.context.lookup(ref);
          if (!(form instanceof PDFRawStream)) {
            break;
          }
          // A picture or form on a watermark layer.
          if (this.isWatermarkLayer(form.dict.get(PDFName.of('OC')))) {
            spans.push({ start: op.start, end: op.end });
          } else if (name(form.dict.get(PDFName.of('Subtype'))) === 'Form') {
            if (this.isWatermarkForm(form.dict)) {
              spans.push({ start: op.start, end: op.end });
            } else if (ref instanceof PDFRef) {
              this.cleanForm(ref, form, ctm, resources, minPt);
            }
          }
          break;
        }
        default:
          if (TEXT_SHOWS.has(op.op) && textStart >= 0 && !textCut) {
            textCut = isWatermarkText(multiply(tm, ctm), fontSize, minPt);
          }
      }
    }
    return spans.length ? cutSpans(bytes, spans) : null;
  }

  private cleanForm(
    ref: PDFRef,
    form: PDFRawStream,
    ctm: Matrix,
    parentResources: PDFDict | undefined,
    minPt: number,
  ) {
    const key = ref.toString();
    if (this.visited.has(key)) {
      return;
    }
    this.visited.add(key);
    const matrix = this.get(form.dict, 'Matrix');
    const formMatrix =
      matrix instanceof PDFArray
        ? toMatrix(
            matrix
              .asArray()
              .map(n => String(n instanceof PDFNumber ? n.asNumber() : NaN)),
          ) ?? IDENTITY
        : IDENTITY;
    const resources =
      this.dict(this.get(form.dict, 'Resources')) ?? parentResources;
    const cleaned = this.cleanContent(
      decodePDFRawStream(form).decode(),
      resources,
      multiply(formMatrix, ctm),
      minPt,
    );
    if (!cleaned) {
      return;
    }
    const stream = this.context.flateStream(cleaned);
    for (const [k, v] of form.dict.entries()) {
      if (!['Filter', 'DecodeParms', 'Length'].includes(k.decodeText())) {
        stream.dict.set(k, v);
      }
    }
    this.context.assign(ref, stream);
    this.changed = true;
  }
}

/** "/MC#200" → "MC 0": a name operand as its key. */
const decodeName = (operand: string) =>
  operand
    .replace(/^\//, '')
    .replace(/#([0-9a-fA-F]{2})/g, (_, hex) =>
      String.fromCharCode(parseInt(hex, 16)),
    );

/** Text drawn this big at a slant: a watermark, not a dimension. */
function isWatermarkText(m: Matrix, fontSize: number, minPt: number) {
  const height = fontSize * Math.hypot(m[2], m[3]);
  const angle = Math.abs((Math.atan2(m[1], m[0]) * 180) / Math.PI) % 90;
  const slanted = angle > SLANT_DEGREES && angle < 90 - SLANT_DEGREES;
  return slanted && height >= minPt;
}

/**
 * The PDF's bytes without its watermarks; the same bytes when it has none,
 * or when it can't be read here (encrypted, damaged): drawings still show.
 */
export async function removeWatermarks(bytes: Uint8Array): Promise<Uint8Array> {
  try {
    const pdf = await PDFDocument.load(bytes);
    const remover = new WatermarkRemover(pdf.context);
    for (const page of pdf.getPages()) {
      const node = page.node;
      // Watermark annotations, and annotations on a watermark layer.
      const annots = node.Annots();
      if (annots) {
        const kept = annots.asArray().filter(a => {
          const annot = pdf.context.lookup(a);
          return !(
            annot instanceof PDFDict &&
            (name(annot.get(PDFName.of('Subtype'))) === 'Watermark' ||
              remover.isWatermarkLayer(annot.get(PDFName.of('OC'))))
          );
        });
        if (kept.length !== annots.size()) {
          node.set(PDFName.of('Annots'), pdf.context.obj(kept));
          remover.changed = true;
        }
      }
      // The page's content, all its streams as one.
      const contents = node.Contents();
      const streams = (
        contents instanceof PDFArray ? contents.asArray() : [contents]
      )
        .map(s => s && pdf.context.lookup(s))
        .filter((s): s is PDFRawStream => s instanceof PDFRawStream);
      if (!streams.length) {
        continue;
      }
      const parts = streams.map(s => decodePDFRawStream(s).decode());
      const joined = new Uint8Array(
        parts.reduce((n, p) => n + p.length + 1, 0),
      );
      let at = 0;
      for (const p of parts) {
        joined.set(p, at);
        at += p.length;
        joined[at++] = 0x0a;
      }
      const { width, height } = page.getSize();
      const minPt = Math.max(
        WATERMARK_MIN_PT,
        WATERMARK_SHEET_SHARE * Math.min(width, height),
      );
      const cleaned = remover.cleanContent(
        joined,
        node.Resources(),
        IDENTITY,
        minPt,
      );
      if (cleaned) {
        node.set(
          PDFName.of('Contents'),
          pdf.context.register(pdf.context.flateStream(cleaned)),
        );
        remover.changed = true;
      }
    }
    return remover.changed ? await pdf.save() : bytes;
  } catch {
    return bytes;
  }
}
