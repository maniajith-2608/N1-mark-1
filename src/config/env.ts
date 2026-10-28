import { Platform } from 'react-native';

/**
 * N1 Core API (run it with `pnpm dev` in N1-mark-1-backend). Web builds use
 * N1_API_URL, falling back to the dev server's /api proxy (webpack.config.js)
 * because the local backend only allows browser calls from its docs site.
 * The Android emulator reaches the Mac at 10.0.2.2; on a real phone use the
 * Mac's LAN IP instead.
 */
export const API_BASE_URL = Platform.select({
  web: process.env.N1_API_URL || '/api',
  android: 'http://10.0.2.2:3000',
  default: 'http://127.0.0.1:3000',
});
/**
 * Web dev only: the dev server path that forwards presigned file uploads to
 * S3, whose CORS allows only the deployed app (webpack.config.js).
 */
export const UPLOAD_PROXY =
  Platform.OS === 'web' ? process.env.N1_UPLOAD_PROXY || '' : '';
export const API_TIMEOUT_MS = 15000;

/** Sent as x-app-version on every request; keep in step with package.json. */
export const APP_VERSION = '0.0.1';
