# Logistics Architecture

**Status:** Working architecture, post Session 28
**Last updated:** 2026-04-25
**Supersedes (in part):** `docs/specs/logistics-pool/` (parts 1-3, Dec 2025) where conflicts exist
**Companion doc:** `TECH_DEBT.md`

---

## 1. What this document is for

This is the canonical statement of how logistics works in the Rangkai protocol as of Session 28. The earlier `logistics-pool/part1-3` specs are still useful for UI and workflow detail, but they pre-date several decisions we've made since: the 0.5% fee model, Incoterms, the marketplace-entrepreneur framing, the buyer's three opt-out tiers, and the rejection of the marketplace-anon flag. Where this doc and the older specs disagree, this doc wins.

When a new Claude session opens with the project, point it here first. It will not need to re-derive any of this.

---

## 2. The three-actor model

The protocol has three classes of actors. This is foundational and has not changed:

- **Marketplace entrepreneurs** set up flagship marketplaces using the protocol. They onboard their local sellers and buyers, decide their own KYC policy, set their own seller fees, handle their own jurisdictional compliance. Rangkai-marketplace is one such marketplace and is also our reference client.
- **Logistics pool participants** are KYC-mandatory, no exceptions. Single tier, ranked by performance not verification level. Pool is shared across all marketplaces.
- **The protocol itself** is passive infrastructure. It provides rails (identity, catalog, transaction, logistics, trust, governance, SDK), takes 0.5%, and does not enforce policy beyond the protocol-level rules in this doc.

The phrase "marketplace entrepreneur" matters. These are people getting their local small businesses online and bringing local logistics into the pool. They are not platform operators in the FAANG sense — they are community builders. Build features for them.

---

## 3. Fee model

Flat 0.5% to the protocol from each side of a logistics transaction:

- 0.5% from the seller's side, taken from the product portion of the order
- 0.5% from the logistics provider's side, taken from the logistics portion

Total protocol take per logistics-completed order: 1% of GMV.

Marketplace entrepreneurs may charge their own fee on top of the seller's portion. That's their business; the protocol doesn't care what they charge or whether they charge anything. Down the line we may reduce the seller side to 0.1% as volume justifies it.

The 0.5% appears as a line item labelled **"Service fee"** on checkout. Visible, not hidden. Trust is built by transparency.

The fee is collected by the protocol regardless of payment rail (Stripe, BTC on-chain, Lightning). On Stripe it's deducted at settlement. On BTC/Lightning the marketplace remits it as part of the payment-routing logic.

**Floor consideration (tech debt):** at very low transaction values, 0.5% may not cover variable processing costs. Punt for now, revisit when we have real volume data.

---

## 4. Identity & KYC matrix

| Actor | KYC required? | Decided by |
|---|---|---|
| Marketplace entrepreneur | Required to sign up to protocol | Protocol |
| Logistics provider | Required to join logistics pool | Protocol |
| Seller on a marketplace | Marketplace's choice | Marketplace entrepreneur |
| Buyer on a marketplace | Marketplace's choice | Marketplace entrepreneur |
| Anyone using BTC/Lightning rails | KYC not required by protocol | — |

**Anon sellers and buyers can use the logistics pool.** The pool itself is KYC'd, so the logistics counterparty is identified — that's the audit trail anchor for the physical leg. Pseudonymous parties at the marketplace layer don't need their own KYC for the pool to be accountable.

