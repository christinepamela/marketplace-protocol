/**
 * Rangkai SDK - Main Export
 * 
 * @packageDocumentation
 * Rangkai Protocol TypeScript SDK for building decentralized marketplace applications
 * 
 * @example
 * ```typescript
 * import { RangkaiSDK } from '@rangkai/sdk';
 * 
 * const sdk = new RangkaiSDK({
 *   apiUrl: 'https://api.rangkai.protocol',
 *   token: 'your-jwt-token'
 * });
 * 
 * // Use the SDK
 * const products = await sdk.catalog.search({ query: 'leather shoes' });
 * const order = await sdk.orders.create({ ... });
 * ```
 */

// Main client
export { RangkaiSDK, HttpClient } from './client';
export type { RangkaiSDKConfig } from './client';

// Modules
export { IdentityModule } from './modules/identity';
export { CatalogModule } from './modules/catalog';
export { OrdersModule } from './modules/orders';
export { LogisticsModule } from './modules/logistics';
export { TrustModule } from './modules/trust';
export { GovernanceModule } from './modules/governance';

// Module request/response types
export type * from './modules/identity';
export type * from './modules/catalog';
export type * from './modules/orders';
export type * from './modules/logistics';
export type * from './modules/trust';
export type * from './modules/governance';

// Core types
export type * from './types';

// Errors
export {
  RangkaiSDKError,
  RangkaiNetworkError,
  RangkaiAuthError,
  RangkaiForbiddenError,
  RangkaiNotFoundError,
  RangkaiValidationError,
  RangkaiRateLimitError,
  RangkaiServerError,
  mapApiError,
} from './errors';

// Version
export const SDK_VERSION = '1.0.0';
export const PROTOCOL_VERSION = 'v1';