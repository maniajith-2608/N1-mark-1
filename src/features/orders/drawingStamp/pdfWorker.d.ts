// webpack serves pdf.js's worker as a file; importing it gives its URL.
declare module 'pdfjs-dist/build/pdf.worker.min.mjs' {
  const url: string;
  export default url;
}

// The worker's code as a module, for running it on the page itself (the
// Android drawing renderer, rendererPage.web.ts).
declare module 'pdfjs-dist/build/pdf.worker.mjs' {
  export const WorkerMessageHandler: unknown;
}
