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


### R11. Stablecoin support
USDC, USDT as a third payment rail beyond Stripe and BTC. Architecturally similar to BTC routing, different settlement properties.

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