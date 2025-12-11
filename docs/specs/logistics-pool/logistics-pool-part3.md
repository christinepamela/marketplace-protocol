# 🚚 Logistics Pool Specifications - Part 3

**Version:** 1.0  
**Date:** December 11, 2025  
**Status:** Final Specification  
**Related Docs:** [Part 1: Overview](logistics-pool-part1.md), [Part 2: Features](logistics-pool-part2.md)

---

## Table of Contents

1. [Technical Stack](#technical-stack)
2. [SDK Integration](#sdk-integration)
3. [Database Schema](#database-schema)
4. [API Endpoints](#api-endpoints)
5. [UI Components](#ui-components)
6. [State Management](#state-management)
7. [Testing Strategy](#testing-strategy)
8. [Deployment](#deployment)

---

## Technical Stack

### Frontend Application

```yaml
Framework: Next.js 14.2.15
Language: TypeScript 5.x (strict mode)
Styling: Tailwind CSS 3.x
State: Zustand 4.x
UI Library: React 18.x
Icons: Lucide React
```

### Backend Integration

```yaml
Protocol: Rangkai Protocol (existing)
SDK: @rangkai/sdk (npm package)
Database: Supabase PostgreSQL (shared)
Auth: JWT tokens (30-day validity)
```

### Development Tools

```yaml
Package Manager: npm
Bundler: Next.js built-in (Turbopack)
Linter: ESLint
Formatter: Prettier
Version Control: Git + GitHub
```

---

## SDK Integration

### Installation

```bash
# In logistics-marketplace directory
npm install @rangkai/sdk

# Link during development
cd marketplace-protocol/packages/sdk
npm link

cd logistics-marketplace
npm link @rangkai/sdk
```

### SDK Instance

```typescript
// lib/sdk.ts
import { RangkaiSDK } from '@rangkai/sdk'

export const sdk = new RangkaiSDK({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1',
  // No API key needed - JWT handled automatically
})

export default sdk
```

### SDK Methods Available

```typescript
// Provider Management
sdk.logistics.registerProvider(data)
sdk.logistics.getProvider(providerId)
sdk.logistics.searchProviders(filters)
sdk.logistics.updateProviderCapabilities(providerId, updates)

// Quote Management
sdk.logistics.submitQuote(quoteData)
sdk.logistics.getQuotesForOrder(orderId)
sdk.logistics.acceptQuote(quoteId)
sdk.logistics.rejectQuote(quoteId)

// NEW METHODS NEEDED (Issue #16):
sdk.logistics.getProviderQuotes(providerId, status?)
sdk.logistics.getOpportunities(filters?)
sdk.logistics.favoriteProvider(providerId)
sdk.logistics.getFavoriteProviders()

// Shipment Management
sdk.logistics.createShipment(shipmentData)
sdk.logistics.getShipment(shipmentId)
sdk.logistics.getShipmentByOrder(orderId)
sdk.logistics.updateTracking(shipmentId, update)
sdk.logistics.getTrackingHistory(shipmentId)

// NEW METHODS NEEDED:
sdk.logistics.getProviderShipments(providerId, status?)
sdk.logistics.confirmDelivery(shipmentId, proof)
```

---

## Database Schema

### Existing Tables (Layer 3)

**logistics_providers**
```sql
CREATE TABLE logistics_providers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_name TEXT NOT NULL,
  identity_did TEXT NOT NULL,
  service_regions TEXT[] NOT NULL,
  shipping_methods TEXT[] NOT NULL,
  insurance_available BOOLEAN DEFAULT false,
  average_rating DECIMAL(3,2),
  total_deliveries INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**shipping_quotes**
```sql
CREATE TABLE shipping_quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES orders(id),
  provider_id UUID REFERENCES logistics_providers(id),
  method TEXT NOT NULL,
  price_sats INTEGER,
  price_fiat DECIMAL(10,2),
  currency TEXT DEFAULT 'USD',
  estimated_days INTEGER NOT NULL,
  insurance_included BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'pending',
  valid_until TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**shipments**
```sql
CREATE TABLE shipments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES orders(id) UNIQUE,
  quote_id UUID REFERENCES shipping_quotes(id),
  provider_id UUID REFERENCES logistics_providers(id),
  tracking_number TEXT UNIQUE NOT NULL,
  status TEXT DEFAULT 'pending_pickup',
  current_location TEXT,
  estimated_delivery TIMESTAMPTZ,
  proof_of_delivery_hash TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**tracking_events**
```sql
CREATE TABLE tracking_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id UUID REFERENCES shipments(id),
  status TEXT NOT NULL,
  location TEXT,
  notes TEXT,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);
```

### New Tables Needed

**provider_favorites** (NEW)
```sql
CREATE TABLE provider_favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_did TEXT NOT NULL,
  provider_id UUID REFERENCES logistics_providers(id),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_did, provider_id)
);

CREATE INDEX idx_favorites_user ON provider_favorites(user_did);
CREATE INDEX idx_favorites_provider ON provider_favorites(provider_id);
```

**quote_requests** (NEW - Optional)
```sql
CREATE TABLE quote_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_did TEXT NOT NULL,
  origin_country TEXT NOT NULL,
  destination_country TEXT NOT NULL,
  weight_kg DECIMAL(10,2) NOT NULL,
  dimensions_cm JSONB NOT NULL,
  insurance_required BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'open',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ
);
```

---

## API Endpoints

### Existing Endpoints

```
POST   /api/v1/logistics/providers
GET    /api/v1/logistics/providers
GET    /api/v1/logistics/providers/:id
PUT    /api/v1/logistics/providers/:id

POST   /api/v1/logistics/quotes
GET    /api/v1/logistics/quotes/order/:orderId
POST   /api/v1/logistics/quotes/:id/accept
POST   /api/v1/logistics/quotes/:id/reject

POST   /api/v1/logistics/shipments
GET    /api/v1/logistics/shipments/:id
GET    /api/v1/logistics/shipments/order/:orderId
PUT    /api/v1/logistics/shipments/:id/status
GET    /api/v1/logistics/shipments/:id/history
POST   /api/v1/logistics/shipments/:id/cancel

GET    /api/v1/logistics/track/:trackingNumber
```

### New Endpoints Needed (Issue #17)

```typescript
// Provider quotes
GET /api/v1/logistics/providers/:id/quotes?status=pending
// Returns all quotes submitted by provider

// Opportunities (orders needing quotes)
GET /api/v1/logistics/opportunities?region=SG&weight_min=1&weight_max=5
// Returns orders in 'confirmed' status without accepted quotes

// Provider shipments
GET /api/v1/logistics/providers/:id/shipments?status=in_transit
// Returns all shipments for provider

// Favorites
POST /api/v1/logistics/providers/:id/favorite
DELETE /api/v1/logistics/providers/:id/favorite
GET /api/v1/logistics/favorites
// Manage user's favorite providers

// Delivery confirmation
POST /api/v1/logistics/shipments/:id/deliver
// Mark shipment as delivered with proof
```

### Route Implementation Example

```typescript
// src/api/routes/logistics.routes.ts

/**
 * GET /api/v1/logistics/providers/:id/quotes
 * Get all quotes for a provider
 */
router.get(
  '/providers/:id/quotes',
  requireAuth,
  async (req, res, next) => {
    try {
      const { id } = req.params
      const { status } = req.query
      
      // Verify provider ownership
      const userDid = getUserDid(req)
      const provider = await providerService.getProvider(id)
      if (provider.identity_did !== userDid) {
        throw new ApiError(ErrorCode.FORBIDDEN, 'Not your provider')
      }
      
      const quoteService = new QuoteService(req.supabase)
      const quotes = await quoteService.getProviderQuotes(id, status)
      
      res.json({ success: true, data: quotes })
    } catch (error) {
      next(error)
    }
  }
)

/**
 * GET /api/v1/logistics/opportunities
 * Get orders needing quotes
 */
router.get(
  '/opportunities',
  requireAuth,
  async (req, res, next) => {
    try {
      const { region, weight_min, weight_max } = req.query
      
      // Query orders:
      // - Status = 'confirmed'
      // - No accepted quote
      // - Matches filters
      
      const { data: orders } = await req.supabase
        .from('orders')
        .select(`
          *,
          shipping_address,
          items:order_items(*)
        `)
        .eq('status', 'confirmed')
        .not('id', 'in', (
          req.supabase
            .from('shipping_quotes')
            .select('order_id')
            .eq('status', 'accepted')
        ))
      
      // Filter by region/weight if provided
      const filtered = orders.filter(order => {
        if (region && order.shipping_address.country !== region) {
          return false
        }
        // Additional filters...
        return true
      })
      
      res.json({ success: true, data: filtered })
    } catch (error) {
      next(error)
    }
  }
)
```

---

## UI Components

### Component Library Structure

```
components/
├── layout/
│   ├── Header.tsx           # Provider navigation
│   ├── Footer.tsx           # Logistics-specific footer
│   └── Sidebar.tsx          # Dashboard sidebar
│
├── provider/
│   ├── ProviderCard.tsx     # Display provider info
│   ├── ProviderStats.tsx    # Stats widget
│   ├── ProviderProfile.tsx  # Profile form
│   └── ProviderBadge.tsx    # Rating badge
│
├── quotes/
│   ├── QuoteForm.tsx        # Submit quote form
│   ├── QuoteCard.tsx        # Quote display
│   ├── QuoteComparison.tsx  # Side-by-side comparison
│   └── QuoteStatus.tsx      # Status badge
│
├── opportunities/
│   ├── OpportunityCard.tsx  # Order card
│   ├── OpportunityFilters.tsx  # Filters
│   └── OpportunityList.tsx  # List view
│
├── shipments/
│   ├── ShipmentCard.tsx     # Shipment card
│   ├── TrackingForm.tsx     # Update tracking
│   └── DeliveryProofForm.tsx  # Upload proof
│
└── shared/
    ├── SearchBar.tsx
    ├── FilterPanel.tsx
    ├── RatingStars.tsx
    └── LoadingSpinner.tsx
```

### Example Component: ProviderCard

```typescript
// components/provider/ProviderCard.tsx
'use client'

import { Star, Package, Shield, MapPin } from 'lucide-react'
import type { LogisticsProvider } from '@rangkai/sdk'

interface ProviderCardProps {
  provider: LogisticsProvider
  onSelect?: () => void
  selected?: boolean
}

export default function ProviderCard({
  provider,
  onSelect,
  selected
}: ProviderCardProps) {
  
  const formatRating = (rating?: number) => {
    if (!rating) return 'New'
    return rating.toFixed(1)
  }
  
  return (
    <div
      onClick={onSelect}
      className={`
        border rounded-lg p-4 cursor-pointer transition-all
        ${selected 
          ? 'border-warm-taupe bg-light-cream ring-2 ring-warm-taupe' 
          : 'border-barely-beige hover:border-warm-taupe'
        }
      `}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="font-medium text-soft-black">
            {provider.business_name}
          </h3>
          <div className="flex items-center gap-1 text-sm mt-1">
            <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
            <span className="font-medium">
              {formatRating(provider.average_rating)}
            </span>
            <span className="text-warm-gray">
              ({provider.total_deliveries} deliveries)
            </span>
          </div>
        </div>
      </div>
      
      {/* Details */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm">
          <MapPin className="w-4 h-4 text-warm-taupe" />
          <span className="text-warm-gray">Serves:</span>
          <span className="text-soft-black">
            {provider.service_regions.slice(0, 3).join(', ')}
            {provider.service_regions.length > 3 && 
              ` +${provider.service_regions.length - 3}`
            }
          </span>
        </div>
        
        <div className="flex items-center gap-2 text-sm">
          <Package className="w-4 h-4 text-warm-taupe" />
          <span className="text-warm-gray">Methods:</span>
          <span className="text-soft-black capitalize">
            {provider.shipping_methods.join(', ')}
          </span>
        </div>
        
        {provider.insurance_available && (
          <div className="flex items-center gap-2 text-sm">
            <Shield className="w-4 h-4 text-warm-taupe" />
            <span className="text-soft-black">Insurance available</span>
          </div>
        )}
      </div>
    </div>
  )
}
```

### Example Component: QuoteForm

```typescript
// components/quotes/QuoteForm.tsx
'use client'

import { useState } from 'react'
import { sdk } from '@/lib/sdk'
import type { ShippingMethod } from '@rangkai/sdk'

interface QuoteFormProps {
  orderId: string
  providerId: string
  onSuccess?: () => void
}

export default function QuoteForm({
  orderId,
  providerId,
  onSuccess
}: QuoteFormProps) {
  
  const [method, setMethod] = useState<ShippingMethod>('standard')
  const [price, setPrice] = useState('')
  const [days, setDays] = useState('3')
  const [insurance, setInsurance] = useState(false)
  const [validHours, setValidHours] = useState('24')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    
    try {
      await sdk.logistics.submitQuote({
        order_id: orderId,
        provider_id: providerId,
        method,
        price_fiat: parseFloat(price),
        currency: 'USD',
        estimated_days: parseInt(days),
        insurance_included: insurance,
        valid_hours: parseInt(validHours)
      })
      
      alert('Quote submitted successfully!')
      if (onSuccess) onSuccess()
    } catch (error: any) {
      alert(`Failed: ${error.message}`)
    } finally {
      setSubmitting(false)
    }
  }
  
  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="label">Shipping Method</label>
        <select
          value={method}
          onChange={(e) => setMethod(e.target.value as ShippingMethod)}
          className="input"
        >
          <option value="standard">Standard</option>
          <option value="express">Express</option>
          <option value="freight">Freight</option>
        </select>
      </div>
      
      <div>
        <label className="label">Price (USD)</label>
        <input
          type="number"
          step="0.01"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          className="input"
          required
        />
      </div>
      
      <div>
        <label className="label">Estimated Days</label>
        <input
          type="number"
          value={days}
          onChange={(e) => setDays(e.target.value)}
          className="input"
          required
        />
      </div>
      
      <div>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={insurance}
            onChange={(e) => setInsurance(e.target.checked)}
          />
          <span>Include insurance</span>
        </label>
      </div>
      
      <div>
        <label className="label">Valid For (hours)</label>
        <input
          type="number"
          value={validHours}
          onChange={(e) => setValidHours(e.target.value)}
          className="input"
          required
        />
      </div>
      
      <div>
        <label className="label">Notes (Optional)</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="input"
          rows={3}
        />
      </div>
      
      <button
        type="submit"
        disabled={submitting}
        className="btn btn-primary w-full"
      >
        {submitting ? 'Submitting...' : 'Submit Quote'}
      </button>
    </form>
  )
}
```

---

## State Management

### Zustand Store: Provider State

```typescript
// lib/stores/provider.ts
import { create } from 'zustand'
import type { LogisticsProvider } from '@rangkai/sdk'

interface ProviderState {
  provider: LogisticsProvider | null
  stats: ProviderStats | null
  loading: boolean
  
  setProvider: (provider: LogisticsProvider) => void
  setStats: (stats: ProviderStats) => void
  clearProvider: () => void
}

interface ProviderStats {
  active_shipments: number
  pending_quotes: number
  total_deliveries: number
  average_rating: number
  revenue_mtd: number
}

export const useProviderStore = create<ProviderState>((set) => ({
  provider: null,
  stats: null,
  loading: false,
  
  setProvider: (provider) => set({ provider }),
  setStats: (stats) => set({ stats }),
  clearProvider: () => set({ provider: null, stats: null })
}))
```

### React Context: Provider Auth

```typescript
// lib/contexts/ProviderContext.tsx
'use client'

import { createContext, useContext, useState, useEffect } from 'react'
import { sdk } from '@/lib/sdk'
import type { LogisticsProvider } from '@rangkai/sdk'

interface ProviderContextType {
  provider: LogisticsProvider | null
  loading: boolean
  login: (did: string) => Promise<void>
  logout: () => void
}

const ProviderContext = createContext<ProviderContextType | undefined>(undefined)

export function ProviderProvider({ children }: { children: React.ReactNode }) {
  const [provider, setProvider] = useState<LogisticsProvider | null>(null)
  const [loading, setLoading] = useState(true)
  
  useEffect(() => {
    // Load provider from localStorage
    const loadProvider = async () => {
      const token = localStorage.getItem('rangkai_token')
      if (!token) {
        setLoading(false)
        return
      }
      
      try {
        // Get provider ID from token
        const decoded = JSON.parse(atob(token.split('.')[1]))
        const providerId = decoded.providerId
        
        if (providerId) {
          const data = await sdk.logistics.getProvider(providerId)
          setProvider(data)
        }
      } catch (error) {
        console.error('Failed to load provider:', error)
      } finally {
        setLoading(false)
      }
    }
    
    loadProvider()
  }, [])
  
  const login = async (did: string) => {
    // Login handled by main auth system
    // Just load provider data
    const providers = await sdk.logistics.searchProviders({})
    const userProvider = providers.find(p => p.identity_did === did)
    if (userProvider) {
      setProvider(userProvider)
    }
  }
  
  const logout = () => {
    localStorage.removeItem('rangkai_token')
    setProvider(null)
  }
  
  return (
    <ProviderContext.Provider value={{ provider, loading, login, logout }}>
      {children}
    </ProviderContext.Provider>
  )
}

export function useProvider() {
  const context = useContext(ProviderContext)
  if (!context) {
    throw new Error('useProvider must be used within ProviderProvider')
  }
  return context
}
```

---

## Testing Strategy

### Manual Testing (Preferred)

**Test Flow:**
```
1. Register provider (Firefox)
2. Create product in marketplace (Chrome - vendor)
3. Request quotes from provider
4. Provider submits quote (Firefox)
5. Place order (Edge - buyer)
6. Vendor accepts quote (Chrome)
7. Provider creates shipment (Firefox)
8. Provider updates tracking (Firefox)
9. Buyer tracks shipment (Edge)
10. Provider marks delivered (Firefox)
11. Buyer confirms delivery (Edge)
```

### Test Data

**Test Provider:**
```json
{
  "business_name": "Test Express",
  "service_regions": ["MY", "SG"],
  "shipping_methods": ["standard", "express"],
  "insurance_available": true
}
```

**Test Quote:**
```json
{
  "method": "express",
  "price_fiat": 12.00,
  "estimated_days": 3,
  "insurance_included": true,
  "valid_hours": 24
}
```

### Unit Tests (Optional)

```typescript
// __tests__/components/ProviderCard.test.tsx
import { render, screen } from '@testing-library/react'
import ProviderCard from '@/components/provider/ProviderCard'

describe('ProviderCard', () => {
  const mockProvider = {
    id: 'test-id',
    business_name: 'Test Provider',
    service_regions: ['MY', 'SG'],
    shipping_methods: ['standard'],
    insurance_available: true,
    average_rating: 4.8,
    total_deliveries: 100
  }
  
  it('renders provider name', () => {
    render(<ProviderCard provider={mockProvider} />)
    expect(screen.getByText('Test Provider')).toBeInTheDocument()
  })
  
  it('displays rating', () => {
    render(<ProviderCard provider={mockProvider} />)
    expect(screen.getByText('4.8')).toBeInTheDocument()
  })
})
```

---

## Deployment

### Environment Variables

```bash
# .env.local
NEXT_PUBLIC_API_URL=http://localhost:3000/api/v1
NEXT_PUBLIC_APP_URL=http://localhost:3002
```

### Development

```bash
# Start protocol
cd marketplace-protocol
npm run dev  # Port 3000

# Start marketplace
cd rangkai-marketplace
npm run dev  # Port 3001

# Start logistics pool
cd logistics-marketplace
npm run dev  # Port 3002
```

### Production

```bash
# Build
npm run build

# Start
npm run start
```

### Hosting Recommendations

**Vercel (Recommended):**
- Automatic deployments from GitHub
- Edge network (global CDN)
- Serverless functions
- Free SSL

**Alternative: Railway / Render**
- Docker support
- Easy scaling
- Database hosting

---

**End of Part 3**

---

## Summary of All Three Parts

**Part 1:** Vision, architecture, user roles, core concepts  
**Part 2:** Features, workflows, quote system, tracking  
**Part 3:** Technical implementation, SDK, components, deployment

These specifications provide complete guidance for building the Logistics Pool application.

---

**Prepared by:** AI Assistant (Session 13)  
**For:** Chris (Rangkai Protocol)  
**Next Steps:** Save to `docs/specs/`, commit to GitHub, begin Session 14 implementation