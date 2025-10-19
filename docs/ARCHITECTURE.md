# Rangkai Protocol Architecture
## High-Level Component Breakdown

---

## 1. PROTOCOL CORE (The Brain)

### Layer 0: Identity & Reputation
**Purpose:** Who's who, and can they be trusted?

**Components:**
- Identity Registry (stores DIDs, verification status)
- Reputation Calculator (aggregates ratings, transaction history)
- Verification Service (handles KYC where required)

**Key Functions:**
- `registerIdentity()` - Create new vendor/buyer/logistics identity
- `verifyIdentity()` - Process KYC documents (client decides if needed)
- `getReputation()` - Fetch trust score for any participant
- `updateReputation()` - Record ratings after transactions

**Data Stored:**
- Decentralized identifiers (DIDs)
- Verification status (KYC, Nostr, Anonymous)
- Reputation scores & rating history
- Transaction completion rates

**Critical Feature: Portable Reputation**
- Reputation scores are portable across clients
- Stored as signed proofs or on decentralized ledger
- Vendor can move between marketplaces without losing trust history

---

### Layer 1: Discovery & Catalog
**Purpose:** What's available, and how do buyers find it?

**Components:**
- Product Schema Validator
- Federated Search Index
- Category Manager
- Image Storage Interface

**Key Functions:**
- `createProduct()` - Vendor adds listing (via client)
- `updateProduct()` - Modify listing
- `federatedSearch()` - Query across all client marketplaces
- `getProductDetails()` - Fetch full product info

**Data Stored:**
- Product listings (standardized schema)
- Images & documents (links to S3/R2)
- Categories & attributes
- Search indexes

**Critical Feature: Federated Search**
```
Buyer searches → Protocol queries ALL connected clients
→ Aggregates results → Returns unified list
→ Buyer can purchase from any marketplace seamlessly
```

**Real-time Updates:**
- Push-based events via WebSocket/SDK
- Clients receive instant notifications of new listings
- Search index updates in near real-time

---

### Layer 2: Transaction & Settlement
**Purpose:** How do orders happen, and how does money move?

**Components:**
- Order State Machine
- Escrow Manager
- Payment Router (supports Lightning, Stripe, PayPal, etc.)
- Fee Calculator & Distributor

**Key Functions:**
- `createOrder()` - Initiate purchase
- `processPayment()` - Route to appropriate payment rail
- `holdEscrow()` - Lock funds until delivery
- `releasePayment()` - Distribute to vendor, protocol, client
- `refundOrder()` - Handle cancellations/disputes

**Order States:**
```
CREATED → PAYMENT_PENDING → PAYMENT_ESCROWED → 
LOGISTICS_PENDING → IN_TRANSIT → DELIVERED → 
COMPLETED (or DISPUTED at any stage)
```

**Payment Flow:**
```
Buyer pays 100% → Escrow holds →
Delivery confirmed → Release:
  - Vendor: 94-97% (depends on client fee)
  - Protocol: 3% (configurable, can be reduced)
  - Client: 0-3% (client decides)
  
Note: Protocol fee is optional and configurable per client
```

---

### Layer 3: Logistics
**Purpose:** How do packages get from A to B?

**Components:**
- Logistics Provider Registry
- Quote Matching Engine
- Tracking Aggregator
- Delivery Confirmation Service

**Key Functions:**
- `registerLogisticsProvider()` - Courier signs up
- `broadcastShipment()` - Notify providers of opportunity
- `submitQuote()` - Provider bids on shipment
- `selectProvider()` - Vendor chooses courier
- `updateTracking()` - Real-time shipment status
- `confirmDelivery()` - Triggers payment release

**Logistics Marketplace Flow:**
```
Order placed → Protocol broadcasts to relevant providers
→ Providers submit quotes (price + timeline)
→ Vendor reviews and selects best option
→ Vendor explicitly approves selected provider
→ Selected provider gets shipment details
→ Updates tracking throughout journey
→ Confirms delivery → Triggers escrow release
```

---

### Layer 4: Trust & Compliance
**Purpose:** What happens when things go wrong? What are the rules?

**Components:**
- Dispute Manager
- Evidence Collection System
- Sanctions Advisory (not enforcement)
- Tax Tag Generator
- Rating & Review System

**Key Functions:**
- `fileDispute()` - Any party can raise issue
- `submitEvidence()` - Upload proof (tracking, photos, etc.)
- `resolveDispute()` - Operator/arbiter decides
- `checkSanctions()` - Advisory only, client decides
- `generateTaxReport()` - For compliant clients

**Dispute Resolution:**
```
Issue raised → Escrow frozen →
Evidence collected (both sides) →
Arbiter reviews → Decision made →
Funds released accordingly →
Reputation updated

Resolution Model (Progressive):
- Early stage: Operator-led
- Growth stage: Client-led
- Mature stage: Community-driven
```

**Compliance Model:**
- Protocol provides advisory tools (sanctions lists, tax helpers)
- Clients decide enforcement based on their jurisdiction
- Protocol stays neutral and non-custodial

---

### Layer 5: Developer SDK
**Purpose:** How do others build on this?

**Components:**
- REST API Gateway
- WebSocket Event Streams
- SDK Libraries (TypeScript, Python, etc.)
- Integration Plugins (Shopify, WooCommerce)

**Key Functions:**
- All protocol functions exposed as APIs
- Real-time event subscriptions
- Pre-built UI components (optional)
- Documentation & code examples

