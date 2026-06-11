# Tech Debt

**Last updated:** 2026-04-25 (Session 28)
**Maintained by:** the team, updated each session
**Companion docs:** `LOGISTICS_ARCHITECTURE.md`

---

## How to use this doc

This is the running list of things we know are wrong, missing, or deferred. Each item has a status and rough priority. When working on something, check here first to see if it's already known. When deferring something during a session, add it here so it's not forgotten in session 29, 30, 31.

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
**Priority:** Highest. Blocks everything in Stage 5+. The current code "works" only in the sense that it doesn't error — it doesn't actually move money for logistics.

### B2. Login flow is missing
**What:** Login page redirects to register. No actual authentication path for returning users. localStorage tokens persist but the UI has no way to use them after a session restart that clears localStorage on the marketplace side.
**Where:** `rangkai-marketplace/app/auth/login/page.tsx`
**Fix:** Implement real login: email + password (or wallet connect for crypto users) → POST to identity service → set token via AuthContext.
**Priority:** High. Will hit it as soon as the test user logs out or the dev server restarts mid-session.

### B3. Sessions expire on server restart
**What:** Tokens are in localStorage but there's no refresh logic on the rangkai-marketplace side. (The logistics-marketplace `ProviderContext` *does* have refresh — that's the pattern to copy.)
**Where:** `rangkai-marketplace/lib/contexts/AuthContext.tsx`
**Fix:** Mirror `logistics-marketplace/lib/contexts/ProviderContext.tsx` — JWT-aware refresh scheduling, refresh-token storage, automatic re-auth on 401.
**Priority:** High. Annoying during dev, broken in production.

### B4. Tracking number not shown in buyer shipment UI
**What:** Buyer's order page renders shipment data, but tracking number doesn't appear. Likely a missing field in the hydrated query or a renderer that's looking at the wrong path.
**Where:** `rangkai-marketplace/app/orders/[id]/page.tsx`, `components/logistics/TrackingTimeline.tsx`
**Fix:** Trace the data path from `getShipmentByOrder` → component props → render. Add the `tracking_number` field where missing.
**Priority:** Medium. Buyer-facing bug, makes the buyer experience feel incomplete.

### B5. Dashboard data fails to load on fresh provider account
**What:** The "Failed to load dashboard data" banner on `logistics-marketplace/app/dashboard/page.tsx` for a brand-new provider with no quotes/shipments. One of the parallel SDK calls (`getProviderQuotes`, `getProviderShipments`) probably 500s or returns unexpected shape for empty state.
**Where:** `logistics-marketplace/app/dashboard/page.tsx` `loadDashboardData()`
**Fix:** Check API server logs for the failing endpoint. Likely an empty-array vs null vs error response mismatch. Stat cards still render with zeros, so this is cosmetic but worth fixing.
**Priority:** Low.

### B6. Two leftover register-page artifacts (already partially fixed in Session 28)
**What:** Pre-Session-28, the logistics provider register page bypassed `ProviderContext.login()` and double-navigated. Fixed in S28. Confirmed in test screenshots.
**Status:** ✅ Fixed S28.

### B7. `/register` vs `/auth/register` redirects (fixed S28)
**What:** Four files had `router.push('/register')` to a route that doesn't exist. Should be `/auth/register`.
**Status:** ✅ Fixed S28.

### B8. ProviderHeader visible only on /dashboard (fixed S28)
**What:** Other authenticated pages had no nav. Fixed via `ConditionalHeader` in root layout.
**Status:** ✅ Fixed S28.

### B9. Four route files exist but aren't mounted in routes/index.ts
**What:** `bitcoin.routes.ts`, `btcpay.routes.ts`, `stripe.routes.ts`, and `trust.routes.ts` exist as fully-implemented files but are not imported or `router.use()`'d in `src/api/routes/index.ts`. Bitcoin route added in S28 to unblock Stage 6 testing. Stripe and BTCPay still not mounted (Stripe Stages 1-4 may have been working through a different path — needs investigation). Trust routes never mounted.
**Where:** `src/api/routes/index.ts`
**Fix:** Mount the remaining three routes after verifying their internal paths and confirming there are no duplicate handlers elsewhere.
**Priority:** High — Stripe is in active use, the absence of clear mounting is concerning. Trust and BTCPay are blocked features.

