import { RangkaiSDK } from '@rangkai/sdk'

/**
 * SDK Configuration
 * 
 * This connects your frontend to your Rangkai Protocol backend.
 * Make sure your protocol API is running at the URL below.
 */

// Get API URL from environment variable or use default
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'

/**
 * Create SDK instance
 * 
 * This is a singleton - one instance shared across your app.
 * We'll add authentication token later when users log in.
 */
export function createSDK(token?: string) {
  return new RangkaiSDK({
    apiUrl: API_URL,
    token: token,
  })
}

// Export a default instance for unauthenticated requests
// (like browsing products before logging in)
export const sdk = createSDK()

/**
 * Helper: Get SDK with user authentication
 * 
 * Call this after user logs in to get an authenticated SDK instance.
 * We'll implement proper auth in Session 4.
 */
export function getAuthenticatedSDK(token: string) {
  return createSDK(token)
}

/**
 * Type exports for convenience
 * 
 * These types come from your protocol SDK.
 * Use them throughout your app for type safety.
 */
export type {
  Product,
  Order,
  Identity,
  Review,
  Dispute,
} from '@rangkai/sdk'