'use client'

import { useState, useEffect } from 'react'
import { useProvider } from '@/lib/contexts/ProviderContext'
import { useRouter } from 'next/navigation'
import { sdk } from '@/lib/sdk'
import { 
  Package, 
  FileText, 
  TrendingUp, 
  Star,
  DollarSign,
  Clock,
  CheckCircle,
  AlertCircle
} from 'lucide-react'
import Link from 'next/link'

interface DashboardStats {
  activeShipments: number
  pendingQuotes: number
  totalDeliveries: number
  averageRating: number
  ratingCount: number
  revenueMTD: number
}

interface RecentActivity {
  id: string
  type: 'quote' | 'shipment' | 'opportunity'
  message: string
  timestamp: Date
  status?: string
}

export default function ProviderDashboard() {
  const { provider, loading: providerLoading } = useProvider()
  const router = useRouter()
  
  const [stats, setStats] = useState<DashboardStats>({
    activeShipments: 0,
    pendingQuotes: 0,
    totalDeliveries: 0,
    averageRating: 0,
    ratingCount: 0,
    revenueMTD: 0
  })
  
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (providerLoading) return
    
    if (!provider) {
      router.push('/auth/register')
      return
    }

    loadDashboardData()
  }, [provider, providerLoading, router])

  async function loadDashboardData() {
    if (!provider) return

    try {
      setLoading(true)
      setError(null)

      // Load all data in parallel
      const [quotes, shipments, allShipments] = await Promise.all([
        sdk.logistics.getProviderQuotes(provider.id, 'pending'),
        sdk.logistics.getProviderShipments(provider.id, 'in_transit'),
        sdk.logistics.getProviderShipments(provider.id)
      ])

      // Calculate active shipments (in_transit + out_for_delivery + picked_up)
      const activeShipments = allShipments.filter(s => 
        ['in_transit', 'out_for_delivery', 'picked_up'].includes(s.status)
      ).length

      // Calculate total deliveries
      const totalDeliveries = allShipments.filter(s => 
        s.status === 'delivered'
      ).length

      // Get rating from provider data
      const averageRating = provider.rating || 0
      const ratingCount = provider.total_deliveries || 0

      // Calculate MTD revenue (simplified - would need date filtering in real implementation)
      const revenueMTD = allShipments
        .filter(s => s.status === 'delivered')
        .reduce((sum, shipment) => {
          // This would come from the quote amount
          return sum + 0 // Placeholder - need to join with quotes
        }, 0)

      setStats({
        activeShipments,
        pendingQuotes: quotes.length,
        totalDeliveries,
        averageRating,
        ratingCount,
        revenueMTD
      })

      // Build recent activity
      const activities: RecentActivity[] = []

      // Add recent quotes
      quotes.slice(0, 3).forEach(quote => {
        activities.push({
          id: quote.id,
          type: 'quote',
          message: `Pending quote for order #${quote.order_id.slice(0, 8)}`,
          timestamp: new Date(quote.created_at),
          status: quote.status
        })
      })

      // Add recent shipments
      shipments.slice(0, 3).forEach(shipment => {
        activities.push({
          id: shipment.id,
          type: 'shipment',
          message: `Shipment ${shipment.tracking_number} in transit`,
          timestamp: new Date(shipment.created_at),
          status: shipment.status
        })
      })

      // Sort by timestamp
      activities.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      setRecentActivity(activities.slice(0, 5))

    } catch (err) {
      console.error('Failed to load dashboard data:', err)
      setError('Failed to load dashboard data. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (providerLoading || !provider) {
    return (
      <div className="min-h-screen bg-warm-white flex items-center justify-center">
        <div className="text-warm-gray">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-warm-white">
      <main className="max-w-7xl mx-auto p-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-medium text-soft-black mb-2">
            Welcome back, {provider.business_name}
          </h1>
          <p className="text-warm-gray">
            Here's what's happening with your logistics operations
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-600" />
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Active Shipments */}
          <div className="bg-white border border-barely-beige rounded-lg p-6">
            <div className="flex items-center justify-between mb-2">
              <Package className="w-8 h-8 text-warm-taupe" />
              <span className="text-3xl font-bold text-soft-black">
                {stats.activeShipments}
              </span>
            </div>
            <p className="text-sm font-medium text-soft-black">Active Shipments</p>
            <p className="text-xs text-warm-gray mt-1">
              Currently in transit
            </p>
          </div>

          {/* Pending Quotes */}
          <div className="bg-white border border-barely-beige rounded-lg p-6">
            <div className="flex items-center justify-between mb-2">
              <FileText className="w-8 h-8 text-warm-taupe" />
              <span className="text-3xl font-bold text-soft-black">
                {stats.pendingQuotes}
              </span>
            </div>
            <p className="text-sm font-medium text-soft-black">Pending Quotes</p>
            <p className="text-xs text-warm-gray mt-1">
              Awaiting decision
            </p>
          </div>

          {/* Total Deliveries */}
          <div className="bg-white border border-barely-beige rounded-lg p-6">
            <div className="flex items-center justify-between mb-2">
              <CheckCircle className="w-8 h-8 text-warm-taupe" />
              <span className="text-3xl font-bold text-soft-black">
                {stats.totalDeliveries}
              </span>
            </div>
            <p className="text-sm font-medium text-soft-black">Total Deliveries</p>
            <p className="text-xs text-warm-gray mt-1">
              All time completed
            </p>
          </div>

          {/* Rating & Revenue */}
          <div className="bg-white border border-barely-beige rounded-lg p-6">
            <div className="flex items-center gap-1 mb-2">
              <Star className="w-6 h-6 text-amber-500 fill-amber-500" />
              <span className="text-3xl font-bold text-soft-black">
                {stats.averageRating.toFixed(1)}
              </span>
            </div>
            <p className="text-sm font-medium text-soft-black">Average Rating</p>
            <p className="text-xs text-warm-gray mt-1">
              {stats.ratingCount} total ratings
            </p>
            <div className="mt-3 pt-3 border-t border-barely-beige">
              <div className="flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-warm-taupe" />
                <span className="text-lg font-bold text-soft-black">
                  ${stats.revenueMTD.toFixed(2)}
                </span>
              </div>
              <p className="text-xs text-warm-gray">Revenue MTD</p>
            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Activity - Takes 2 columns */}
          <div className="lg:col-span-2 bg-white border border-barely-beige rounded-lg p-6">
            <h2 className="text-xl font-medium text-soft-black mb-4">
              Recent Activity
            </h2>

            {loading ? (
              <div className="text-center py-8 text-warm-gray">
                Loading activity...
              </div>
            ) : recentActivity.length === 0 ? (
              <div className="text-center py-8 text-warm-gray">
                <Clock className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>No recent activity</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentActivity.map((activity) => (
                  <div
                    key={activity.id}
                    className="p-4 border border-barely-beige rounded-lg hover:bg-light-cream transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        {activity.type === 'quote' && (
                          <FileText className="w-5 h-5 text-warm-taupe mt-0.5" />
                        )}
                        {activity.type === 'shipment' && (
                          <Package className="w-5 h-5 text-warm-taupe mt-0.5" />
                        )}
                        {activity.type === 'opportunity' && (
                          <TrendingUp className="w-5 h-5 text-warm-taupe mt-0.5" />
                        )}
                        <div>
                          <p className="text-sm font-medium text-soft-black">
                            {activity.message}
                          </p>
                          <p className="text-xs text-warm-gray mt-1">
                            {activity.timestamp.toLocaleDateString()} at{' '}
                            {activity.timestamp.toLocaleTimeString()}
                          </p>
                        </div>
                      </div>
                      {activity.status && (
                        <span className="px-2 py-1 bg-amber-100 text-amber-800 rounded text-xs">
                          {activity.status}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick Actions - Takes 1 column */}
          <div className="bg-white border border-barely-beige rounded-lg p-6">
            <h2 className="text-xl font-medium text-soft-black mb-4">
              Quick Actions
            </h2>

            <div className="space-y-3">
              <Link
                href="/opportunities"
                className="block w-full bg-warm-taupe text-white px-4 py-3 rounded-lg hover:bg-soft-black transition-colors text-center font-medium"
              >
                View Opportunities
              </Link>

              <Link
                href="/quotes"
                className="block w-full border border-warm-taupe text-warm-taupe px-4 py-3 rounded-lg hover:bg-light-cream transition-colors text-center font-medium"
              >
                My Quotes
              </Link>

              <Link
                href="/shipments"
                className="block w-full border border-warm-taupe text-warm-taupe px-4 py-3 rounded-lg hover:bg-light-cream transition-colors text-center font-medium"
              >
                Manage Shipments
              </Link>

              <Link
                href="/profile"
                className="block w-full border border-barely-beige text-warm-gray px-4 py-3 rounded-lg hover:bg-light-cream transition-colors text-center font-medium"
              >
                Profile Settings
              </Link>
            </div>

            {/* Stats Summary */}
            <div className="mt-6 pt-6 border-t border-barely-beige">
              <h3 className="text-sm font-medium text-soft-black mb-3">
                Service Regions
              </h3>
              <div className="flex flex-wrap gap-2">
                {provider.service_regions.map((region) => (
                  <span
                    key={region}
                    className="px-2 py-1 bg-light-cream border border-barely-beige rounded text-xs text-soft-black"
                  >
                    {region}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}