### B10. Bitcoin auto-confirms on burned derivation indexes (PRODUCTION-BLOCKING)
**What:** When a new order is created, `getNextDerivationIndex()` in `bitcoin.service.ts` returns the next BIP84 index from the database. If the database is empty or has been reset, it returns 0 — which is "burned" from prior testing (the address `tb1qnpzzqjzet8gd5gl8l6gzhuc4s9xv0djt99y09w` has 159,808 confirmations on testnet). The burned address gets assigned to a new order, but Blockstream sees the historic transaction and `monitorOrderPayment` marks the order paid with `amount_received=0`. **Vendor sees the order as paid; no Bitcoin was sent for this order.**

**Where:** `src/core/layer2-transaction/bitcoin.service.ts` — `getNextDerivationIndex()` method.

**Fix:** Before assigning an index, check Blockstream for any history on the derived address. If history exists, skip the index (write a placeholder row to claim it), try the next. Continue until a clean index is found. Sketch:

```typescript
private async getNextDerivationIndex(): Promise<number> {
  const { data } = await this.dbClient
    .from('bitcoin_payment_addresses')
    .select('derivation_index')
    .order('derivation_index', { ascending: false })
    .limit(1)
    .single();
  
  let candidateIndex = data ? data.derivation_index + 1 : 0;
  
  while (await this.isAddressBurned(candidateIndex)) {
    console.log(`[Bitcoin] Skipping burned index ${candidateIndex}`);
    await this.storeBurnedPlaceholder(candidateIndex);
    candidateIndex++;
  }
  
  return candidateIndex;
}

private async isAddressBurned(index: number): Promise<boolean> {
  const address = this.deriveAddress(index);
  const url = `${this.blockstreamBase}/address/${address}`;
  const response = await fetch(url);
  if (!response.ok) return false;
  const data = await response.json();
  return (data.chain_stats?.tx_count > 0) || (data.mempool_stats?.tx_count > 0);
}
```

**Why critical:** Production failure mode — vendors would think they got paid when they didn't. Also makes Stage 6 testing impossible without manual cleanup. This bug was originally documented in Session 26 handover's troubleshooting section but never fixed. Re-discovered in Session 28 when it caused order ORD-2026-153612-4VX to flip to "paid" without any tBTC being sent.

**Priority:** Highest within 🔴 Broken-but-shipped — production-blocking once real money is involved.

### B11. Marketplace register page collected passwords but threw them away
**What:** `rangkai-marketplace/app/auth/register/page.tsx` has email and password fields in the form, validates them, then sends only `displayName/country/businessType/avatarUrl/bio` to the protocol's register endpoint. Passwords were never stored anywhere — silently discarded before the API call. This means even if a login endpoint existed, users couldn't authenticate because no password hash was ever stored.

**Where:** `rangkai-marketplace/app/auth/register/page.tsx` and `rangkai-marketplace/lib/api/auth.ts`.

**Fix:** Update `register()` in `lib/api/auth.ts` to include `email` and `password` in the request body. Protocol-side, `identity.routes.ts` register endpoint already needs updating (see Session 29 build plan) to accept and bcrypt-hash the password before storing.

**Status:** Will be ✅ Fixed S29 as part of B2 (build login flow). Tracking here because it's a separate failure mode worth documenting — not just "login is missing" but "registration was lying to users about what it collected."

**Priority:** Bundled with B2 fix in Session 29.

---

## 🟡 Deferred / partial

### D1. Logistics quote schema is order-tied only
**What:** `shipping_quotes` table has `order_id` but no `product_id`. Cannot represent product-level standing quotes (the core feature of Path A in `LOGISTICS_ARCHITECTURE.md` section 8).
**Fix:** Add `product_id` (nullable) and `quote_type` discriminator. Either set, never both. Update SDK methods and routes accordingly.
**Priority:** High — blocks the v1 slice.

### D2. Provider profile fields are too coarse
**What:** Provider declares `service_regions: string[]`, `shipping_methods: ('standard'|'express'|'freight')[]`, `insurance_available: boolean`. Doesn't capture routes, modes, Incoterms supported, HS categories, weight brackets, insurance caps. See `LOGISTICS_ARCHITECTURE.md` section 7.
**Fix:** Add new columns/tables. Migrate existing providers with sensible defaults. Update registration UI.
**Priority:** Medium — works for now, blocks the "smart pool" matching.

### D3. Opportunities surface raw orders
**What:** `getOpportunities()` returns orders that need logistics, post-payment. Should return RFQs (seller-initiated or buyer-override) filtered by provider's specialties. See `LOGISTICS_ARCHITECTURE.md` section 9.
**Fix:** New `logistics_rfq` table. New broadcast endpoint. Update `getOpportunities()` to read from it. Existing order-based path becomes a fallback used in narrow cases.
**Priority:** Medium-High — this is the core "smart pool" feature.

