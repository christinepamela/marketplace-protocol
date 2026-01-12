/**
 * Rangkai SDK Instance
 * Shared SDK instance for all API calls
 */
import { RangkaiSDK } from '@rangkai/sdk'

// Get token from localStorage
function getToken(): string | undefined {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('rangkai_token') || undefined
  }
  return undefined
}

// Create SDK instance with token
export const sdk = new RangkaiSDK({
  apiUrl: 'http://localhost:3000',
  sandbox: true,
  token: getToken() // ← Use 'token' property instead of 'getToken'
})

// Update token whenever it changes
if (typeof window !== 'undefined') {
  const originalSetItem = localStorage.setItem
  localStorage.setItem = function(key, value) {
    originalSetItem.apply(this, [key, value] as any)
    if (key === 'rangkai_token') {
      // Token changed, recreate SDK instance
      location.reload()
    }
  }
}

export default sdk