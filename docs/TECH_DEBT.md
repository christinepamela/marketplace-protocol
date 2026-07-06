# Tech Debt

**Last updated:** 2026-07-03 (Session 31)
**Maintained by:** the team, updated each session
**Companion docs:** `LOGISTICS_ARCHITECTURE.md`

---

## How to use this doc

This is the running list of things we know are wrong, missing, or deferred. Each item has a status and rough priority. When working on something, check here first to see if it's already known. When deferring something during a session, add it here so it's not forgotten.

Three categories:
- **🔴 Broken-but-shipped** — exists in the code, doesn't work as intended, must be fixed before production
- **🟡 Deferred / partial** — exists in incomplete form, works for testing but needs completion
- **🟢 Roadmap / not v1** — explicitly punted, valuable but not now

Within each category, items are roughly priority-ordered.

---

## 🔴 Broken-but-shipped

### B1. Logistics is not paid for
**What:** Buyer pays product subtotal only at checkout. Logistics provider submits quote post-payment, no money moves for logistics.
**Where:** `rangkai-marketplace/app/checkout/page.tsx`, `rangkai-marketplace/lib/api/cart.ts`, `marketplace-protocol/src/api/routes/logistics.routes.ts`
**Status:** 🔄 In progress S31. Tier 1 schema ✅. Tier 2 backend ✅ (L5–L10 all complete). Tier 3 frontend next in S32 (L11–L16).

**Fee model confirmed S30:** Buyer pays product + logistics only. Protocol skims 0.5% from seller payout and 0.5% from logistics payout on escrow release. Fee is NOT added to buyer's total. `LOGISTICS_ARCHITECTURE.md` section 13 formula corrected accordingly.

**Terminology confirmed S30:** seller (not vendor), buyer, logistics (not provider/courier). Use consistently in all new code and docs.

**Full job list (L-series):**

TIER 1 — Schema (✅ Complete S30)
- L1. ✅ Added `product_id` (nullable) and `quote_type ('product'|'order')` to `shipping_quotes`
- L2. ✅ Added `incoterm ('EXW'|'FOB'|'DAP'|'DDP')` to `products`, default DAP
- L3. ✅ Created `quote_requests` table with RLS enabled. Columns: `id`, `requester_did`, `product_id`, `origin_country`, `destination_country`, `weight_kg`, `dimensions_cm` (JSONB), `incoterm`, `hs_code`, `insurance_required`, `status ('open'|'closed'|'expired')`, `created_at`, `expires_at`
- L4. ✅ Added `routes` (JSONB), `modes` (TEXT[]), `incoterms_supported` (TEXT[]), `door_pickup` (BOOL), `door_delivery` (BOOL), `weight_min_kg`, `weight_max_kg` to `logistics_providers`

TIER 2 — Backend API (✅ Complete S31)
- L5. ✅ S30. Seller RFQ broadcast endpoint: `POST /api/v1/logistics/quote-requests` — creates `quote_requests` row, filters matching logistics by routes/incoterms
- L6. ✅ S30. Rewrite `getOpportunities()` — reads `quote_requests` filtered by logistics profile, not raw orders
- L7. ✅ S30. Extend quote submission — `POST /api/v1/logistics/quotes` accepts `product_id` + `quote_type: 'product'`
- L8. ✅ S30. Verify `POST /api/v1/logistics/quotes/:id/accept` works for `quote_type: 'product'` quotes
- L9. Unified checkout: order creation accepts `selected_quote_id`...
  **Status:** ✅ S31. Orders table has logistics_quote_id and logistics_cost. Total = subtotal + logistics_cost. Fee bug (3%) corrected to 0.
- L10. ✅ S31. `executeSplitPayoutBTC()` added to `bitcoin.service.ts`. `POST /api/v1/bitcoin/split-payout` route added. Untested e2e — needs delivered order with confirmed BTC.
- L11. ✅ S32. Path B2 implemented. `products.require_logistics_quote` (boolean, default false) and `orders.own_logistics` (boolean, default false) added via migration. `order.service.ts` `createOrder()` blocks order creation if any cart item's product requires a quote and neither `logisticsQuoteId` nor `ownLogistics` is set. Checkout has "I'll arrange my own logistics" checkbox wired through `createOrdersFromCart()` → `createOrderFromCart()` → SDK → API → service. Tested S32: gate blocks with correct product name in error, opt-out checkbox correctly sets own_logistics=true, regression checkout (no gate) unaffected.

