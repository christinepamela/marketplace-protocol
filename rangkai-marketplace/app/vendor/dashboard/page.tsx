'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import VendorSidebar from '@/components/vendor/VendorSidebar'
import { sdk } from '@/lib/sdk'
import { Package, ShoppingBag, TrendingUp, Plus } from 'lucide-react'
import Link from 'next/link'

export default function VendorDashboardPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [stats, setStats] = useState({
    totalProducts: 0,
    activeProducts: 0,
    draftProducts: 0,
    activeOrders: 0,
    totalRevenue: '$0',
    recentOrders: [] as any[]
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) {
      router.push('/auth/register')
      return
    }

    loadDashboardData()
  }, [user, router])

  async function loadDashboardData() {
    if (!user) return

    try {
      // Load vendor products
      const products = await sdk.catalog.getByVendor(user.did)
      
      // Calculate stats
      const activeProducts = products.filter(p => p.status === 'active').length
      const draftProducts = products.filter(p => p.status === 'draft').length

      // ✅ FIXED: Use correct SDK method name
      // Load vendor orders (vendor is the seller)
      const orders = await sdk.orders.getByVendor(user.did, { limit: 5 })
      const activeOrders = orders.filter(o => 
        ['paid', 'confirmed', 'processing', 'shipped'].includes(o.status)
      ).length

      // Calculate total revenue (simplified)
      const totalRevenue = orders
        .filter(o => o.status === 'completed')
        .reduce((sum, order) => sum + order.total.amount, 0)

      setStats({
        totalProducts: products.length,
        activeProducts,
        draftProducts,
        activeOrders,
        totalRevenue: `$${totalRevenue.toFixed(2)}`,
        recentOrders: orders.slice(0, 5)
      })
    } catch (error) {
      console.error('Failed to load dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  if (!user) {
    return null
  }

  return (
    <div className="flex min-h-screen bg-warm-white">
      <VendorSidebar stats={{
        totalProducts: stats.totalProducts,
        activeOrders: stats.activeOrders,
        totalRevenue: stats.totalRevenue
      }} />

      <main className="flex-1 p-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-medium text-soft-black mb-2">
            Dashboard
          </h1>
          <p className="text-warm-gray">
            Welcome back, {user.identity.publicProfile.displayName}
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 border border-barely-beige rounded">
            <div className="flex items-center justify-between mb-2">
              <Package className="w-8 h-8 text-warm-taupe" />
              <span className="text-2xl font-bold text-soft-black">
                {stats.totalProducts}
              </span>
            </div>
            <p className="text-sm text-warm-gray">Total Products</p>
            <p className="text-xs text-warm-gray mt-1">
              {stats.activeProducts} active, {stats.draftProducts} draft
            </p>
          </div>

          <div className="bg-white p-6 border border-barely-beige rounded">
            <div className="flex items-center justify-between mb-2">
              <ShoppingBag className="w-8 h-8 text-warm-taupe" />
              <span className="text-2xl font-bold text-soft-black">
                {stats.activeOrders}
              </span>
            </div>
            <p className="text-sm text-warm-gray">Active Orders</p>
            <p className="text-xs text-warm-gray mt-1">
              Requires action
            </p>
          </div>

          <div className="bg-white p-6 border border-barely-beige rounded">
            <div className="flex items-center justify-between mb-2">
              <TrendingUp className="w-8 h-8 text-warm-taupe" />
              <span className="text-2xl font-bold text-soft-black">
                {stats.totalRevenue}
              </span>
            </div>
            <p className="text-sm text-warm-gray">Total Revenue</p>
            <p className="text-xs text-warm-gray mt-1">
              All time
            </p>
          </div>

          <div className="bg-white p-6 border border-barely-beige rounded flex items-center justify-center">
            <Link
              href="/vendor/products/new"
              className="flex flex-col items-center text-center"
            >
              <Plus className="w-12 h-12 text-warm-taupe mb-2" />
              <span className="text-sm font-medium text-soft-black">
                Add Product
              </span>
            </Link>
          </div>
        </div>

        {/* Recent Orders */}
        <div className="bg-white border border-barely-beige rounded p-6">
          <h2 className="text-xl font-medium text-soft-black mb-4">
            Recent Orders
          </h2>

          {loading ? (
            <div className="text-center py-8 text-warm-gray">
              Loading orders...
            </div>
          ) : stats.recentOrders.length === 0 ? (
            <div className="text-center py-8 text-warm-gray">
              <ShoppingBag className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No orders yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {stats.recentOrders.map((order) => (
                <Link
                  key={order.id}
                  href={`/orders/${order.id}`}
                  className="block p-4 border border-barely-beige rounded hover:bg-light-cream transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-soft-black">
                        Order #{order.orderNumber}
                      </p>
                      <p className="text-sm text-warm-gray">
                        {order.items.length} item(s) • {order.status}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-soft-black">
                        ${order.total.amount.toFixed(2)}
                      </p>
                      <p className="text-xs text-warm-gray">
                        {new Date(order.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}

          <div className="mt-4 text-center">
            <Link
              href="/orders?view=vendor"
              className="text-sm text-warm-taupe hover:text-soft-black transition-colors"
            >
              View All Orders →
            </Link>
          </div>
        </div>
      </main>
    </div>
  )
}