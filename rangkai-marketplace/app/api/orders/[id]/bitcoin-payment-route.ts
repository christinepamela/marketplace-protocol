/**
 * API Route: Generate Bitcoin Payment Address
 * POST /api/orders/[id]/bitcoin-payment
 * 
 * Generates a unique Bitcoin escrow address for order payment
 */

import { NextRequest, NextResponse } from 'next/server'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const orderId = params.id
    const body = await request.json()
    const { amount, currency } = body

    // Get auth token from headers
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    
    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Call backend protocol API to generate Bitcoin address
    const protocolUrl = process.env.NEXT_PUBLIC_PROTOCOL_URL || 'http://localhost:3000'
    
    const response = await fetch(`${protocolUrl}/api/v1/bitcoin/generate-address`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        orderId,
        amount: {
          amount,
          currency
        }
      })
    })

    if (!response.ok) {
      const error = await response.json()
      return NextResponse.json(
        { error: error.message || 'Failed to generate payment address' },
        { status: response.status }
      )
    }

    const data = await response.json()

    return NextResponse.json({
      address: data.address,
      expectedAmount: data.expectedAmount, // satoshis
      usdAmount: data.usdAmount,
      expiresAt: data.expiresAt,
      derivationPath: data.derivationPath
    })

  } catch (error) {
    console.error('Bitcoin payment generation error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
