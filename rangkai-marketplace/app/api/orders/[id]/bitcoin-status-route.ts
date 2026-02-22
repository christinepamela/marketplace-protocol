/**
 * API Route: Check Bitcoin Payment Status
 * GET /api/orders/[id]/bitcoin-status
 * 
 * Checks if Bitcoin payment has been received and confirmed
 */

import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const orderId = params.id

    // Get auth token from headers
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    
    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Call backend protocol API to check payment status
    const protocolUrl = process.env.NEXT_PUBLIC_PROTOCOL_URL || 'http://localhost:3000'
    
    const response = await fetch(`${protocolUrl}/api/v1/bitcoin/payment-status/${orderId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      const error = await response.json()
      return NextResponse.json(
        { error: error.message || 'Failed to check payment status' },
        { status: response.status }
      )
    }

    const data = await response.json()

    return NextResponse.json({
      address: data.address,
      confirmed: data.confirmed,
      confirmations: data.confirmations,
      amountReceived: data.amountReceived,
      txid: data.txid,
      blockHeight: data.blockHeight
    })

  } catch (error) {
    console.error('Bitcoin status check error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
