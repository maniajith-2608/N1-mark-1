/**
 * A form that slides up from the bottom over the screen below (Create / Edit
 * order, Edit invoice), like the Edit machine sheet. A stack screen's
 * `options`, so screens it opens (e.g. Edit process operations) push on top.
 */
export const SHEET_SCREEN_OPTIONS = {
  presentation: 'fullScreenModal',
  animation: 'slide_from_bottom',
} as const;
