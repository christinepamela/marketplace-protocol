# Logistics

**Status:** DRAFT, Session 44. Built from `docs/specs/logistics-pool/LOGISTICS_ARCHITECTURE.md` (April 2026, the last canonical statement), the earlier `logistics-pool` parts 1 to 3 (December 2025), the code at `958364a`, and Pam's S44 decisions. Where they disagree, Pam's decisions and then the code win. Those spec files were removed from the repository in S44. They are still in git history at `958364a` (for example `git show 958364a:docs/specs/logistics-pool/logistics-pool-part1.md`). Parts 1 to 3 hold the screen and workflow detail this page does not repeat.

---

## Why logistics is built into the protocol

Pam, S44: logistics is **mandatory** in the design. The protocol has to gather logistics vendors, because a small seller in Penang who has never exported cannot trade without a freight price. A pool shared across all marketplaces gives every marketplace shipping from day one.

Two further aims:
- **Entrepreneurs bring their own providers.** A marketplace entrepreneur can register local carriers and forwarders into the pool with very little effort. Registration must stay simple (see B21).
- **Data lowers costs.** Over time the pool records routes, prices, delivery times and failures. Use that to give sellers better estimates and to cut shipping costs. (Pam: "later".)

---

## Who may use the pool

| Who | Access |
|---|---|
| **Logistics provider** | **KYC identity only.** Enforced at registration (`provider.service.ts`: identity type must be `kyc`) |
| **Seller or buyer (KYC)** | Yes |
| **Seller or buyer (Nostr)** | **Yes, once they have completed KYC** through a marketplace (Pam, S44). A provider needs addresses, contacts and insurance details to quote and ship, so the pool needs a verified identity |
| **Seller or buyer (anonymous)** | **No.** They arrange their own logistics (Pam, S44) |

Not enforced yet: nothing stops an anonymous buyer or seller from requesting pool quotes (D55).

**Conflict in the old spec:** `LOGISTICS_ARCHITECTURE.md` section 4 says anonymous sellers and buyers can use the pool, because the provider is KYC'd and anchors the audit trail. Pam's S44 rule replaces it.

**Kept:** the protocol does not record a marketplace's "compliance posture" (no `acceptsAnonUsers` flag). Recording it would give the protocol actual knowledge of what each marketplace allows. The protocol records only what it can observe, such as which payment rails a marketplace used.

---

## Provider categories

Pam asked for a full category list to be held here. These are the kinds of provider the pool should hold. The code today has a `modes` field (free text) and a `service_type`-style split in the spec, not a fixed list.

| Category | Notes |
|---|---|
| Air express | Parcels, couriers, small high-value goods |
| Air freight | Pallets and larger air cargo |
| Sea LCL (shared container) | Common for small sellers |
| Sea FCL (full container) | Larger shipments |
| Road and trucking | Cross-border and domestic |
| Rail | Where lines exist |
| Last mile and domestic courier | Delivery at either end |
| Freight forwarders | Arrange the whole route; end to end |
| Customs brokers | Clearance and duties |
| Warehousing and fulfilment | Storage, packing. Not in the code yet (D47) |
| Specialised handling | Cold chain, hazardous goods, oversize. Needs a goods-licensing field |

A provider also declares: routes (origin and destination country pairs), which Incoterms it can fulfil, which goods it may carry, door pickup, door delivery, weight limits and insurance limits.

---

## How a shipment is arranged

**Path A (default): the seller attaches quotes to the product.**
1. The seller creates the product with origin country, weight, dimensions, HS code and Incoterm.
2. The seller asks the pool for quotes: broadcast to matching providers, a direct request to one, or pick a provider's standing quote.
3. Providers answer with price, days, Incoterm, validity (30 to 60 days) and insurance.
4. The seller accepts one or more. They become the shipping options the buyer sees.
5. The buyer picks one at checkout and pays product plus logistics in a single payment, held in escrow.
6. Accepting the quote creates the shipment. Tracking runs from there.
7. On release, escrow splits to seller, provider, marketplace and protocol (`payments_and_fees.md`).

**Path B: the buyer arranges their own.**
- **B1:** the buyer picks from pool quotes for their destination. Same payment and split as Path A.
- **B2:** the buyer uses their own forwarder off the platform. The order is product only (in effect EXW or FOB). The protocol is out of the logistics loop. This is also what anonymous users do.

**Incoterms.** Every product declares one. v1 supports **EXW, FOB, DAP and DDP**, with DAP the default. The Incoterm decides which quotes are valid for the product.

