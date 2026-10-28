/** A drawing with the order QR on every page, ready to print. */
export type StampedDrawing = {
  /** A link to the stamped PDF, valid until the page reloads. */
  url: string;
  pageCount: number;
  /** Pages (1-based) with no blank area big enough: the QR covers a little. */
  crowdedPages: number[];
};

/** A stamped drawing drawn as images, to check the QR before printing. */
export type StampedPreview = {
  /** One image per page, with its width ÷ height. */
  pages: { uri: string; aspectRatio: number }[];
  crowdedPages: number[];
};
