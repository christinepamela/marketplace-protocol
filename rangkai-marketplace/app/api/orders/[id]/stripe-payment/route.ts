/**
 * API Route: Initiate Stripe Payment
 * POST /api/orders/[id]/stripe-payment
 */
import { NextRequest, NextResponse } from 'next/server'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const orderId = params.id
    const token = request.headers.get('authorization')?.replace('Bearer ', '')

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const protocolUrl = process.env.NEXT_PUBLIC_PROTOCOL_URL || 'http://localhost:3000'

    const paymentResponse = await fetch(
      `${protocolUrl}/api/v1/orders/${orderId}/initiate-payment`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ paymentMethod: 'stripe' })
      }
    )

    if (!paymentResponse.ok) {
      const error = await paymentResponse.json()
      return NextResponse.json(
        { error: error.message || 'Failed to initiate Stripe payment' },
        { status: paymentResponse.status }
      )
    }

    const paymentData = await paymentResponse.json()

    return NextResponse.json({
      url: paymentData.data?.url,
      sessionId: paymentData.data?.sessionId,
    })

  } catch (error) {
    console.error('Stripe payment initiation error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}