/**
 * Auth API Functions
 * Helper functions for user registration and authentication
 */

import { sdk } from '@/lib/sdk'
import type { IdentityType, BusinessType, PublicProfile } from '@rangkai/sdk'

// ============================================================================
// TYPES
// ============================================================================

export interface RegisterRequest {
  type: IdentityType
  businessType: BusinessType
  displayName: string
  email: string
  password: string
  country?: string
  bio?: string
}

export interface RegisterResponse {
  did: string
  token: string
  refreshToken: string | null  // ✅ NEW: null for anonymous users
  identity: any
}

// ============================================================================
// REGISTRATION
// ============================================================================

/**
 * Register new user identity
 * 
 * @param data - Registration data
 * @returns DID, JWT tokens, and identity object
 */
export async function register(data: RegisterRequest): Promise<RegisterResponse> {
  try {
    // Build public profile
    const publicProfile: PublicProfile = {
      displayName: data.displayName,
      businessType: data.businessType,
      country: data.country,
      verified: false,
      bio: data.bio
    }
    
    // Call SDK to register
    const response = await sdk.identity.register({
      type: data.type,
      clientId: 'rangkai-marketplace',
      publicProfile,
      contactInfo: {
        email: data.email
      },
      metadata: getMetadataForType(data.type, data)
    })
    
    return {
      did: response.did,
      token: response.token,
      refreshToken: response.refreshToken, // ✅ NEW: Pass through refresh token
      identity: response.identity
    }
  } catch (error) {
    console.error('Failed to register:', error)
    throw error
  }
}

/**
 * Build metadata based on identity type
 */
function getMetadataForType(type: IdentityType, data: RegisterRequest): any {
  switch (type) {
    case 'kyc':
      return {
        kyc: {
          businessName: data.displayName,
          country: data.country || '',
          ownerName: data.displayName,
          email: data.email,
          // Other KYC fields would be collected in a more detailed form
          // For now, we use minimal data
        }
      }
    
    case 'anonymous':
      return {
        anonymous: {
          dailyLimit: 1000, // Default limits
          escrowPremium: 0.05
        }
      }
    
    case 'nostr':
      return {
        nostr: {
          pubkey: '', // Would be provided by Nostr extension
          displayName: data.displayName,
          country: data.country
        }
      }
    
    default:
      return {}
  }
}

// ============================================================================
// VALIDATION
// ============================================================================

/**
 * Validate registration data
 * Returns array of error messages, empty if valid
 */
export function validateRegistrationData(data: Partial<RegisterRequest>): string[] {
  const errors: string[] = []
  
  if (!data.displayName?.trim()) {
    errors.push('Display name is required')
  }
  
  if (!data.email?.trim()) {
    errors.push('Email is required')
  } else if (!isValidEmail(data.email)) {
    errors.push('Invalid email format')
  }
  
  if (!data.password || data.password.length < 8) {
    errors.push('Password must be at least 8 characters')
  }
  
  if (!data.type) {
    errors.push('Identity type is required')
  }
  
  if (!data.businessType) {
    errors.push('Business type is required')
  }
  
  return errors
}

/**
 * Validate email format
 */
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}