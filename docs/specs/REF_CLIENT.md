# Reference Client
**Layer 5 – Client SDK & Reference Marketplace**

## Purpose
The Reference Client is the official marketplace front-end demonstrating how **Layers 0–5 integrate**. It serves two intertwined purposes:

### 1. Developer Reference / SDK Consumer
- Provides typed methods for marketplaces to interact with the protocol.
- Handles identity, catalog, orders, logistics, ratings, and governance.
- Supports REST, WebSocket, and optional Nostr event flows.

### 2. User-Facing Marketplace
- Implements the **“Timeless Comfort”** inspired design theme.
- Clean, approachable, functional, warm UI that emphasizes products.
- Supports multiple categories: footwear, bags, accessories, electronics, home & living.
- Balances Alibaba-like clarity for B2B with Etsy-like warmth, helping users immediately understand the marketplace.

---

## 1️⃣ Reference Client Strategy

### Primary Goals

| Goal | Description |
|------|-------------|
| Seamless Protocol Integration | All UI actions map directly to Layer 0–5 SDK flows. |
| Modular UX | Components separated by actor type: buyer, vendor, logistics, admin. |
| Scalable SDK | TypeScript-first; extensible to Python, mobile, and other languages. |
| Marketplace-as-a-Home | UI is subtle and supportive; products remain the hero. |
| Future-Proof | Supports Nostr subscriptions, multi-marketplace flows, hybrid decentralization. |

### Theme Guidelines (Timeless Comfort Inspired)

| Aspect | Specification |
|--------|---------------|
| Palette | Whites, creams, soft greys, muted earth tones, subtle accents (dusty sage, muted blush, navy) |
| Texture | Linen, light woods, soft textiles, ceramics, matte metals |
| Shapes | Clean lines, soft curves, layered textures |
| Mood | Calm, organized, approachable luxury; cozy yet sophisticated |
| Focus | Products and objects take center stage; UI functional and warm |

---

## 2️⃣ Client Folder Architecture (Extended)

client-sdk/ # SDK for marketplace developers
reference-client/ # Next.js reference marketplace
├─ src/
│ ├─ app/
│ │ ├─ layout.tsx # Global layout & theming
│ │ ├─ page.tsx # Home page
│ │ ├─ marketplace/ # Customer browsing flows
│ │ ├─ vendors/ # Vendor dashboards & onboarding
│ │ └─ admin/ # Marketplace management
│ ├─ components/ # UI components
│ │ ├─ common/ # Buttons, modals, typography
│ │ ├─ buyer/ # Cart, checkout, reviews
│ │ ├─ vendor/ # Listings, inventory
│ │ └─ logistics/ # Tracking, delivery UI
│ ├─ services/
│ │ ├─ api.ts # SDK client wrapper
│ │ └─ protocol.ts # Protocol integration (Layer 0–5)
│ └─ types/ # Type definitions
├─ public/ # Static assets
├─ package.json
└─ next.config.js


**Key Points:**  
- `services/api.ts` acts as the reference client SDK adapter.  
- `services/protocol.ts` orchestrates Layer 0–5 calls and event handling.  
- Components are modular per actor type.  
- App is ready for multi-marketplace and multi-category expansion.  

---

## 3️⃣ Client Actor Roles & Permissions

| Actor | Allowed Actions | SDK Methods / Layer |
|-------|----------------|------------------|
| Buyer | Browse catalog, add to cart, checkout, submit review | catalog.*, orders.*, logistics.* |
| Vendor | List products, update inventory, view orders | catalog.*, orders.*, logistics.* |
| Logistics | View assigned orders, update tracking | logistics.* |
| Admin | Manage categories, users, marketplace config | governance.*, catalog.*, orders.* |

**Notes:**  
- Permissions enforced both client-side and protocol-side.  
- Buyers can override logistics providers if allowed by seller rules (Layer 3).  

---

## 4️⃣ SDK Methods & Module Mapping

| Module | Method | Purpose |
|--------|--------|--------|
| Identity | registerUser() | Onboard buyer/vendor with KYC/ZK |
| Identity | getReputation(userId) | Fetch reputation NFT |
| Catalog | listProducts(filters?) | Fetch product catalog |
| Catalog | getProduct(id) | Fetch single product details |
| Orders | createOrder(orderInput) | Buyer initiates order |
| Orders | getOrderStatus(orderId) | Poll or subscribe for updates |
| Orders | submitReview(orderId, review) | Post-transaction review |
| Logistics | getProviders(region?) | Show Layer 3 pool options |
| Logistics | overrideProvider(orderId, providerId) | Buyer override if allowed |
| Events | subscribe(event, handler) | WebSocket/Nostr real-time updates |

