import { COMMON_STRINGS } from '../../shared/constants';
import { formatCurrency, formatDate, formatRate } from '../../shared/utils';
import type { Organization } from '../profile/types';
import {
  BILLING_STRINGS,
  INVOICE_STATUS_META,
  QUOTE_STATUS_META,
} from './constants';
import type { Invoice, Quote, Totals } from './types';

const I = BILLING_STRINGS.invoice;
const Q = BILLING_STRINGS.quote;
const P = BILLING_STRINGS.preview;
const T = BILLING_STRINGS.totals;

type Field = { label: string; value: string };
type TotalLine = { label: string; value: string; strong?: boolean };

/**
 * Everything a printed invoice or quote shows, in reading order: the
 * organization with its logo, the document and job details, and the
 * amounts. No operation rows and no customer block.
 */
export type InvoiceDocument = {
  /** The viewer's heading, e.g. "Invoice preview". */
  previewTitle: string;
  /** For "… will work once the backend is connected" where print can't. */
  printAction: string;
  seller: {
    name: string;
    /** Invoice logo (else the organization's logo); null shows initials. */
    logoUri: string | null;
    initials: string;
    lines: string[];
  };
  title: string;
  meta: Field[];
  details: Field[];
  totals: TotalLine[];
  notes: string;
  terms: string;
  footer: string;
};

const totalLines = (totals: Totals): TotalLine[] => {
  const half = formatRate(totals.gstRate / 2);
  const gst: TotalLine[] =
    totals.supply === 'none'
      ? [{ label: T.noGst, value: formatCurrency(0) }]
      : totals.supply === 'inter'
      ? [
          {
            label: T.igst(formatRate(totals.gstRate)),
            value: formatCurrency(totals.igst),
          },
        ]
      : [
          { label: T.cgst(half), value: formatCurrency(totals.cgst) },
          { label: T.sgst(half), value: formatCurrency(totals.sgst) },
        ];
  return [
    { label: T.subtotal, value: formatCurrency(totals.subtotal) },
    ...(totals.discount > 0
      ? [{ label: T.discount, value: formatCurrency(-totals.discount) }]
      : []),
    ...gst,
    { label: T.total, value: formatCurrency(totals.total), strong: true },
  ];
};

/** "ABC Engineering Pvt Ltd" → "AE": shown when there's no logo. */
const initialsOf = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(word => word[0].toUpperCase())
    .join('');

/** The organization block: logo (or initials), name, address and contact. */
const sellerOf = (org: Organization | null): InvoiceDocument['seller'] => {
  const name = org?.name ?? '';
  const logo = org?.invoiceLogo ?? org?.logo ?? null;
  const place = org
    ? [
        org.address,
        [org.city, org.state, org.pinCode].filter(Boolean).join(', '),
      ]
    : [];
  return {
    name,
    logoUri: logo?.uri?.startsWith('data:image') ? logo.uri : null,
    initials: initialsOf(name),
    lines: [
      ...place,
      org?.gstNumber ? P.gstin(org.gstNumber) : '',
      [org?.phone, org?.email].filter(Boolean).join(' · '),
    ].filter(Boolean),
  };
};

/** The invoice as it reads on paper, from the saved invoice and its totals. */
export function invoiceDocument(
  invoice: Invoice,
  totals: Totals,
  organization: Organization | null,
): InvoiceDocument {
  const org = organization;
  return {
    previewTitle: P.modalTitle,
    printAction: P.printAction,
    seller: sellerOf(org),
    title: P.title,
    meta: [
      { label: P.number, value: invoice.number },
      { label: P.date, value: formatDate(invoice.issuedAt) },
      { label: I.status, value: INVOICE_STATUS_META[invoice.status].label },
    ],
    details: [
      { label: I.jobId, value: invoice.jobId },
      { label: I.routeCard, value: invoice.routeCard || COMMON_STRINGS.dash },
      { label: I.partName, value: invoice.partName },
      { label: I.quantity, value: `${invoice.quantity} pcs` },
      {
        label: I.poAmount,
        value:
          invoice.poAmount == null
            ? COMMON_STRINGS.dash
            : formatCurrency(invoice.poAmount),
      },
    ],
    totals: totalLines(totals),
    notes: invoice.notes,
    terms: org?.termsAndConditions ?? '',
    footer: org?.invoiceFooter || P.thanks,
  };
}