TIER 3 — Frontend (❌ Not started — Session 31+)
- L12. 🔄 S32 in progress. Option A chosen (see R21 for deferred Option B). Frontend done: `incoterm` (required, default DAP), `hsCode` (optional), `requireLogisticsQuote` (seller-toggled checkbox) added to `packages/sdk/src/types.ts`, `catalog.ts` SDK module, and `ProductForm.tsx`. Migration: `products.hs_code` column added. Buyer-facing plain-language Incoterm explanations added (`lib/utils/incoterms.ts`), wired into product detail page. **Not yet done:** backend persistence unconfirmed — haven't seen the product-creation route/service that handles `POST /catalog/products`, so `incoterm`/`hsCode`/`requireLogisticsQuote` may not actually save to the DB yet. RFQ auto-broadcast on publish also not wired — needs the logistics quote-request route or SDK method. Both required before this can be marked done.
- L13. Seller: quote review UI on product page — accept one or more quotes, each becomes a buyer-visible shipping option.
- L14. Product page: buyer sees logistics options as line items — provider name, price, days, Incoterm in plain language ("Door to door, you pay import duties on arrival" for DAP; "Fully delivered, all duties included" for DDP).
- L15. Checkout: product subtotal + chosen logistics line. "Change shipping" link opens pool browser. "I'll arrange my own logistics" option (Path B2). Total = product + logistics only, no added fee line.
- L16. Logistics-marketplace: opportunities dashboard reads `quote_requests`, not raw orders.

TIER 4 — Spec corrections (🟡 Partially reopened S32)
- L17. 🟡 S32: Section 13 fee formula fix applied (confirmed in file). Section 3 still describes the 0.5% as a visible checkout line item — contradicts the corrected model, not yet fixed. The "Architecture doc additions" block at the bottom of the file (quote_requests rename, Section 9.1 Vendor Favorites, Section 8 quote-expiry cron table) was drafted but never merged into the doc body — not yet fixed. Both deferred to after L16 by agreement with Pam. Do not mark this fully complete until both are also applied and the doc is reviewed end to end.
- L18. Tech debt updated (this entry).

**Rules confirmed S30:**
- KYC sellers: mandatory minimum of one logistics quote (firm or estimated) before product can be published
- Anon sellers: manage own logistics, cannot access logistics pool
- Multiple quotes per product allowed (competitive — multiple logistics providers can quote same product)
- Currency for v1: USD. D6 (currency layer) stays deferred. Bitcoin escrow splits into two BTC transactions. Lightspark/Strike (R11) investigated offline by Pam — check Malaysia availability before Session 31.

**Priority:** Highest. L11 done S32. Next: L12 (product creation mandatory logistics step).

### B2. Login flow is missing
**Status:** ✅ Fixed S29. Real login page built. `POST /api/v1/identity/login` endpoint added. bcrypt password verification working. Vendors persist across sessions. 33-ghost-vendor problem resolved.

### B3. Sessions expire on server restart
**What:** Tokens are in localStorage but there's no refresh logic on the rangkai-marketplace side. The logistics-marketplace `ProviderContext` does have refresh — that's the pattern to copy.
**Where:** `rangkai-marketplace/lib/contexts/AuthContext.tsx`
**Fix:** Mirror `logistics-marketplace/lib/contexts/ProviderContext.tsx` — JWT-aware refresh scheduling, refresh-token storage, automatic re-auth on 401.
**Priority:** High. Annoying during dev, broken in production.

### B4. Tracking number not shown in buyer shipment UI
**What:** Buyer's order page renders shipment data, but tracking number doesn't appear. Likely a missing field in the hydrated query or a renderer that's looking at the wrong path.
**Where:** `rangkai-marketplace/app/orders/[id]/page.tsx`, `components/logistics/TrackingTimeline.tsx`
**Fix:** Trace the data path from `getShipmentByOrder` → component props → render. Add the `tracking_number` field where missing.
**Priority:** Medium. Buyer-facing bug, makes the buyer experience feel incomplete.

### B5. Dashboard data fails to load on fresh provider account
**What:** "Failed to load dashboard data" banner on `logistics-marketplace/app/dashboard/page.tsx` for a brand-new provider with no quotes/shipments.
**Where:** `logistics-marketplace/app/dashboard/page.tsx` `loadDashboardData()`
**Fix:** Check API server logs for failing endpoint. Likely empty-array vs null vs error response mismatch.
**Priority:** Low.
**Status:** Still open S31. Confirmed not just a fresh-account issue. Logging in as BitHaul shows SatsFleet Express data. ProviderContext is fetching provider by a cached/stale ID rather than the authenticated DID. Fix in S32 alongside B1 frontend work — affects every new logistics login.

### B6. Two leftover register-page artifacts
**Status:** ✅ Fixed S28. Logistics provider register page no longer bypasses `ProviderContext.login()`.

### B7. `/register` vs `/auth/register` redirects
**Status:** ✅ Fixed S28. Four files updated to correct path.

