const path = require('path');
const webpack = require('webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin');

const appDirectory = path.resolve(__dirname);

// Source files plus React Native packages that ship untranspiled code.
const babelLoaderConfiguration = {
  test: /\.[jt]sx?$/,
  include: [
    path.resolve(appDirectory, 'index.web.js'),
    path.resolve(appDirectory, 'src'),
    path.resolve(appDirectory, 'web'),
    path.resolve(appDirectory, 'node_modules/@react-native/new-app-screen'),
  ],
  use: {
    loader: 'babel-loader',
    options: {
      babelrc: false,
      configFile: false,
      cacheDirectory: true,
      presets: ['module:@react-native/babel-preset'],
    },
  },
};

// React Navigation, Reanimated & co. publish ESM with extensionless imports.
const esmResolutionConfiguration = {
  test: /\.m?js$/,
  resolve: { fullySpecified: false },
};

// pdf.js runs its parser in a worker; it is served as a file of its own.
const pdfWorkerConfiguration = {
  test: /pdf\.worker\.min\.mjs$/,
  type: 'asset/resource',
};

const assetLoaderConfiguration = {
  test: /\.(gif|jpe?g|png|svg|webp|ttf)$/,
  type: 'asset/resource',
};

module.exports = (env, argv) => {
  const isDev = argv.mode !== 'production';

  return {
    entry: path.resolve(appDirectory, 'index.web.js'),
    output: {
      path: path.resolve(appDirectory, 'dist'),
      filename: isDev ? 'bundle.js' : 'bundle.[contenthash].js',
      publicPath: '/',
      clean: true,
    },
    devtool: isDev ? 'eval-source-map' : 'source-map',
    module: {
      rules: [
        esmResolutionConfiguration,
        babelLoaderConfiguration,
        assetLoaderConfiguration,
        pdfWorkerConfiguration,
      ],
    },
    resolve: {
      // .web.* files take priority, so platform-specific code can live beside shared code.
      extensions: ['.web.tsx', '.web.ts', '.web.js', '.tsx', '.ts', '.js'],
      alias: {
        'react-native$': path.resolve(
          appDirectory,
          'web/shims/react-native.js',
        ),
        'react-native/Libraries/Core/Devtools/openURLInBrowser': path.resolve(
          appDirectory,
          'web/shims/openURLInBrowser.js',
        ),
        '@react-native/assets-registry/registry': path.resolve(
          appDirectory,
          'web/shims/assetsRegistry.js',
        ),
      },
    },
    plugins: [
      new HtmlWebpackPlugin({
        template: path.resolve(appDirectory, 'public/index.html'),
      }),
      new webpack.DefinePlugin({
        __DEV__: JSON.stringify(isDev),
        // The dev server always calls its /api proxy (which forwards to
        // N1_API_URL), since the backend refuses browser calls from
        // localhost; production builds call N1_API_URL directly.
        'process.env.N1_API_URL': JSON.stringify(
          (!isDev && process.env.N1_API_URL) || '/api',
        ),
        __REACT_NATIVE_VERSION__: JSON.stringify(
          require(path.resolve(
            appDirectory,
            'node_modules/react-native/package.json',
          )).version,
        ),
      }),
    ],
    devServer: {
      port: 8080,
      hot: true,
      historyApiFallback: true,
      static: path.resolve(appDirectory, 'public'),
      // The backend allows CORS only from its docs site, so the web app calls
      // it same-origin through /api (see src/config/env.ts).
      proxy: [
        {
          context: ['/api'],
          target:
            process.env.N1_API_PROXY_TARGET ||
            process.env.N1_API_URL ||
            'http://127.0.0.1:3000',
          // Send the target's own Host header; a remote HTTPS backend
          // (staging behind CloudFront) refuses "localhost:8080".
          changeOrigin: true,
          pathRewrite: { '^/api': '' },
        },
      ],
    },
  };
};
