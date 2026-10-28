// webpack serves pdf.js's worker as a file; importing it gives its URL.
declare module 'pdfjs-dist/build/pdf.worker.min.mjs' {
  const url: string;
  export default url;
}