### D4. No Incoterm on products
**What:** Products have origin country, weight, dimensions, but no Incoterm. Required for any international B2B sale.
**Fix:** Add `incoterm: 'EXW' | 'FOB' | 'DAP' | 'DDP'` to product schema. UI: dropdown on product create/edit. Validate on listing.
**Priority:** Medium-High — needed for any real international order.

### D5. No HS code on products
**What:** Required for international shipping. Currently absent.
**Fix:** Add `hs_code: string` field. v1: free-text required for international products. v1.1: validate against the actual HS tariff schedule. v2: auto-suggest from product description.
**Priority:** Medium-High — required for international compliance.

### D6. Currency layer absent
**What:** Cart and quotes use ad-hoc currency fields, mostly default to USD. Real B2B export has sellers in MYR, providers quoting in USD, buyers paying in EUR.
**Fix:** Centralize FX. Lock rate at order confirmation, 24-48h validity. Show currency conversions transparently in cart.
**Priority:** Medium — works for testing, breaks at first non-USD real customer.

### D7. Provider rating field exists but isn't populated
**What:** `LogisticsProvider.average_rating` is in the schema, opportunity cards reference it, but there's no rating-write path post-delivery.
**Fix:** After buyer confirms delivery, prompt for provider rating. Aggregate into `average_rating`. Tie into Layer 4 reputation.
**Priority:** Medium — needed before "smart pool" ranking is meaningful.

### D8. Estimated quotes (rate cards) not implemented
**What:** Providers should be able to publish standing rate cards as estimates. Sellers see ranges before requesting firm quotes. See `LOGISTICS_ARCHITECTURE.md` section 10.
**Fix:** New `provider_rate_card` entity. Surface as estimates on product page when no firm quote exists. Clear "estimate vs bookable" labelling.
**Priority:** Medium — useful but not blocking.

### D9. Bitcoin on-chain payment flow untested
**What:** Stage 6 of the testing plan. Code paths exist but haven't been exercised end-to-end. QR code generation, scheduler polling, confirmation flow.
**Fix:** Run Stage 6 testing.
**Priority:** Medium — needed before BTC marketplaces can ship.

### D10. Lightning untested
**What:** Lightning is in the architecture but no flow has been built or tested.
**Priority:** Low until BTC on-chain is solid.

### D11. Service fee not displayed at checkout
**What:** 0.5% protocol fee should appear as a "Service fee" line on checkout. Currently not implemented because the unified product+logistics checkout itself isn't built.
**Fix:** Roll into B1 fix. When implementing unified checkout, include service fee line.
**Priority:** Bundled with B1.

### D12. No quote refresh / expiry handling
**What:** Quotes have `valid_until` but there's no notification system for "your quote expires in 7 days, want to refresh?" Older specs describe this; not built.
**Fix:** Scheduler job: 7 days before expiry, notify provider. Provider can submit refresh quote. Seller accepts. Product page updates.
**Priority:** Low for v1, becomes important once standing quotes are real.

### D13. BIP84 derivation path uses mainnet coin type on testnet
**What:** `bitcoin.service.ts` line ~146 hardcodes `m/84'/0'/0'/0/N` regardless of network. The `0'` is BIP44 coin type for mainnet Bitcoin; testnet should use `1'`. Addresses still work because `network` is set correctly when generating the P2WPKH output, but the seed mnemonic won't be standards-compliant for hardware wallet recovery on testnet.
**Where:** `src/core/layer2-transaction/bitcoin.service.ts` line 146
**Fix:** `const coinType = this.network === bitcoin.networks.testnet ? "1'" : "0'"` then `m/84'/${coinType}/0'/0/${derivationIndex}`. Migrate existing addresses or accept that testnet history won't recover from seed.
**Priority:** Low — doesn't break testing, but breaks long-term hardware wallet recovery on testnet.

### D14. BitcoinService instantiation pattern is inconsistent
**What:** Routes create `new BitcoinService(req.supabase, ...)` per request. Scheduler injects a single instance via `initializeScheduler`. Both work, but request-scoped instantiation creates redundant wallet derivation work and means the cached BTC price isn't shared between requests and the scheduler.
**Where:** `src/api/routes/bitcoin.routes.ts` (3 places), `src/api/scheduler.ts`
**Fix:** Singleton or DI pattern — instantiate once at server startup, share across routes and scheduler.
**Priority:** Low — performance/cleanliness, not correctness.

### D15. Trust & compliance routes not exposed (HIGH PRIORITY)
**What:** `src/core/layer4-trust/compliance.service.ts` is fully implemented (~300 lines) with sanctions screening, multi-factor confidence scoring, audit trail logging, and tax rate calculation. `trust.routes.ts` exists as a 0-byte file — the HTTP layer was never written, so no marketplace can call into the working compliance logic. Empty file caused API boot failure in S29; temporarily removed from `routes/index.ts` mounts to unblock Stage 6 testing.

