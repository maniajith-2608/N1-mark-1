import { Platform } from 'react-native';

/** N1 Core API on staging (SIT database). */
export const STAGING_API_URL = 'https://api.staging.app.none1.in';

/** N1 Core API in production (live database). */
export const LIVE_API_URL = 'https://api.app.none1.in';

/**
 * Native build environment: dev, sit or prod. Set N1_APP_ENV when starting
 * Metro or building; babel.config.js bakes it into the bundle. Unset means sit.
 */
export const APP_ENV = process.env.N1_APP_ENV || 'sit';

/**
 * Web builds use N1_API_URL, falling back to the dev server's /api proxy
 * (webpack.config.js, which forwards to staging) because the backend only
 * allows browser calls from its docs site. Native apps call the API directly:
 * dev and sit builds use staging (SIT), only prod builds use live.
 */
export const API_BASE_URL = Platform.select({
  web: process.env.N1_API_URL || '/api',
  default: APP_ENV === 'prod' ? LIVE_API_URL : STAGING_API_URL,
});
/**
 * Web dev only: the dev server path that forwards presigned file uploads
 * (and drawing downloads) to S3, whose CORS allows only the deployed app (webpack.config.js).
 */
export const UPLOAD_PROXY =
  Platform.OS === 'web' ? process.env.N1_UPLOAD_PROXY || '' : '';
export const API_TIMEOUT_MS = 15000;

/** Sent as x-app-version on every request; keep in step with package.json. */
export const APP_VERSION = '0.0.1';
