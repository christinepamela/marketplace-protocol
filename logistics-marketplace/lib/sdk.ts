/**
 * Rangkai SDK Instance
 * Shared SDK instance for all API calls
 */

import { RangkaiSDK } from '@rangkai/sdk'

export const sdk = new RangkaiSDK({
  apiUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1'
})

export default sdk