**Developer Experience:**
```typescript
import { RangkaiSDK } from '@rangkai/protocol-sdk';

const client = new RangkaiSDK({ apiKey: '...' });

// SDK abstracts both local client actions and protocol API calls
// Client developers can focus on UX, not infrastructure

// Create product
const product = await client.catalog.createProduct({
  name: "Leather Sandals",
  price: { amount: 45, currency: "USD" },
  // ... standard schema
});

// Listen for orders (real-time via WebSocket)
client.orders.on('new', (order) => {
  console.log('New order received:', order.id);
});
```

---

### Layer 6: Governance
**Purpose:** Who decides protocol changes and disputes?

**Components:**
- Multisig Operator Council
- Upgrade Proposal System
- Emergency Controls
- Fee Configuration

**Governance Stages:**
1. **Early:** Operator-led (you + small team)
2. **Growth:** Hybrid (clients vote on major changes)
3. **Mature:** Community-driven (progressive decentralization)

**Key Decisions Governed:**
- Protocol fee changes
- Core feature additions
- Dispute escalations
- Sanctions list updates

**Emergency Controls:**
- Pause mechanism for critical bugs
- Rollback capability for protocol attacks
- Multisig required for emergency actions

---

## 2. CLIENT LAYER (The Face)

### Rangkai Client (Reference Implementation)

**Components:**
- User Authentication
- Vendor Dashboard
- Buyer Marketplace UI
- Admin Panel
- Local Payment Integrations
- Messaging System
- Notification Engine

**Responsibilities:**
- UX/UI design and localization
- KYC enforcement (for Rangkai, required)
- Marketing and customer support
- Local compliance (Malaysia-specific)
- Additional features beyond protocol

**What Rangkai Adds:**
- Malay/English language support
- MYR currency display (with BTC option)
- Malaysia-specific logistics integrations
- Local tax compliance (GST reporting)
- Vendor onboarding assistance
- Photo editing tools for vendors

---

## 3. INFRASTRUCTURE LAYER (The Plumbing)

### Payment Rails
- **Stripe:** Fiat payments (card, bank transfer)
- **BTCPay Server:** Non-custodial Bitcoin/Lightning
- **PayPal:** Optional, client-configurable

### Database
- **Supabase PostgreSQL:** Primary data store
  - Identity records
  - Product catalog
  - Order history
  - Reputation scores
  - Logistics tracking

### Storage
- **Cloudflare R2 or S3:** Product images, dispute evidence
- **Client-level encrypted storage:** KYC documents (protocol does not manage these)
- **Access controls:** Only client and authorized parties can access sensitive data

### Messaging
- **Nostr:** Anonymous, decentralized messaging (optional)
- **SendGrid/Resend:** Email notifications
- **Twilio:** SMS for order updates

---

## 4. KEY INTERACTIONS

### Vendor Journey
```
Sign up (via Rangkai) → Verify identity (if KYC required) →
Create product listings → Get discovered globally →
Receive order → Select logistics → Ship →
Get paid (escrow release) → Build reputation
```

### Buyer Journey
```
Browse (local or federated search) →
Find product (any client marketplace) →
Place order → Pay (BTC or fiat) →
Track shipment → Receive goods →
Confirm delivery → Rate vendor & courier
```

### Logistics Provider Journey
```
Register on protocol → Verify credentials →
Set service areas & pricing →
Browse shipment opportunities →
Submit quotes to vendors →
Get selected → Pick up package →
Update tracking → Deliver →
Get paid → Build reputation
```

---

## 5. CRITICAL DESIGN PRINCIPLES

### Protocol is Neutral
- Never holds fiat currency (payment gateways do)
- Never enforces sanctions (clients decide)
- Never chooses winners (all clients equal access)

### Clients Have Autonomy
- Can add features beyond protocol
- Can enforce stricter rules than protocol
- Can customize UX completely
- Can set their own fee structure (within protocol limits)

### Vendors Have Portability
- Identity works across all clients
- Reputation follows them
- Can list products on multiple marketplaces
- Can leave one client without losing history

### Data Flows Are Clear

**Who Stores What:**

| Layer / Actor | Stores |
|---------------|--------|
| **Protocol Core** | Identity (DIDs), reputation proofs, product metadata, order state, logistics tracking |
| **Client** | UI customizations, user preferences, payment credentials, local compliance data |
| **Infrastructure** | Images, KYC documents (encrypted), dispute evidence, payment receipts |

**Key Principle:** Protocol never holds sensitive compliance data. Clients manage their own regulatory requirements.

---

## 6. WHAT MAKES THIS DIFFERENT

### vs. Alibaba
- No minimum order volumes
- Vendor controls logistics choice
- Anonymous options available
- Open protocol, not closed platform

### vs. Etsy
- B2B-focused, not just crafts
- Multi-client federation
- Built-in cross-border logistics
- Bitcoin payment option

### vs. Shopify
- Not locked to one platform
- Federated discovery across clients
- Protocol-level escrow
- Logistics marketplace integrated

---

## NEXT: Implementation Strategy

This architecture gives you:
1. **Clear separation of concerns** (Protocol vs Client vs Infrastructure)
2. **Gradual build path** (Layer 0 → Layer 6)
3. **Flexibility** (clients can innovate without breaking protocol)
4. **Neutrality** (no single entity controls everything)

The key is: **Start with Layers 0-2, build Rangkai client, then expand.**