**Anon-by-protocol-design: explicitly off-limits.** The pool requires KYC from providers. Marketplaces can be entirely anon (their entrepreneur's choice) but those marketplaces cannot use the pool — they self-arrange logistics off-platform. This is by design.

---

## 5. The marketplace identity question (no flag)

Earlier draft proposed a `acceptsAnonUsers: boolean` field on marketplace registration. **This was wrong.** Recording a marketplace's compliance posture creates "actual knowledge" liability for the protocol operator. We do not want to be the witness on the stand.

Instead: the protocol records *what is operationally observable* — which payment rails a marketplace uses, transaction history, etc. — and does not record *self-attested compliance posture*. If a marketplace operates anon, this is observable through behavior (uses BTC rails, no KYC enforcement on their side, and so on) but not through a flag we maintain.

The protocol provides all rails (Stripe, BTC, Lightning) to all marketplaces. Whether a given rail is appropriate for a given marketplace's user policy is the marketplace's call. Stripe's own KYC will block transactions that Stripe finds non-compliant; that's not the protocol's enforcement, it's Stripe's.

Net effect: the protocol cannot answer "is this marketplace anon-friendly" because it does not record it. It can only answer "what rails has this marketplace used."

---

## 6. The logistics flow — corrected

The implemented flow as of Session 27 was: order placed → payment → orders surface as opportunities to providers → vendor accepts a quote post-payment → no payment for logistics ever happens. **This is broken** and was never the intended design — older specs (Dec 2025) describe a product-level pre-quote system that was simply not built.

The corrected flow has two paths.

### Path A — Seller pre-attaches logistics quotes (default)

```
1. Seller creates product. Declares:
   - origin country (where it ships from)
   - weight + dimensions
   - HS code
   - Incoterm offered (default: DAP)

2. Seller requests quotes from logistics pool. Either:
   (a) Broadcast to providers matching route+modal+HS, or
   (b) Direct RFQ to a known provider, or
   (c) Picks a standing quote already on a provider's profile

3. Providers respond with quotes. Quote has:
   - price + currency
   - estimated days
   - Incoterm fulfilled
   - validity period (default 30-60 days)
   - insurance terms

4. Seller accepts one or more quotes per route.
   These become the buyer-visible shipping options on the product.

5. Buyer adds product to cart. Sees product price + each available
   logistics option as a separate line. Picks one before paying.

6. Buyer pays product subtotal + chosen logistics + 0.5% service fee.
   Single payment, escrowed.

7. Quote acceptance triggers shipment creation. Provider gets pickup
   details. Standard tracking lifecycle from there.

8. On delivery confirmation, escrow splits:
   - Product portion → seller (minus 0.5%)
   - Logistics portion → provider (minus 0.5%)
   - 1% total → protocol
```

### Path B — Buyer arranges own logistics

At checkout, the buyer can opt to decline seller's logistics. Two sub-paths:

**B1. Buyer picks from logistics pool.** Buyer sees pool-wide quotes for their destination, filtered by what providers are qualified to handle (route, HS, Incoterm). Buyer picks one. Same payment flow as A — single payment, escrow split. The seller's liability ends at handover to logistics; buyer accepts liability from there.

**B2. Buyer arranges off-platform.** Buyer says "I'll send my own freight forwarder." Order is product-only. Seller indicates pickup readiness. Platform is out of the logistics loop. This is essentially EXW or FOB — buyer accepts full responsibility from seller's door (or seller's port). Platform charges 0.5% on the product side only.

### Required field on every product: Incoterm

Every product must declare an Incoterm. Default to DAP for small-business export (seller arranges shipping, buyer pays duties on arrival). The Incoterm determines which logistics quotes are valid for the product (a DDP product needs a DDP-capable provider).

The 11 Incoterms grouped by IINO San:
- **Group E (EXW):** buyer takes everything from seller's door
- **Group F (FCA, FAS, FOB):** seller delivers to origin port, buyer takes over
- **Group C (CFR, CIF, CPT, CIP):** seller pays freight, risk transfers at origin port
- **Group D (DAP, DPU, DDP):** seller bears responsibility to destination

For v1, support: **EXW, FOB, DAP, DDP**. These cover ~90% of small-business B2B export. Add the others later.

---

## 7. Provider profile fields (replacing the current generic enum)

Current model: provider declares `service_regions: string[]`, `shipping_methods: ('standard'|'express'|'freight')[]`, `insurance_available: boolean`. This is too coarse to serve real B2B logistics.

New model — provider declares:

| Field | Why |
|---|---|
| `service_type` | end-to-end forwarder / segment specialist / pure carrier |
| `routes` | array of `{origin_country, destination_country}` pairs they cover |
| `modes` | sea_lcl / sea_fcl / air_express / air_freight / road / rail |
| `incoterms_supported` | which Incoterms they fulfil — affects whether their quote is valid for a given product |
| `hs_categories` | which goods they're licensed to carry (textiles ok, dangerous goods not unless permitted) |
| `door_pickup` / `door_delivery` | booleans for last-mile coverage at origin / destination |
| `weight_brackets` | min/max weight per shipment |
| `insurance_caps` | coverage limits in fiat, with excluded categories |

The current `service_regions` and `shipping_methods` fields stay as-is in the database for now and are deprecated — see `TECH_DEBT.md`. New fields layer on without breaking existing providers.

---

## 8. Quote model — product-level vs order-level

Two kinds of quotes coexist:

**Product-level quote (standing offer).** Tied to a `product_id`, not an order. Has `valid_until` (default 30-60 days). When a product gets ordered and the buyer picks this option, the quote is consumed and a shipment is created. Quote can be refreshed: provider gets a notification 7 days before expiry, can re-quote, seller accepts the refresh, product page updates seamlessly.

**Order-level quote (Path B / fallback).** Tied to an `order_id`. Used when buyer picks own logistics, or when seller has no pre-attached quotes and the order falls into a post-payment RFQ. Same lifecycle as the current implementation, just better-scoped.

