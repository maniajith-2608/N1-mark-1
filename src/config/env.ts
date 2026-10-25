import { Platform } from 'react-native';

/**
 * N1 Core API (run it with `pnpm dev` in N1-mark-1-backend). Web calls go
 * through the dev server's /api proxy (webpack.config.js) because the backend
 * only allows browser calls from its docs site. The Android emulator reaches
 * the Mac at 10.0.2.2; on a real phone use the Mac's LAN IP instead.
 */
export const API_BASE_URL = Platform.select({
  web: '/api',
  android: 'http://10.0.2.2:3000',
  default: 'http://127.0.0.1:3000',
});
export const API_TIMEOUT_MS = 15000;

/** Sent as x-app-version on every request; keep in step with package.json. */
export const APP_VERSION = '0.0.1';
