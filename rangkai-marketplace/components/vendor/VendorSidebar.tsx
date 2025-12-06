'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Package, ShoppingBag, Settings } from 'lucide-react'

interface VendorSidebarProps {
  stats?: {
    totalProducts: number
    activeOrders: number
    totalRevenue: string
  }
}

export default function VendorSidebar({ stats }: VendorSidebarProps) {
  const pathname = usePathname()

  const navItems = [
    {
      href: '/vendor/dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard
    },
    {
      href: '/vendor/products',
      label: 'My Products',
      icon: Package
    },
    {
      href: '/orders?view=vendor',
      label: 'Orders',
      icon: ShoppingBag
    },
    {
      href: '/vendor/settings',
      label: 'Settings',
      icon: Settings
    }
  ]

  const isActive = (href: string) => {
    if (href === '/vendor/dashboard') {
      return pathname === href
    }
    return pathname.startsWith(href)
  }

  return (
    <aside className="w-64 bg-white border-r border-barely-beige min-h-screen p-6">
      {/* Vendor Header */}
      <div className="mb-8">
        <h2 className="text-xl font-medium text-soft-black mb-1">
          Vendor Portal
        </h2>
        <p className="text-sm text-warm-gray">
          Manage your products & orders
        </p>
      </div>

      {/* Quick Stats */}
      {stats && (
        <div className="mb-8 p-4 bg-light-cream border border-barely-beige rounded">
          <h3 className="text-sm font-medium text-soft-black mb-3">
            Quick Stats
          </h3>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-warm-gray">Products</span>
              <span className="font-medium text-soft-black">
                {stats.totalProducts}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-warm-gray">Active Orders</span>
              <span className="font-medium text-soft-black">
                {stats.activeOrders}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-warm-gray">Revenue</span>
              <span className="font-medium text-soft-black">
                {stats.totalRevenue}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon
          const active = isActive(item.href)

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`
                flex items-center gap-3 px-4 py-3 rounded transition-colors
                ${active 
                  ? 'bg-soft-black text-white' 
                  : 'text-warm-gray hover:bg-light-cream hover:text-soft-black'
                }
              `}
            >
              <Icon size={20} />
              <span className="font-medium">{item.label}</span>
            </Link>
          )
        })}
      </nav>

      {/* Help Section */}
      <div className="mt-8 pt-8 border-t border-barely-beige">
        <h3 className="text-sm font-medium text-soft-black mb-2">
          Need Help?
        </h3>
        <p className="text-xs text-warm-gray mb-3">
          Check our vendor guide or contact support
        </p>
        <Link
          href="/help/vendor-guide"
          className="text-xs text-warm-taupe hover:text-soft-black transition-colors"
        >
          View Vendor Guide →
        </Link>
      </div>
    </aside>
  )
}