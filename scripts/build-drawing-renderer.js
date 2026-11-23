/**
 * Builds the page the Android app's hidden drawing WebView loads
 * (src/features/orders/drawingStamp/renderer/rendererPage.web.ts) into
 * android/app/src/main/assets/drawing-renderer. Run by the Android build
 * (android/app/build.gradle) before every build; uses webpack's Node API, so
 * it runs on the shell's default Node too.
 */
const path = require('path');
const webpack = require('webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const webConfig = require('../webpack.config');

const root = path.resolve(__dirname, '..');
const base = webConfig({}, { mode: 'production' });

const config = {
  ...base,
  mode: 'production',
  devtool: false,
  entry: path.resolve(
    root,
    'src/features/orders/drawingStamp/renderer/rendererPage.web.ts',
  ),
  output: {
    path: path.resolve(root, 'android/app/src/main/assets/drawing-renderer'),
    filename: 'renderer.js',
    // Relative, since the page is opened from file:///android_asset.
    publicPath: '',
    clean: true,
  },
  resolve: {
    ...base.resolve,
    alias: {
      ...base.resolve.alias,
      // pdf.js's legacy build, for older Android WebViews: the modern one
      // calls Promise.withResolvers (Chrome 119+), and WebView 113 draws
      // nothing. The worker's code comes from the same build.
      'pdfjs-dist$': require.resolve('pdfjs-dist/legacy/build/pdf.mjs'),
      'pdfjs-dist/build/pdf.worker.mjs$': require.resolve(
        'pdfjs-dist/legacy/build/pdf.worker.mjs',
      ),
    },
  },
  module: {
    ...base.module,
    // The worker runs on the page (see rendererPage.web.ts), so the worker
    // file the web build serves isn't needed: its import is left as a URL
    // and the file isn't written.
    rules: base.module.rules.map(rule =>
      String(rule.test) === String(/pdf\.worker\.min\.mjs$/)
        ? { ...rule, generator: { emit: false } }
        : rule,
    ),
  },
  plugins: [
    ...base.plugins.filter(plugin => !(plugin instanceof HtmlWebpackPlugin)),
    new HtmlWebpackPlugin({
      templateContent:
        '<!doctype html><html><head><meta charset="utf-8"></head><body></body></html>',
      filename: 'index.html',
    }),
  ],
  performance: { hints: false },
  devServer: undefined,
};

webpack(config, (error, stats) => {
  if (error || stats.hasErrors()) {
    console.error(error || stats.toString('errors-only'));
    process.exit(1);
  }
  console.log(`Drawing renderer built in ${config.output.path}`);
});