### B8. ProviderHeader visible only on /dashboard
**Status:** ✅ Fixed S28. `ConditionalHeader` added to root layout.

### B9. Four route files exist but aren't mounted in routes/index.ts
**What:** `bitcoin.routes.ts`, `btcpay.routes.ts`, `stripe.routes.ts`, and `trust.routes.ts` existed as files but were not mounted. Bitcoin route added S28. Stripe and BTCPay are mounted directly in `server.ts` as webhooks (correct — webhooks need raw body parsing). Trust is the only legitimate gap, deferred as D15.
**Status:** Partially resolved S28. Bitcoin mounted. Stripe/BTCPay confirmed correct in server.ts. Trust deferred as D15.
**Priority:** D15 sprint.

### B10. Bitcoin auto-confirms on burned derivation indexes
**Status:** ✅ Fixed S29. `getNextDerivationIndex()` now scans for burned addresses via Blockstream before assigning. `isAddressBurned()` and `storeBurnedPlaceholder()` added. Fresh mnemonic generated — `abandon abandon...` replaced. `BITCOIN_START_INDEX=0`. Confirmed working in Stage 6 end-to-end test S29.

### B11. Marketplace register page collected passwords but threw them away
**Status:** ✅ Fixed S29. `auth.ts` now sends `email` and `password` as top-level fields. `identity.routes.ts` Zod schema updated to accept them. `identity.service.ts` bcrypt-hashes password and stores in `password_hash` column.

### B12. Blockstream 429 not handled gracefully
**What:** When Blockstream returns HTTP 429 (Too Many Requests), `checkPaymentStatus()` in `bitcoin.service.ts` throws an unhandled error that propagates as a 500. During Stage 6 testing in S29, the burn scan made ~526 requests and hit Blockstream's 700 req/hour limit, causing all subsequent payment checks to 500 until the rate limit reset. The rate limit eventually cleared and Stage 6 completed successfully, but the 500 errors are noisy and confusing.
**Where:** `src/core/layer2-transaction/bitcoin.service.ts` — `checkPaymentStatus()` catch block.
**Fix:** Catch 429 specifically, return a "not yet confirmed" result, and let the scheduler retry on the next poll cycle:
```typescript
} catch (error: any) {
  if (error?.response?.status === 429) {
    console.warn('[Bitcoin] Blockstream rate limited (429). Will retry next poll cycle.');
    return {
      address,
      confirmed: false,
      confirmations: 0,
      amountReceived: 0
    };
  }
  console.error('Error checking Bitcoin payment:', error);
  throw new Error('Failed to check payment status');
}
```
**Priority:** High. Small fix (~15 min). Do at start of Session 30 before B1 work begins.
**Note:** This makes the symptom graceful but doesn't fix the underlying dependency on Blockstream's free tier. See R10 (BTCPay Server) for the real fix at production volume.
**Status:** ✅ Fixed S30. Catch block updated to return graceful "not yet confirmed" result on 429. Committed and pushed to GitHub.

### B13. Logistics marketplace registration has no email/password fields
**What:** `logistics-marketplace/app/auth/register` has no email or password fields. Logistics providers register via Nostr/anon key only and cannot log back in after session ends.
**Where:** `logistics-marketplace/app/auth/register/page.tsx` (or equivalent)
**Fix:** Add email and password fields matching seller register pattern (B11, fixed S29). Wire to `POST /api/v1/identity/register` with `clientId: 'logistics-marketplace'`.
**Priority:** High — blocks real logistics providers from returning. Fix start of S31.
**Status:** ✅ Fixed S31. Email/password added to registration form. Login page created. Logout now redirects to `/auth/login`. BitHaul (`BitHaul@123.com`) confirmed working.

### B14. Logistics-required error message shows product ID, not name
**Status:** ✅ Fixed S32. Confirmed `products.basic` is JSONB with a `name` field. `order.service.ts` now reads `blockingProduct.basic?.name`, falls back to `blockingProduct.id` only if `basic.name` is somehow missing.

### B15. Logistics-marketplace opportunities page crashes on real data
**What:** `localhost:3002/opportunities` throws `TypeError: Cannot read properties of undefined (reading 'length_cm')` and fails to render. The page's `Opportunity` interface expects `dimensions.length_cm/width_cm/height_cm` and an always-present flat `destination_country`. The actual `/opportunities` endpoint (rewritten in S30 for L6) returns `dimensions_cm: {length, width, height}` — different key names entirely — and as of S32, `destination_country` can legitimately be `null` (global RFQ broadcasts with no pinned destination — see L12). This page was never updated to match either shape.
**Where:** `logistics-marketplace/app/opportunities/page.tsx`
**Fix:** Full rewrite as part of L16 (opportunities dashboard reads `quote_requests`) — not a standalone patch, since L16 already covers rebuilding this page's data model end to end.
**Priority:** Bundled into L16. Discovered S32 while testing L12's destination-optional fix; not caused by L12, but is why L12's opportunities-matching step could only be logic-verified rather than confirmed live (see note below).

