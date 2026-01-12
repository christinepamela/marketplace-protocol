'use client'

import { useState } from 'react'
import { useProvider } from '@/lib/contexts/ProviderContext'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { 
  Package, 
  FileText, 
  TrendingUp, 
  User,
  LogOut,
  Menu,
  X,
  Home
} from 'lucide-react'

export default function ProviderHeader() {
  const { provider, logout } = useProvider()
  const router = useRouter()
  const pathname = usePathname()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const handleLogout = () => {
    logout()
    router.push('/register')
  }

  const navLinks = [
    { href: '/dashboard', label: 'Dashboard', icon: Home },
    { href: '/opportunities', label: 'Opportunities', icon: TrendingUp },
    { href: '/quotes', label: 'My Quotes', icon: FileText },
    { href: '/shipments', label: 'Shipments', icon: Package },
    { href: '/profile', label: 'Profile', icon: User },
  ]

  const isActive = (href: string) => pathname === href

  return (
    <header className="bg-white border-b border-barely-beige sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/dashboard" className="flex items-center gap-2">
            <Package className="w-8 h-8 text-warm-taupe" />
            <div>
              <h1 className="text-xl font-bold text-soft-black">
                Logistics Pool
              </h1>
              <p className="text-xs text-warm-gray -mt-1">
                Rangkai Protocol
              </p>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => {
              const Icon = link.icon
              const active = isActive(link.href)
              
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`
                    flex items-center gap-2 px-4 py-2 rounded-lg transition-colors
                    ${active 
                      ? 'bg-light-cream text-soft-black font-medium' 
                      : 'text-warm-gray hover:bg-light-cream hover:text-soft-black'
                    }
                  `}
                >
                  <Icon className="w-4 h-4" />
                  <span>{link.label}</span>
                </Link>
              )
            })}
          </nav>

          {/* Provider Info & Logout */}
          <div className="hidden md:flex items-center gap-4">
            {provider && (
              <div className="text-right">
                <p className="text-sm font-medium text-soft-black">
                  {provider.business_name}
                </p>
                <p className="text-xs text-warm-gray">
                  {provider.service_regions.join(', ')}
                </p>
              </div>
            )}
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 text-warm-gray hover:text-soft-black hover:bg-light-cream rounded-lg transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span>Logout</span>
            </button>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 text-warm-gray hover:text-soft-black"
          >
            {mobileMenuOpen ? (
              <X className="w-6 h-6" />
            ) : (
              <Menu className="w-6 h-6" />
            )}
          </button>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-barely-beige">
            <nav className="space-y-1">
              {navLinks.map((link) => {
                const Icon = link.icon
                const active = isActive(link.href)
                
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`
                      flex items-center gap-3 px-4 py-3 rounded-lg transition-colors
                      ${active 
                        ? 'bg-light-cream text-soft-black font-medium' 
                        : 'text-warm-gray hover:bg-light-cream hover:text-soft-black'
                      }
                    `}
                  >
                    <Icon className="w-5 h-5" />
                    <span>{link.label}</span>
                  </Link>
                )
              })}
            </nav>

            {/* Mobile Provider Info */}
            {provider && (
              <div className="mt-4 pt-4 border-t border-barely-beige px-4">
                <p className="text-sm font-medium text-soft-black mb-1">
                  {provider.business_name}
                </p>
                <p className="text-xs text-warm-gray mb-3">
                  {provider.service_regions.join(', ')}
                </p>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2 w-full px-4 py-2 text-warm-gray hover:text-soft-black hover:bg-light-cream rounded-lg transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Logout</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  )
}