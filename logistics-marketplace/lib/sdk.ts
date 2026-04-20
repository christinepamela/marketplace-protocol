/**
 * Rangkai SDK Instance — Logistics Marketplace
 * Path: logistics-marketplace/lib/sdk.ts
 *
 * FIXED:
 *   1. API URL now reads from NEXT_PUBLIC_API_URL env var (no hardcoded localhost)
 *   2. Sandbox flag reads from NEXT_PUBLIC_SANDBOX env var
 *   3. localStorage monkey-patch removed — was causing full page reloads on every token write
 *   4. Token is NOT read at module init (it was always stale). Call sdk.setToken() after login.
 */
import { RangkaiSDK } from '@rangkai/sdk';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
const IS_SANDBOX = process.env.NEXT_PUBLIC_SANDBOX !== 'false'; // defaults true in dev

export const sdk = new RangkaiSDK({
  apiUrl: API_URL,
  sandbox: IS_SANDBOX,
  // No token here — call sdk.setToken(token) explicitly after login
});

export default sdk;