---

## 🟡 Deferred / partial

### D1. Logistics quote schema is order-tied only
**What:** `shipping_quotes` table has `order_id` but no `product_id`. Cannot represent product-level standing quotes (the core feature of Path A in `LOGISTICS_ARCHITECTURE.md` section 8).
**Fix:** Add `product_id` (nullable) and `quote_type` discriminator. Either set, never both. Update SDK methods and routes accordingly.
**Priority:** High — blocks the v1 logistics slice (B1).
**Status:** ✅ Fixed S30. `product_id` (nullable) and `quote_type ('product'|'order')` added to `shipping_quotes`. Index added on `product_id`. See B1 L1.

### D2. Provider profile fields are too coarse
**What:** Provider declares `service_regions`, `shipping_methods`, `insurance_available` but doesn't capture routes, modes, Incoterms supported, HS categories, weight brackets, insurance caps.
**Fix:** Add new columns/tables. Migrate existing providers with sensible defaults. Update registration UI.
**Priority:** Medium — works for now, blocks the "smart pool" matching.
**Status:** ✅ Fixed S30 (schema layer). `routes`, `modes`, `incoterms_supported`, `door_pickup`, `door_delivery`, `weight_min_kg`, `weight_max_kg` added to `logistics_providers`. Old `service_regions` and `shipping_methods` fields kept for backwards compatibility, now deprecated. Registration UI update and buyer-language translation layer (Tier 3) still needed — see B1 L14.

### D3. Opportunities surface raw orders
**What:** `getOpportunities()` returns raw orders. Should return RFQs filtered by logistics profile.
**Fix:** `quote_requests` table now exists (L3 ✅). Rewrite `getOpportunities()` to read from it filtered by logistics `routes`/`modes`/`incoterms_supported`. See B1 L6.
**Note:** Table was specced as `logistics_rfq` in older docs. Canonical name is `quote_requests` per part-3 spec and architecture doc addition 1.
**Status:** ✅ Fixed S30. `getOpportunities()` rewritten to read `quote_requests` table, filtered by logistics provider's routes/incoterms/weight. See B1 L6.

### D4. No Incoterm on products
**What:** Products have origin country, weight, dimensions, but no Incoterm. Required for any international B2B sale.
**Fix:** Add `incoterm: 'EXW' | 'FOB' | 'DAP' | 'DDP'` to product schema. UI: dropdown on product create/edit.
**Priority:** Medium-High — needed for real international orders.
**Status:** ✅ Fixed S30. `incoterm` column added to `products` with CHECK constraint `('EXW'|'FOB'|'DAP'|'DDP')`, default DAP. UI (product creation step) still needed — see B1 L12.

### D5. No HS code on products
**What:** Required for international shipping.
**Fix:** Add `hs_code: string` field. v1: free-text required for international products. v2: auto-suggest from product description.
**Priority:** Medium-High — required for international compliance.

### D6. Currency layer absent
**What:** Cart and quotes use ad-hoc currency fields, mostly default to USD. Real B2B export has sellers in MYR, providers quoting in USD, buyers paying in EUR.
**Fix:** Centralize FX. Lock rate at order confirmation, 24-48h validity. Show currency conversions transparently in cart.
**Priority:** Medium — works for testing, breaks at first non-USD real customer.

### D7. Provider rating field exists but isn't populated
**What:** `LogisticsProvider.average_rating` is in the schema but there's no rating-write path post-delivery.
**Fix:** After buyer confirms delivery, prompt for provider rating. Aggregate into `average_rating`.
**Priority:** Medium — needed before "smart pool" ranking is meaningful.

### D8. Estimated quotes (rate cards) not implemented
**What:** Providers should be able to publish standing rate cards as estimates.
**Fix:** New `provider_rate_card` entity. Surface as estimates on product page when no firm quote exists.
**Priority:** Medium.

### D9. Bitcoin on-chain payment flow
**Status:** ✅ Complete S29. Stage 6 fully confirmed. tBTC sent via coinfaucet, detected by scheduler, 3 confirmations reached, order `ORD-2026-280506-D4O` flipped to `paid`, vendor dashboard (Bitshop) showed order as paid. Full end-to-end Bitcoin payment rail confirmed working.

### D10. Lightning untested
**What:** Lightning is in the architecture but no flow has been built or tested.
**Priority:** Low until BTC on-chain is solid. See R9.