**Why this matters:** Trust is the highest-leverage feature for the platform. Small B2B exporters trading across borders have no in-person signals, often no shared language, no common legal system. Sanctions screening at KYC onboarding is the single biggest credibility lever the protocol can offer to marketplaces. Logistics-without-trust is just shipping; logistics-with-trust is what makes Rangkai different.

**Where:**
- `src/api/routes/trust.routes.ts` (empty, needs implementation)
- `src/api/routes/index.ts` (re-mount once routes built)
- `src/core/layer4-trust/compliance.service.ts` (already complete)
- `docs/specs/LAYER4_TRUST_AND_COMPLIANCE.md` (spec is thorough)

**Sub-items:**

- **D15a. Build trust.routes.ts** (~2-3 hours)
  Expose existing compliance service via REST. Required endpoints:
  - `POST /trust/sanctions-check` (marketplace screens KYC users at onboarding)
  - `GET /trust/sanctions-history/:did` (audit trail per identity)
  - `POST /trust/sanctions-list` (governance-only: add sanctioned entity)
  - `POST /trust/sanctions-list/bulk-update` (governance-only: ingest from feed)
  - `GET /trust/stats` (compliance stats — transparency)
  - `GET /trust/tax-rates` (get rates for country/category)
  - `POST /trust/tax-rates` (governance-only: upsert rate)
  - `POST /trust/tax-calculation` (calculate tax for hypothetical transaction)

- **D15b. Populate sanctions list** (data work, not code)
  The `sanctions_list` table is empty. Need an ingest path from OFAC SDN list, UN sanctions list, EU consolidated list. Either manual data load, scheduled cron job, or governance-proposal-driven update. Without data, `checkSanctions` returns "passed" for everyone — worse than not running the check at all because it gives false confidence.

- **D15c. Integrate sanctions check into rangkai-marketplace registration**
  The marketplace's identity registration flow needs to call `POST /trust/sanctions-check` for KYC users at signup. Currently, registration creates identities without screening. This is a marketplace-side change in `rangkai-marketplace/app/auth/register/page.tsx`.

- **D15d. Marketplace operator dashboard for flagged identities**
  When `checkSanctions` returns `flagged` (moderate-confidence match, 0.7-0.95), the marketplace operator needs a UI to review and decide. Block/clear/escalate. This is a marketplace-side feature, not protocol — but the protocol needs to expose the query endpoint (`GET /trust/sanctions-checks?action=flagged&marketplace=X`).

- **D15e. Compliance events for real-time wiring**
  Spec mentions `compliance.flagged` and similar events. Currently just DB writes. Real-time event emission to marketplaces would be a v1.5 improvement. Low priority within this group.

- **D15f. Public sanctions-list transparency page**
  `GET /trust/sanctions-lists` — what lists is the protocol checking against? Important for protocol credibility. Small endpoint, easy win.

**Priority:** HIGH. Promote to next sprint after Stage 6 Bitcoin testing completes. Service already exists; the gap is HTTP exposure + data ingest + marketplace integration. Estimated effort: 1-2 focused sessions for D15a-c (the meaningful trust delivery), D15d-f can follow.

**Decision log:** S28 mistakenly attempted to mount empty trust.routes.ts; caused boot failure. S29 traced root cause: file was scaffold-only since repo init (Oct 19 2025). Discussion confirmed compliance is intentionally NOT per-transaction in this architecture — it's a one-shot at KYC onboarding. That makes the route surface small and tractable. Service code is already correct.

### D16. v2 search federation needs architectural decision (HIGH PRIORITY)
**What:** Pam's vision requires buyers on marketplace-Malaysia to find vendors on marketplace-Germany. This is THE feature that makes Rangkai different from any single-marketplace platform. Three architectural options on the table:

1. **Shared protocol-level search index** — every marketplace pushes products to a central Rangkai search service. Pros: best UX, simplest queries. Cons: defeats decentralization, concentrates data, doesn't scale to many marketplaces.
2. **Federated search queries (Mastodon-style)** — buyer's marketplace queries peer marketplaces in real-time, aggregates results. Pros: each marketplace stays sovereign. Cons: slow, complex caching, ranking is hard.
3. **Nostr-publication + Rangkai-owned index** — vendors publish product events as a custom Nostr kind. Rangkai-specific aggregators index those events. Buyers' clients query the Rangkai index, not Nostr directly. Pros: inherits Nostr's federation properties, Rangkai owns search UX. Cons: depends on Nostr relay stability, indexing complexity.

