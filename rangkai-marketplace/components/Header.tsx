'use client'

import Link from 'next/link'
import { ShoppingCart, User, Search, Menu, X } from 'lucide-react'
import { useState } from 'react'

export default function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-barely-beige">
      <nav className="container-custom">
        <div className="flex items-center justify-between h-16 md:h-20">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2 group">
            <span className="text-2xl md:text-3xl font-serif font-medium tracking-tight group-hover:text-warm-taupe transition-colors">
              Rangkai
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            <Link 
              href="/products" 
              className="text-soft-black hover:text-warm-taupe transition-colors font-medium"
            >
              Shop
            </Link>
            <Link 
              href="/vendors" 
              className="text-soft-black hover:text-warm-taupe transition-colors font-medium"
            >
              Vendors
            </Link>
            <Link 
              href="/about" 
              className="text-soft-black hover:text-warm-taupe transition-colors font-medium"
            >
              About
            </Link>
          </div>

          {/* Desktop Actions */}
          <div className="hidden md:flex items-center space-x-6">
            {/* Search */}
            <button 
              className="text-soft-black hover:text-warm-taupe transition-colors"
              aria-label="Search"
            >
              <Search className="w-5 h-5" />
            </button>

            {/* Account */}
            <Link 
              href="/auth/login"
              className="text-soft-black hover:text-warm-taupe transition-colors"
              aria-label="Account"
            >
              <User className="w-5 h-5" />
            </Link>

            {/* Cart */}
            <Link 
              href="/cart"
              className="relative text-soft-black hover:text-warm-taupe transition-colors"
              aria-label="Shopping cart"
            >
              <ShoppingCart className="w-5 h-5" />
              {/* Cart count badge - will be dynamic later */}
              <span className="absolute -top-2 -right-2 bg-soft-black text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">
                0
              </span>
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden text-soft-black hover:text-warm-taupe transition-colors"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? (
              <X className="w-6 h-6" />
            ) : (
              <Menu className="w-6 h-6" />
            )}
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-barely-beige py-4">
            <div className="flex flex-col space-y-4">
              <Link 
                href="/products"
                className="text-soft-black hover:text-warm-taupe transition-colors font-medium py-2"
                onClick={() => setMobileMenuOpen(false)}
              >
                Shop
              </Link>
              <Link 
                href="/vendors"
                className="text-soft-black hover:text-warm-taupe transition-colors font-medium py-2"
                onClick={() => setMobileMenuOpen(false)}
              >
                Vendors
              </Link>
              <Link 
                href="/about"
                className="text-soft-black hover:text-warm-taupe transition-colors font-medium py-2"
                onClick={() => setMobileMenuOpen(false)}
              >
                About
              </Link>
              <div className="flex items-center space-x-4 pt-4 border-t border-barely-beige">
                <Link 
                  href="/auth/login"
                  className="flex items-center space-x-2 text-soft-black hover:text-warm-taupe transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <User className="w-5 h-5" />
                  <span>Account</span>
                </Link>
                <Link 
                  href="/cart"
                  className="flex items-center space-x-2 text-soft-black hover:text-warm-taupe transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <ShoppingCart className="w-5 h-5" />
                  <span>Cart (0)</span>
                </Link>
              </div>
            </div>
          </div>
        )}
      </nav>
    </header>
  )
}