The implemented `shipping_quotes` table currently only has `order_id`. **Schema change needed:** add `product_id` (nullable) and a `quote_type: 'product' | 'order'` discriminator. Either field is set, never both. See `TECH_DEBT.md`.

---

## 9. Opportunity model — corrected

Opportunities are not raw orders. Opportunities are RFQs that providers can browse and quote on. They come from two sources:

1. **Seller-initiated:** seller publishes a product and broadcasts an RFQ. Filtered to providers who match route, mode, HS, Incoterm.
2. **Buyer override:** buyer at checkout declines seller's logistics and triggers a pool RFQ. Same matching logic.

Providers don't see "all orders that need shipping." They see "RFQs I'm qualified for." This is the "smart pool" feature that was always promised in the older specs.

The current `getOpportunities()` endpoint surfaces orders. **Endpoint behaviour change needed:** opportunities now come from a new `logistics_rfq` table (or equivalent), filtered against the provider's profile. See `TECH_DEBT.md`.

---

## 10. Estimated quotes (pre-quote)

Providers can publish standing rate cards on their profile: "MY → DE air express, 1-5kg, ~$45-65 typical." These appear to sellers as **estimates**, clearly labelled, when no formal quote exists. They are not bookable. They become bookable when a seller requests a real quote and the provider responds with a firm number.

Estimated rates have a `last_updated` field. Estimates older than 30 days are shown with reduced confidence or suppressed.

This is what makes the pool useful for a seller in Penang who's never exported before — they get a price range without having to chase 5 providers for quotes.

---

## 11. Documentation requirements per shipment

For international shipments, the system supports (sometimes requires) a few extras:

- **HS code** on the product (required for any international shipment)
- **Commercial invoice** auto-generated from order data (v1.1)
- **Incoterm** on the product → flows into the shipping label / bill of lading
- **Sanctions advisory** — protocol provides the lookup, marketplace decides what to do (Layer 4)

The first version requires sellers to provide HS codes. We can add HS code suggestion (from product description) later — that's a Layer 1 catalog feature.

---

## 12. Currency

Sellers price in their currency. Logistics providers quote in their currency. Buyers pay in theirs. All cart math happens in a presentation currency (USD by default) using exchange rates locked at order confirmation, valid for 24-48 hours.

Currently the cart and logistics quote use ad-hoc currency fields and assume USD. This works for testing. **For production:** introduce a currency layer with rate-locking. See `TECH_DEBT.md`.

---

## 13. Escrow split

When payment is received:

```
buyer pays = product_subtotal + logistics_cost + (0.005 * product_subtotal) + (0.005 * logistics_cost)
           = product portion + logistics portion + service fee
```

Escrow holds the full amount. On delivery confirmation:

- Seller receives `product_subtotal - (0.005 * product_subtotal) - (marketplace_fee_if_any)`
- Logistics provider receives `logistics_cost - (0.005 * logistics_cost)`
- Protocol receives `0.005 * (product_subtotal + logistics_cost)`
- Marketplace receives whatever they configured for their seller fee

For Stripe: split via Stripe Connect transfers at delivery confirmation.
For BTC: marketplace's payment router handles the split using PSBTs or routed Lightning payments.

The current implementation doesn't split — vendor gets product money and logistics gets nothing. **This is the most important fix needed.** See `TECH_DEBT.md`.

---

## 14. What's deferred

These are mentioned in our discussions but are not v1:

- Provider-pitches-seller (Scenario 4 from session 28) — needs anti-spam throttle design
- Multi-vendor logistics consolidation (combining shipments from multiple sellers in one region into one shipment to one buyer)
- Reverse logistics financials (returns, damaged shipments, rejected at customs)
- Landed cost API integration (DHL or similar) for accurate import duty preview
- HS code auto-suggest from product description
- Lightning Network as primary rail (BTC on-chain is being tested first)
- Stablecoin support (USDC, USDT)
- Federated provider discovery (provider on marketplace A serving sellers on marketplace B with cross-marketplace reputation)

These are tracked in `TECH_DEBT.md` under "Roadmap / not v1."

---

## 15. v1 minimum buildable slice

For Stage 5 testing to work as designed (not as currently broken):

1. Add Incoterm field to product schema. Validate on listing.
2. Add `product_id` and `quote_type` to `shipping_quotes` table.
3. Add seller-initiated RFQ broadcast endpoint.
4. Build seller-side "request shipping quotes" UI on product creation/edit page.
5. Show available logistics options at checkout (cart line items per option).
6. Unified cart math: product + logistics + 0.5% service fee.
7. Implement escrow split on delivery confirmation.
8. Buyer override option at checkout (Path B1).
9. Update `getOpportunities()` to read from RFQs not orders.

