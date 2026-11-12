const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * @type {import('@react-native/metro-config').MetroConfig}
 */
const config = {
  // babel.config.js inlines N1_APP_ENV, so a cached SIT bundle must never be
  // reused for a prod build (or the other way round).
  cacheVersion: process.env.N1_APP_ENV || 'sit',
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