### D11. Service fee not displayed at checkout
**What:** 0.5% protocol fee should appear as a "Service fee" line on checkout.
**Fix:** Roll into B1 fix. When implementing unified checkout, include service fee line.
**Priority:** Bundled with B1.
**Status:** ✅ Resolved by design decision S30. Fee model confirmed: buyer pays product + logistics only. 0.5% deducted from seller payout, 0.5% deducted from logistics payout at escrow release. No "service fee" line added to buyer's total. Checkout shows product + logistics lines only. `LOGISTICS_ARCHITECTURE.md` section 13 corrected accordingly (L17).

### D12. No quote refresh / expiry handling
**What:** Quotes have `valid_until` but there's no notification system for expiring quotes.
**Priority:** Low for v1, becomes important once standing quotes are real.

### D13. BIP84 derivation path uses mainnet coin type on testnet
**What:** Hardcoded `m/84'/0'/0'/0/N` regardless of network. Testnet should use `1'` coin type. Addresses work but seed mnemonic won't be standards-compliant for hardware wallet recovery on testnet.
**Where:** `src/core/layer2-transaction/bitcoin.service.ts` line ~146
**Fix:** `const coinType = this.network === bitcoin.networks.testnet ? "1'" : "0'"` then use in path.
**Priority:** Low — doesn't break testing.

### D14. BitcoinService instantiation pattern is inconsistent
**What:** Routes create `new BitcoinService(req.supabase, ...)` per request. Scheduler injects a single instance. Redundant wallet derivation work, cached BTC price not shared.
**Where:** `src/api/routes/bitcoin.routes.ts` (3 places), `src/api/scheduler.ts`
**Fix:** Singleton or DI pattern — instantiate once at server startup.
**Priority:** Low — performance/cleanliness, not correctness.

### D15. Trust & compliance routes not exposed (HIGH PRIORITY)
**What:** `compliance.service.ts` is fully implemented (~300 lines) with sanctions screening, multi-factor confidence scoring, audit trail logging, and tax rate calculation. `trust.routes.ts` exists as a 0-byte file — the HTTP layer was never written. Empty file caused API boot failure S28; removed from mounts to unblock S29.

**Why this matters:** Trust is the highest-leverage feature for the platform. Small B2B exporters trading across borders have no in-person signals. Sanctions screening at KYC onboarding is the single biggest credibility lever the protocol can offer to marketplaces.

**Where:**
- `src/api/routes/trust.routes.ts` (empty, needs implementation)
- `src/api/routes/index.ts` (re-mount once routes built)
- `src/core/layer4-trust/compliance.service.ts` (already complete)
- `docs/specs/LAYER4_TRUST_AND_COMPLIANCE.md` (spec is thorough)

**Sub-items:**
- **D15a.** Build trust.routes.ts — expose existing compliance service via REST (~2-3 hours). Required endpoints: `POST /trust/sanctions-check`, `GET /trust/sanctions-history/:did`, `POST /trust/sanctions-list`, `POST /trust/sanctions-list/bulk-update`, `GET /trust/stats`, `GET /trust/tax-rates`, `POST /trust/tax-rates`, `POST /trust/tax-calculation`
- **D15b.** Populate sanctions list from OFAC/UN/EU feeds (data work, not code)
- **D15c.** Integrate sanctions check into rangkai-marketplace KYC registration
- **D15d.** Marketplace operator dashboard for flagged identities
- **D15e.** Compliance events for real-time wiring (v1.5, low priority within this group)
- **D15f.** Public sanctions-list transparency page

**Priority:** HIGH. Sprint after B1 (logistics payment) completes. D15a–c are the meaningful trust delivery. D15d–f can follow.

### D16. v2 search federation needs architectural decision (HIGH PRIORITY)
**What:** Buyers on marketplace-Malaysia must find vendors on marketplace-Germany. This is THE feature that makes Rangkai different from any single-marketplace platform. Three architectural options on the table:

1. **Shared protocol-level search index** — every marketplace pushes products to a central Rangkai search service. Pros: best UX, simplest queries. Cons: defeats decentralization.
2. **Federated search queries (Mastodon-style)** — buyer's marketplace queries peer marketplaces in real-time, aggregates results. Pros: each marketplace stays sovereign. Cons: slow, complex caching.
3. **Nostr-publication + Rangkai-owned index** — vendors publish product events as a custom Nostr kind. Rangkai aggregators index those events. Pros: inherits Nostr's federation. Cons: depends on relay stability, indexing complexity.

**Decision context:**
- Nostr's own search is bad — Pam as 3-year user can't find her own past posts
- Rangkai must own the search index quality regardless of underlying transport
- Search excellence is THE product differentiator, not auth or Bitcoin

