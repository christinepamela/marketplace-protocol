# 🚚 Logistics Pool Siti decides:
→ Favorites FastShip ($12, good balance)
→ Favorites QuickPost ($15, fastest)
→ Sets FastShip as default

Back to product form:
┌────────────────────────────────────┐
│ Preferred Provider: FastShip       │
│ Estimated Shipping: $12 USD        │
│ Quote valid until: Mar 15, 2026    │
│ [Change Provider]                  │
└────────────────────────────────────┘

Publishes product → Goes live
```

**Week 4: First Order**
```
Buyer in Singapore purchases backpack
→ Order #12345 created
→ Status: payment_pending

Buyer pays → Status: paid

Siti receives notification:
📧 "New order #12345 - confirm order"

Siti confirms order → Status: confirmed

System shows:
┌────────────────────────────────────┐
│ Order #12345 - Ready for Shipping │
│ Preferred Provider: FastShip       │
│ Quote: $12 USD (valid 5 days)     │
│ [Confirm Provider] [Choose Other]  │
└────────────────────────────────────┘

Siti clicks "Confirm Provider"
→ FastShip notified
→ Pickup scheduled
```

**Week 4: Shipment & Tracking**
```
FastShip picks up package
→ Siti sees: "Shipment created"
→ Tracking: FS-123456

Siti can monitor progress:
- Picked up ✓
- In transit ✓
- Delivered ✓

Order complete → Siti gets paid
```

---

### Workflow 2: Vendor Manages Quote Expiry

**Month 2: Quote Expires Soon**
```
Siti receives email:
📧 "Quote expiring in 7 days"

Product: Leather Backpack
Provider: FastShip Express
Current Quote: $12 USD
Expires: Mar 15, 2026

[Request Fresh Quote] [Find New Provider]

Siti clicks "Request Fresh Quote"
→ FastShip submits new quote: $13 USD
  (fuel prices increased)
→ Siti accepts
→ Product updated automatically
```

**Month 3: Provider Goes Offline**
```
Siti receives notification:
⚠️ "FastShip Express is no longer available"

Action Required:
Your product "Leather Backpack" needs a new provider.

[Browse Logistics Pool]

Siti selects QuickPost as new default
→ Product still available for purchase
→ No downtime
```

---

## Buyer Workflows

### Workflow 1: Buyer Overrides Provider

**Checkout Experience**
```
David browses Rangkai Marketplace
→ Finds "Leather Backpack" from Malaysia
→ Adds to cart → Proceeds to checkout

Checkout Page:
┌────────────────────────────────────────┐
│ Shipping Address: [Filled]             │
│ Payment Method: [Filled]               │
│                                        │
│ Shipping Provider:                     │
│ ⦿ Vendor's Choice (Recommended)        │
│   FastShip Express                     │
│   $12 USD, 3-5 days, ⭐ 4.8           │
│                                        │
│ ⦾ Choose My Own Provider              │
│   [Browse Logistics Pool →]            │
│                                        │
│ Total: $162 USD                        │
│ [Place Order]                          │
└────────────────────────────────────────┘

David thinks: "I've used QuickPost before,
they're more reliable. Worth the extra $3."

