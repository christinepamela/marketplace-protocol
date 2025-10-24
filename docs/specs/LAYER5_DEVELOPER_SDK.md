# Layer 5 — Marketplace Integration & UI SDK Layer

## Purpose & Scope
Layer 5 provides the interface that allows external marketplaces, seller dashboards, mobile apps, logistics portals, and third-party commerce platforms to interact with the underlying decentralized commerce protocol. It abstracts away complexity from Layers 0–4 and presents a consistent, well-documented API and UI component set.

This layer ensures:
- Simple developer onboarding
- Seamless marketplace integration
- Optional decentralization migration paths
- Consistent user experience across different platforms

Layer 5 is **not** responsible for business logic or authoritative state. Instead, it binds UI flows to protocol instructions.

---

## Architecture Overview

UI / Marketplace Frontends
↓
Layer 5 (SDK + Components)
↓
Layer 4 (Order State & Escrow)
↓
Layer 3 (Logistics Coordination)
↓
Layer 2 (Payments & Settlement)


The SDK serves as a stable, versioned interface across varying marketplace environments or regulatory contexts.

---

## Core Modules

| Module | Description | Inputs | Outputs |
|-------|-------------|--------|---------|
| **Auth Adapter** | Maps marketplace identity to protocol identity | OAuth / Wallet, KYC Session | `actor_id`, Permissions |
| **Listing / Catalog UI** | Displays products + logistics eligibility | Marketplace DB + Protocol Calls | UI Rendered Components |
| **Checkout & Payment Flow** | Handles payment quote retrieval + execution | Buyer + Quote Details | Payment Receipt / Escrow Lock |
| **Shipment Selection UI** | Selects seller-default or buyer override logistics | Seller Vendor List + L3 Provider Pool | Selected Provider ID |
| **Order Tracking UI** | Displays end-to-end movement updates | Tracking Events (L3) | Progress Timeline |
| **Ratings UI** | Collects post-completion feedback | Delivery Confirmation | Stored Review Records |

---

## Event Synchronization Model (Hybrid Default)

Layer 5 uses a dual model:

| Channel | Default State | Use Case |
|--------|--------------|----------|
| **HTTPS Webhooks** | Enabled by default | Existing platforms needing easy integration |
| **Nostr Relay Subscription (Optional)** | Opt-in via config | Decentralized or privacy-sensitive marketplaces |

### Webhook Format
POST /webhook/order-status
Content-Type: application/json

{
"event": "order.shipped",
"tx_id": "0x...",
"order_id": "ORD-9834",
"timestamp": 1723847294,
"signature": "..."
}

### Nostr Subscription Topic Example
npub1... -> kind 70001 (order_status_updates)


---

## Ratings & Review Schema

| Field | Type | Description |
|------|------|-------------|
| rating_id | UUID | Rating record key |
| order_id | UUID | Linked order |
| actor_id | UUID | Buyer or Seller submitting rating |
| target_id | UUID | Provider or Counterparty being rated |
| score | INTEGER (1-5) | Performance rating |
| comment | TEXT | Optional feedback |
| timestamp | TIMESTAMP | Recorded on chain / DB |

---

## Buyer Override Logic

Buyers may override seller’s chosen logistics provider **only if**:

| Rule | Condition |
|------|-----------|
| R1 | Seller provider must be public in L3 logistics pool |
| R2 | Buyer-selected provider must support delivery region |
| R3 | Cost differential > 0 must be acknowledged before confirmation |
| R4 | Both parties maintain dispute eligibility |

Override action is negotiated and visible to all parties.

---

## Security Considerations

- Private keys never leave client wallets.
- Order lifecycle state checks enforced at Layer 4.
- Shipping override history recorded for dispute reconstructability.
- Reviews signed to prevent impersonation or spoofing.

---

## Design Recommendations

- Keep UI components theme-agnostic.
- Provide SDK wrappers for React, Vue, Svelte, iOS, and Android.
- Support progressive decentralization rollout via config flags:

enableNostr: false
enableWebhooks: true

This maintains smooth adoption while enabling long-term decentralization.
