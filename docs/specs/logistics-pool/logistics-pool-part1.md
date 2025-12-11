# 🚚 Logistics Pool Specifications - Part 1

**Version:** 1.0  
**Date:** December 11, 2025  
**Status:** Final Specification  
**Related Docs:** [Part 2: Features & Workflows](logistics-pool-part2.md), [Part 3: Technical Implementation](logistics-pool-part3.md)

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Vision & Purpose](#vision--purpose)
3. [System Architecture](#system-architecture)
4. [User Roles & Personas](#user-roles--personas)
5. [Core Concepts](#core-concepts)
6. [Integration Model](#integration-model)

---

## Executive Summary

### What is the Logistics Pool?

The **Logistics Pool** is a standalone decentralized marketplace for shipping services, built on the Rangkai Protocol. It enables logistics providers worldwide to compete for business from vendors and buyers across ANY marketplace built on the protocol.

### The Innovation

Unlike traditional e-commerce platforms where logistics is locked to the platform (Amazon Logistics, Lazada Express), Rangkai **separates logistics into its own competitive marketplace**.

```
Traditional E-commerce:
┌─────────────┐
│  Marketplace │ → Built-in Logistics (Monopoly)
└─────────────┘   No choice, fixed pricing

Rangkai Protocol:
┌─────────────┐     ┌─────────────────┐
│ Marketplace │ ──→ │ Logistics Pool  │
└─────────────┘     │ 100+ providers  │
                    │ Compete for you │
                    └─────────────────┘
```

### Key Benefits

| Stakeholder | Benefit |
|-------------|---------|
| **Small Businesses** | Access to competitive shipping rates, not forced into expensive regional monopolies |
| **Logistics Providers** | Access to global clients across multiple marketplaces |
| **Buyers** | Can choose trusted providers, override vendor's selection |
| **Marketplace Owners** | Don't need to build/maintain logistics infrastructure |

### Real-World Impact

**Problem:** A leather goods artisan in Malaysia wants to sell to Singapore. Local courier monopolies charge $25 USD per shipment. This makes their products uncompetitive.

**Solution:** With Logistics Pool, 15 providers compete for the business:
- Provider A: $12 USD, 3-5 days
- Provider B: $15 USD, 2-3 days (express)
- Provider C: $10 USD, 5-7 days (budget)

The artisan saves $13-15 per shipment, making global trade viable.

---

## Vision & Purpose

### Vision Statement

> "Enable small businesses worldwide to access affordable, reliable shipping by creating an open, competitive logistics marketplace where providers from any country can serve customers in any other country."

### Mission

Break the logistics monopolies that prevent small businesses from competing globally.

### Design Principles

1. **Openness:** Any KYC-verified provider can join
2. **Competition:** Multiple providers compete for each shipment
3. **Transparency:** Ratings, pricing, and delivery times are public
4. **Choice:** Vendors AND buyers can select providers
5. **Decentralization:** No single entity controls the pool
6. **Fairness:** Small providers compete with large corporations

### Why Separate Application?

**Architectural Decision:** Logistics Pool is a **separate application** from marketplaces.

**Reasoning:**

1. **Scalability:** One pool serves unlimited marketplaces
   ```
   Rangkai Marketplace (Malaysia) ──┐
   Artisan Hub (Indonesia) ─────────┼──→ Shared Pool
   Craft Exchange (Philippines) ────┘
   Maker's Market (Thailand) ───────┘
   ```

2. **Independence:** Providers aren't controlled by marketplace owners
   - Marketplaces can't manipulate pricing
   - Providers can serve competitors
   - True free market competition

3. **Specialization:** Provider-focused features without cluttering marketplace
   - Provider dashboard (stats, quotes, shipments)
   - Quote submission workflows
   - Shipment tracking updates
   - Business analytics for providers

4. **Maintenance:** Updates to logistics don't affect marketplaces
   - Add new shipping methods → no marketplace code changes
   - Improve tracking UI → providers get it immediately
   - Fix bugs → isolated from marketplace operations

---

## System Architecture

### High-Level Overview

```
┌─────────────────────────────────────────────────────┐
│          RANGKAI PROTOCOL (Backend)                 │
│  Layer 0: Identity (DID, KYC, Nostr, Anonymous)    │
│  Layer 1: Products & Catalog                       │
│  Layer 2: Orders & Payments                        │
│  Layer 3: Logistics Coordination ◄─── WE'RE HERE   │
│  Layer 4: Disputes                                 │
│  Layer 5: Analytics                                │
│  Layer 6: Governance                               │
└─────────────────┬───────────────────────────────────┘
                  │
                  │ SDK (npm package)
                  │
         ┌────────┴────────┬────────────────┐
         │                 │                │
         ▼                 ▼                ▼
┌────────────────┐ ┌────────────────┐ ┌────────────────┐
│   MARKETPLACE  │ │   MARKETPLACE  │ │   MARKETPLACE  │
│       #1       │ │       #2       │ │       #3       │
│   (Malaysia)   │ │  (Indonesia)   │ │ (Philippines)  │
│                │ │                │ │                │
│ - Browse/Buy   │ │ - Browse/Buy   │ │ - Browse/Buy   │
│ - Track Orders │ │ - Track Orders │ │ - Track Orders │
└───────┬────────┘ └───────┬────────┘ └───────┬────────┘
        │                  │                  │
        └──────────────────┼──────────────────┘
                           │
                           ▼
                  ┌────────────────┐
                  │ LOGISTICS POOL │
                  │  (Separate App)│
                  │                │
                  │ - Register     │
                  │ - Quote        │
                  │ - Ship         │
                  │ - Track        │
                  └────────────────┘
```

### Application Ports

```
Protocol Backend:        localhost:3000
Marketplace Frontend:    localhost:3001
Logistics Pool Frontend: localhost:3002
```

### Data Flow: Order to Delivery

```
1. MARKETPLACE: Buyer places order
   ↓
2. MARKETPLACE: Order created (status: payment_pending)
   ↓
3. MARKETPLACE: Buyer pays (status: paid)
   ↓
4. MARKETPLACE: Vendor confirms (status: confirmed)
   ↓
5. LOGISTICS POOL: Providers see opportunity
   ↓
6. LOGISTICS POOL: Providers submit quotes
   ↓
7. MARKETPLACE: Vendor reviews quotes
   ↓
8. MARKETPLACE: Vendor accepts best quote
   ↓
9. LOGISTICS POOL: Provider creates shipment
   ↓
10. LOGISTICS POOL: Provider updates tracking
    ↓
11. MARKETPLACE: Buyer tracks progress
    ↓
12. LOGISTICS POOL: Provider marks delivered
    ↓
13. MARKETPLACE: Buyer confirms delivery
    ↓
14. MARKETPLACE: Order complete, provider rated
```

### Component Interaction

```
┌──────────────────────────────────────────────────┐
│ FRONTEND LAYER                                   │
├──────────────────────────────────────────────────┤
│                                                  │
│  Marketplace App          Logistics Pool App     │
│  ┌──────────────┐        ┌──────────────┐      │
│  │ Vendor Pages │        │ Provider     │      │
│  │ Buyer Pages  │        │ Dashboard    │      │
│  │ Order Pages  │        │ Quote Pages  │      │
│  └──────┬───────┘        └──────┬───────┘      │
│         │                       │              │
└─────────┼───────────────────────┼──────────────┘
          │                       │
          │    ┌──────────────────┴──────────┐
          │    │                             │
          ▼    ▼                             ▼
     ┌─────────────────────────────────────────┐
     │ SDK LAYER (@rangkai/sdk)                │
     │ - Logistics Module                      │
     │ - Orders Module                         │
     │ - Identity Module                       │
     └─────────────┬───────────────────────────┘
                   │
                   ▼
     ┌─────────────────────────────────────────┐
     │ PROTOCOL LAYER (REST API)               │
     │ - /api/v1/logistics/providers           │
     │ - /api/v1/logistics/quotes              │
     │ - /api/v1/logistics/shipments           │
     └─────────────┬───────────────────────────┘
                   │
                   ▼
     ┌─────────────────────────────────────────┐
     │ DATABASE LAYER (Supabase)               │
     │ - logistics_providers                   │
     │ - shipping_quotes                       │
     │ - shipments                             │
     │ - tracking_events                       │
     └─────────────────────────────────────────┘
```

---

## User Roles & Personas

### Role 1: Logistics Provider

**Primary User of Logistics Pool Application**

**Who They Are:**
- Shipping companies (DHL, FedEx, etc.)
- Local courier services
- Freight forwarders
- Individual drivers with business licenses

**Demographics:**
- Age: 25-55
- Tech Savvy: Medium to High
- Business Size: Solo operator to large corporation
- Motivation: Find new clients, grow business

**Goals:**
- Discover vendors who need shipping services
- Submit competitive quotes
- Manage shipments efficiently
- Build reputation through good service
- Earn consistent income

**Pain Points (Current State):**
- Hard to find new clients
- Big companies (DHL, FedEx) dominate
- No platform to showcase their service
- Manual quote processes
- Limited reach (local only)

**Needs from Logistics Pool:**
- Easy provider registration
- Dashboard showing opportunities
- Simple quote submission
- Shipment tracking tools
- Performance analytics
- Rating system to build trust

**User Journey:**
```
Day 1: Discover Logistics Pool
  → Register with KYC
  → Set up profile (regions, methods, pricing)

Day 2-7: Browse opportunities
  → Filter by region (serve Malaysia, Singapore)
  → See vendor requests for quotes
  → Submit competitive quotes

Day 8: First quote accepted!
  → Get notification
  → Create shipment
  → Pick up package

Day 9-11: Update tracking
  → Package in transit
  → Notify buyer of progress

Day 12: Deliver package
  → Upload proof of delivery
  → Receive payment
  → Get 5-star rating ⭐

Day 13+: Grow business
  → More quotes accepted
  → Build reputation
  → Expand service regions
```

**Example Persona: Ahmad**
- **Background:** 32-year-old courier in Kuala Lumpur
- **Business:** Small delivery service, 2 vans
- **Current:** Limited to local clients, struggles to find work
- **Goal:** Expand to Singapore/Indonesia routes
- **Quote:** "I provide better service than big companies but nobody knows me"

---

### Role 2: Vendor (Seller/Manufacturer)

**Secondary User of Logistics Pool (Browse/Select)**

**Who They Are:**
- Artisans, craftspeople
- Small manufacturers
- Distributors
- Home-based businesses

**Demographics:**
- Age: 25-50
- Tech Savvy: Low to Medium
- Business Size: Solo to small team (<10 people)
- Motivation: Grow sales, reduce costs

**Goals:**
- Find reliable shipping partners
- Get competitive pricing
- Reduce shipping costs
- Ensure on-time delivery
- Focus on making products, not logistics

**Pain Points (Current State):**
- Shipping too expensive (eats into profit)
- Limited to one or two local couriers
- Poor service, missed pickups
- Can't ship internationally
- No bargaining power

**Needs from Logistics Pool:**
- Easy provider discovery
- Compare pricing and delivery times
- See provider ratings/reviews
- Set default providers for products
- Request quotes in bulk
- Monitor shipment status

**User Journey:**
```
Week 1: Set up shop
  → Create product listings
  → "Who will ship my products?"
  → Browse Logistics Pool

Week 2: Find providers
  → Filter by region (ship to Singapore)
  → See 15 providers with ratings
  → Request quotes from top 5

Week 3: Review quotes
  → Compare pricing ($10-20 USD)
  → Check delivery times (3-7 days)
  → Read reviews from other vendors
  → Favorite top 3 providers

Week 4: First order!
  → Buyer purchases product
  → System suggests favorited providers
  → Accept $12 quote from FastShip
  → Package picked up

Week 5+: Ongoing operations
  → Orders flow smoothly
  → Quotes refresh automatically
  → Provider handles shipping
  → Focus on making products
```

**Example Persona: Siti**
- **Background:** 28-year-old leather goods maker in Malaysia
- **Business:** Handmade bags, ships to SG/ID/TH
- **Current:** Pays $25/shipment, eating 15% of profit
- **Goal:** Find $10-12 shipping to stay competitive
- **Quote:** "I make beautiful products but shipping costs kill my margins"

---

### Role 3: Buyer (Customer)

**Tertiary User of Logistics Pool (Override/Track)**

**Who They Are:**
- Online shoppers
- Gift buyers
- Small businesses buying supplies
- Regular customers

**Demographics:**
- Age: 18-60
- Tech Savvy: Low to High
- Purchase Frequency: Monthly to weekly
- Motivation: Get products safely and on-time

**Goals:**
- Receive products on-time
- Track shipment progress
- Use trusted shipping companies
- Override vendor's choice if needed
- Get delivery confirmation

**Pain Points (Current State):**
- No visibility into shipping
- Stuck with vendor's provider (even if bad)
- Poor tracking updates
- Missed deliveries
- No recourse if provider is bad

**Needs from Logistics Pool:**
- See provider options at checkout
- View provider ratings
- Override vendor's selection
- Real-time tracking
- Delivery notifications
- Easy proof of delivery

**User Journey:**
```
Day 1: Shopping
  → Browse marketplace
  → Find product from Malaysia
  → Add to cart

Day 2: Checkout
  → See shipping options:
    - Vendor's choice: FastShip ($12)
    - My choice: QuickPost ($15) ⭐ 4.9
  → "I trust QuickPost, used them before"
  → Override to QuickPost
  → Complete payment

Day 3: Tracking
  → Email: "Package picked up"
  → Check Logistics Pool tracking
  → See: "Package at sorting facility"

Day 4-5: In transit
  → Updates every 8 hours
  → "Package cleared customs"
  → "Out for delivery"

Day 6: Delivery
  → Package arrives
  → Upload delivery photo
  → Rate provider 5 stars
  → Order complete
```

**Example Persona: David**
- **Background:** 35-year-old office worker in Singapore
- **Behavior:** Buys handmade goods monthly
- **Concern:** Previous vendor's courier damaged items
- **Goal:** Use only trusted providers
- **Quote:** "I'll pay $3 more for a provider I trust"

---

## Core Concepts

### Concept 1: The Logistics Pool

**Definition:** A shared marketplace of shipping providers accessible to all marketplaces built on Rangkai Protocol.

**Analogy:** Like Uber, but for shipping:
- **Uber:** Drivers join platform → Riders request rides → Drivers compete for business
- **Logistics Pool:** Providers join pool → Vendors need shipping → Providers compete with quotes

**Characteristics:**
- **Permissionless:** Any KYC-verified provider can join
- **Global:** Providers from any country, serve any country
- **Competitive:** Multiple providers quote same order
- **Transparent:** Ratings, pricing, delivery times are public
- **Meritocratic:** Best service wins, not biggest company

**Size Expectations:**
- **Launch:** 10-20 providers (Malaysia, Singapore, Indonesia)
- **Year 1:** 100-200 providers (Southeast Asia)
- **Year 2:** 500+ providers (Global)

---

### Concept 2: Two-Quote System

**Problem:** Shipping costs change frequently (fuel prices, route changes, demand fluctuations). Static quotes become inaccurate.

**Solution:** Two types of quotes with different validity periods.

#### Product-Level Quotes (Pre-Negotiated)

**Purpose:** Vendors get estimated shipping costs BEFORE listing products.

**Use Case:**
```
Vendor thinks:
"I want to sell leather bags to Singapore.
What will shipping cost?"

Vendor creates product:
- Typical weight: 2kg
- Typical dimensions: 30x30x15cm
- Destination: Singapore

System broadcasts to providers serving SG.
Providers submit quotes:
- FastShip: $12 USD (valid 90 days)
- QuickPost: $15 USD (valid 60 days)
- BudgetShip: $10 USD (valid 30 days)

Vendor favorites FastShip and QuickPost.
```

**Characteristics:**
- **Validity:** 30-90 days (vendor configurable)
- **Purpose:** Estimate costs, set product pricing
- **Bindingness:** Not binding, may change at order time
- **Expiry:** Vendor notified 7 days before expiry

**Benefits:**
- Vendors can price products accurately
- Reduces checkout surprises
- Builds vendor-provider relationships

---

#### Order-Level Quotes (On-Demand)

**Purpose:** Get exact shipping cost for specific order with actual weight/dimensions.

**Use Case:**
```
Buyer places order.
Order confirmed by vendor.

System requests fresh quotes:
- Order weight: 2.3kg (actual)
- Dimensions: 32x28x16cm (actual)
- Destination: Singapore (buyer's address)
- Declared value: $150 USD

Providers submit fresh quotes:
- FastShip: $13 USD (24h validity)
- QuickPost: $16 USD (48h validity)
- BudgetShip: $11 USD (24h validity)

Vendor accepts FastShip.
Provider ships within 24 hours.
```

**Characteristics:**
- **Validity:** 24-48 hours (urgent)
- **Purpose:** Exact cost for specific shipment
- **Bindingness:** Binding once accepted
- **Expiry:** Auto-expire after validity period

**Benefits:**
- Accurate pricing (actual weight/dimensions)
- Fresh rates (current fuel prices, etc.)
- Commitment from provider

---

### Concept 3: Quote Expiry Management

**Challenge:** Quotes can't be valid forever. Costs change, routes change, availability changes.

**Solution:** Built-in expiry system with notifications and renewal workflows.

**Expiry Flow:**

```
Day 0: Quote submitted (valid 90 days)
Day 83: System notification: "Quote expires in 7 days"
Day 85: Vendor notification: "Renew quote with FastShip?"
Day 88: Provider notification: "Your quote expires in 2 days"
Day 90: Quote expires (status: expired)
Day 91: Buyer places order
Day 91: Vendor sees: "Quote expired ❌"
Day 91: Vendor requests fresh quote
Day 91: Provider submits new quote
Day 92: Quote accepted, shipment created
```

**Notification Triggers:**
- 7 days before expiry → Vendor warning
- 2 days before expiry → Provider reminder
- On expiry → Status change to "expired"
- On order with expired quote → Prompt for fresh quote

**UI Indicators:**
```
[Product Page - Buyer View]
Estimated Shipping: ~$12 USD
⚠️ Quote may be outdated
(Contact seller for current pricing)

[Vendor Dashboard]
┌────────────────────────────────────┐
│ Preferred Providers                │
├────────────────────────────────────┤
│ ✅ FastShip Express               │
│ $12 USD, 3-5 days (expires in 5d) │
│ [Renew Quote]                      │
├────────────────────────────────────┤
│ ❌ QuickPost Logistics            │
│ Quote expired 2 weeks ago          │
│ [Request Fresh Quote]              │
└────────────────────────────────────┘
```

**Automatic Processes:**
- Daily cron job checks for expiring quotes
- Emails sent to vendors/providers
- Expired quotes marked in database
- Fresh quote requests triggered automatically

---

### Concept 4: Provider Discovery & Favorites

**Discovery:** How vendors/buyers find providers in the pool.

**Search Filters:**
```
Find Providers:
├─ Service Region: [Singapore ▼]
├─ Shipping Method: [Express ▼]
├─ Insurance Required: [✓]
├─ Min Rating: [4.0 ★]
├─ Price Range: [$10 - $20]
└─ Sort By: [Rating ▼]
```

**Results:**
```
┌──────────────────────────────────────────┐
│ ⭐ 4.9  QuickPost Logistics             │
│ 567 deliveries | Insurance ✓            │
│ Serves: MY, SG, ID, TH, PH              │
│ Typical: $12-18 USD, 2-5 days          │
│ [Request Quote] [★ Add to Favorites]    │
└──────────────────────────────────────────┘
```

**Favorites System:**

Vendors can "favorite" providers they trust:
```
My Favorite Providers (3):
├─ ⭐ FastShip Express
│  Last quote: $12 USD (expires 5d)
│  Used: 15 times, 100% on-time
│  [Use for New Product]
│
├─ ⭐ QuickPost Logistics
│  Last quote: $15 USD (expired ❌)
│  Used: 8 times, 1 late delivery
│  [Request Fresh Quote]
│
└─ ⭐ ReliableShip Co
   Last quote: $14 USD (expires 20d)
   Never used yet
   [Try on Next Order]
```

**Benefits:**
- Saves time (don't search every order)
- Builds relationships (repeat business)
- Trust (tested providers)
- Efficiency (one-click selection)

---

### Concept 5: Buyer Override

**Principle:** Buyers have final say on who ships their purchase.

**Rationale:**
- Buyer pays for shipping (included in total)
- Buyer bears risk if package is lost/damaged
- Buyer may have preferred providers
- Buyer may distrust vendor's choice

**Flow:**

```
[Checkout Page]

Shipping Address: [Filled]
Payment Method: [Filled]

Shipping Provider:
┌────────────────────────────────────────┐
│ ⦿ Vendor's Choice (Recommended)        │
│   FastShip Express                     │
│   $12 USD, 3-5 days, ⭐ 4.8           │
│   [Why this provider?]                 │
├────────────────────────────────────────┤
│ ⦾ Choose My Own Provider              │
│   [Browse Logistics Pool →]            │
│                                        │
│   💡 You can select any provider      │
│   serving your region                  │
└────────────────────────────────────────┘

[Continue to Payment]
```

**If Buyer Clicks "Choose My Own":**

```
Select Logistics Provider:

Filters: Region: Singapore (auto-filled)

Available Providers (3):
┌────────────────────────────────────────┐
│ ✓ FastShip Express (Vendor's choice)  │
│   $12 USD, 3-5 days, ⭐ 4.8           │
│   [Select]                             │
├────────────────────────────────────────┤
│   QuickPost Logistics                  │
│   $15 USD, 2-3 days, ⭐ 4.9           │
│   ⭐ YOU'VE USED BEFORE (5 times)     │
│   [Select]                             │
├────────────────────────────────────────┤
│   BudgetShip Services                  │
│   $10 USD, 5-7 days, ⭐ 4.2           │
│   [Select]                             │
└────────────────────────────────────────┘
```

**Vendor Notification:**
```
📧 Email to Vendor:
Subject: Buyer selected different logistics provider

Order #12345
Buyer: David (Singapore)
Original provider: FastShip Express ($12)
Buyer's choice: QuickPost Logistics ($15)

The buyer will pay the difference.
Please prepare package for QuickPost pickup.

[View Order Details]
```

**Key Rules:**
- Buyer pays difference if more expensive
- Buyer saves money if cheaper
- Vendor cannot block override
- Provider must serve buyer's region
- Quote must be valid (not expired)

---

## Integration Model

### How Marketplaces Integrate

**Step 1: Install SDK**
```bash
npm install @rangkai/sdk
```

**Step 2: Initialize SDK**
```typescript
// lib/sdk.ts
import { RangkaiSDK } from '@rangkai/sdk'

export const sdk = new RangkaiSDK({
  baseURL: 'https://api.rangkai.com',
  apiKey: process.env.RANGKAI_API_KEY
})
```

**Step 3: Use Logistics Methods**
```typescript
// During product creation
const providers = await sdk.logistics.searchProviders({
  service_region: "SG",
  shipping_method: "express"
})

// At checkout
const quotes = await sdk.logistics.getQuotesForOrder(orderId)

// After order
const shipment = await sdk.logistics.getShipmentByOrder(orderId)
const tracking = await sdk.logistics.getTrackingHistory(shipmentId)
```

**That's it!** The marketplace now has access to the entire Logistics Pool.

---

### How Providers Integrate

**Option A: Use Logistics Pool App** (Recommended)
- Register at logistics-pool.rangkai.com
- Use provided dashboard
- No development needed

**Option B: API Integration** (For large providers)
- Get API credentials
- Integrate quote submission
- Integrate tracking updates
- Build custom dashboard

**Example API Integration:**
```typescript
// Provider's backend
import { RangkaiSDK } from '@rangkai/sdk'

const sdk = new RangkaiSDK({
  baseURL: 'https://api.rangkai.com',
  apiKey: process.env.PROVIDER_API_KEY
})

// Listen for quote requests (webhook)
app.post('/webhook/quote-request', async (req, res) => {
  const { order_id, destination, weight, dimensions } = req.body
  
  // Calculate price
  const price = calculateShipping(destination, weight)
  
  // Submit quote
  await sdk.logistics.submitQuote({
    order_id,
    provider_id: PROVIDER_ID,
    method: 'express',
    price_fiat: price,
    currency: 'USD',
    estimated_days: 3,
    insurance_included: true,
    valid_hours: 24
  })
  
  res.json({ success: true })
})
```

---

**End of Part 1**

Continue to [Part 2: Features & Workflows](logistics-pool-part2.md)