Clicks "Choose My Own Provider"
```

**Provider Selection**
```
Logistics Pool Modal:
┌────────────────────────────────────────┐
│ Select Logistics Provider              │
│ Serving: Malaysia → Singapore          │
├────────────────────────────────────────┤
│ ✓ FastShip Express (Vendor's choice)  │
│   $12 USD, 3-5 days, ⭐ 4.8           │
│   [Select]                             │
├────────────────────────────────────────┤
│ ⭐ QuickPost Logistics                 │
│   $15 USD, 2-3 days, ⭐ 4.9           │
│   ✨ YOU'VE USED BEFORE (5 times)     │
│   [Select] ← David clicks here         │
├────────────────────────────────────────┤
│ BudgetShip Services                    │
│   $10 USD, 5-7 days, ⭐ 4.2           │
│   [Select]                             │
└────────────────────────────────────────┘

David selects QuickPost
→ Returns to checkout
→ Total updated: $165 USD (+$3)
→ Places order
```

**After Order**
```
Vendor receives notification:
📧 "Buyer selected different provider"

Order #12345
Original: FastShip ($12)
Buyer's choice: QuickPost ($15)
Buyer paid the difference.

Please prepare package for QuickPost pickup.

Siti: "No problem, QuickPost is reliable too"
→ Confirms order
→ QuickPost notified
```

---

### Workflow 2: Buyer Tracks Shipment

**Tracking Experience**
```
Day 1: Order placed
→ David receives email:
   "Order confirmed, awaiting shipment"

Day 2: Shipped
→ David receives email:
   "Your order has been shipped!"
   Tracking: QP-789012
   
→ David clicks tracking link
→ Opens logistics pool tracking page
```

**Tracking Page**
```
┌────────────────────────────────────────┐
│ Track Shipment: QP-789012              │
├────────────────────────────────────────┤
│ Order #12345 - Leather Backpack        │
│ From: Leather Goods Shop (Malaysia)    │
│ To: David (Singapore)                  │
│                                        │
│ Status: 🚚 In Transit                  │
│ Current Location: Johor Bahru          │
│ Est. Delivery: Dec 18, 2025 by 6 PM   │
│                                        │
│ Progress: ▓▓▓▓▓▓▓▓░░░░░░ 60%          │
│                                        │
│ Timeline:                              │
│ ✓ Dec 16, 10:00 AM - Picked up        │
│ ✓ Dec 16, 3:00 PM - Sorting facility  │
│ ✓ Dec 17, 9:00 AM - In transit        │
│ ✓ Dec 17, 2:00 PM - Johor Bahru       │
│ ⏳ Dec 18, 6:00 PM - Delivery          │
│                                        │
│ Provider: QuickPost Logistics          │
│ Contact: +60-XXX-XXXX                  │
└────────────────────────────────────────┘

David can check anytime
→ Real-time updates
→ SMS notifications on status changes
```

**Day 3: Delivery**
```
6:30 PM - Doorbell rings
QuickPost driver: "Package for David?"
David: "That's me"
→ Signs tablet
→ Receives package

7:00 PM - Email arrives:
📧 "Your order has been delivered!"

Please confirm receipt:
[Confirm Delivery] [Report Issue]

David clicks "Confirm Delivery"
→ Asked to rate provider:

Rate QuickPost Logistics:
⭐⭐⭐⭐⭐ 5/5
Comment: "Fast, professional, package
in perfect condition!"

[Submit Rating]

→ Order complete
→ Siti gets paid
→ QuickPost gets 5-star review
```

---

## Quote System Details

### Quote Types Comparison

| Feature | Product Quote | Order Quote |
|---------|--------------|-------------|
| **When** | During product setup | After order placed |
| **Purpose** | Estimate costs | Exact pricing |
| **Validity** | 30-90 days | 24-48 hours |
| **Binding** | No | Yes |
| **Weight** | Typical estimate | Actual weight |
| **Destination** | General region | Specific address |
| **Updates** | Can request refresh | One-time only |

### Quote Status Lifecycle

```
PENDING
  │
  ├─→ ACCEPTED (1 quote per order)
  │   └─→ Shipment Created
  │
  ├─→ REJECTED (all other quotes)
  │   └─→ Provider notified
  │
  └─→ EXPIRED (passed valid_until)
      └─→ Provider can resubmit
```

### Quote Comparison Matrix

**Provider's View:**
```
My Quote vs Competition:

Order #12345 (MY → SG, 2kg)

My Quote:        Competitor Quotes:
$14 USD          $12 USD (FastShip) ← Cheaper
2-3 days         3-5 days           ← Slower
⭐ 4.9           ⭐ 4.8            ← Higher rated
Insurance ✓      Insurance ✓

My advantages: Faster, better rating
Their advantage: Cheaper

Strategy: Highlight speed & reliability
```

**Vendor's View:**
```
Compare 3 Quotes for Order #12345:

┌─────────────────────────────────────┐
│ FastShip | QuickPost | BudgetShip  │
├─────────────────────────────────────┤
│ $12      | $14       | $10         │
│ 3-5 days | 2-3 days  | 5-7 days    │
│ ⭐ 4.8   | ⭐ 4.9    | ⭐ 4.2      │
│ 234 del. | 567 del.  | 89 del.     │
│ Ins. ✓   | Ins. ✓    | Ins. ✗      │
├─────────────────────────────────────┤
│ [Accept] | [Accept]  | [Accept]    │
└─────────────────────────────────────┘

💡 Recommendation: QuickPost
   (Best rated, fastest, good price)
```

---

## Shipment Tracking

### Tracking Status Flow

```
PENDING_PICKUP
  ↓
PICKED_UP
  ↓
IN_TRANSIT
  ↓
OUT_FOR_DELIVERY
  ↓
DELIVERED

Alternative flows:
IN_TRANSIT → FAILED_DELIVERY → RETURNING → RETURNED
IN_TRANSIT → LOST
ANY → CANCELLED
```

### Tracking Event Types

**Standard Events:**
- Package created
- Picked up from vendor
- Arrived at sorting facility
- Departed sorting facility
- In transit (with location updates)
- Arrived at destination hub
- Out for delivery
- Delivered

**Special Events:**
- Customs clearance (international)
- Delayed (weather, traffic, etc.)
- Failed delivery attempt
- Returned to sender
- Lost in transit

### Real-Time Updates

**Provider Updates:**
```typescript
// Provider scans package at each checkpoint
await sdk.logistics.updateTracking(shipmentId, {
  status: 'in_transit',
  location: 'Johor Bahru Hub',
  notes: 'Package in transit to Singapore'
})
```

**Automatic Notifications:**
```
Buyer SMS: "Your package is in transit.
Current location: Johor Bahru"

Buyer Email: 
Subject: Shipment Update - Order #12345
Your package is on its way!
Track: logistics-pool.com/track/QP-789012

Vendor Dashboard:
🔔 "Order #12345 - In transit"
```

---

## Rating & Review System

### Rating Components

**Provider Rating (0-5 stars):**
- Overall satisfaction
- Delivery speed
- Package condition
- Communication
- Professionalism

**Rating Form:**
```
┌──────────────────────────────────────┐
│ Rate QuickPost Logistics             │
├──────────────────────────────────────┤
│ Overall: ⭐⭐⭐⭐⭐                    │
│                                      │
│ Delivery Speed: ⭐⭐⭐⭐⭐            │
│ Package Condition: ⭐⭐⭐⭐⭐          │
│ Communication: ⭐⭐⭐⭐⭐             │
│ Professionalism: ⭐⭐⭐⭐⭐           │
│                                      │
│ Comments (Optional):                 │
│ [Great service! Package arrived     │
│  in perfect condition.]              │
│                                      │
│ [Submit Rating]                      │
└──────────────────────────────────────┘
```

### Rating Calculation

**Rolling Average:**
```typescript
// When new rating submitted
const newAverage = (
  (currentAverage * totalDeliveries) + newRating
) / (totalDeliveries + 1)

// Update provider
await db.logistics_providers.update({
  average_rating: newAverage,
  total_deliveries: totalDeliveries + 1
})
```

### Provider Performance Metrics

**Dashboard Metrics:**
```
┌──────────────────────────────────────┐
│ QuickPost Logistics Performance     │
├──────────────────────────────────────┤
│ Overall Rating: ⭐ 4.9 (567 reviews) │
│                                      │
│ Delivery Metrics:                    │
│ • On-time: 95% (538/567)            │
│ • Early: 3% (17/567)                │
│ • Late: 2% (12/567)                 │
│                                      │
│ Issue Rate: 1% (6/567)              │
│ • Lost: 0.2% (1)                    │
│ • Damaged: 0.5% (3)                 │
│ • Failed delivery: 0.3% (2)         │
│                                      │
│ Response Time: 2.3 hours avg        │
│ Customer Satisfaction: 98%          │
└──────────────────────────────────────┘
```

---

**End of Part 2**

Continue to [Part 3: Technical Implementation](logistics-pool-part3.md)pecifications - Part 2

**Version:** 1.0  
**Date:** December 11, 2025  
**Status:** Final Specification  
**Related Docs:** [Part 1: Overview & Architecture](logistics-pool-part1.md), [Part 3: Technical Implementation](logistics-pool-part3.md)

---

## Table of Contents

1. [Feature Specifications](#feature-specifications)
2. [Provider Workflows](#provider-workflows)
3. [Vendor Workflows](#vendor-workflows)
4. [Buyer Workflows](#buyer-workflows)
5. [Quote System Details](#quote-system-details)
6. [Shipment Tracking](#shipment-tracking)
7. [Rating & Review System](#rating--review-system)

---

## Feature Specifications

### Feature 1: Provider Registration

**Purpose:** Allow logistics companies to join the pool and offer services.

**Requirements:**
- Must have KYC-verified identity
- Must provide business information
- Must specify service capabilities
- Must agree to terms of service

**Registration Form:**
```
┌──────────────────────────────────────────┐
│ Register as Logistics Provider           │
├──────────────────────────────────────────┤
│ Business Information:                    │
│ Business Name: [________________]        │
│ Business License: [Upload]               │
│ Contact Email: [________________]        │
│ Contact Phone: [________________]        │
│                                          │
│ Service Capabilities:                    │
│ Service Regions:                         │
│   ☑ Malaysia (MY)                       │
│   ☑ Singapore (SG)                      │
│   ☐ Indonesia (ID)                      │
│   ☐ Thailand (TH)                       │
│   ☐ Philippines (PH)                    │
│   [+ Add More]                           │
│                                          │
│ Shipping Methods:                        │
│   ☑ Standard (3-7 days)                 │
│   ☑ Express (1-3 days)                  │
│   ☐ Freight (for large items)           │
│                                          │
│ Insurance:                               │
│   ☑ I offer insurance coverage          │
│                                          │
│ Terms of Service:                        │
│   ☑ I agree to Logistics Pool terms     │
│                                          │
│ [Register Provider]                      │
└──────────────────────────────────────────┘
```

**Validation Rules:**
- Business name: 2-100 characters
- Service regions: At least 1 required
- Shipping methods: At least 1 required
- Email: Valid format
- Phone: Valid international format
- KYC: Must be verified before approval

**API Call:**
```typescript
await sdk.logistics.registerProvider({
  business_name: "FastShip Express",
  identity_did: user.did,
  service_regions: ["MY", "SG", "ID"],
  shipping_methods: ["standard", "express"],
  insurance_available: true
})
```

**Success Response:**
```json
{
  "success": true,
  "data": {
    "provider_id": "uuid",
    "status": "pending_verification",
    "message": "Your application is under review"
  }
}
```

**Post-Registration:**
```
Email sent to provider:
Subject: Welcome to Logistics Pool!

Thank you for registering.
Your application is under review.

What happens next:
1. We verify your KYC identity (24-48 hours)
2. We review your business license
3. You receive approval email
4. You can start accepting quotes!

Questions? Contact support@rangkai.com
```

**Approval Process:**
```
Admin reviews application → Checks KYC → Verifies business
  ↓
Approved → Provider can submit quotes
  OR
Rejected → Provider receives reason, can reapply
```

---

### Feature 2: Provider Dashboard

**Purpose:** Central hub for provider to manage business operations.

**Dashboard Layout:**
```
┌────────────────────────────────────────────────────────┐
│ FastShip Express Dashboard                             │
├────────────────────────────────────────────────────────┤
│ ┌────────────┐ ┌────────────┐ ┌────────────┐         │
│ │Active      │ │Pending     │ │Total       │         │
│ │Shipments   │ │Quotes      │ │Delivered   │         │
│ │            │ │            │ │            │         │
│ │    12      │ │     5      │ │  1,234     │         │
│ └────────────┘ └────────────┘ └────────────┘         │
│                                                        │
│ ┌────────────┐ ┌──────────────────────────────────┐  │
│ │Rating      │ │Recent Activity                   │  │
│ │            │ │                                  │  │
│ │  ⭐ 4.8    │ │• Quote accepted: Order #12345   │  │
│ │  (234)     │ │  2 hours ago                    │  │
│ │            │ │                                  │  │
│ │Revenue     │ │• Shipment delivered: #11234     │  │
│ │$12,450 MTD │ │  5 hours ago                    │  │
│ └────────────┘ │                                  │  │
│                │• New opportunity: Malaysia → SG  │  │
│                │  8 hours ago                     │  │
│                └──────────────────────────────────┘  │
│                                                        │
│ Quick Actions:                                         │
│ [View Opportunities] [My Quotes] [Active Shipments]    │
└────────────────────────────────────────────────────────┘
```

**Statistics Calculated:**
```typescript
interface ProviderStats {
  active_shipments: number      // Status: pending_pickup to out_for_delivery
  pending_quotes: number         // Status: pending
  total_deliveries: number       // Status: delivered
  average_rating: number         // Rolling average 0-5
  revenue_mtd: number           // Month-to-date revenue
  on_time_percentage: number     // % delivered by estimated date
  acceptance_rate: number        // % of quotes accepted
}
```

**Data Loading:**
```typescript
useEffect(() => {
  const loadDashboard = async () => {
    const stats = await sdk.logistics.getProviderStats(providerId)
    const recent = await sdk.logistics.getRecentActivity(providerId)
    setStats(stats)
    setActivity(recent)
  }
  loadDashboard()
}, [providerId])
```

---

### Feature 3: Opportunities Browser

**Purpose:** Show providers which vendors/orders need quotes.

**Opportunities Page:**
```
┌──────────────────────────────────────────────────────┐
│ Available Opportunities                              │
├──────────────────────────────────────────────────────┤
│ Filters:                                             │
│ Service Region: [All ▼] Weight: [Any ▼] Sort: [New ▼]│
├──────────────────────────────────────────────────────┤
│                                                      │
│ ┌──────────────────────────────────────────────────┐│
│ │ 🆕 Order #12345 - Malaysia → Singapore          ││
│ │                                                  ││
│ │ Details:                                         ││
│ │ • Weight: 2.5 kg                                ││
│ │ • Dimensions: 30 x 30 x 15 cm                  ││
│ │ • Declared Value: $150 USD                      ││
│ │ • Insurance Required: Yes                       ││
│ │ • Required by: Dec 20, 2025                    ││
│ │                                                  ││
│ │ Vendor: Leather Goods Shop ⭐ 4.7              ││
│ │ Buyer: Singapore resident                       ││
│ │                                                  ││
│ │ Competition: 3 quotes submitted                 ││
│ │                                                  ││
│ │ [Submit Quote] [Save for Later]                 ││
│ └──────────────────────────────────────────────────┘│
│                                                      │
│ ┌──────────────────────────────────────────────────┐│
│ │ Order #12344 - Malaysia → Indonesia             ││
│ │ Weight: 5 kg | Dimensions: 40x40x20 cm          ││
│ │ Competition: 1 quote | Required: Dec 18         ││
│ │ [Submit Quote]                                   ││
│ └──────────────────────────────────────────────────┘│
│                                                      │
│ Showing 1-10 of 45 opportunities                     │
│ [Load More]                                          │
└──────────────────────────────────────────────────────┘
```

**Filtering Logic:**
```typescript
const opportunities = await sdk.logistics.getOpportunities({
  service_region: selectedRegion || undefined,
  min_weight_kg: minWeight || undefined,
  max_weight_kg: maxWeight || undefined,
  insurance_required: insuranceFilter || undefined
})

// Only show orders where:
// 1. Provider serves the destination region
// 2. Order weight within provider's capacity
// 3. Order status = 'confirmed' (ready for quotes)
// 4. No accepted quote yet
```

**Privacy Considerations:**
- Buyer name hidden (show only region)
- Exact address hidden (show only city/country)
- Product details limited (show category, not specifics)
- Full details revealed after quote accepted

---

### Feature 4: Quote Submission

**Purpose:** Allow providers to submit competitive quotes for orders.

**Quote Form:**
```
┌──────────────────────────────────────────────────────┐
│ Submit Quote for Order #12345                        │
├──────────────────────────────────────────────────────┤
│ Order Summary:                                       │
│ • Origin: Kuala Lumpur, Malaysia                   │
│ • Destination: Singapore                            │
│ • Weight: 2.5 kg                                   │
│ • Dimensions: 30 x 30 x 15 cm                     │
│ • Declared Value: $150 USD                         │
│                                                      │
│ Your Quote:                                          │
│                                                      │
│ Shipping Method: [Express ▼]                        │
│   ○ Standard (5-7 days)                            │
│   ● Express (2-3 days)                             │
│   ○ Same Day (if available)                        │
│                                                      │
│ Pricing:                                            │
│ Base Rate: [$________] USD                         │
│                                                      │
│ Insurance: (Required by buyer)                      │
│   ☑ Include insurance: +$2.00 USD                  │
│                                                      │
│ Total Price: $14.00 USD                            │
│                                                      │
│ Estimated Delivery:                                 │
│ [  2  ] to [  3  ] business days                   │
│                                                      │
│ Quote Valid For:                                    │
│ [  24  ] hours                                     │
│                                                      │
│ Additional Notes (Optional):                        │
│ [We specialize in fragile items and provide        │
│  extra cushioning at no additional cost.]          │
│                                                      │
│ Terms & Conditions:                                 │
│ ☑ I agree to pick up within 24 hours if accepted  │
│ ☑ I commit to the delivery timeframe specified    │
│                                                      │
│ [Cancel] [Submit Quote]                            │
└──────────────────────────────────────────────────────┘
```

**Validation:**
```typescript
const validateQuote = (quote) => {
  const errors = []
  
  if (!quote.method) errors.push("Shipping method required")
  if (!quote.price_fiat || quote.price_fiat <= 0) {
    errors.push("Price must be greater than 0")
  }
  if (!quote.estimated_days || quote.estimated_days < 1) {
    errors.push("Estimated days required")
  }
  if (!quote.valid_hours || quote.valid_hours < 1) {
    errors.push("Valid hours required")
  }
  
  return errors
}
```

**Submission:**
```typescript
try {
  await sdk.logistics.submitQuote({
    order_id: orderId,
    provider_id: providerId,
    method: 'express',
    price_fiat: 14.00,
    currency: 'USD',
    estimated_days: 2,
    insurance_included: true,
    valid_hours: 24
  })
  
  alert('Quote submitted successfully!')
  router.push('/quotes?status=pending')
} catch (error) {
  alert(`Failed: ${error.message}`)
}
```

**After Submission:**
```
Provider Dashboard:
┌──────────────────────────────────────────┐
│ Quote Submitted ✓                       │
│                                          │
│ Order #12345                            │
│ Your quote: $14 USD, 2-3 days          │
│ Competition: 3 other quotes             │
│ Valid until: Dec 12, 2:30 PM           │
│                                          │
│ Status: Awaiting vendor decision        │
│ [View Quote] [Withdraw]                 │
└──────────────────────────────────────────┘

Vendor receives notification:
📧 New Quote Received
FastShip Express quoted $14 USD for Order #12345
[Review All Quotes]
```

---

### Feature 5: My Quotes

**Purpose:** Provider can view and manage all submitted quotes.

**Quotes Page:**
```
┌──────────────────────────────────────────────────────┐
│ My Quotes                                            │
├──────────────────────────────────────────────────────┤
│ Filters: [All ▼] [Pending] [Accepted] [Rejected] [Expired]│
├──────────────────────────────────────────────────────┤
│                                                      │
│ Pending (5)                                         │
│ ┌──────────────────────────────────────────────────┐│
│ │ 🟡 Order #12345 - Malaysia → Singapore          ││
│ │ Your quote: $14 USD, 2-3 days                   ││
│ │ Competing quotes: 3                              ││
│ │ Expires: 18 hours                                ││
│ │ [View] [Withdraw]                                ││
│ └──────────────────────────────────────────────────┘│
│                                                      │
│ Accepted (2) 🎉                                     │
│ ┌──────────────────────────────────────────────────┐│
│ │ ✅ Order #12340 - Malaysia → Singapore          ││
│ │ Accepted quote: $12 USD, 3-5 days               ││
│ │ Pickup by: Dec 13, 5 PM                         ││
│ │ [Create Shipment]                                ││
│ └──────────────────────────────────────────────────┘│
│                                                      │
│ Rejected (1)                                        │
│ ┌──────────────────────────────────────────────────┐│
│ │ ❌ Order #12338 - Malaysia → Indonesia          ││
│ │ Your quote: $18 USD                              ││
│ │ Reason: Vendor selected cheaper option          ││
│ │ [View Details]                                   ││
│ └──────────────────────────────────────────────────┘│
│                                                      │
│ Expired (12)                                        │
│ [View All]                                          │
└──────────────────────────────────────────────────────┘
```

**Quote Status Colors:**
- 🟡 Yellow: Pending
- ✅ Green: Accepted
- ❌ Red: Rejected
- ⏰ Gray: Expired

**Data Loading:**
```typescript
const [quotes, setQuotes] = useState([])
const [filter, setFilter] = useState('all')

useEffect(() => {
  const loadQuotes = async () => {
    const data = await sdk.logistics.getProviderQuotes(
      providerId,
      filter === 'all' ? undefined : filter
    )
    setQuotes(data)
  }
  loadQuotes()
}, [providerId, filter])
```

---

### Feature 6: Shipment Management

**Purpose:** Provider can manage active shipments and update tracking.

**Shipments Page:**
```
┌──────────────────────────────────────────────────────┐
│ Active Shipments (12)                                │
├──────────────────────────────────────────────────────┤
│ Filters: [All] [Pickup] [Transit] [Delivery]        │
├──────────────────────────────────────────────────────┤
│                                                      │
│ ┌──────────────────────────────────────────────────┐│
│ │ 📦 Shipment #SHP-2025-001                        ││
│ │ Order: #12340                                    ││
│ │ Tracking: FS-123456789                          ││
│ │                                                  ││
│ │ Route: Kuala Lumpur → Singapore                 ││
│ │ Status: 🚚 In Transit                           ││
│ │ Current Location: Johor Bahru                   ││
│ │ Est. Delivery: Dec 15, 2025                     ││
│ │                                                  ││
│ │ Progress: ▓▓▓▓▓▓▓▓▓▓░░░░░░ 60%                 ││
│ │                                                  ││
│ │ [Update Tracking] [View Details] [Contact]      ││
│ └──────────────────────────────────────────────────┘│
│                                                      │
│ ┌──────────────────────────────────────────────────┐│
│ │ 📦 Shipment #SHP-2025-002                        ││
│ │ Status: 📍 Out for Delivery                      ││
│ │ Est. Delivery: Today by 6 PM                    ││
│ │ [Mark as Delivered]                              ││
│ └──────────────────────────────────────────────────┘│
└──────────────────────────────────────────────────────┘
```

**Update Tracking Modal:**
```
┌──────────────────────────────────────────┐
│ Update Tracking - #SHP-2025-001          │
├──────────────────────────────────────────┤
│ Current Status:                          │
│ ● In Transit                            │
│                                          │
│ Update To:                              │
│ [Out for Delivery ▼]                    │
│   - Pending Pickup                      │
│   - Picked Up                           │
│   - In Transit                          │
│   - Out for Delivery                    │
│   - Delivered                           │
│                                          │
│ Current Location:                        │
│ [Woodlands Checkpoint, Singapore]        │
│                                          │
│ Notes (Optional):                        │
│ [Package cleared customs, on final leg]  │
│                                          │
│ Estimated Delivery:                      │
│ [Dec 15, 2025  3:00 PM]                 │
│                                          │
│ [Cancel] [Update Tracking]               │
└──────────────────────────────────────────┘
```

**API Call:**
```typescript
await sdk.logistics.updateTracking(shipmentId, {
  status: 'out_for_delivery',
  location: 'Woodlands Checkpoint, Singapore',
  notes: 'Package cleared customs, on final leg'
})
```

**Notification Sent:**
```
To Buyer:
📱 SMS: Your package from Leather Goods Shop is out
for delivery. Expected today by 6 PM.
Track: logistics-pool.com/track/FS-123456789

To Vendor:
📧 Email: Shipment update for Order #12340
Status: Out for delivery
Provider: FastShip Express
```

---

### Feature 7: Delivery Proof

**Purpose:** Provider uploads proof of delivery to complete shipment.

**Delivery Form:**
```
┌──────────────────────────────────────────────────────┐
│ Mark as Delivered - #SHP-2025-001                    │
├──────────────────────────────────────────────────────┤
│ Shipment Details:                                    │
│ • Order: #12340                                     │
│ • Recipient: David (Singapore)                      │
│ • Delivered to: 123 Orchard Rd, #05-01             │
│                                                      │
│ Proof of Delivery:                                  │
│                                                      │
│ Upload Photos:                                      │
│ ┌────────────┐ ┌────────────┐ ┌────────────┐      │
│ │  [Photo 1] │ │  [Photo 2] │ │ [+ Add]    │      │
│ │  Package   │ │ Signature  │ │            │      │
│ └────────────┘ └────────────┘ └────────────┘      │
│                                                      │
│ Recipient Signature:                                │
│ ┌──────────────────────────────────────────────┐   │
│ │                                              │   │
│ │          [Signature Canvas]                  │   │
│ │                                              │   │
│ └──────────────────────────────────────────────┘   │
│ [Clear]                                             │
│                                                      │
│ Delivered At:                                       │
│ [Dec 15, 2025  3:45 PM] (Auto-filled)              │
│                                                      │
│ Notes:                                              │
│ [Package delivered to recipient. ID verified.]      │
│                                                      │
│ Recipient Information:                              │
│ Name: [David Tan]                                  │
│ ID/Contact: [+65-XXXX-XXXX] (optional)             │
│                                                      │
│ [Cancel] [Confirm Delivery]                         │
└──────────────────────────────────────────────────────┘
```

**Submission:**
```typescript
const handleDelivery = async () => {
  // Upload photos to storage
  const photoUrls = await uploadPhotos(photos)
  
  // Hash signature for blockchain verification
  const signatureHash = await hashSignature(signature)
  
  await sdk.logistics.confirmDelivery(shipmentId, {
    photos: photoUrls,
    signature_hash: signatureHash,
    delivered_at: new Date(),
    recipient_name: recipientName,
    notes: notes
  })
  
  alert('Delivery confirmed! Payment will be processed.')
}
```

**After Confirmation:**
```
Provider sees:
┌────────────────────────────────────┐
│ ✅ Delivery Confirmed             │
│ Shipment #SHP-2025-001            │
│ Payment processing...             │
│ Expected in your account: 3-5 days│
└────────────────────────────────────┘

Buyer receives:
📧 Your order #12340 has been delivered!
Please confirm receipt and rate your experience.
[Confirm Delivery] [Report Issue]

Vendor sees:
📧 Order #12340 delivered successfully
Funds will be released from escrow in 7 days
(or immediately upon buyer confirmation)
```

---

## Provider Workflows

### Workflow 1: New Provider Onboarding

**Day 1: Discovery**
```
Provider (Ahmad) hears about Logistics Pool
→ Visits logistics-pool.rangkai.com
→ Reads "How It Works"
→ Clicks "Register as Provider"
```

**Day 1: Registration**
```
Fills registration form:
- Business name: "Ahmad Express Delivery"
- Regions: Malaysia, Singapore
- Methods: Standard, Express
- Insurance: Yes
- Uploads business license

Submits form
→ Receives confirmation email
→ KYC verification initiated
```

**Day 2-3: Verification**
```
Rangkai team reviews:
- KYC documents
- Business license
- Service capabilities

Email sent: "Application approved!"
→ Ahmad logs in
→ Sees dashboard for first time
```

**Day 3: First Quote**
```
Dashboard shows: "3 new opportunities"
Ahmad clicks "View Opportunities"

Sees: Order from KL to Singapore
- Weight: 2kg
- Needs insurance
- Perfect fit!

Ahmad submits quote: $12 USD, 3 days
→ Waits for response
```

**Day 4: Quote Accepted!**
```
Email notification: "Your quote was accepted!"
Ahmad logs in → Creates shipment

Generates tracking number: AE-123456
Schedules pickup: Tomorrow 9 AM
→ Confirms with vendor
```

**Day 5: Pickup & Ship**
```
Ahmad picks up package
→ Updates tracking: "Picked up"
→ Drives to Singapore

Updates tracking: "In transit"
→ Clears customs
→ Updates: "Out for delivery"
```

**Day 6: Delivery**
```
Ahmad delivers package
→ Takes photo
→ Gets signature
→ Uploads proof

Marks as delivered
→ Receives notification: "Payment processing"
→ Gets 5-star rating from buyer! ⭐
```

**Day 7+: Growth**
```
Ahmad's stats:
- 1 delivery complete
- 5.0 rating
- $12 revenue

More quotes come in
→ Builds reputation
→ Expands to Indonesia
→ Hires helper
→ Grows business
```

---

### Workflow 2: Daily Provider Operations

**Morning Routine:**
```
9:00 AM - Ahmad logs into dashboard
→ Checks stats:
  - 3 active shipments
  - 2 pending quotes
  - 1 new opportunity

→ Reviews shipments:
  - #001: En route to SG (on schedule)
  - #002: Ready for pickup today
  - #003: Delivered yesterday (awaiting confirmation)

→ Checks quotes:
  - Quote #45: Awaiting decision (20h left)
  - Quote #46: Rejected (vendor chose cheaper)

→ New opportunity:
  - KL → Bangkok (5kg, express)
  - Outside current routes
  - Decides to pass
```

**Midday Operations:**
```
12:00 PM - Pickup #002
→ Arrives at vendor location
→ Scans package
→ Updates tracking: "Picked up"
→ Photo of package
→ Drives to sorting center

1:00 PM - Updates #001
→ Crossed into Singapore
→ Updates tracking: "Cleared customs"
→ Location: "Woodlands Checkpoint"
```

**Afternoon Delivery:**
```
3:00 PM - Delivers #001
→ Arrives at buyer location
→ Verifies recipient ID
→ Hands over package
→ Takes photo + signature
→ Marks as delivered

3:15 PM - New opportunity alert
→ Perfect route (KL → SG)
→ Submits quote immediately
→ $13 USD, 3 days
```

**Evening Wrap-up:**
```
6:00 PM - Reviews day
→ 1 delivered ✓
→ 1 picked up ✓
→ 1 quote submitted ✓

→ Checks tomorrow's schedule:
  - 2 deliveries in Singapore
  - 1 pickup in KL
  - Route optimized ✓

→ Logs off
```

---

### Workflow 3: Handling Delivery Issues

**Scenario: Failed Delivery Attempt**

**Day 1: Delivery Attempt**
```
Ahmad arrives at delivery address
→ Nobody home
→ Calls buyer - no answer
→ Leaves notice: "We attempted delivery"

Updates tracking:
→ Status: "Failed delivery"
→ Location: Buyer's address
→ Notes: "Recipient not available, will retry tomorrow"

Buyer receives notification:
📱 SMS: Delivery attempt failed. Contact provider to reschedule.
```

**Day 1: Buyer Responds**
```
Buyer calls Ahmad: "Sorry, I'm at work until 6 PM"
Ahmad: "I can deliver tomorrow evening"
Buyer: "Perfect, see you then"

Ahmad updates tracking:
→ Notes: "Rescheduled for tomorrow 6-8 PM"
```

**Day 2: Successful Delivery**
```
Ahmad delivers at 6:30 PM
→ Buyer receives package
→ Happy resolution ✓
→ Ahmad still gets 5-star rating
→ Buyer notes: "Great communication!"
```

---

**Continue to workflows in next section...**

---

## Vendor Workflows

### Workflow 1: Vendor Sets Up Shipping

**Week 1: Product Creation**
```
Siti (leather goods maker) creates new product:
- Name: "Handmade Leather Backpack"
- Price: $150 USD
- Ships from: Kuala Lumpur, Malaysia

Reaches "Shipping" section:
┌────────────────────────────────────┐
│ Typical Shipping Details          │
│ Main Destinations: [Singapore ▼]  │
│ Weight: [2] kg                    │
│ Dimensions: [30] x [30] x [15] cm │
│                                    │
│ [Request Quotes from Providers]    │
└────────────────────────────────────┘

Clicks "Request Quotes"
```

**Week 1: Browse Providers**
```
Logistics Pool opens in new tab:
┌────────────────────────────────────────┐
│ Find Logistics Providers               │
│ Serving: Malaysia → Singapore          │
├────────────────────────────────────────┤
│ 15 providers available                 │
│                                        │
│ ⭐ 4.9 QuickPost (567 deliveries)     │
│ $15 USD, 2-3 days, Insurance ✓        │
│ [Request Quote] [★ Favorite]          │
│                                        │
│ ⭐ 4.8 FastShip (234 deliveries)      │
│ $12 USD, 3-5 days, Insurance ✓        │
│ [Request Quote] [★ Favorite]          │
│                                        │
│ ... (13 more)                          │
└────────────────────────────────────────┘

Siti requests quotes from top 5 providers
```

**Week 2: Review Quotes**
```
Email notification: "3 providers quoted your product"

Siti reviews:
- FastShip: $12 USD, 3-5 days
- QuickPost: $15 USD, 2-3 days
- SpeedyGo: $10 USD, 5-7 days

