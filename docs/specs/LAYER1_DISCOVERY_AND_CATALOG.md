# Layer 1 — Discovery & Catalog  
**Version:** v1.0 (Oct 2025)  
**Author:** Mestrae Protocol Core  
**Status:** Production-ready (~94 % complete)

---

## Purpose
Layer 1 defines the **marketplace’s data spine** — what a product is, how it’s stored, searched, and synced across federated clients.  
It turns **trusted identity (Layer 0)** into **discoverable inventory**, enabling open yet verifiable commerce.  
It follows a **public-read / vendor-write** security pattern to prevent single-point-of-failure while ensuring ownership integrity.

**Core Objectives**
- Define canonical product schema and relationships.  
- Enable cross-client discovery with minimal duplication.  
- Maintain search speed through an index layer.  
- Enforce reputation-aware ranking via vendor DID and score lookup.  
- Keep architecture modular for federation and protocol upgrades.

---

## System Overview
| Stack Layer | Role |
|--------------|------|
| Layer 0 | Identity & Reputation |
| **Layer 1** | **Discovery & Catalog** |
| Layer 2 | Transactions & Escrow |
| Layer 3 | Federation & Sync |

Layer 1 bridges **trust** (who you are) and **commerce** (what you sell).

---

## Architecture

| Component | Function | Notes |
|------------|-----------|-------|
| `types.ts` | Product, Category, and related contracts | Composed from `BasicSpecifications`, `AdvancedSpecifications`, `ProductPricing`, and `LogisticsInfo`. |
| `product.service.ts` | CRUD + lifecycle (`draft → active → indexed`) | Soft-delete, validation, async indexing trigger. |
| `search.service.ts` | Federated search, faceted filters, vendor enrichment | Queries `product_index` and ranks by `vendor_reputation`. |
| `category.service.ts` | Category hierarchy and attribute suggestions | Modular, extendable taxonomies. |
| `test-layer1.ts` | End-to-end integration test | Covers creation → publish → search. |
| **SQL schema** | Tables, triggers, RLS, RPCs | JSONB hybrid model with full-text search and automation. |

---

## Federated Search Philosophy

Search defines the experience of any marketplace.  
If discovery feels slow, fragmented, or inconsistent, the entire protocol feels broken — no matter how good the products or vendors are.

In Layer 1, search is treated as **infrastructure**, not an afterthought.

The `search.service.ts` module is designed to:

- Query across federated clients with index parity, so every node searches as if it’s global.  
- Rank results by vendor reputation from Layer 0, making trust a built-in ranking signal.  
- Cache relevance data locally to deliver low-latency suggestions.  
- Sync asynchronously so writes remain fast and reads stay fresh.

This design gives decentralized marketplaces what many federated systems lack — a smooth, instant, reputation-aware discovery layer.  
It makes products searchable by anyone, from anywhere, without giving up ownership or control.

Discovery is only useful when visibility is chosen, not imposed.

---

### Visibility & Ethical Commerce

Not every seller wants to be found by everyone. Some operate in early pilots, some serve only specific clients, and others simply need time to rebuild or restock. Visibility should reflect those realities, not force exposure.

#### Visibility States

| State       | Description                                                                 | Search Inclusion  |
|-------------|-----------------------------------------------------------------------------|-------------------|
| **Public**  | Fully searchable across federated marketplaces. Default for verified (KYC) sellers. | ✅                |
| **Restricted** | Visible only to specific marketplaces, geographies, or whitelisted buyers.       | ⚙️ Conditional     |
| **Private** | Hidden from search, accessible only via direct link. Used for closed pilots or invite-only sellers. | ❌                |
| **Paused**  | Searchable but marked inactive (“temporarily unavailable”). Ideal for holidays, restocks, or internal downtime. | ✅ (flagged)      |

This structure balances openness and choice. It keeps small sellers protected, allows marketplaces to manage access, and still maintains a transparent search ecosystem.

---

#### Seller Identity and Visibility