/** The quote as it reads on paper, laid out like the invoice. */
export function quoteDocument(
  quote: Quote,
  totals: Totals,
  organization: Organization | null,
): InvoiceDocument {
  const org = organization;
  return {
    previewTitle: P.quoteModalTitle,
    printAction: P.quotePrintAction,
    seller: sellerOf(org),
    title: P.quoteTitle,
    meta: [
      { label: P.quoteNumber, value: quote.number },
      { label: P.date, value: formatDate(quote.createdAt) },
      { label: Q.status, value: QUOTE_STATUS_META[quote.status].label },
    ],
    details: [
      { label: Q.partName, value: quote.partName },
      { label: Q.quantity, value: `${quote.quantity} pcs` },
    ],
    totals: totalLines(totals),
    notes: '',
    terms: org?.termsAndConditions ?? '',
    footer: org?.invoiceFooter || P.thanks,
  };
}

const escapeHtml = (text: string) =>
  text.replace(
    /[&<>"]/g,
    c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!),
  );

// Print styles: an A4 page, plain black on white, like the preview sheet.
const PRINT_CSS = `
@page { size: A4; margin: 16mm; }
* { box-sizing: border-box; }
body { margin: 0; font: 12px/1.5 -apple-system, "Segoe UI", Roboto, sans-serif; color: #111; }
.top { display: flex; justify-content: space-between; gap: 24px; }
h1 { margin: 0; font-size: 22px; letter-spacing: .08em; }
.seller { font-weight: 700; font-size: 15px; }
.muted { color: #666; }
.label { color: #666; font-size: 10px; text-transform: uppercase; letter-spacing: .06em; }
.meta { text-align: right; }
hr { border: 0; border-top: 1px solid #ddd; margin: 16px 0; }
.brand { display: flex; gap: 12px; align-items: flex-start; }
.logo { width: 56px; height: 56px; object-fit: contain; }
.mark { width: 56px; height: 56px; border-radius: 8px; background: #111; color: #fff; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 18px; }
.details { display: flex; flex-wrap: wrap; gap: 12px 32px; }
.totals { width: 260px; margin: 16px 0 0 auto; }
.totals div { display: flex; justify-content: space-between; padding: 2px 0; }
.totals .strong { font-weight: 700; font-size: 15px; border-top: 1px solid #ddd; margin-top: 6px; padding-top: 8px; }
.footer { margin-top: 32px; text-align: center; color: #666; }
`;

/** A printable HTML page of the invoice (web: Print, then Save as PDF). */
export function invoiceHtml(doc: InvoiceDocument): string {
  const e = escapeHtml;
  const field = (f: Field) =>
    `<div><div class="label">${e(f.label)}</div><div>${e(f.value)}</div></div>`;
  const totals = doc.totals
    .map(
      t =>
        `<div${t.strong ? ' class="strong"' : ''}><span>${e(
          t.label,
        )}</span><span>${e(t.value)}</span></div>`,
    )
    .join('');
  const block = (label: string, text: string) =>
    text ? `<hr><div class="label">${e(label)}</div><div>${e(text)}</div>` : '';
  return (
    `<!doctype html><html><head><meta charset="utf-8"><title>${e(
      doc.meta[0].value,
    )}</title><style>${PRINT_CSS}</style></head><body>` +
    `<div class="top"><div class="brand">` +
    (doc.seller.logoUri
      ? `<img class="logo" src="${e(doc.seller.logoUri)}" alt="">`
      : `<div class="mark">${e(doc.seller.initials)}</div>`) +
    `<div><div class="seller">${e(doc.seller.name)}</div>` +
    doc.seller.lines.map(l => `<div class="muted">${e(l)}</div>`).join('') +
    `</div></div><div class="meta"><h1>${e(doc.title)}</h1>` +
    doc.meta
      .map(
        m =>
          `<div><span class="muted">${e(m.label)}</span> ${e(m.value)}</div>`,
      )
      .join('') +
    `</div></div><hr>` +
    `<div class="details">${doc.details.map(field).join('')}</div>` +
    `<div class="totals">${totals}</div>` +
    block(I.notes, doc.notes) +
    block(P.terms, doc.terms) +
    `<div class="footer">${e(doc.footer)}</div>` +
    `</body></html>`
  );
}
