import { lightTheme } from '../../theme';

const { colors, spacing, radius, borderWidth, typography } = lightTheme;

/** Escapes text for HTML element content and quoted attributes. */
export const escapeHtml = (text: string) =>
  text.replace(
    /[&<>"]/g,
    c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!),
  );

const px = (n: number) => `${n}px`;

// Paper is always light, whatever theme the app is in.
const STYLE = `
@page { margin: ${px(spacing.xxl)}; }
* { box-sizing: border-box; }
body {
  margin: 0;
  font-family: Lato, -apple-system, Roboto, Helvetica, Arial, sans-serif;
  font-size: ${px(typography.body.fontSize)};
  line-height: ${px(typography.body.lineHeight)};
  color: ${colors.textPrimary};
  background: ${colors.surface};
}
h1 {
  margin: 0 0 ${px(spacing.lg)};
  font-size: ${px(typography.h2.fontSize)};
  line-height: ${px(typography.h2.lineHeight)};
}
.figure {
  padding: ${px(spacing.lg)};
  border: ${px(borderWidth.hairline)} solid ${colors.border};
  border-radius: ${px(radius.md)};
  text-align: center;
}
.figure svg, .figure img { width: 100%; max-height: 60vh; }
.row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: ${px(spacing.lg)};
  margin-top: ${px(spacing.lg)};
  page-break-inside: avoid;
}
.label { color: ${colors.textSecondary}; font-size: ${px(
  typography.small.fontSize,
)}; }
.value { font-weight: bold; font-size: ${px(typography.h3.fontSize)}; }
dl { margin: 0; display: grid; grid-template-columns: max-content 1fr; gap: ${px(
  spacing.xs,
)} ${px(spacing.lg)}; }
dt { color: ${colors.textSecondary}; }
dd { margin: 0; white-space: pre-line; }
`;

/** A whole printable page: `body` is already-escaped HTML. */
export const printPage = (title: string, body: string) =>
  '<!doctype html><html><head><meta charset="utf-8">' +
  '<meta name="viewport" content="width=device-width, initial-scale=1">' +
  `<title>${escapeHtml(title)}</title><style>${STYLE}</style></head>` +
  `<body>${body}</body></html>`;

/** Label/value pairs as a definition list; blank values are left out. */
export const detailList = (rows: readonly (readonly [string, string])[]) =>
  `<dl>${rows
    .filter(([, value]) => value.trim())
    .map(
      ([label, value]) =>
        `<dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd>`,
    )
    .join('')}</dl>`;