**Fix:** Pam leads deep conversation in Session 30+ before any work begins.
**Priority:** v2 (before soft launch). Don't shortcut this conversation.

### D17. v2 public Rangkai channels architecture (HIGH PRIORITY)
**What:** Pam pushed back on dropping public community channels to v3. Wants curated Rangkai channels (not generic Nostr) for seller-to-seller advice, buyer reviews, regional/category groups. Pam: *"if users have to just general nostr than I think it's a downfall. it's too centralised. I have been a nostr user for 3 years and even I get annoyed."*
**Fix:** Pam leads deeper conversation in Session 30+ before any work begins. Moderation model, cross-marketplace vs per-marketplace channels, spam handling all need deciding.
**Priority:** v2 (before soft launch). After search federation is designed (D16 has dependencies here).

### D18. v2 Frostr 2-of-3 multisig auth
**What:** "Three keys, any two can sign in." Browser key + marketplace key + recovery service key. Bitkey-style framing for non-technical users.
**Decision context:** Frostr ecosystem is alpha as of 2025-2026. Schema is already forward-compatible — `signing_strategy` column exists with default `single_key`. v2 migration is additive. Wait for Frostr/Pomegranate to reach production readiness.
**Priority:** v2, DEPENDENT on upstream Frostr stability. May slip to v2.5.

### D19. Country field is free text, but downstream validation expects ISO codes
**What:** `ProductForm.tsx`'s Origin Country field is a plain text input (placeholder "Malaysia"). But `logistics.routes.ts`'s RFQ broadcast schema requires `origin_country` to be 2-3 characters (an ISO country code like "MY"), and `catalog.routes.ts`'s product schema requires `logistics.originCountry` to be exactly 2 characters. A seller typing "Malaysia" instead of "MY" will fail RFQ broadcast silently (caught in the try/catch, logged to console, doesn't block publish) or fail product creation outright depending on which validator catches it first. Noticed during L12 (S32) but pre-existing — not a new bug introduced by L12.
**Fix:** Replace the free-text input with an autocomplete/typeahead backed by a small prefilled country name→ISO code list (e.g., "Malaysia" shown to the user, "MY" stored). This is likely the easier fix vs. asking sellers to know their own country's ISO code. Apply to both the base product logistics section and any future destination-country fields (L13/L14).
**Priority:** Medium — real but not blocking, since KYC test sellers so far have been typing valid-length strings by chance. Will start silently failing for any real seller who doesn't know to type "MY" instead of "Malaysia."

### D20. Nostr data load management
**What:** Nostr clients sync large amounts of historical data by default. Pam: *"nostr has large data all the time. even when i run primal my laptop is noisy."*
**Fix:** Scoped subscriptions only (never the general firehose), filtered relays, server-side aggregation, lightweight kind definitions for any Rangkai-specific Nostr usage.
**Priority:** Cross-cutting design concern. Must inform D16 (search federation) and v2 messaging decisions.

