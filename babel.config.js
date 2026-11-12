/**
 * N1_APP_ENV picks the backend a native build talks to (src/config/env.ts):
 * dev and sit use the SIT API, prod uses production. Unset means sit, so a
 * build only reaches production when asked to explicitly.
 */
const APP_ENVS = ['dev', 'sit', 'prod'];
const appEnv = process.env.N1_APP_ENV || 'sit';
if (!APP_ENVS.includes(appEnv)) {
  throw new Error(
    `N1_APP_ENV must be one of ${APP_ENVS.join(', ')}; got "${appEnv}"`,
  );
}

// Metro does not expose process.env to the app, so bake the value in.
const inlineAppEnv = ({ types: t }) => ({
  name: 'inline-n1-app-env',
  visitor: {
    MemberExpression(path) {
      if (path.matchesPattern('process.env.N1_APP_ENV')) {
        path.replaceWith(t.stringLiteral(appEnv));
      }
    },
  },
});

module.exports = api => {
  // Jest sets N1_APP_ENV per test, so leave it to be read at runtime there.
  const isTest = api.env('test');
  api.cache.using(() => process.env.N1_APP_ENV);
  return {
    presets: ['module:@react-native/babel-preset'],
    plugins: [
      ...(isTest ? [] : [inlineAppEnv]),
      // Required by react-native-reanimated (used by the drawer). Must stay last.
      'react-native-worklets/plugin',
    ],
  };
};
