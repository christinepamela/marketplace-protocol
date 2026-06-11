# Tech Debt

**Last updated:** 2026-06-11 (Session 29)
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
**What:** Buyer pays product subtotal only at checkout. Logistics provider submits quote, vendor accepts it post-payment, shipment is created — no money changes hands for logistics. The `order.shippingCost` field is rendered conditionally and is null in practice.
**Where:** `rangkai-marketplace/app/checkout/page.tsx`, `rangkai-marketplace/lib/api/cart.ts`, `marketplace-protocol/src/api/routes/logistics.routes.ts`
**Fix:** Implement Path A from `LOGISTICS_ARCHITECTURE.md` section 6. Buyer picks logistics at checkout, single payment covers product + logistics + service fee.
**Priority:** Highest. The last major broken item before v1 is production-ready. First order of business in Session 30 after B12.

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

---

## 🟡 Deferred / partial

### D1. Logistics quote schema is order-tied only
**What:** `shipping_quotes` table has `order_id` but no `product_id`. Cannot represent product-level standing quotes (the core feature of Path A in `LOGISTICS_ARCHITECTURE.md` section 8).
**Fix:** Add `product_id` (nullable) and `quote_type` discriminator. Either set, never both. Update SDK methods and routes accordingly.
**Priority:** High — blocks the v1 logistics slice (B1).

### D2. Provider profile fields are too coarse
**What:** Provider declares `service_regions`, `shipping_methods`, `insurance_available` but doesn't capture routes, modes, Incoterms supported, HS categories, weight brackets, insurance caps.
**Fix:** Add new columns/tables. Migrate existing providers with sensible defaults. Update registration UI.
**Priority:** Medium — works for now, blocks the "smart pool" matching.

### D3. Opportunities surface raw orders
**What:** `getOpportunities()` returns orders that need logistics, post-payment. Should return RFQs filtered by provider specialties.
**Fix:** New `logistics_rfq` table. New broadcast endpoint. Update `getOpportunities()` to read from it.
**Priority:** Medium-High — this is the core "smart pool" feature.

### D4. No Incoterm on products
**What:** Products have origin country, weight, dimensions, but no Incoterm. Required for any international B2B sale.
**Fix:** Add `incoterm: 'EXW' | 'FOB' | 'DAP' | 'DDP'` to product schema. UI: dropdown on product create/edit.
**Priority:** Medium-High — needed for real international orders.

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

### D19. Nostr data load management
**What:** Nostr clients sync large amounts of historical data by default. Pam: *"nostr has large data all the time. even when i run primal my laptop is noisy."*
**Fix:** Scoped subscriptions only (never the general firehose), filtered relays, server-side aggregation, lightweight kind definitions for any Rangkai-specific Nostr usage.
**Priority:** Cross-cutting design concern. Must inform D16 (search federation) and v2 messaging decisions.

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

### R11 (UPDATED). Currency abstraction with Bitcoin settlement
User sees their local currency throughout. Bitcoin moves underneath as settlement rail. Sender pays MYR → BTC → recipient receives EUR. Pattern: Strike, CashApp, Bitkey. Reference: Bitcoin Dev Kit (BDK) open source from Square/Spiral.
Pam: *"I likely won't use stablecoins but I will consider e-cash in the background where even if user pays in any currency it is converted to bitcoin in the background and transmitted and reconverted back to their currency."*
**Priority:** v3. Major architectural undertaking but doesn't require renegotiating the Bitcoin payment rail.

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