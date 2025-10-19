README.MD

# Rangkai Protocol

A lightweight, open protocol for decentralised marketplaces, enabling small businesses to trade globally without relying on large platforms.

---

## Overview

Globalising small businesses is hard. Most marketplaces are optimised for scale and capital, leaving millions of unique vendors invisible beyond their local markets.  

**Rangkai** is a protocol-first, platform-optional marketplace infrastructure that:  
- Lowers barriers for small vendors to trade globally  
- Decentralises payments, logistics, and reputation  
- Supports Bitcoin + fiat payments  
- Remains open-source and tokenless  
- Allows multiple client marketplaces to plug in  

The protocol is the brain. Client marketplaces like Rangkai are the face, delivering local experiences, compliance, and onboarding. For now, both protocol and client are called Rangkai, with Rangkai-client serving as the pilot. Builders can create their own clients.

Option 2 (even simpler):
---

## Architecture Layers

**Protocol Core**

| Layer | Purpose |
|-------|--------|
| 0     | Identity & Reputation – Portable IDs, KYC optional, rating history |
| 1     | Discovery & Catalog – Standardized product schema, federated search |
| 2     | Transaction & Settlement – Escrow-first flow, Bitcoin & fiat |
| 3     | Logistics – Open courier registry, vendor-selected providers |
| 4     | Trust & Compliance – Ratings, disputes, advisory, tax tagging |
| 5     | Developer SDK – APIs, webhooks, plugins, Shopify/WooCommerce |
| 6     | Governance – Multisig, upgrade paths, gradual decentralisation |



**Client Layer**  
- Handles local UX, compliance, payment integrations, and vendor support  
- Can enforce jurisdiction-specific rules (e.g., KYC, tax)  
- Rangkai client supports MYR + BTC, Malaysia-specific logistics, and bilingual interface.   Similarly other clients can select logistics, language and currency preferences. 

**Infrastructure Layer**  
- Payment Rails: BTCPay Server, Stripe, optional PayPal, Visa, Mastercard
- Database: Supabase PostgreSQL  
- File Storage: S3 / Cloudflare R2  
- Messaging / Notifications: Nostr, SendGrid, Twilio  

---

## User Journeys

**Vendors**  
- Register → Create product listings → Get discovered globally → Receive orders → Select logistics → Ship → Get paid → Build reputation  

**Buyers**  
- Browse → Federated search → Place order → Pay (BTC/fiat) → Track shipment → Confirm delivery → Rate vendor & courier  

**Logistics Providers**  
- Register → Browse shipments → Submit quotes → Get selected → Pick up → Update tracking → Deliver → Get paid  

---

## Key Principles

- **Protocol Neutrality** – No custody of funds, no enforcement of sanctions, no central control  
- **Client Autonomy** – Clients can customise UX, compliance, and fees  
- **Vendor Portability** – Identity and reputation follow vendors across clients  
- **Transparent Data Flows** – Protocol stores only metadata, reputations, and order states  

---

## Federated Marketplace

- Clients query the protocol for listings from all marketplaces  
- Vendors can be discovered globally without leaving their local client  
- Escrow, payments, and logistics operate seamlessly across clients  

---

## Why Rangkai is Different

Alibaba: Large-scale B2B platform; Rangkai lets vendors sell without minimum order volumes, choose their own logistics, and operate on an open protocol.


Etsy: Focused on handmade/niche B2C; Rangkai supports B2B, multi-client federation, and seamless cross-border commerce.


Shopify: Tied to a single platform ecosystem; Rangkai allows vendor portability, protocol-level escrow, and federated discovery across multiple marketplaces.


---

## Getting Started

1. Connect your client to the Rangkai protocol via SDK/API  
2. Register vendors, buyers, and logistics providers  
3. Create product listings and enable federated search  
4. Enable escrow & payment rails (BTC/fiat)  
5. Start processing orders and tracking shipments  

For full technical details, architecture diagrams, and transaction flows, see the [White Paper](link-to-whitepaper.pdf) and [Transaction Flow](transaction-flow.mmd).

---

## Tooling Recommendations (MVP)

- Messaging: Nostr (anonymous), Twilio (verified)  
- Storage & Database: Supabase + Cloudflare R2  
- Notifications: Resend, SendGrid  
- KYC: Manual → Onfido/Jumio for scaling  
- Helpdesk: AI + Intercom  
- Translation: Optional, client-controlled  

---

**Rangkai Protocol** empowers small businesses to trade globally on their own terms while remaining neutral, flexible, and open-source.
