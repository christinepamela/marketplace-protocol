'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/lib/contexts/AuthContext'
import { getBuyerOrders, getVendorOrders } from '@/lib/api/orders'
import { sdk } from '@/lib/sdk'
import type { Order, OrderStatus } from '@rangkai/sdk'
import OrderCard from '@/components/orders/OrderCard'
import { Package, ShoppingBag, Loader2 } from 'lucide-react'

type ViewMode = 'buyer' | 'vendor'

export default function OrdersPage() {
  const { user } = useAuth()
  
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<ViewMode>('buyer')
  const [statusFilter, setStatusFilter] = useState<OrderStatus | 'all'>('all')
  const [userRole, setUserRole] = useState<'buyer' | 'vendor' | 'both' | 'new'>('new')

  // Detect user role on mount
  useEffect(() => {
    async function detectRole() {
      if (!user?.did) return

      try {
        // Check for orders (buyer)
        const buyerOrders = await getBuyerOrders(user.did, { limit: 1 })
        const hasBuyerOrders = buyerOrders.length > 0

        // Check for products (vendor)
        let hasProducts = false
        try {
          const products = await sdk.catalog.getByVendor(user.did, { limit: 1 })
          hasProducts = products.length > 0
        } catch (error) {
          console.error('Failed to check vendor products:', error)
        }

        if (hasProducts && hasBuyerOrders) {
          setUserRole('both')
          setViewMode('buyer')
        } else if (hasProducts) {
          setUserRole('vendor')
          setViewMode('vendor')
        } else if (hasBuyerOrders) {
          setUserRole('buyer')
          setViewMode('buyer')
        } else {
          setUserRole('new')
        }
      } catch (error) {
        console.error('Failed to detect user role:', error)
      }
    }

    detectRole()
  }, [user])

  // Fetch orders based on view mode
  const fetchOrders = useCallback(async () => {
    if (!user) return

    setLoading(true)
    try {
      const fetchFn = viewMode === 'buyer' ? getBuyerOrders : getVendorOrders
      const options = statusFilter !== 'all' ? { status: statusFilter } : {}
      
      const data = await fetchFn(user.did, options)
      setOrders(data)
    } catch (error) {
      console.error('Failed to fetch orders:', error)
    } finally {
      setLoading(false)
    }
  }, [user, viewMode, statusFilter])

  useEffect(() => {
    if (user && userRole !== 'new') {
      fetchOrders()
    }
  }, [user, userRole, fetchOrders])

  // Loading state
  if (!user) {
    return (
      <div className="container-custom section-padding text-center">
        <h1 className="mb-4">Please Log In</h1>
        <p className="text-warm-gray">You need to be logged in to view orders.</p>
      </div>
    )
  }

  // New user (no orders or products)
  if (userRole === 'new') {
    return (
      <div className="container-custom section-padding text-center">
        <div className="max-w-md mx-auto">
          <Package size={64} className="mx-auto text-warm-gray mb-6" />
          <h1 className="mb-4">Welcome to Rangkai!</h1>
          <p className="text-warm-gray mb-8">
            You haven't placed any orders or listed any products yet.
          </p>
          <div className="grid grid-cols-2 gap-4">
            <a href="/products" className="btn btn-primary">
              Start Shopping
            </a>
            <a href="/vendor/products/new" className="btn btn-secondary">
              Start Selling
            </a>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container-custom section-padding">
      {/* Header */}
      <div className="mb-8">
        <h1 className="mb-2">Orders</h1>
        <p className="text-lg text-warm-gray">
          {viewMode === 'buyer' ? 'Orders you have placed' : 'Orders to fulfill'}
        </p>
      </div>

      {/* View Toggle (if user is both buyer and vendor) */}
      {userRole === 'both' && (
        <div className="mb-6 flex justify-center">
          <div className="inline-flex border border-barely-beige bg-white">
            <button
              onClick={() => setViewMode('buyer')}
              className={`
                px-6 py-2 text-sm font-medium transition-colors
                ${viewMode === 'buyer'
                  ? 'bg-soft-black text-white'
                  : 'text-warm-gray hover:text-soft-black'
                }
              `}
            >
              <ShoppingBag size={16} className="inline mr-2" />
              Buyer View
            </button>
            <button
              onClick={() => setViewMode('vendor')}
              className={`
                px-6 py-2 text-sm font-medium transition-colors border-l border-barely-beige
                ${viewMode === 'vendor'
                  ? 'bg-soft-black text-white'
                  : 'text-warm-gray hover:text-soft-black'
                }
              `}
            >
              <Package size={16} className="inline mr-2" />
              Vendor View
            </button>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="mb-6 flex items-center justify-between">
        {/* Results count */}
        <p className="text-sm text-warm-gray">
          {orders.length} order{orders.length !== 1 ? 's' : ''} found
        </p>

        {/* Status filter */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as OrderStatus | 'all')}
          className="input w-auto text-sm"
        >
          <option value="all">All Statuses</option>
          <option value="payment_pending">Payment Pending</option>
          <option value="paid">Paid</option>
          <option value="confirmed">Confirmed</option>
          <option value="shipped">Shipped</option>
          <option value="delivered">Delivered</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      {/* Orders list */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={32} className="animate-spin text-warm-gray" />
        </div>
      ) : orders.length === 0 ? (
        <div className="text-center py-20">
          <Package size={64} className="mx-auto text-warm-gray mb-4" />
          <h3 className="text-xl font-medium mb-2">No orders found</h3>
          <p className="text-warm-gray">
            {statusFilter === 'all'
              ? viewMode === 'buyer'
                ? "You haven't placed any orders yet."
                : "You don't have any orders to fulfill yet."
              : `No orders with status: ${statusFilter}`
            }
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {orders.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              viewMode={viewMode}
            />
          ))}
        </div>
      )}
    </div>
  )
}