---

## 5️⃣ Event Subscriptions

| Event Name | Trigger | Payload | Subscriber Example |
|------------|--------|--------|------------------|
| order:created | Buyer completes checkout | Order ID, buyer, seller, items | Admin dashboard, Vendor WS |
| order:shipped | Logistics provider ships | Tracking info, ETA | Buyer, Vendor WS |
| order:delivered | Order delivered | Timestamp, rating eligibility | Buyer, Vendor WS |
| review:submitted | Buyer posts review | Rating ID, score, comment | Vendor dashboard |
| inventory:updated | Vendor updates product quantity | Product ID, new quantity | Buyer search cache |

---

## 6️⃣ Data Flow Mapping (UI → SDK → Layer)

| UI Action | SDK Call / Layer | Notes |
|-----------|----------------|-------|
| Add product to cart | catalog.getProduct() | Client-side validation |
| Checkout | orders.createOrder() | Layer 2 escrow triggered |
| Track shipment | logistics.getProviders() | Optional buyer override |
| Submit review | orders.submitReview() | Updates Layer 3/4 ratings |
| Vendor updates inventory | catalog.listProducts() | Real-time via WebSocket |

---

## 7️⃣ Data Structures & Override Rules

**Order Object**
```json
{
  "id": "order123",
  "buyerId": "userA",
  "vendorId": "vendorB",
  "items": [{ "productId": "p1", "quantity": 2 }],
  "status": "pending",
  "logisticsProviderId": "l1"
}

```

**Review Object**
```json
{
  "id": "review123",
  "orderId": "order123",
  "score": 5,
  "comment": "Great product!",
  "timestamp": "2025-10-25T10:00:00Z"
}
```

**Logistics Provider Object***
```json

{
  "id": "l1",
  "name": "FastShip",
  "region": "Kuala Lumpur",
  "kycVerified": true
}
```

### Buyer Override Rules

| Condition                | Allowed Action                          |
|--------------------------|----------------------------------------|
| Seller allows override    | Buyer can select provider               |
| Seller restricts override | Disabled / ignored                      |
| KYC buyer + anon seller   | Buyer informed; risk on buyer/logistics |

---

### 8️⃣ Reference Client Roadmap

| Phase | Goal / Focus | Deliverables / Notes |
|-------|--------------|--------------------|
| 0 — Planning & Design | Finalize theme, UI components, initial categories, wireframes | Design system, category mapping, theme tokens |
| 1 — SDK & API Integration | Implement client.ts bindings; test Layer 0–4 API calls | Minimal UI for product catalog, connection testing |
| 2 — Core Marketplace Flows | Buyer browsing, cart, checkout; Vendor onboarding & listing; Logistics selection & tracking | Functional buyer/vendor/logistics flows |
| 3 — Ratings & Reviews | Post-delivery reviews; display seller ratings; buyer override rules | Integrate Layer 3 review tables & rules |
| 4 — Event-Driven UX | Real-time order/shipping/inventory updates; optional Nostr | WebSocket subscriptions, event handler setup |
| 5 — Polishing & Theme Refinement | Apply full Timeless Comfort design; accessibility & mobile-first; cross-category consistency | Design polish, responsive layout, accessibility tweaks |
| 6 — Multi-marketplace & Hybrid Deployment | Support multiple marketplaces per client; hybrid decentralization flags | Config-driven marketplaces, optional REST/Nostr toggle, SDK extensions (Python, mobile) |

---

### 9️⃣ Testing & Error Handling

| Area             | Strategy                                                                 |
|-----------------|--------------------------------------------------------------------------|
| Unit tests       | SDK module methods, API adapters, event handlers                         |
| Integration tests| Mock server for Layer 0–5 flows                                          |
| Event handling   | Simulate WebSocket/Nostr messages, validate UI updates                   |
| Error handling   | Network failures, invalid data, unsupported features handled gracefully  |

---

### 🔟 Recommendations

- Start with protocol/SDK integration first, then build the UI.
- Keep the theme subtle; products remain the hero.
- Prioritize cross-category clarity (Alibaba + Etsy).
- Develop SDK and reference client in parallel for Layer feature integration.
- Implement theme toggles / hybrid deployment flags for gradual decentralization testing.
- Include error handling, fallback, and testing strategy before UI polishing.
