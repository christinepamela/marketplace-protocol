import Link from 'next/link'

export default function Footer() {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="bg-light-cream border-t border-barely-beige mt-auto">
      <div className="container-custom py-12 md:py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 md:gap-12">
          {/* Brand Column */}
          <div className="md:col-span-1">
            <Link href="/" className="inline-block mb-4">
              <span className="text-2xl font-serif font-medium">Rangkai</span>
            </Link>
            <p className="text-sm text-warm-gray leading-relaxed">
              Connecting artisans and small businesses with buyers worldwide through a decentralized marketplace.
            </p>
          </div>

          {/* Shop Column */}
          <div>
            <h4 className="font-medium text-soft-black mb-4">Shop</h4>
            <ul className="space-y-2">
              <li>
                <Link href="/products?category=footwear" className="text-sm text-warm-gray hover:text-soft-black transition-colors">
                  Footwear
                </Link>
              </li>
              <li>
                <Link href="/products?category=bags" className="text-sm text-warm-gray hover:text-soft-black transition-colors">
                  Bags
                </Link>
              </li>
              <li>
                <Link href="/products?category=accessories" className="text-sm text-warm-gray hover:text-soft-black transition-colors">
                  Accessories
                </Link>
              </li>
              <li>
                <Link href="/products" className="text-sm text-warm-gray hover:text-soft-black transition-colors">
                  All Products
                </Link>
              </li>
            </ul>
          </div>

          {/* For Vendors Column */}
          <div>
            <h4 className="font-medium text-soft-black mb-4">For Vendors</h4>
            <ul className="space-y-2">
              <li>
                <Link href="/vendors/register" className="text-sm text-warm-gray hover:text-soft-black transition-colors">
                  Start Selling
                </Link>
              </li>
              <li>
                <Link href="/vendors/dashboard" className="text-sm text-warm-gray hover:text-soft-black transition-colors">
                  Vendor Dashboard
                </Link>
              </li>
              <li>
                <Link href="/vendors/guide" className="text-sm text-warm-gray hover:text-soft-black transition-colors">
                  Seller Guide
                </Link>
              </li>
              <li>
                <Link href="/vendors/fees" className="text-sm text-warm-gray hover:text-soft-black transition-colors">
                  Fees & Pricing
                </Link>
              </li>
            </ul>
          </div>

          {/* Support Column */}
          <div>
            <h4 className="font-medium text-soft-black mb-4">Support</h4>
            <ul className="space-y-2">
              <li>
                <Link href="/about" className="text-sm text-warm-gray hover:text-soft-black transition-colors">
                  About Us
                </Link>
              </li>
              <li>
                <Link href="/help" className="text-sm text-warm-gray hover:text-soft-black transition-colors">
                  Help Center
                </Link>
              </li>
              <li>
                <Link href="/shipping" className="text-sm text-warm-gray hover:text-soft-black transition-colors">
                  Shipping Info
                </Link>
              </li>
              <li>
                <Link href="/contact" className="text-sm text-warm-gray hover:text-soft-black transition-colors">
                  Contact Us
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 pt-8 border-t border-barely-beige">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <p className="text-sm text-warm-gray">
              © {currentYear} Rangkai Protocol. Built on Bitcoin.
            </p>
            <div className="flex items-center space-x-6">
              <Link href="/privacy" className="text-sm text-warm-gray hover:text-soft-black transition-colors">
                Privacy Policy
              </Link>
              <Link href="/terms" className="text-sm text-warm-gray hover:text-soft-black transition-colors">
                Terms of Service
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}