That's the v1 slice. Path B2 (off-platform), provider profile expansion (routes/modes/HS), estimated rates, and Path A's quote refresh flow can come in v1.1.

---

## 16. Open architecture questions

These are explicitly unresolved and should be revisited:

- **Quote binding:** when a seller accepts a provider's pre-sale quote, is the provider locked in for every sale or is it a standing offer that can be revoked? Lean: standing offer with `valid_until`, no commitment of capacity.
- **Returns financial flow:** if a shipment is returned, who refunds whom? Touches Layer 4 (disputes) more than Layer 3.
- **Multi-vendor cart:** vendors can be in different countries with different logistics. Each vendor-group needs its own logistics pick. UI gets busier; data model already supports it.
- **Payment-rail-specific 0.5% handling:** Stripe Connect has fee mechanics, BTC on-chain doesn't. The fee math in section 13 assumes split is mechanical. The implementation will be different per rail.
- **Marketplace registration data:** what fields do we record about marketplace entrepreneurs (the protocol's only directly-onboarded users)? What's the minimum needed for the protocol to function vs. what creates legal exposure?

---

## 17. References to existing docs

This doc replaces the architecture sections of:
- `docs/ARCHITECTURE.md` Layer 3 description (where it says "Provider bids on shipment" implying post-payment)
- `docs/specs/LAYER3_LOGISTICS.md` (older, lighter spec)

This doc supplements and partially supersedes:
- `docs/specs/logistics-pool/part1.md` — Vision still holds, fee model is now 0.5% not 3%
- `docs/specs/logistics-pool/part2.md` — Workflows still hold, add Incoterm and 0.5% fee where missing
- `docs/specs/logistics-pool/part3.md` — Schema needs the changes listed in `TECH_DEBT.md`

When a future session reads this, they should also skim parts 1-3 for UI/workflow detail this doc deliberately doesn't repeat.



# Architecture doc additions (after re-reading older specs)

These are three focused additions to `LOGISTICS_ARCHITECTURE.md`. Apply them before committing.

---

## Addition 1 — Replace `logistics_rfq` with `quote_requests`

The older part-3 spec already proposed a `quote_requests` table for exactly this purpose. Use that name to align with prior work.

**In Section 9 (Opportunity model):**

Change:
> Opportunities now come from a new `logistics_rfq` table (or equivalent), filtered against the provider's profile.

To:
> Opportunities come from the `quote_requests` table (already specced in `docs/specs/logistics-pool/part3.md`, not yet implemented), filtered against the provider's profile. The schema already includes origin/destination/weight/dimensions/insurance — extend it with `incoterm`, `hs_code`, and `product_id` (nullable, set when seller-initiated for a specific product).

**In `TECH_DEBT.md` D3:** Same rename — `quote_requests` not `logistics_rfq`.

---

## Addition 2 — Add Section 9.1: Vendor Favorites

Add this as a new subsection right after Section 9.

> ### 9.1 Vendor favorites
>
> Vendors can favorite providers they've worked with successfully. Favorited providers appear at the top of the provider list when the vendor requests new quotes (Path A step 2). The data model is `provider_favorites` (`{ user_did, provider_id, notes, created_at }`) — already specced in part-3, not yet implemented.
>
> Favorites have three benefits:
> - Saves the vendor from re-searching the pool every time
> - Builds repeat business for trusted providers (a small accountability lever)
> - Surfaces "providers I've used before" prominently when a buyer is in Path B1
>
> Favorites do not lock a vendor in. Just a UX shortcut. A vendor can still RFQ-broadcast or pick from the wider pool at any time.

---

## Addition 3 — Expand Section 8 with quote-expiry cron details

Currently Section 8 ends with: *"Quote can be refreshed: provider gets a notification 7 days before expiry, can re-quote, seller accepts the refresh, product page updates seamlessly."*

Replace that one sentence with this fuller paragraph:

> **Quote expiry lifecycle (cron-driven, daily):**
>
> | Days before expiry | Action |
> |---|---|
> | 7 | Vendor receives email: "Quote expires soon, request fresh quote?" |
> | 2 | Provider receives email: "Your quote expires in 2 days, refresh?" |
> | 0 | Quote status auto-flips to `expired`. Product listing shows "estimated only" with reduced confidence label. |
> | After expiry | Next time someone tries to order, vendor is prompted to request a fresh quote before the buyer can complete checkout. |
>
> The expiry table is the same lifecycle described in `docs/specs/logistics-pool/part1.md` Concept 3. Surfaced here so the implementation has a single source.

---

## Apply, then commit

After making these three edits in your local file, the architecture doc is complete. Commit will follow.