'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { User, LogOut, Package, Settings } from 'lucide-react'
import { useAuth } from '@/lib/contexts/AuthContext'
import { useRouter } from 'next/navigation'

/**
 * Account Menu Component
 * Dropdown menu for authenticated users
 */
export default function AccountMenu() {
  const { user, logout, isAuthenticated } = useAuth()
  const [isOpen, setIsOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Handle logout
  const handleLogout = () => {
    logout()
    setIsOpen(false)
    router.push('/')
  }

  // If not authenticated, show login link
  if (!isAuthenticated) {
    return (
      <Link 
        href="/auth/register"
        className="text-soft-black hover:text-warm-taupe transition-colors"
        aria-label="Login"
      >
        <User className="w-5 h-5" />
      </Link>
    )
  }

  return (
    <div className="relative" ref={menuRef}>
      {/* User button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="text-soft-black hover:text-warm-taupe transition-colors"
        aria-label="Account menu"
      >
        <User className="w-5 h-5" />
      </button>

      {/* Dropdown menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 bg-white border border-barely-beige shadow-soft-lg z-50">
          {/* User info */}
          <div className="px-4 py-3 border-b border-barely-beige">
            <p className="text-sm font-medium text-soft-black">
              {user?.identity.publicProfile.displayName}
            </p>
            <p className="text-xs text-warm-gray mt-1 truncate">
              {user?.did}
            </p>
            {user?.identity.publicProfile.verified && (
              <span className="inline-block mt-2 text-xs bg-muted-sage text-white px-2 py-1">
                Verified
              </span>
            )}
          </div>

          {/* Menu items */}
          <div className="py-2">
            <Link
              href="/orders"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-3 px-4 py-2 text-sm text-soft-black hover:bg-light-cream transition-colors"
            >
              <Package size={16} />
              <span>My Orders</span>
            </Link>

            <Link
              href="/profile"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-3 px-4 py-2 text-sm text-soft-black hover:bg-light-cream transition-colors"
            >
              <Settings size={16} />
              <span>Settings</span>
            </Link>
          </div>

          {/* Logout */}
          <div className="border-t border-barely-beige py-2">
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 w-full px-4 py-2 text-sm text-soft-black hover:bg-light-cream transition-colors"
            >
              <LogOut size={16} />
              <span>Logout</span>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}