### D21. L12's opportunities-matching (null destination) not empirically confirmed
**What:** The destination-optional RFQ fix (L12, S32) was verified by tracing the matching logic against known data (BitHaul's route MY→SG, a null-destination quote_request from MY, confirming origin-only matching should apply) rather than by observing it live in the UI — the opportunities page crash (see B[above]) blocked direct visual confirmation, and BitHaul's auth token couldn't be located to test the endpoint directly via curl.
**Fix:** Once L16 rebuilds the opportunities page, confirm as a first sanity check that a null-destination quote_request actually appears for a provider whose routes specify a different destination than the request. If it doesn't, the bug is in the matching logic added this session (`src/api/routes/logistics.routes.ts`, the `/opportunities` route handler), not in the L16 rebuild itself.
**Priority:** Low standalone — folded into L16's testing, not urgent on its own since the logic was reasoned through carefully and the code change was small and specific.

---

## 🟢 Roadmap / not v1

### R1. Provider pitches sellers (Scenario 4)
Anti-spam-throttled outreach: providers express interest on listings, seller invites them to quote. Rate-limited direct messages. Unthrottled provider outreach destroys marketplaces (Alibaba's lesson).

### R2. Multi-vendor logistics consolidation
A buyer ordering from 3 sellers in the same origin region — one shipment. Architectural complexity: shipment lifecycle no longer 1:1 with order.

### R3. Reverse logistics financial flow
Returns, damaged shipments, rejected at customs. Who pays the return leg? Touches Layer 4 (disputes) heavily.

### R4. Landed cost API integration
Real-time duty/tax estimates via DHL, FedEx, or Easyship API. Becomes critical once real cross-border buyers complain about surprise duties.

### R5. Commercial invoice auto-generation
For international shipments, formatted per destination country requirements.

### R6. HS code auto-suggest
From product description. ML or rule-based. Becomes important at scale.

### R7. Two-tier provider system
Considered and rejected for v1. Single KYC-mandatory tier with 0.5% fee. Documented here so we don't re-derive.

### R8. Marketplace federation
**CLARIFICATION (see R20):** This is not a roadmap item — it's the goal of the entire project. R8 described federation as a feature to be added later. That framing is wrong. Every v1 design decision must preserve the federation path. The specific federation protocol still needs design (tied to D16).

### R9. Lightning Network as a payment rail
Hardware-dependent. Requires Pi 4/5 + 1TB SSD + Umbrel/Start9, ~USD 150-220. BTC on-chain must be solid first (now confirmed S29). Lightning is the natural next rail — solves on-chain's two problems (slow confirmations, high fees for small transactions). Don't block on this. Decide if Lightning is v1.5 or later after B1 ships.

### R10. BTCPay Server integration
**Priority upgrade — S29:** Replace Blockstream polling with server-side BTCPay Server webhooks. Code already exists (`btcpay.adapter.ts`, `btcpay.routes.ts`) but not wired in. Blockstream rate limiting blocked Stage 6 during S29 burn scan (~526 requests in minutes hit the 700/hour free tier limit). At production volume (100 active orders polling every 60s = 6,000 req/hour), Blockstream's free tier is completely inadequate. BTCPay webhooks eliminate polling entirely and solve this permanently.

**Was:** Roadmap. **Now:** Target v1.5, immediately after v1 ships and before real payment volume. Do not wait for v2.

**Setup when ready:** Run BTCPay Server (Docker or hosted via Voltage/nodl.it). Create Store, generate API key, add webhook for `InvoiceSettled`/`InvoiceExpired`/`InvoiceInvalid`. Add `BTCPAY_URL`, `BTCPAY_API_KEY`, `BTCPAY_STORE_ID`, `BTCPAY_WEBHOOK_SECRET` to `.env`. Mount `btcpay.routes.ts` in `routes/index.ts`.

### R11. Currency abstraction with Bitcoin settlement ("invisible Bitcoin")
**What:** User sees local currency throughout. Bitcoin settles in background. Buyer pays MYR → BTC → seller receives MYR. Pattern: Strike, CashApp, Bitkey, Block/Lightspark Grid.
**Architecture confirmed S30:** This is the right long-term design. Lightspark Grid runs on Lightning (not yet built — R9). Strike API is a simpler alternative. **Pam checked offline:** Strike does NOT support MYR payout in Malaysia. Lightspark Grid does support Malaysia (confirmed: https://www.lightspark.com/knowledge/instant-payments-malaysia). R11 is v1.5 priority.
**Current state:** v1 escrow holds BTC (on-chain) or USD (Stripe). Seller and logistics receive BTC directly for Bitcoin orders. Currency conversion is manual for v1. This is an explicit known limitation, not an oversight.
**Priority:** v1.5 if Strike/Lightspark supports Malaysia. v2 otherwise. Do not block B1 on this.

### R12. Insurance marketplace
Real insurance with caps, deductibles, exclusions, claims processes.

### R13. Customs broker integration
For non-DDP shipments where buyer needs help with import clearance.

### R14. ESG / sustainability metadata
Carbon footprint per shipping mode, offset options, certifications.

### R15. EU IOSS support for VAT collection
For EU-bound B2C shipments under €150.

### R16. US de minimis policy changes
US eliminating $800 de minimis for some corridors. Surface "expect duties" warnings on US-bound shipments.

### R17. Light-tier providers (rejected, see R7)
Originally proposed S28. Rejected in favour of single KYC-mandatory tier. Documented here so we don't re-derive.

### R18. Naming/branding decision: rangkai.store
**What:** Pam owns `rangkai.store`. Four options: (A) protocol=Rangkai + marketplace=Rangkai, rangkai.store = marketplace; (B) marketplace gets a Malay name (Lapak/Pasar/etc.), rangkai.store = protocol docs; (C) subdomains; (D) Bitcoin-themed protocol rename (Aksara, Lintas).
**Fix:** Pam's call. Not blocking technical work. Must resolve before any external launch or public announcement.
**Priority:** Pre-launch only.

### R19. UX channel decision per user type
**What:** Web, native app, PWA, or mix. Marketplace entrepreneurs → desktop web. Buyers → web + PWA. Sellers → PWA (installable, offline). Logistics → native mobile (driver/courier UX).
**Priority:** v2/v3 design consideration. Not blocking v1.

### R20. Clarification: marketplace federation is the goal, not a roadmap item
**What:** R8 misframes federation as a feature to be added. It is the reason the protocol exists. Every design decision must preserve the federation path. v1 is "one marketplace done well, designed to federate" — not "one marketplace, federation later."
**Specifically, the following v1 decisions are already federation-compatible:**
- Identity layer is DID-based ✓
- Logistics pool is shared across marketplaces ✓
- Payment rails are universal (Stripe per-marketplace, BTC universal) ✓
- Trust/sanctions screening is per-protocol — when D15 is built ✓
- Search v1 is centralised within one marketplace, BUT schema and API must extend to federation in v2 — this is D16
**Priority:** Architectural principle, always-on.

### R21. L12 Option B — hard-block publish until a real quote exists
**What:** S32 chose Option A for L12 (collect Incoterm/HS code, seller manually toggles `requireLogisticsQuote`). Option B is stricter: KYC sellers genuinely cannot publish until at least one quote (firm or estimated) exists for the product — turning "Publish" into a multi-step flow (draft → request quotes → wait/select → goes active). Deferred because it depends on L13 (quote review UI) existing first; building the hard gate before there's a UI to review quotes would strand sellers with drafts they can't act on.
**Fix:** Revisit once L13 ships. Decide then whether to enforce.
**Priority:** v1.1, after L13.

---

## Process notes

### Test user naming convention
Use thematic names tied to what's being tested. Examples: "Bit*" for Bitcoin payment tests (testBit2, Bitshop, Bitty Buy), "Logi*" for logistics flow tests. Makes ghost data and old test artifacts identifiable in DB queries.

### Bitcoin mnemonic rotation procedure
When a mnemonic needs to be replaced (burned wallet, mainnet launch, security rotation):

1. Generate a fresh 24-word mnemonic on your local machine:
   ```
   node -e "const bip39 = require('bip39'); console.log(bip39.generateMnemonic(256));"
   ```
2. Store the new mnemonic in `.env` as `BITCOIN_MNEMONIC="word1 word2 ... word24"`
3. Set `BITCOIN_START_INDEX=0` in `.env` to start fresh from index 0
4. Restart the API server — `getNextDerivationIndex()` will automatically scan and skip any burned addresses on the new wallet
5. The burn scan writes placeholder rows to `bitcoin_payment_addresses` for each skipped index — these are harmless (the logic correctly skips them) but are noise in queries. Clean them up with:
   ```sql
   DELETE FROM bitcoin_payment_addresses WHERE order_id LIKE 'burned-placeholder-%';
   ```
6. Never reuse a mnemonic from documentation, tutorials, or examples — they are all burned by the developer community worldwide. The `abandon abandon abandon...` mnemonic is BIP39's "test vector zero" — every address derived from it has prior blockchain history.

**Mnemonic storage:**
- **Development/testnet:** `.env` file on local machine is acceptable
- **Production/mainnet:** `.env` on server is NOT sufficient. Mnemonic must also be stored offline — written on paper and kept physically secure, or in a hardware wallet seed phrase backup, or in a password manager with offline export. Never in plain text in version control, cloud notes, or email. A lost production mnemonic = lost vendor funds with no recovery.

**Current state (S29):** Fresh testnet mnemonic generated on Pam's machine, stored in `.env`. The old `abandon abandon...` mnemonic was replaced after its addresses (indexes 0–500+) were all found burned. A separate production mainnet mnemonic exists (referenced in Session 26 handover) stored in password manager — do not use for testnet development.

### Burned placeholder database hygiene
When `getNextDerivationIndex()` scans and skips burned indexes, it writes rows to `bitcoin_payment_addresses` with `order_id` values like `burned-placeholder-0`, `burned-placeholder-1`, etc. These rows are functional (they prevent index reuse) but they pollute queries that aggregate payment data.

After any mnemonic rotation or fresh database setup, clean them up:
```sql
DELETE FROM bitcoin_payment_addresses WHERE order_id LIKE 'burned-placeholder-%';
```

This is safe to run at any time — it only removes placeholder rows, never real order payment rows. Real order rows have UUID `order_id` values (e.g. `f0215cb7-3349-40c2-aab8-1631ef0a4e25`).

### Adding to this doc

```
### XN. Short title
**What:** One sentence describing the issue.
**Where:** File path(s) if known, otherwise "TBD".
**Fix:** What needs to happen.
**Priority:** Low / Medium / Medium-High / High / Highest.
```

### Reviewing this doc

Once a month, or at the start of any session planning a sprint:
1. Re-read 🔴 Broken — fix one if you can
2. Re-read 🟡 Deferred — promote to in-progress if it blocks something
3. Skim 🟢 Roadmap — kill anything no longer relevant

### When something is fixed

Move it under the same number with `**Status:** ✅ Fixed S<session number>.` and a one-line summary. Don't delete — the history is useful.