| Identity Type                          | Default Visibility | Allowed Options            | Notes                                                         |
|----------------------------------------|--------------------|----------------------------|---------------------------------------------------------------|
| **KYC Sellers**                         | Public             | Restricted, Paused         | Verified sellers default to openness but can choose limited visibility. |
| **Pseudonymous Sellers (Nostr, DID)**   | Public             | Private, Restricted        | Respect pseudonymity while allowing traceability through public keys. |
| **Anonymous Sellers (ZK)**              | Restricted         | Private                    | Full anonymity requires limited visibility for network safety. |

Visibility is earned through proof, not assumed. Verification grants reach, while privacy preserves agency.

---

#### Ethical Commerce

The protocol does not enable crime. It enables transparency, even when context is complex.

All marketplaces must comply with **internationally recognized human rights and trade norms**.  
Listings related to the following are prohibited:

- Weapons, arms, or explosives  
- Human trafficking, forced labor, or organ trade  
- Endangered wildlife (CITES violations)  
- Narcotics banned under UN conventions  
- Fraudulent or stolen financial assets

For politically induced “black markets” — where essential goods become restricted due to local policies — the protocol remains neutral but traceable. Marketplaces hosting such listings must ensure compliance and maintain transaction auditability.

**Responsibility is distributed:**

- The **protocol** enforces proof, integrity, and traceability.  
- The **marketplaces** enforce legality within their jurisdictions.  
- The **sellers** choose visibility based on trust, readiness, and context.

The protocol doesn’t decide what’s moral. It makes every decision visible.


---


## Data Flow
Vendor (Layer 0) → ProductService.createProduct()
   ↳ INSERT into products  
   ↳ trigger_sync_product_to_index()  
   ↳ UPSERT into product_index  
→ SearchService.search()
   ↳ Query product_index  
   ↳ Join vendor reputation (Layer 0)  
   ↳ Return faceted results  

Asynchronous syncing ensures **fast writes + consistent reads**.



---

## Database Schema

| Table | Role | Highlights |
|--------|------|-------------|
| `products` | Canonical source of truth | JSONB schema, version-ready. |
| `product_index` | Search-optimized store | Full-text & keyword indexes; auto-synced. |
| `product_views` | Analytics capture | Tracks public engagement. |
| `product_inquiries` | Lead capture | Links buyer ↔ vendor for future Layer 2 use. |
| **Functions / Triggers** | Automation | `sync_product_to_index()`, `increment_product_stat()`. |
| **RLS Policies** | Security | “Public read, vendor write” enforced per DID. |

---

## Integrations

| Upstream / Downstream | Status | Description |
|------------------------|---------|-------------|
| **Layer 0 – Identity & Reputation** | ✅ Ready | Uses `vendorDid`, joins `identities` + `reputations`. |
| **Layer 2 – Transactions & Escrow** | ⚙️ Pending | Consumes `price`, `moq`, `leadTime` for order contracts. |
| **Layer 3 – Federation & Sync** | ✅ Active | `clientId` + triggers propagate updates. |
| **Analytics (Layer 5)** | 🚧 Optional | Feeds views & inquiries into dashboards. |

---

## Governance Hooks
- **Parameter changes** (index config, ranking weights) require multisig from Layer 6.  
- **Protocol upgrades** use versioned schemas to avoid breaking clients.  
- **Data portability** supported via federated export (JSON schema + signature).

---

## Security & Compliance
- Row-Level Security for vendor ownership.  
- Public read-only access through restricted policies.  
- Rate limiting recommended for `product_inquiries`.  
- Audit log events recorded for schema updates.

---

## Testing
- `test-layer1.ts`: full integration test path.  
- Focus areas: CRUD, publish workflow, search relevance, RLS policy enforcement.  
- Target coverage ≥ 90 %.

---

## Future Extensions
- **Caching Layer:** Add Redis or Supabase Edge caching for federated search.  
- **Dynamic Taxonomies:** External category validation via micro-service.  
- **Reputation Integration:** Weighted ranking using Layer 0 reputation proofs.  
- **Cross-Instance Federation:** Auto-sync via Layer 3 pub/sub queue.

---

## Summary
Layer 1 converts product data into **network-discoverable, trust-anchored inventory**.  
It is production-ready with minor optimizations pending, and fully aligned with Layer 0 identity standards.