**Where:** Cross-cutting; involves catalog service, search service, possibly a new federation service, and infrastructure choices.

**Decision context:**
- Nostr's own search is bad (Pam's experience as 3-year user — can't find her own past posts)
- We cannot make buyers depend on Nostr search to find vendors
- Rangkai must own the search index quality regardless of underlying transport
- Search excellence is THE product differentiator, not auth or Bitcoin

**Fix:** Pam will lead a deeper conversation in Session 29+ before any v2 work begins. Need to evaluate Meilisearch, Typesense, Elasticsearch, or Postgres full-text for the index layer. Need to decide if Nostr-kind product events are the publication mechanism. Need to think about how search ranking handles cross-marketplace.

**Priority:** v2 (before soft launch). Belongs at SAME priority as auth — both are foundational. Don't shortcut this conversation.


### D17. v2 public Rangkai channels architecture (HIGH PRIORITY)
**What:** Pam pushed back on dropping public community channels to v3. Wants curated Rangkai channels (not generic Nostr) for seller-to-seller advice, buyer reviews, regional/category groups. Quote: *"if users have to just general nostr than I think it's a downfall. it's too centralised. I have been a nostr user for 3 years and even I get annoyed."*

**Where:** TBD — new messaging service, possibly leveraging Nostr relays as transport but with Rangkai-owned indexing, moderation, and UI. Likely involves new `channel.service.ts` or similar.

**Decision context:**
- Underlying transport could be Nostr (relay infrastructure exists) OR custom (more control, more ops)
- Moderation model: protocol-level (concentrates power), marketplace-level (per-marketplace channels), community-level (mods elected by users)
- Cross-marketplace channels (one "Malaysian craft exporters" channel visible to all marketplaces) vs per-marketplace (each marketplace has its own community)
- Spam handling: rate-limiting, reputation-gating, slow-mode for new accounts
- Discovery: how do users find relevant channels?

**Fix:** Pam will lead deeper conversation in Session 29+ before any work begins.

**Priority:** v2 (before soft launch). After search federation is designed (D16 has dependencies on this).


### D18. v2 Frostr 2-of-3 multisig auth
**What:** Build the "three keys, any two can sign in" model. Browser key + marketplace key + recovery service key. Bitkey-style framing for non-technical users. Pomegranate-style email recovery integration.

**Where:** New `multisig.service.ts` or similar. Updates to `identity.service.ts` to support `signing_strategy = 'frostr_2of3'`. Marketplace UI for ceremony.

**Decision context:**
- Frostr ecosystem is alpha (as of 2025-2026). Igloo desktop signer exists. Frost2x browser extension exists. Pomade (FROST + email recovery) is reference implementation, not production API.
- v1 schema is forward-compatible: `signing_strategy` column already exists in v1 with default `'single_key'`. v2 migration is additive.
- Bitkey framing should be stolen for the UX: "Three keys protect your account, any two can sign you in. Marketplace alone can never sign in as you. Lose your password? Marketplace + recovery service issue a new browser key."

**Fix:** Wait until Frostr leaves alpha. Wait for Pomegranate (or equivalent recovery service) to be production-ready. Then build.

**Priority:** v2 (before soft launch), but DEPENDENT on upstream Frostr stability. May slip to v2.5 if Frostr doesn't mature in time.


### D19. Nostr data load management
**What:** Nostr clients sync large amounts of historical data by default. Pam noted: *"nostr has large data all the time. even when i run primal my laptop is noisy."* This is real and would be a worse problem for Rangkai users (small business operators, not Nostr power users) running marketplace clients alongside their daily work.

**Where:** All Nostr-using parts of the system. Currently primarily future-facing (v2 messaging, v2 search federation), but design decisions made now affect this.

**Fix:** Establish architectural rules:

1. **Subscribe scopes only:** Rangkai clients NEVER subscribe to the general Nostr firehose. Only specific kinds (order-chat kinds, future product-event kinds) and specific authors (order participants, federated marketplaces).
2. **Filtered relays:** Consider running Rangkai-specific relays that carry only Rangkai-relevant kinds. Smaller working set, less bandwidth, faster sync. Could be v2 or v3.
3. **Server-side aggregation:** Marketplace caches Nostr data and serves to client. Client doesn't directly hit relays for most operations. Reduces per-client data volume dramatically.
4. **Lightweight kind definitions:** If we use Nostr for product publication, define the kinds tightly — minimal payload, clear schema, pagination-friendly. Clients fetch only what they need.