**Two kinds of quote.** A *product-level* quote is a standing offer with an expiry date, reused for each order until it expires. An *order-level* quote is tied to one order (Path B, or a seller with no pre-attached quote). The code has `quote_type: 'product' | 'order'`.

**Estimates.** Providers can publish rate cards ("MY to DE air express, 1 to 5 kg, about USD 45 to 65"). Sellers see these as clearly labelled estimates when no real quote exists. They cannot be booked. Not built (D8).

**Opportunities.** A provider sees only requests it is qualified for (route, mode, goods, Incoterm), not every order. The matcher exists but skips its filters for providers with no declared capabilities (B20).

**Favourites.** A seller can favourite providers, who then appear first in the next quote request.

---

## Fees on the logistics leg

- The protocol takes **0.5% of the logistics provider's payout**, never added to the buyer's total. (Plus 0.5% of the seller's payout.)
- Logistics providers are paid separately from the seller, in the same release.
- The marketplace fee applies to the seller's portion, not the logistics portion.

Details and the gaps in the code are in `payments_and_fees.md`.

---

## What exists in code

| Piece | State |
|---|---|
| Provider registration, KYC identity check | **BUILT** |
| Provider profile (routes, modes, Incoterms, door service, weight) | **PARTIAL.** Fields exist, registration does not collect them (B21), and two capability vocabularies are in use (B22) |
| Quotes: seller estimate, product quote, order quote, accept, reject | **BUILT** |
| Quote requests (seller and buyer) and opportunities | **BUILT**, with bugs (B20, B24, B25, D49) |
| Shipments, tracking events, status updates, history, cancel | **BUILT** |
| Favourites | **BUILT** |
| Logistics marketplace app (`logistics-marketplace`) | **BUILT**, a separate Next.js client for providers |
| Paying the provider on release | **PARTIAL** (B1, B32) |
| HS code on products | **Not built** (D5) |
| Currency layer with locked rates | **Not built** (D6) |
| Rate cards / estimates | **Not built** (D8) |
| Quote expiry and refresh reminders | **Not built** (D12) |
| Block anonymous users from the pool | **Not built** (D55) |

About 30 routes exist under `src/api/routes/logistics.routes.ts`.

---

## Deferred (not v1)

Provider pitches sellers (R1); several sellers' goods consolidated into one shipment (R2); returns and their money (R3); landed-cost lookup; HS code suggestion (R6); Lightning as the main rail; stablecoins; providers serving several marketplaces with shared reputation.

---

## Decisions on the open questions (Pam, S44)

1. **Nostr identities and the pool.** Allowed once they have done KYC (D59 is what makes that possible).
2. **Quote binding.** A quote is valid until its `valid_until` date. A provider may withdraw it early only for a major global shock (an oil price spike, a port closure) and reissue new quotes. A withdrawn standing quote does not vanish: it stays visible as an **estimate**, not bookable.
3. **Multi-vendor carts.** By default each seller's order is shipped on its own. If one buyer orders from sellers A and B who use the same port, the buyer can ask the provider to consolidate them into one carton. That is worthwhile only for high volume and the same port. The protocol does not automate it in v1 (R2, D28).
4. **Marketplace registration data.** See `actors_and_trust.md`, "Registering a marketplace".

## Returns (R27, open)

A return is a dispute question, so the criteria sit in `payments_and_fees.md` ("Returns and who pays"). For logistics, the rule from Pam (S44, 20 Nov) is: **first decide whether it is a real problem, then whose fault. If the shipment is at fault, the logistics provider bears the cost; if the seller is at fault, the seller does.**

What the norm is, for reference:
- **B2C:** the seller usually handles it, often with a prepaid return label.
- **B2B:** a physical return is costly and rare. Common outcomes are a replacement shipment, a credit against the next order, a partial refund, with return freight decided by fault. Return freight can cost more than the goods.

For a logistics provider this means: damage or loss in transit is their cost, covered by their insurance, so every provider's insurance limit matters. Open: how the protocol recovers from a carrier that has already been paid.

Sources: [ShipAid, B2B bulk return resolution](https://www.shipaid.com/blogs/ecommerce-tips/return-resolution-flowchart-b2b-bulk-orders).

---

Sources (removed S44, in git history at `958364a`): `docs/specs/logistics-pool/LOGISTICS_ARCHITECTURE.md`, `readme.md` and parts 1 to 3. Also `src/core/layer3-logistics/*`, `src/api/routes/logistics.routes.ts`, `tech_debt.md`.