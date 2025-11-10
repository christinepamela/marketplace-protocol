import Link from 'next/link'
import { ArrowRight, ShieldCheck, Globe, Zap } from 'lucide-react'

export default function HomePage() {
  return (
    <div>
      {/* Hero Section */}
      <section className="section-padding bg-warm-white">
        <div className="container-custom">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="mb-6 text-balance">
              Global Marketplace for Small Businesses
            </h1>
            <p className="text-xl md:text-2xl text-warm-gray mb-8 text-balance max-w-2xl mx-auto">
              Connecting artisans and manufacturers with buyers worldwide through a decentralized, Bitcoin-native platform.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/products" className="btn btn-primary w-full sm:w-auto">
                Shop Now
                <ArrowRight className="inline-block ml-2 w-5 h-5" />
              </Link>
              <Link href="/vendors/register" className="btn btn-secondary w-full sm:w-auto">
                Start Selling
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="section-padding bg-white">
        <div className="container-custom">
          <div className="text-center mb-12">
            <h2 className="mb-4">Why Rangkai?</h2>
            <p className="text-lg text-warm-gray max-w-2xl mx-auto">
              Built on principles of decentralization, fairness, and empowerment for small businesses.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12">
            {/* Feature 1 */}
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 mb-6 bg-light-cream border border-barely-beige">
                <ShieldCheck className="w-8 h-8 text-warm-taupe" />
              </div>
              <h3 className="text-2xl mb-3">Non-Custodial</h3>
              <p className="text-warm-gray">
                Your funds, your control. 7-day escrow with automatic release ensures secure transactions without intermediaries.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 mb-6 bg-light-cream border border-barely-beige">
                <Globe className="w-8 h-8 text-warm-taupe" />
              </div>
              <h3 className="text-2xl mb-3">Global Reach</h3>
              <p className="text-warm-gray">
                Connect with buyers and sellers worldwide. Federated marketplace network with unified search and discovery.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 mb-6 bg-light-cream border border-barely-beige">
                <Zap className="w-8 h-8 text-warm-taupe" />
              </div>
              <h3 className="text-2xl mb-3">Fair Fees</h3>
              <p className="text-warm-gray">
                Just 3% protocol fee. No hidden costs, no surprises. Lightning Network support for instant, low-cost payments.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Categories Preview */}
      <section className="section-padding bg-light-cream">
        <div className="container-custom">
          <div className="text-center mb-12">
            <h2 className="mb-4">Shop by Category</h2>
            <p className="text-lg text-warm-gray">
              Discover unique, handcrafted products from artisans around the world.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Category 1 - Footwear */}
            <Link href="/products?category=footwear" className="group">
              <div className="bg-white border border-barely-beige overflow-hidden hover:shadow-soft transition-shadow">
                <div className="aspect-square bg-barely-beige relative">
                  <div className="absolute inset-0 flex items-center justify-center text-warm-gray">
                    <span className="text-6xl">👟</span>
                  </div>
                </div>
                <div className="p-6">
                  <h4 className="font-medium text-soft-black group-hover:text-warm-taupe transition-colors">
                    Footwear
                  </h4>
                  <p className="text-sm text-warm-gray mt-1">
                    Handcrafted shoes & sandals
                  </p>
                </div>
              </div>
            </Link>

            {/* Category 2 - Bags */}
            <Link href="/products?category=bags" className="group">
              <div className="bg-white border border-barely-beige overflow-hidden hover:shadow-soft transition-shadow">
                <div className="aspect-square bg-barely-beige relative">
                  <div className="absolute inset-0 flex items-center justify-center text-warm-gray">
                    <span className="text-6xl">👜</span>
                  </div>
                </div>
                <div className="p-6">
                  <h4 className="font-medium text-soft-black group-hover:text-warm-taupe transition-colors">
                    Bags
                  </h4>
                  <p className="text-sm text-warm-gray mt-1">
                    Leather goods & accessories
                  </p>
                </div>
              </div>
            </Link>

            {/* Category 3 - Accessories */}
            <Link href="/products?category=accessories" className="group">
              <div className="bg-white border border-barely-beige overflow-hidden hover:shadow-soft transition-shadow">
                <div className="aspect-square bg-barely-beige relative">
                  <div className="absolute inset-0 flex items-center justify-center text-warm-gray">
                    <span className="text-6xl">⌚</span>
                  </div>
                </div>
                <div className="p-6">
                  <h4 className="font-medium text-soft-black group-hover:text-warm-taupe transition-colors">
                    Accessories
                  </h4>
                  <p className="text-sm text-warm-gray mt-1">
                    Watches, jewelry & more
                  </p>
                </div>
              </div>
            </Link>

            {/* Category 4 - Home & Living */}
            <Link href="/products?category=home" className="group">
              <div className="bg-white border border-barely-beige overflow-hidden hover:shadow-soft transition-shadow">
                <div className="aspect-square bg-barely-beige relative">
                  <div className="absolute inset-0 flex items-center justify-center text-warm-gray">
                    <span className="text-6xl">🏠</span>
                  </div>
                </div>
                <div className="p-6">
                  <h4 className="font-medium text-soft-black group-hover:text-warm-taupe transition-colors">
                    Home & Living
                  </h4>
                  <p className="text-sm text-warm-gray mt-1">
                    Décor & lifestyle products
                  </p>
                </div>
              </div>
            </Link>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="section-padding bg-soft-black text-white">
        <div className="container-custom">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="mb-6 text-white">Ready to Start Selling?</h2>
            <p className="text-lg text-gray-300 mb-8">
              Join thousands of artisans and small businesses already selling on Rangkai. Set up your shop in minutes.
            </p>
            <Link href="/vendors/register" className="btn bg-white text-soft-black border-white hover:bg-light-cream">
              Create Your Shop
              <ArrowRight className="inline-block ml-2 w-5 h-5" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}