**Priority:** Cross-cutting design concern. Must inform D16 (search federation) and v2 messaging decisions. Document the architectural rules now even if implementation is later.

---

## 🟢 Roadmap / not v1

### R1. Provider pitches sellers (Scenario 4)
Anti-spam-throttled outreach: providers express interest on listings, seller invites them to quote. Category/route subscriptions for providers. Rate-limited direct messages. Unthrottled provider outreach destroys marketplaces (Alibaba's lesson).

### R2. Multi-vendor logistics consolidation
A buyer ordering from 3 sellers in the same origin region — can logistics consolidate into one shipment? Big cost saver. Architectural complexity: shipment lifecycle no longer 1:1 with order.

### R3. Reverse logistics financial flow
Returns, damaged shipments, rejected at customs. Who pays the return leg? Refund mechanics. Touches Layer 4 (disputes) heavily.

### R4. Landed cost API integration
Real-time duty/tax estimates via DHL, FedEx, or Easyship API. Show buyer the all-in landed cost before they commit. Becomes critical once we have real cross-border buyers complaining about surprise duties.

### R5. Commercial invoice auto-generation
For international shipments. Pulls from order data, formats per destination country requirements.

### R6. HS code auto-suggest
From product description. ML or rule-based. Becomes important at scale; not for v1.

### R7. Two-tier provider system
Considered and rejected for v1 (single KYC tier is simpler and more honest). May revisit if there's demand for a lower-friction lane for very small operators. Implementation would be a "light verification" tier with reduced visibility. Not on the roadmap unless requested.

### R8. Marketplace federation
Provider on marketplace A serving sellers on marketplace B. Cross-marketplace reputation. Federated search across all marketplace clients (`docs/ARCHITECTURE.md` describes this as Layer 1 federated search). Building it well requires the protocol's identity layer to be very mature.

### R9. Lightning Network as a payment rail

**What:** Lightning is in the architecture as a payment rail (`docs/ARCHITECTURE.md` section 3) but no implementation exists. BTC on-chain comes first; Lightning is the natural next rail because it solves on-chain's two main problems (slow confirmations, high fees for small transactions).

**Why deferred:** Requires running a Lightning node, which means hardware and a fully-synced Bitcoin Core full node behind it. Not a code-only task. Also non-trivial channel management once live.

**Hardware needed (minimum viable Lightning node):**
- Raspberry Pi 4, 8GB RAM (4GB technically works but tight; 8GB recommended). Pi 5 is fine but overkill.
- External SSD, 1TB minimum (BTC blockchain is ~640GB and growing). MicroSD will not survive the write load — SSD is required, not optional.
- Official Pi power supply (3A USB-C) plus a powered USB hub for the SSD if not using a Pi 5. Undervolting kills these setups silently.
- Ethernet cable (don't run a node on Wi-Fi if avoidable).
- Total hardware cost: roughly USD 150-220 depending on SSD choice.

**Software stack options (pick one):**
- **Umbrel** — easiest, opinionated, app-store-style UX, Bitcoin Core + LND bundled. Recommended for first-time Lightning operators.
- **Start9 (StartOS)** — similar to Umbrel, more privacy-focused, supports both LND and Core Lightning.
- **RaspiBlitz** — older, more Bitcoin-purist, requires more terminal use. More flexible but steeper.
- **Manual Bitcoin Core + LND** — for the brave. Full control, no abstraction layer.

**Time investment:**
- Hardware order + arrival: 2-7 days depending on shipping
- Initial Bitcoin Core sync: 1-7 days, runs in background. Can start tinkering with config in parallel.
- LND setup, wallet seed backup, channel funding: 1-3 hours once sync completes
- For testing on signet (recommended for dev), separate sync of signet chain is needed but is much faster (~1 day)

**Integration with the protocol:**
- Protocol's job is to talk to LND's gRPC API (or Core Lightning's RPC) to create invoices, watch for payments, route balances to vendors
- Existing BTCPay code (if used) may already abstract this away — worth checking which approach was chosen before buying hardware
- For testing: signet Lightning is the right network. Mainnet Lightning requires real BTC and real channel funding.

**Open question:** custodial vs self-custody. If we run the Lightning node, we're operating it on behalf of marketplaces — possible regulatory implications (money transmitter status in some jurisdictions). Cleaner if marketplaces run their own Lightning nodes and the protocol provides interop only. To be revisited.

**Priority:** Roadmap. Don't block on this. Get BTC on-chain solid first, then decide if Lightning is v1.5 or later.

### R10. BTCPay Server integration

**What:** Replace browser-driven Blockstream polling with server-side BTCPay Server webhooks for Bitcoin payment confirmation. Code already exists (`btcpay.adapter.ts`, `btcpay.routes.ts`) but isn't wired in. Comment in adapter file says: "Until BTCPay is set up, the system falls back to Blockstream polling."

**Why upgrade:** BTCPay handles invoice expiry, refunds, multi-currency display, and supports both on-chain and Lightning natively. Webhooks are more reliable than polling and don't depend on Blockstream's free API staying up. Self-hosted or hosted (Voltage, nodl.it).

**Setup once we're ready:**
- Run BTCPay Server (Docker or hosted)
- Create Store, generate API key with `btcpay.store.cancreateinvoice` and `btcpay.store.canviewinvoices`
- Add webhook: `https://yourdomain.com/webhooks/btcpay` for `InvoiceSettled`, `InvoiceExpired`, `InvoiceInvalid`
- Add `BTCPAY_URL`, `BTCPAY_API_KEY`, `BTCPAY_STORE_ID`, `BTCPAY_WEBHOOK_SECRET` to `.env`
- Mount `btcpay.routes.ts` in `routes/index.ts` (currently not mounted)

**Priority:** Roadmap. Blockstream polling works for v1. BTCPay becomes valuable once we have real payment volume or want Lightning natively bundled with on-chain.


### R11 (UPDATED). Currency abstraction with Bitcoin settlement (replaces stablecoin entry)
**What:** Originally R11 was "USDC/USDT stablecoin support." Pam's clarification in Session 28: not pursuing stablecoins. Instead, the v3 vision is a **currency abstraction layer** where Bitcoin moves under the hood but users see their local currency throughout the experience.

Pattern: Strike, CashApp, Bitkey. User in Malaysia sends MYR → system converts to BTC → settlement happens on Bitcoin rails → recipient in Germany receives EUR. Both sides experience their native currency, Bitcoin is invisible plumbing.

**Why this matters for Rangkai:** A Malaysian batik buyer sending MYR to an Indonesian seller shouldn't have to think about FX or BTC. They see a price in MYR, pay in MYR, and the seller receives IDR. Bitcoin is the rail that makes cross-border practical for small businesses without traditional banking infrastructure.

**Where:** Cross-cutting. Payment routing (`payment-router.service.ts`), pricing display (catalog), settlement layer (new), receipt layer.

**Reference implementations:**
- Strike — does this for cross-border remittance at consumer scale
- Square/CashApp — Bitcoin Dev Kit (BDK) is open source, very useful
- Spiral (within Block) — Bitcoin protocol development including BDK and LDK
- Bitkey — hardware+software for self-custody Bitcoin
- Open-source: https://github.com/bitcoindevkit, https://github.com/lightningdevkit

**Pam's framing (Session 28):** *"I likely won't use stablecoins but I will consider e-cash in the background where even if user pays in any currency it is converted to bitcoin in the background and transmitted and reconverted back to their currency. I believe this is how Square and CashApp does it. Also Square and CashApp and Bitkey and their other products have a lot of open source."*

**Priority:** v3. Don't block v1/v2 on this. Major architectural undertaking but doesn't require renegotiating the Bitcoin payment rail.


### R12. Insurance marketplace
Currently `insurance_included: boolean` on quotes. Real insurance has caps, deductibles, exclusions, claims processes. Eventually a separate marketplace within the marketplace.

### R13. Customs broker integration
For non-DDP shipments where the buyer needs help with import clearance. Connect buyers to brokers in their country. Out of scope for v1.

### R14. ESG / sustainability metadata
Carbon footprint per shipping mode, offset options, certifications. B2B buyers increasingly demand this. Niche but growing.

### R15. EU IOSS support for VAT collection
For EU-bound B2C shipments under €150, sellers can collect VAT upfront via IOSS. Eliminates surprise duties at delivery. Big UX win for EU sales.

### R16. US de minimis policy changes (2025)
US is moving to eliminate the $800 de minimis for some corridors. Need to track regulatory changes and surface "expect duties" warnings on US-bound shipments accordingly.

### R17. Light-tier providers (rejected, see R7)
Originally proposed in Session 28 as 0.5% / no-KYC tier. Rejected in favor of single KYC-mandatory tier with 0.5% fee for everyone. Documented here so we don't re-derive.

### R18. NEW — Naming/branding decision: rangkai.store
**What:** Pam owns `rangkai.store` domain. Hasn't decided whether it's the protocol's canonical home OR the reference marketplace for Malaysia OR something else. Currently both the protocol AND the reference marketplace are called "Rangkai" which creates confusion.

**Options on the table:**
- **A.** Protocol stays "Rangkai Protocol" / reference marketplace stays "Rangkai" (rangkai.store = the marketplace). Different layers, same name. Future Rangkai-powered marketplaces have their own brands.
- **B.** Reference marketplace gets a Malay name (Lapak, Pasar, Pelabuhan, etc.) / protocol stays Rangkai (rangkai.store = protocol docs). Cleaner separation.
- **C.** Subdomains: rangkai.store for marketplace, protocol.rangkai.store for protocol docs.
- **D.** Rename the protocol with a Bitcoin-themed Malay name (Aksara = "script/letters", Lintas = "cross-border"). Rangkai becomes marketplace brand only.

**Where:** Brand strategy decision. Affects public-facing materials, GitHub repo names, docs site, marketing.

**Fix:** Pam's call. Defer to Pam. Not blocking technical work, but should be resolved before any external launch or public-facing announcement.

**Priority:** Pre-launch only. Internal work isn't blocked.



### R19. NEW — UX channel decision per user type (web / native app / PWA / mix)
**What:** Rangkai has four user types with very different contexts:

1. **Marketplace entrepreneurs** — managing operations, probably desktop-heavy
2. **Buyers** — could be B2B procurement (desktop) or individual buyers (mobile)
3. **Sellers (vendors)** — often non-technical, often mobile-first in emerging markets
4. **Logistics vendors** — on the move, almost certainly mobile

No single UX channel serves all four well. Decisions to make:
- Web-only (works everywhere, no app store gatekeeping, but slower mobile UX)
- Native apps (best mobile UX, expensive to build/maintain, app store policies threaten censorship-resistance for Bitcoin marketplaces)
- PWA (Progressive Web App — good middle ground, installable but web-based)
- Hybrid (web for some user types, app for others)

**Where:** Frontend architecture decision. Affects rangkai-marketplace, logistics-marketplace, future marketplace entrepreneur tools.

**Pam's framing (Session 28):** *"we have 3 types of users... where are they seeing all this — web based? app based? we don't have to answer this now. but something to think about"*

**Fix:** Open question. Defer formal decision. Start collecting requirements per user type. Possible answer:
- Marketplace entrepreneurs → web admin dashboard
- Buyers → web + PWA
- Sellers → PWA (installable, works offline)
- Logistics → native mobile (driver/courier UX needs mobile-first)

**Priority:** v2/v3 design consideration. Not blocking v1. But worth scoping in v2 planning.


### R20. NEW — Clarification: marketplace federation is the goal, not a roadmap item
**What:** R8 in the existing TECH_DEBT.md describes "Marketplace federation" as a roadmap item. This is a misstatement. **Marketplace-to-marketplace federation is the entire purpose of Rangkai Protocol.** Not a feature; the goal.

Pam (Session 28): *"Marketplace-marketplace federation is the goal of this whole thing. so we need to build for that."*

**Implication:** Every design decision must preserve the federation path. v1 is "one marketplace done well, designed to federate." Not "one marketplace, federation later."

**Specifically, the following v1 decisions must remain federation-compatible:**
- Identity layer is DID-based (works across marketplaces) ✓
- Logistics pool is shared across marketplaces ✓
- Trust/sanctions screening is per-protocol (works across marketplaces) — when D15 is built
- Payment rails are universal (Stripe per-marketplace, BTC universal) ✓
- Search v1 is centralised within one marketplace, BUT schema and API design must extend to federation in v2 — this is D16

**Where:** Architectural principle. Already documented in handover. Update R8 in existing TECH_DEBT.md to reflect this clarification.

**Fix:** Treat federation as an architectural constraint, not a roadmap item. R8 should be split: the architectural principle (this entry, R20) and the specific cross-marketplace search/discovery/identity flows that need building (those become specific D-items as they're scoped).

**Priority:** Architectural principle, always-on.

---

## Process notes

### Adding to this doc

When you find a bug, defer a feature, or scope something out: add it here in the appropriate section before closing the session. Format:

```
### XN. Short title
**What:** One sentence describing the issue.
**Where:** File path(s) if known, otherwise "TBD".
**Fix:** What needs to happen.
**Priority:** Low / Medium / Medium-High / High / Highest.
```

### Reviewing this doc

Once a month, or at the start of any session that's planning a sprint:
1. Re-read 🔴 Broken — fix one if you can
2. Re-read 🟡 Deferred — promote to in-progress if it blocks something
3. Skim 🟢 Roadmap — kill anything that's no longer relevant

### When something is fixed

Move it under the same number with status `✅ Fixed S<session number>.` and a one-line summary. Don't delete — the history is useful.
