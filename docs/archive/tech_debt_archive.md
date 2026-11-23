# Tech Debt Archive

**Closed and superseded items, moved here in S43. Never edited, never deleted.**
Open items live in `TECH_DEBT.md`. When an item is fixed, copy its block here, add `✅ Fixed S<N>`, and remove it from `TECH_DEBT.md`.

Three parts: (1) items that are fully closed or rejected; (2) the pre-S43 original text of items that stay open in `TECH_DEBT.md` in a shorter, current form; (3) the old Process notes.

---

## Part 1: Closed items, original text

### B2. Login flow is missing
**Status:** ✅ Fixed S29. Real login page built. `POST /api/v1/identity/login` endpoint added. bcrypt password verification working. Vendors persist across sessions. 33-ghost-vendor problem resolved.

### B3. Sessions expire on server restart
**What:** Tokens are in localStorage but there's no refresh logic on the rangkai-marketplace side. The logistics-marketplace `ProviderContext` does have refresh — that's the pattern to copy.
**Where:** `rangkai-marketplace/lib/contexts/AuthContext.tsx`
**Fix:** Mirror `logistics-marketplace/lib/contexts/ProviderContext.tsx` — JWT-aware refresh scheduling, refresh-token storage, automatic re-auth on 401.
**Priority:** High. Annoying during dev, broken in production.
**Status:** ✅ Fixed S37. `scheduleTokenRefresh()` in `AuthContext.tsx` now decodes JWT `exp` claim to calculate actual time remaining, matching the pattern in `ProviderContext.tsx`. Confirmed: API server restart no longer kicks logged-in users out on page refresh.

### B5. Dashboard data fails to load on fresh provider account
**What:** "Failed to load dashboard data" banner on `logistics-marketplace/app/dashboard/page.tsx` for a brand-new provider with no quotes/shipments.
**Where:** `logistics-marketplace/app/dashboard/page.tsx` `loadDashboardData()`
**Fix:** Check API server logs for failing endpoint. Likely empty-array vs null vs error response mismatch.
**Priority:** Low.
**Status:** ✅ Fixed S34. Root cause: `searchProviders({ identity_did: did })` — `identity_did` is not a supported filter in the backend schema, so it was silently ignored and `providers[0]` returned SatsFleet. Fixed by client-side `.find(p => p.identity_did === did)` after fetching all providers. Real fix (GET /logistics/providers/me endpoint) tracked as D34.

### B6. Two leftover register-page artifacts
**Status:** ✅ Fixed S28. Logistics provider register page no longer bypasses `ProviderContext.login()`.

### B7. `/register` vs `/auth/register` redirects
**Status:** ✅ Fixed S28. Four files updated to correct path.

### B8. ProviderHeader visible only on /dashboard
**Status:** ✅ Fixed S28. `ConditionalHeader` added to root layout.

### B9. Four route files exist but aren't mounted in routes/index.ts
**What:** `bitcoin.routes.ts`, `btcpay.routes.ts`, `stripe.routes.ts`, and `trust.routes.ts` existed as files but were not mounted. Bitcoin route added S28. Stripe and BTCPay are mounted directly in `server.ts` as webhooks (correct — webhooks need raw body parsing). Trust is the only legitimate gap, deferred as D15.
**Status:** ✅ Fully resolved S37. Bitcoin mounted S28. Stripe/BTCPay confirmed correct in server.ts S28. Trust routes built and mounted S37 (see D15a) — all four route files now accounted for.

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

### B16. Buyer nav shows vendor-only items; no buyer purchase-history page
**What:** Marketplace header nav (`Dashboard`, `My Products`) renders for all logged-in users, including buyers — these are vendor-facing. Buyers also have no page listing past purchases; an individual order detail page exists (B4, `app/orders/[id]/page.tsx`) but nothing lists or links to a buyer's order history.
**Where:** Header/nav component (not yet identified), plus a new buyer order-history list page.
**Fix:** (1) Role-based conditional rendering on nav items. (2) Build buyer order-history list, backed by whatever order-listing endpoint exists or needs adding.
**Priority:** Medium. Buyer-facing usability gap, not blocking L14–L16.
**Status:** ✅ Fixed S37. `Header.tsx` now renders "My Orders" for `businessType: 'buyer'` and "Dashboard" + "My Products" for all other types. `AccountMenu.tsx` matches the same logic. `app/orders/page.tsx` already handled buyer order history — no new page needed, it auto-detects role. Confirmed live: Bitty Buy sees buyer nav, Bitshop sees seller nav.

### B18. `packages` build has been failing on pre-existing errors, silently stranding consuming apps on stale SDK code
**What:** `npm run build` in `packages/` fails with 12 TypeScript errors across `identity.service.ts`, `quote.service.ts`, `dispute.service.ts`, and `stripe.adapter.ts` — none related to any session's active work, all pre-existing type drift. Because the build never completes, `dist/` never regenerates, so `rangkai-marketplace` (and likely `logistics-marketplace`) run against a stale compiled SDK. This is almost certainly why tonight's new `getAcceptedQuoteForProduct` method (confirmed present in source) doesn't exist at runtime.
**Where:** `src/core/layer0-identity/identity.service.ts`, `src/core/layer3-logistics/quote.service.ts`, `src/core/layer4-trust/dispute.service.ts`, `src/infrastructure/payment/stripe.adapter.ts`.
**Fix:** ✅ Fixed S33. Three narrow, non-behavioral type patches (`identity.service.ts`, `quote.service.ts`, `dispute.service.ts`). `stripe.adapter.ts` fixed by pinning `stripe` to exact version `18.1.0` (matches the adapter's `apiVersion` string) rather than editing the adapter itself — safer for payment code. `npm run build` in `packages/` now completes clean.
**Priority:** Was Highest, retroactively — this may have been silently capping every SDK-consuming feature since whenever these 12 errors were introduced. Resolved. Worth a `postinstall`/CI check going forward so this can't silently recur (not yet set up — consider logging as its own low-priority roadmap item if it matters enough to you).

### B19. Cart not cleared on logout
**What:** Logging out of rangkai-marketplace does not clear the cart.
Items persist in localStorage and appear on next login (even as a
different user).
**Where:** Logout handler in `rangkai-marketplace` (AuthContext or logout
button component — not yet traced).
**Fix:** Call `clearCart()` from `lib/stores/cart.ts` in the logout handler
before redirecting.
**Priority:** Medium. Real data hygiene issue — one buyer's cart visible to
the next.
**Status:** ✅ Fixed S36. `logout()` in `AuthContext.tsx` now calls `clearCart()` before clearing auth storage.

### D1. Logistics quote schema is order-tied only
**What:** `shipping_quotes` table has `order_id` but no `product_id`. Cannot represent product-level standing quotes (the core feature of Path A in `LOGISTICS_ARCHITECTURE.md` section 8).
**Fix:** Add `product_id` (nullable) and `quote_type` discriminator. Either set, never both. Update SDK methods and routes accordingly.
**Priority:** High — blocks the v1 logistics slice (B1).
**Status:** ✅ Fixed S30. `product_id` (nullable) and `quote_type ('product'|'order')` added to `shipping_quotes`. Index added on `product_id`. See B1 L1.

### D2. Provider profile fields are too coarse
**What:** Provider declares `service_regions`, `shipping_methods`, `insurance_available` but doesn't capture routes, modes, Incoterms supported, HS categories, weight brackets, insurance caps.
**Fix:** Add new columns/tables. Migrate existing providers with sensible defaults. Update registration UI.
**Priority:** Medium — works for now, blocks the "smart pool" matching.
**Status:** ✅ Fixed S30 (schema layer). `routes`, `modes`, `incoterms_supported`, `door_pickup`, `door_delivery`, `weight_min_kg`, `weight_max_kg` added to `logistics_providers`. Old `service_regions` and `shipping_methods` fields kept for backwards compatibility, now deprecated. Registration UI update and buyer-language translation layer (Tier 3) still needed — see B1 L14. Registration UI update still outstanding as of S40 — now tracked as its own item, B21, because the behavioural consequence (B20: blank profiles match every RFQ) is more serious than a pending UI change.

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

### D9. Bitcoin on-chain payment flow
**Status:** ✅ Complete S29. Stage 6 fully confirmed. tBTC sent via coinfaucet, detected by scheduler, 3 confirmations reached, order `ORD-2026-280506-D4O` flipped to `paid`, vendor dashboard (Bitshop) showed order as paid. Full end-to-end Bitcoin payment rail confirmed working.

### D11. Service fee not displayed at checkout
**What:** 0.5% protocol fee should appear as a "Service fee" line on checkout.
**Fix:** Roll into B1 fix. When implementing unified checkout, include service fee line.
**Priority:** Bundled with B1.
**Status:** ✅ Resolved by design decision S30. Fee model confirmed: buyer pays product + logistics only. 0.5% deducted from seller payout, 0.5% deducted from logistics payout at escrow release. No "service fee" line added to buyer's total. Checkout shows product + logistics lines only. `LOGISTICS_ARCHITECTURE.md` section 13 corrected accordingly (L17).

### D19. Country field is free text, but downstream validation expects ISO codes
**What:** `ProductForm.tsx`'s Origin Country field is a plain text input (placeholder "Malaysia"). But `logistics.routes.ts`'s RFQ broadcast schema requires `origin_country` to be 2-3 characters (an ISO country code like "MY"), and `catalog.routes.ts`'s product schema requires `logistics.originCountry` to be exactly 2 characters. A seller typing "Malaysia" instead of "MY" will fail RFQ broadcast silently (caught in the try/catch, logged to console, doesn't block publish) or fail product creation outright depending on which validator catches it first. Noticed during L12 (S32) but pre-existing — not a new bug introduced by L12.
**Fix:** Replace the free-text input with an autocomplete/typeahead backed by a small prefilled country name→ISO code list (e.g., "Malaysia" shown to the user, "MY" stored). This is likely the easier fix vs. asking sellers to know their own country's ISO code. Apply to both the base product logistics section and any future destination-country fields (L13/L14).
**Priority:** Medium — real but not blocking, since KYC test sellers so far have been typing valid-length strings by chance. Will start silently failing for any real seller who doesn't know to type "MY" instead of "Malaysia."
**Status:** ✅ Fixed S36. Created `rangkai-marketplace/components/ui/CountryCombobox.tsx` — autocomplete with 37 trading countries, shows full name, stores ISO code. Applied to checkout country field and `ProductForm.tsx` origin country field. Confirmed live: typing "Sing" shows Singapore/SG, selecting stores "SG".

### D21. L12's opportunities-matching (null destination) not empirically confirmed
**What:** The destination-optional RFQ fix (L12, S32) was verified by tracing the matching logic against known data (BitHaul's route MY→SG, a null-destination quote_request from MY, confirming origin-only matching should apply) rather than by observing it live in the UI — the opportunities page crash (see B[above]) blocked direct visual confirmation, and BitHaul's auth token couldn't be located to test the endpoint directly via curl.
**Fix:** Once L16 rebuilds the opportunities page, confirm as a first sanity check that a null-destination quote_request actually appears for a provider whose routes specify a different destination than the request. If it doesn't, the bug is in the matching logic added this session (`src/api/routes/logistics.routes.ts`, the `/opportunities` route handler), not in the L16 rebuild itself.
**Priority:** ✅ Confirmed S34 during L16 testing. Null-destination quote_requests (Bitshop's L12 global broadcasts) appeared correctly for BitHaul alongside destination-specific requests. L15c end-to-end also confirmed same session. Both items closed. 
**✅ Reopening withdrawn S42 — the S34 confirmation was valid.** The S40 reopening claimed BitHaul had empty `routes` and `incoterms_supported`. That was wrong, and this entry's own first line says so: it records BitHaul's route as MY→SG. A query on 2026-10-21 confirms `routes` = [MY→SG] and `incoterms_supported` = [DAP, DDP]. The S34 test was therefore the correct one — a null-destination RFQ from MY reaching a provider whose only route is MY→SG. Re-verified S42: of 8 open RFQs BitHaul saw 6; `c5d3f94c` (MY→MY) and `d4cc2d30` (MY→DE) were correctly withheld. Origin-only matching for null-destination broadcasts and exact matching for destination-specific ones both work. **Still unknown:** when BitHaul's routes were set — D47's missing `updated_at` makes that unanswerable. **Lesson:** S40 reopened this entry without re-reading it and without querying the provider row. **Original S40 reasoning, now withdrawn:** BitHaul saw the null-destination broadcasts because it has empty `routes` and `incoterms_supported`, which the `/opportunities` handler treats as "skip this filter" (see B20). The test confirmed that a blank provider sees everything, not that origin-only matching works. Re-confirm against a provider with populated routes — SatsFleet is the only one, and it is API-only (no `password_hash`), so this must be tested via curl rather than the UI.

### D22. SDK has two differently-named methods for "get one product" — one didn't exist
**What:** `getById(productId)` is the real method on `CatalogModule` (`packages/sdk/src/modules/catalog.ts`). `getProduct(id)`, called from `rangkai-marketplace/lib/api/products.ts`, did not exist on the module at all — not an alias, a broken call. Confirmed live S33: buyer (Bitty Bit) hit `TypeError: sdk.catalog.getProduct is not a function` on every product-detail load, blocking checkout entirely.
**Where:** `rangkai-marketplace/lib/api/products.ts` `getProduct()`.
**Fix:** ✅ Fixed S33 — call site changed to `sdk.catalog.getById(id)`.
**Priority:** Was Highest (blocking). Resolved.

### D24. Seller self-declared "estimated" shipping quote at product upload
**What:** S30 rules allow satisfying the mandatory pre-publish quote requirement with either a firm provider quote or a self-declared estimate. No mechanism exists for a seller to enter their own number — `submitQuote()` in `quote.service.ts` requires a real, registered `provider_id`, verified against `logistics_providers`. Per Pam (S33): this path should exist (gives sellers breathing room before they've gotten a real quote, or if they've simply forgotten to refresh one) but shouldn't be encouraged as the default, since a made-up number can be wrong in either direction — pair with a reminder nudge (see D23) rather than leaving it as a silent fallback.
**Where:** `quote.service.ts` `submitQuote()`, product creation flow (`ProductForm.tsx`, per L12 notes).
**Fix:** Needs a schema decision — likely nullable `provider_id` + an `is_seller_estimate` flag — plus a UI field on product creation, and copy that nudges toward getting a real quote rather than relying on the self-declared one.
**Priority:** Medium. The mandatory-quote publish rule technically can't be satisfied by "estimated" in practice yet — only firm quotes exist as a real path. Worth resolving before R21 (hard-block publish) is revisited.
**Status:** ✅ Fixed S38. Schema: `provider_id` nullable, `is_seller_estimate` flag, CHECK constraint (`provider_id IS NOT NULL OR is_seller_estimate = true`). Backend: `submitSellerEstimate()` in `quote.service.ts` inserts straight to `accepted`/`seller_standing`; `acceptQuote()` auto-supersedes a seller estimate (marks it `rejected`) when a real provider quote is accepted. Route: `POST /logistics/quotes/seller-estimate`, product-owner only. SDK: `sdk.logistics.submitSellerEstimate()`, `ShippingQuote` type updated to real table shape. UI: estimate field on `ProductForm.tsx` (create mode, KYC sellers only) with copy nudging toward a real quote; product page shows "Seller's estimate" and always "(estimated)", never "firm". Tested end-to-end: create, duplicate-block, ownership 403, buyer display, supersede.

### D25. `@rangkai/sdk` is installed as a physical copy, not a live link — `file:` dependency silently goes stale
**What:** `rangkai-marketplace/package.json` declares `"@rangkai/sdk": "file:../packages/sdk"`, which is meant to behave like a live link (similar to `npm link`) so local SDK edits are picked up on rebuild. On this Windows setup, npm instead copied the package into `node_modules/@rangkai/sdk` as a real, physical directory (confirmed via `dir` showing `<DIR>` rather than `<SYMLINKD>`/`<JUNCTION>`). Every SDK edit since initial install (14/11/2025) was invisible to `rangkai-marketplace` — cost significant time S33 chasing what looked like a build failure but was actually a stale dependency snapshot.
**Where:** `rangkai-marketplace/node_modules/@rangkai/sdk`, `rangkai-marketplace/package.json`.
**Fix:** Short-term (done S33): delete the stale copy, `npm install` to force a fresh copy after any SDK change. Real fix: convert the repo to npm workspaces (root `package.json` with a `workspaces` field listing `packages/sdk`, `rangkai-marketplace`, `logistics-marketplace`) so npm creates a proper symlink and this class of bug can't recur. `logistics-marketplace` almost certainly has the identical issue — worth checking its `node_modules/@rangkai/sdk` the same way once this is confirmed fixed.
**Priority:** Medium-High. Not urgent standalone, but every future SDK change will silently fail to reach the frontend the same way until this is fixed properly — worth doing before L15/L16 add more SDK methods.
**Status:** ✅ Fixed S37. Root `package.json` now declares `workspaces: ["packages/sdk", "rangkai-marketplace"]`. `rangkai-marketplace/package.json` changed from `"file:../packages/sdk"` to `"*"`. npm creates a `<JUNCTION>` at `node_modules\@rangkai\sdk` pointing to `packages\sdk`. Verified: `cd packages\sdk && npm run build` immediately updates what `rangkai-marketplace` sees — no delete/reinstall needed.

### D29. No DB-level constraint preventing multiple `accepted` quotes per product
**What:** The app's own `acceptQuote()` flow enforces at most one accepted quote per product (checks for an existing accepted row before allowing a new accept), but nothing at the schema level stops a raw SQL insert — or any future code path that bypasses `acceptQuote()` — from violating that invariant. Hit live S33: a duplicate manual test-data insert produced 3 accepted rows for one product, causing `getAcceptedQuoteForProduct()`'s `.maybeSingle()` to throw a 500 (`"JSON object requested, multiple (or no) rows returned"`). Worked around same session with `.order().limit(1)` (use newest), which prevents the crash but doesn't prevent the underlying bad state from existing.
**Where:** `shipping_quotes` table schema.
**Fix:** `CREATE UNIQUE INDEX ON shipping_quotes (product_id) WHERE status = 'accepted';` — a partial unique index makes the multi-accepted state impossible to create at all, even by hand, rather than just handling it gracefully after the fact.
**Priority:** Low-Medium. App-level code already prevents this in normal operation; only bites on manual/raw test-data manipulation. Worth doing as a real migration when schema changes are next batched, not urgent enough for its own session.
**Status:** ✅ Fixed S38. `CREATE UNIQUE INDEX one_accepted_standing_quote_per_product ON shipping_quotes (product_id) WHERE status = 'accepted' AND context = 'seller_standing'` — batched with D24's migration. Scoped to `seller_standing` (per D35's context model, buyer RFQ accepts legitimately coexist). Duplicate check run pre-migration: clean.

### D31. "I'll arrange my own logistics" doesn't gate by buyer KYC status — should route KYC buyers into the pool, not let them bypass it
**What:** L11 (S32) shipped the checkbox as a flat opt-out for any buyer. Per Pam (S33): only non-KYC buyers should be able to fully self-arrange outside the pool — all logistics providers in the pool are KYC, and a KYC buyer wanting to arrange their own logistics should still be routed through it (via an "opportunity" broadcast or direct provider outreach — see L15c/L15d), not bypass it entirely. Mirrors the existing seller-side rule (S30: anon sellers manage their own logistics, KYC sellers must use the pool). Routing KYC buyers into the pool is also a real sales opportunity for small logistics businesses, not just a compliance nicety.
**Where:** `checkout/page.tsx` (`ownLogistics` checkbox has no KYC check), `order.service.ts` (`own_logistics` gate doesn't distinguish buyer identity type).
**Fix:** Gate the true "fully self-arranged, no pool" option to non-KYC buyers only. For KYC buyers, the checkbox's role changes — it should launch the L15c/L15d pool flow instead of just setting a flag with nothing behind it.
**Priority:** Medium-High. Shipped gap since S32, only caught during L15c scoping (S33). Worth fixing before real KYC buyers hit this path in practice.
**Status:** ✅ Fixed S34. Checkbox now shown to all buyers. Non-KYC: checkbox ends the flow. KYC: ticking the checkbox reveals the per-vendor pool request UI beneath it. `kycLogisticsReady()` gates the submit button correctly for each case.

### D36. Order detail page doesn't show logistics cost as a line item
**What:** `app/orders/[id]/page.tsx` shows subtotal ($10) and total ($27) but no
logistics line between them. Data is correct in DB (logistics_cost: 17.00).
Pure display gap.
**Where:** `rangkai-marketplace/app/orders/[id]/page.tsx`
**Fix:** Add a "Shipping" line item between subtotal and total, reading
`order.logistics_cost` when present.
**Priority:** Medium. Data is correct, display is misleading.
**Status:** ✅ Fixed S36. Added "Logistics" line item between Subtotal and Total in `orders/[id]/page.tsx`. Reads `(order as any).logisticsCost` — present at runtime via `mapDatabaseToOrder` but not yet on the SDK `Order` type. Only renders when `logisticsCost > 0`.

### D37. Checkout error state not cleared when pool flow resets to idle
**What:** If a direct quote request fails (e.g. country field typed as
"Singapore" instead of "SG"), the error banner persists even after the
buyer corrects the country and the browse panel resets. On the next
attempt the stale error is visible alongside a successful flow.
**Where:** `rangkai-marketplace/app/checkout/page.tsx` `handleDirectRequest()`
**Fix:** Call `setErrors([])` at the start of `handleDirectRequest()` and
`handleRequestPoolQuotes()`, same as `handleSubmit()` does.
**Priority:** Low. UX polish, doesn't block anything.
**Status:** ✅ Fixed S36. `setErrors([])` added at the top of both `handleDirectRequest()` and `handleRequestPoolQuotes()` in `checkout/page.tsx`.

### D43. No dedup on RFQ broadcasts — repeated publishes or pool-button presses create duplicate quote_requests
**What:** `POST /logistics/quote-requests` creates a new open row every call. The ProductForm fires it on every publish of a DAP/DDP product, and R21's "Request quotes from the logistics pool" button fires it on demand — so re-publishing or re-pressing creates duplicate open RFQs for the same product, which show as duplicate opportunities to providers.
**Where:** `src/api/routes/logistics.routes.ts` (quote-requests creation), `ProductForm.tsx` (both call sites).
**Fix:** Before insert, check for an existing open `quote_requests` row for the same product + requester (and no target provider) — reuse/refresh it instead of inserting.
**Priority:** Low-Medium. Noise for providers, no data corruption.
**Status S41 — ✅ Fixed S41 (`1b247e6`).** Both quote-request paths now reuse and refresh the open request; see `session-handovers/41.md`. Original S40 findings follow. Product `bad3b0e0-5b97-413a-8c5c-cfd3812a51bd` (Bitshop's `custom`, DDP, active, created 2026-07-06 10:23) has four broadcast RFQs, two still open, at 07-06 11:05, 07-06 11:25, 07-09 02:45, 07-09 07:21, plus two targeted rows. **None coincides with product creation** — all four postdate it by 40+ minutes, the signature of edit-and-republish rather than repeated creation. The client-side source was closed S40 (edits now only re-broadcast when a logistics-material field changed); the protocol-level fix is still open.

**Refined fix:** on finding an existing open row, **UPDATE the payload fields** (`weight_kg`, `dimensions_cm`, `incoterm`, `hs_code`, `origin_country`, and `moq` once D46 lands) **and** refresh `expires_at`, then return that row — not merely refresh the expiry. A seller who corrects weight from 0.7 to 2.4 kg must not leave providers quoting the old figure.

Two things this buys beyond dedup: the D44 manual button becomes idempotent, so mashing it is harmless and no defensive UI state is needed; and pressing the button then later publishing with an interim estimate refreshes one RFQ rather than creating a second — the returning-drafter journey.

**Also check the buyer path** at `logistics.routes.ts` 861 (`POST /quote-requests/buyer`). There are two insert paths into `quote_requests` and the buyer path scopes `requester_did` differently (a buyer requesting quotes on someone else's product), so the uniqueness key may need to differ. Read it before writing the check.

Re-verify duplicates with:
​```sql
SELECT product_id, count(*) AS rfq_count,
       count(*) FILTER (WHERE status = 'open') AS open_count,
       min(created_at) AS first, max(created_at) AS last
FROM quote_requests
WHERE target_provider_id IS NULL
GROUP BY product_id
HAVING count(*) > 1;
​```

### R7. Two-tier provider system
Considered and rejected for v1. Single KYC-mandatory tier with 0.5% fee. Documented here so we don't re-derive.

### R8. Marketplace federation
**CLARIFICATION (see R20):** This is not a roadmap item — it's the goal of the entire project. R8 described federation as a feature to be added later. That framing is wrong. Every v1 design decision must preserve the federation path. The specific federation protocol still needs design (tied to D16).

### R17. Light-tier providers (rejected, see R7)
Originally proposed S28. Rejected in favour of single KYC-mandatory tier. Documented here so we don't re-derive.

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

## Part 2: Original text of items that remain open (pre-S43)

Kept for history. The current version of each is in `TECH_DEBT.md`.

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

TIER 3 — Frontend (✅ Complete — L12–L16 and L15d all done)
- L12. ✅ S32. Done, tested, pushed. `incoterm`, `hsCode`, `requireLogisticsQuote` added end-to-end: SDK types (`packages/sdk/src/types.ts`, `catalog.ts`), core types (`src/core/layer1-catalog/types.ts`), backend persistence (`product.service.ts`, `catalog.routes.ts` Zod schemas — this was the actual root cause of non-persistence, Zod was silently stripping the fields), `ProductForm.tsx` UI, migration (`products.hs_code`). RFQ auto-broadcast on publish wired via new `sdk.logistics.requestQuote()`, fires for KYC sellers only. Destination-country made optional on the RFQ broadcast (global "any destination" broadcast, matching Shopify-style shipping profiles rather than requiring a pinned destination at publish time) — required a DB-level constraint fix too (`quote_requests.destination_country` had `NOT NULL` even after the Zod schema was relaxed). All 7 test steps passed; opportunities-matching specifically logic-verified only, not empirically confirmed live (see D21).
- L13. ✅ S32. Done, tested, pushed. Seller-facing quote review page at `app/vendor/products/[id]/quotes/page.tsx` — lists pending/accepted quotes with provider name, rating, price, days, insurance; Accept button calls `acceptQuote()`. Backend: new `GET /logistics/quotes/product/:productId` endpoint + `getQuotesWithProvidersForProduct()` service method; closed the pre-existing `// TODO: Add ownership check` gap on `POST /quotes/:id/accept` — now verifies the accepting user owns the product (product quotes) or is buyer/vendor on the order (order quotes) before allowing accept. Tested via direct SQL-inserted quote (BitHaul → "custom" product, $15 USD) since the logistics-marketplace's own quote-submission UI is blocked by pre-existing bugs (B5, B15) — accept correctly moved the quote to accepted status in the DB and the UI.
- L14. ✅ S33. Done, tested, pushed. Product page: buyer sees the accepted shipping quote as a line item — provider name, price, days, firm/estimated computed from `valid_until`. Two prerequisite bugs fixed en route: D22 (`sdk.catalog.getProduct` didn't exist — was blocking every buyer product-page load) and B18 (stale `packages` build silently stranding the frontend on old SDK code). Tested live as buyer Bitty Bit against BitHaul's real accepted quote on "custom" ($15 USD, firm).
- L15. Checkout: product subtotal + chosen logistics line. "I'll arrange my own logistics" option (Path B2). Total = product + logistics only, no added fee line.
  - **L15a — ✅ done, tested S33.** Per-vendor shipping display (firm/estimated), total calculation, `ownLogistics` suppresses shipping cost in `CartSummary`. Confirmed working on the actual `/checkout` page (not just `/cart`) after a hard-refresh cleared a stale render. **Known gap, deferred on purpose:** `createOrderFromCart()` still doesn't pass `logisticsQuoteId`/`logisticsCost` — real orders total product-only regardless of what checkout previews. Next step, not yet built.
  - **L15b — ✅ done, tested S33.** 2+-products-per-vendor summing verified with real data (Bitshop: $15+$20 → $35 estimated) and real multi-vendor data (Bitshop + new seller Hash Heel). Surfaced and fixed two bugs along the way: D29 (duplicate-accepted-quote crash) and D30 (hardcoded "Vendor" placeholder name — `CartSummary` restructured to group vendor/items/shipping together per Pam's request).
  - **L15c — ✅ done, tested S34.** Buyer-initiated RFQ broadcast at checkout. KYC buyer ticks "I'll arrange my own logistics" → pool UI appears per vendor group → "Request shipping quotes" broadcasts `POST /logistics/quote-requests/buyer` (new endpoint, reads product logistics server-side, destination from buyer's shipping address) → checkout polls `GET /logistics/quote-requests/buyer/pending` every 10s → buyer accepts an incoming quote → `logisticsQuoteId`/`logisticsCost` wired through `createOrdersFromCart()` into order creation (closing the L15a known gap). D31 (KYC gate) fixed in the same change: non-KYC buyers see the checkbox only; KYC buyers who tick it enter the pool flow instead of bypassing it. Confirmed live: DB shows `quote_requests` row with `requester_did` = Bitty Buy, `destination_country = SG`, correct weight/incoterm read from product. Full end-to-end confirmed S34 via L16 testing: buyer broadcasts RFQ → BitHaul sees in opportunities → submits quote → Bitty Buy accepts in checkout → "Shipping confirmed" state reached. Order placement with logistics cost confirmed in CartSummary ($8 showing correctly). quote.service.ts acceptQuote() guard updated to allow buyer RFQ accepts alongside seller standing accepted quotes.
 - **L15d — ✅ done, tested S35.** Direct pool browsing at checkout. KYC buyer ticks "I'll arrange my own logistics" → two options appear: broadcast (L15c) or browse providers (L15d) → buyer browses provider list (favourites float to top, modes/incoterms shown) → clicks "Request quote" next to a specific provider → targeted `quote_requests` row created with `target_provider_id` set → polling flow same as L15c → buyer accepts → "Shipping confirmed". Provider sees amber "direct request" badge on opportunities page alongside blue "global broadcast" badge. Confirmed live S35: BitHaul saw direct request, submitted $17 quote, Bitty Buy accepted, order `ORD-2026-205695-FXK` placed with `logistics_cost: 17.00`.Confirmed quote from either L15c or L15d gets attached to cart, buyer proceeds to pay/ship normally. In-system conversations/calls between buyer and provider are an explicit later feature, not part of L15c/d.
  - **Both L15c and L15d are gated by D31** — the KYC-buyer routing fix needs to land alongside them, since the current "I'll arrange my own logistics" checkbox incorrectly lets any buyer (KYC or not) skip the pool entirely.
- L16. ✅ Done, tested S34. Logistics-marketplace opportunities dashboard rebuilt: correct data shape (dimensions_cm not dimensions.length_cm), null destination_country handled (global broadcasts show "global broadcast" badge), inline quote submission modal (no separate page), destination filter, timeAgo() showing minutes not just hours. B5 fixed (wrong provider loaded — SatsFleet showing for BitHaul). D21 confirmed: null-destination requests appear correctly. L15c end-to-end confirmed live.

TIER 4 — Spec corrections (🟡 Partially reopened S32)
- L17. 🟡 S32: Section 13 fee formula fix applied (confirmed in file). Section 3 still describes the 0.5% as a visible checkout line item — contradicts the corrected model, not yet fixed. The "Architecture doc additions" block at the bottom of the file (quote_requests rename, Section 9.1 Vendor Favorites, Section 8 quote-expiry cron table) was drafted but never merged into the doc body — not yet fixed. Both deferred to after L16 by agreement with Pam. Do not mark this fully complete until both are also applied and the doc is reviewed end to end.
- L18. Tech debt updated (this entry).

**Rules confirmed S30:**
- KYC sellers: mandatory minimum of one logistics quote (firm or estimated) before product can be published
- Anon sellers: manage own logistics, cannot access logistics pool
- Multiple quotes per product allowed (competitive — multiple logistics providers can quote same product)
- Currency for v1: USD. D6 (currency layer) stays deferred. Bitcoin escrow splits into two BTC transactions. Lightspark/Strike (R11) investigated offline by Pam — check Malaysia availability before Session 31.

**Priority:** Highest. L11–L15b all done and tested (L14, L15a, L15b shipped S33). Next: L15c/L15d (buyer-initiated logistics-pool paths, gated by D31), then L16.

### B20. RFQ matcher penalises providers who declare their capabilities — blank profiles match everything
**⚠️ Corrected S42 — read before the text below.** The claims below that "every real provider is blank" and that BitHaul bypasses the filter are **wrong for BitHaul**. A query on 2026-10-21 shows BitHaul has `routes` = MY→SG and `incoterms_supported` = DAP, DDP (`modes` empty, weight bounds null, door flags false), and the filter demonstrably works on it: of 8 open RFQs it was shown 6 and correctly denied `c5d3f94c` (MY→MY) and `d4cc2d30` (MY→DE), because a request that names a destination needs an exact origin+destination route match. BitHaul's capability data was added by hand after registration — registration writes only five fields (see B21). **What remains true:** a provider with *empty* `routes` / `incoterms_supported` skips those filters entirely, the weight bounds have no guard, and every provider onboarded through the UI starts fully blank. The defect is narrower than first written: it bites providers who register and are never configured, which today is every provider except the two hand-edited fixtures.
**What:** The `/logistics/opportunities` handler computes `hasRoutes` and `hasIncoterms` as graceful-degradation guards: a provider with empty `routes` or `incoterms_supported` has that filter skipped entirely and sees every open RFQ. Combined with B21 (registration never collects those fields), this means every real provider is blank, every blank provider matches everything, and **the filter is inert in production**. Worse, the incentive is inverted — a provider who takes the trouble to declare capabilities becomes the only kind that can be filtered *out*. SatsFleet, the only properly configured provider in the system, is the only one that can miss an opportunity.

Weight has no degradation guard at all: `weight_min_kg` / `weight_max_kg` apply unconditionally whenever non-null. SatsFleet's 0.1 kg floor silently drops any RFQ where weight arrived as 0 — which is exactly what the unit-conversion bug (fixed S40) and the missing-MOQ gap (D46) were producing.

**[WITHDRAWN S42 — wrong for BitHaul; see the correction above and D21] This invalidates D21's S34 confirmation.** D21 was closed on the basis that BitHaul saw Bitshop's null-destination broadcasts. BitHaul saw them because it has no capability data and bypasses the filter — not because origin-only matching works. The test confirmed nothing about the matching logic. See D21.
**Where:** `src/api/routes/logistics.routes.ts` ~641–700 (the `/opportunities` handler).
**Fix:** Decide the intended semantics for a blank profile — "match nothing until you declare" is the honest reading, but it strands existing providers, so it has to land together with B21. Add a degradation guard for weight, or make the bounds NOT NULL with sensible defaults at registration. Then re-run D21's confirmation against a provider that actually has routes.
**Priority:** High, but narrower than first logged (S42). The pool filters correctly for providers that have capability data (BitHaul, SatsFleet) and not at all for freshly registered ones — so behaviour differs by provider, which is harder to diagnose than uniformly broken.

### B21. Provider registration collects no canonical capability fields
**What:** The registration Zod schema requires `service_regions` and `shipping_methods` with `.min(1)` and does not collect `routes`, `modes`, `incoterms_supported`, `door_pickup`, `door_delivery`, `weight_min_kg` or `weight_max_kg` at all. Every provider who self-registers is capability-blank. **(Corrected S42: BitHaul is not capability-blank.** Its MY→SG route and DAP/DDP incoterms were added by hand after registration — registration writes only `business_name`, `identity_did`, `service_regions`, `shipping_methods` and `insurance_available`, the form has no capability inputs, and nothing in the routes file ever writes `routes` or `incoterms_supported`. What registration produces today is a *fully* blank provider.) SatsFleet only has capability data because S30 hand-wrote an UPDATE for it in SQL.

This is the residual of D2, which fixed the schema layer in S30 and explicitly noted "Registration UI update ... still needed." Logged as its own item because the behavioural consequence (B20) is more serious than "UI not updated yet" suggests.
**Where:** `src/api/routes/logistics.routes.ts` 37–38 (registration schema), `src/core/layer3-logistics/provider.service.ts` ~38–54, `logistics-marketplace/app/auth/register/page.tsx`.
**Fix:** Collect the canonical fields at registration, in operator language rather than jargon — "which countries do you collect from and deliver to?", "can you clear import customs and advance duty?" (that last one is what `incoterms_supported` actually means, see note in D47). Backfill existing providers.
**Priority:** High. Blocks B20 and any capability-filtered browse page (D44).

### B23. `rangkai-marketplace` has never typechecked clean — 15 errors, build only green because Next skips typecheck
**What:** `npx tsc --noEmit` in `rangkai-marketplace` reports 15 errors. Three are in `ProductForm.tsx` (144, 145, 161) — pre-existing S38-era mismatches between the SDK `Product` type and the local `FormData` type: `Category` not assignable to the inline category shape, `basic` having optional `shortDescription`/`sku`/`brand` where `FormData` requires them, `ProductStatus` wider than `'draft' | 'active' | 'inactive'`. The other 12 are elsewhere in the app.

Discovered because S39 left a reference to a `formData.requireLogisticsQuote` field that does not exist on the type (removed S40). That line could only have survived a commit because Next dev transpiles via SWC without typechecking.

Distinct from B18, which was the same class of problem in `packages/` and was fixed S33. B18's own closing note flagged that a `postinstall`/CI check was never set up — this is the consequence.
**Where:** `rangkai-marketplace/components/vendor/ProductForm.tsx` 144, 145, 161, plus 12 others (run `npx tsc --noEmit > tsc.txt 2>&1` for the full list).
**Fix:** Clear the 15, then add `tsc --noEmit` to a pre-commit or CI step across all three packages so it cannot silently recur.
**Priority:** Medium. Nothing is broken at runtime today, but a project that does not typecheck cannot tell you when you have broken it.

### B24. Buyer RFQ path converts weight units but not dimensions, and fabricates missing values
**What:** `POST /logistics/quote-requests/buyer` derives shipment data server-side from the product row. It handles weight units correctly (kg/lb/g branches), but reads dimensions raw with no unit check at all — `logistics.dimensions?.length || 1`. Products store the seller's chosen display unit, so a seller who entered inches has those numbers filed as centimetres. A 12×8×6 in carton becomes 12×8×6 cm: an 84 kg volumetric shipment quoted as 0.1 kg.

Same block fabricates data rather than failing: `|| 1` on each dimension and `|| 1` on weight mean a product with missing logistics data silently produces a 1 kg 1×1×1 cm RFQ. A provider cannot tell that apart from a real tiny parcel.

This is the latent half of the S40 unit-conversion fix. S40 fixed the seller broadcast path in `ProductForm.tsx` with `toKg()`/`toCm()` helpers and flagged the buyer path as the likely second site. Confirmed by reading the code in S41. **Not yet observed in data** — the one product tested (`6652da96`) stores `unit: cm`, so the bug did not fire. It needs a product saved in inches to demonstrate.

Interacts with B20: weight bounds are the one matcher filter with no graceful-degradation guard, so a fabricated or mis-scaled weight silently drops RFQs out of providers' pools with no error anywhere.
**Where:** `src/api/routes/logistics.routes.ts` ~899–903 (dimensions), ~890–897 (weight fallback).
**Fix:** Port the `toKg()`/`toCm()` conversion server-side and share it between both paths — the conversion belongs at the protocol, not in each marketplace's form (principle 9). Replace the `|| 1` fallbacks with an explicit error when a product has no usable logistics data.
**Priority:** High. Silent wrong numbers reaching providers is worse than a visible failure.

### B25. `expires_at` is written on every RFQ and never enforced anywhere
**What:** Both quote-request paths set a 30-day `expires_at`. Nothing reads it. The opportunities matcher filters on `status` and `target_provider_id` only, so an expired RFQ stays visible to providers indefinitely and no job ever moves `status` off `open`.

Live example: `d4cc2d30` on *handmade leather boots* expired **2026-08-01** and was still being served on 2026-08-14. It also still carries `weight_kg: 1.50` while the product now says 0.5 kg — a stale row quoting a stale weight.

Two consequences worth separating. Providers see dead requests as live ones, which degrades pool quality as volume grows. And D43's expiry refresh is currently a no-op in terms of what providers actually see — correct to do, but it buys nothing until expiry is enforced.
**Where:** `src/api/routes/logistics.routes.ts` ~650–659 (`/opportunities` query).
**Fix:** Add `.gt('expires_at', new Date().toISOString())` to the opportunities query. Separately decide whether a scheduled job should transition expired rows to a terminal status, or whether filtering at read time is enough — read-time filtering is simpler and has no job to fail silently.
**Priority:** Medium. Not wrong today at test volume; becomes wrong as the pool fills.
**Status S42 — ✅ Fixed S42** for the provider-facing opportunities query: expired RFQs are filtered in the query, so they cannot crowd live rows out of the 50-row limit. Verified as BitHaul: 6 expired rows before, 1 live row after a D43 refresh. Read-time filtering was chosen over a scheduled job, which has nothing to fail silently.
**Still open:** the buyer pending endpoint (`/quote-requests/buyer/pending`, ~line 1042) still shows a buyer their expired RFQs in checkout. Left alone deliberately, because filtering it could strand a buyer mid-checkout. It needs a decision on what a buyer sees when their RFQ has expired.

### D15. Trust & compliance routes not exposed (HIGH PRIORITY)
**What:** `compliance.service.ts` is fully implemented (~300 lines) with sanctions screening, multi-factor confidence scoring, audit trail logging, and tax rate calculation. `trust.routes.ts` exists as a 0-byte file — the HTTP layer was never written. Empty file caused API boot failure S28; removed from mounts to unblock S29.

**Why this matters:** Trust is the highest-leverage feature for the platform. Small B2B exporters trading across borders have no in-person signals. Sanctions screening at KYC onboarding is the single biggest credibility lever the protocol can offer to marketplaces.

**Where:**
- `src/api/routes/trust.routes.ts` (empty, needs implementation)
- `src/api/routes/index.ts` (re-mount once routes built)
- `src/core/layer4-trust/compliance.service.ts` (already complete)
- `docs/specs/LAYER4_TRUST_AND_COMPLIANCE.md` (spec is thorough)

**Sub-items:**
- **D15a.** ✅ Fixed S37. `trust.routes.ts` built and mounted. All 8 endpoints live: `POST /trust/sanctions-check`, `GET /trust/sanctions-history/:did`, `POST /trust/sanctions-list`, `POST /trust/sanctions-list/bulk-update`, `GET /trust/stats`, `GET /trust/tax-rates`, `POST /trust/tax-rates`, `POST /trust/tax-calculation`. Confirmed working via curl.
- **D15b.** ✅ Fixed S37. `sanctions_list` seeded with 8 real entries from OFAC, UN, and EU lists (Kim Jong Un, Al-Qaida, ISIS, Viktor Bout, Aum Shinrikyo, Hamas, Gaddafi Estate, plus one inactive test entry).
- **D15c.** ✅ Fixed S37. `POST /identity/register` now runs `checkSanctions()` automatically for KYC registrations. Blocked identities get 403 and are deleted. Flagged identities are logged for review but registration proceeds. Confirmed: sanctions check auto-logged on new KYC registration.
- **D15d.** Marketplace operator dashboard for flagged identities — deferred, post-v1.
- **D15e.** Compliance events for real-time wiring — v1.5, low priority.
- **D15f.** Public sanctions-list transparency page — v1.5.

**Priority:** HIGH. Sprint after B1 (logistics payment) completes. D15a–c are the meaningful trust delivery. D15d–f can follow.

### D34. Two logistics-marketplace issues bundled (ProviderContext identity + opportunities submit state)

**What (part 1):** `ProviderContext` calls `sdk.logistics.searchProviders()` with an `identity_did` filter that the backend doesn't support — the filter is silently ignored and the first provider returned is used, causing wrong provider to load when multiple providers exist (surfaced S34: BitHaul logged in but saw SatsFleet Express data). Workaround shipped S34: client-side `.find()` by `identity_did` after fetching all providers.
**Where:** `logistics-marketplace/lib/contexts/ProviderContext.tsx` `loadProvider()` and `login()`.
**Fix:** Add `GET /api/v1/logistics/providers/me` backend endpoint — looks up provider by authenticated user's DID, returns single result. Then update `ProviderContext` to call that instead of `searchProviders()`.
**Priority:** Medium. Workaround is correct for small provider counts but becomes a full-table scan at scale.
**Status (part 1):** ✅ Fixed S36. `GET /api/v1/logistics/providers/me` added to `logistics.routes.ts` (registered before `/:id` to avoid route shadowing). `ProviderContext` `loadProvider()` and `login()` now fetch this endpoint directly with Bearer token instead of `searchProviders()` + client-side find.

**What (part 2):** Opportunities page "Submit quote" button resets to enabled on page refresh — submitted state is session-local React state only. A provider can submit multiple quotes for the same request across page loads (the backend `submitQuote()` service blocks duplicate pending quotes from the same provider, but only if the previous one is still pending — if it was accepted/rejected, a new one can be created).
**Where:** `logistics-marketplace/app/opportunities/page.tsx` `OpportunityCard` component.
**Fix:** On page load, fetch this provider's existing pending quotes (`GET /logistics/providers/:id/quotes?status=pending`), extract their `product_id`s, and pre-set `quoted=true` for any `OpportunityCard` whose `product_id` matches.
**Priority:** Low. Backend already blocks the most problematic case (duplicate pending from same provider). Cosmetic issue only in normal operation.

### D35. Buyer RFQ quotes and seller standing quotes share the same accepted status on a product — no schema-level distinction

**What:** When a buyer accepts an RFQ quote (L15c), `shipping_quotes` now has two accepted rows for the same product: the seller's standing accepted quote (from L13) and the buyer's chosen logistics quote. `getAcceptedShippingQuote()` in `products.ts` uses `.order().limit(1)` (newest-first, D29 workaround) and picks the buyer's quote, so the cart summary shows the buyer's $8 instead of the seller's $15. CartSummary and product page (L14) then show the wrong price for new buyers who haven't arranged their own logistics.

**Also:** When a buyer abandons checkout mid-flow (removes item from cart, navigates away, or doesn't place the order), the open `quote_requests` row is never cleaned up. On next visit, the polling finds the old accepted quote and skips straight to "Shipping confirmed" state without the buyer re-requesting, which can be confusing or show stale pricing.

**Where:** `quote.service.ts` `acceptQuote()`, `rangkai-marketplace/lib/api/products.ts` `getAcceptedShippingQuote()`, `rangkai-marketplace/lib/api/cart.ts` `getShippingSummaryByVendor()`.

**Fix:** Two parts. (1) Schema: add a `context` column to `shipping_quotes` — `'seller_standing' | 'buyer_rfq'` — set at insert time. `getAcceptedShippingQuote()` then filters to `context = 'seller_standing'` for cart/product display; buyer RFQ accepts only look at `context = 'buyer_rfq'`. (2) Cleanup: when a buyer removes all items of a product from cart, or when an order is placed, close open `quote_requests` rows for that product/buyer (`status = 'closed'`). Also close them on session logout.

**Priority:** Medium-High. Causes incorrect pricing display for other buyers as soon as one buyer has completed an RFQ accept on a product. Needs schema migration — batch with next schema changes.
**Status:** ✅ Fixed S36. Added `context` column (`text NOT NULL DEFAULT 'seller_standing' CHECK IN ('seller_standing', 'buyer_rfq')`) to `shipping_quotes` via Supabase SQL editor. `submitQuote()` sets `context: 'seller_standing'` on insert. `acceptQuote()` computes `finalContext` at accept time by checking for a buyer `quote_requests` row. `getAcceptedQuoteForProduct()` filters to `.eq('context', 'seller_standing')` so product page and cart are never affected by buyer RFQ accepts. Note: the abandoned-checkout cleanup (part 2 of the original fix description) is not yet done — open quote_requests rows are still not closed on cart removal or logout.

### R21. L12 Option B — hard-block publish until a real quote exists
**What:** S32 chose Option A for L12 (collect Incoterm/HS code, seller manually toggles `requireLogisticsQuote`). Option B is stricter: KYC sellers genuinely cannot publish until at least one quote (firm or estimated) exists for the product — turning "Publish" into a multi-step flow (draft → request quotes → wait/select → goes active). Deferred because it depends on L13 (quote review UI) existing first; building the hard gate before there's a UI to review quotes would strand sellers with drafts they can't act on.
**Fix:** Revisit once L13 ships. Decide then whether to enforce.
**Priority:** v1.1, after L13.
**Status:** ✅ Core fixed S39. Gate is Incoterm-aware: KYC seller + DAP/DDP → server refuses draft→active without an accepted seller_standing quote (provider firm or seller estimate); EXW/FOB and anon sellers exempt. Enforced in catalog.routes.ts PUT at status transition only (grandfathered actives untouched). `require_logistics_quote` now derived from incoterm (DAP/DDP→true), toggle removed from form and API schemas; migration applied. ProductForm: draft-first publish (create draft → estimate → gated activate), estimate block DAP/DDP-only, EXW/FOB "buyer arranges freight" note, client-side pre-check, eye-icon toggle surfaces the server's gate message. Tested e2e S39 (curl T1–T5 + UI tests 1–4). **Remaining, designed S39 for S40 (edits drafted in-session, not applied, not tested):** two-door shipping-price UI — explicit "Request quotes from the logistics pool" button (saves draft, broadcasts RFQ, lands on the product's Quotes page) alongside the estimate fields; both doors shown in create mode AND when editing a draft (today the estimate field is create-only, dead-ending returning drafters); seller waiting on pool quotes can interim-add an estimate and publish; block-message copy points to both doors; DAP dropdown annotation gains "(most common — what buyers usually expect)"; shortened estimate copy "Shown to buyers as an estimate — final shipping is confirmed by a real provider quote". Open debate for S40: pool broadcast manual-only (button) vs auto-fire on estimate-publish — Pam leaning automate.

---

## Part 3: Old Process notes (pre-S43)

Bitcoin mnemonic rotation and burned-placeholder cleanup now live, condensed, in `OPERATIONS.md`.

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

### D27. Master architecture docs are ~10 months stale, predate the Nostr decision
**What:** `docs/ARCHITECTURE.md`, `docs/whitepaper/WHITEPAPER.md`, and the `docs/specs/LAYER0–6` files haven't been updated in ~10 months — since before the decision to use Nostr as transport (see `docs/NOSTR_ARCHITECTURE_RATIONALE.md`, which *is* current, S29). They don't reflect the actual current schema, terminology (still say "vendor" in places, not "seller"), fee model, or any of L1–L16's real implementation. Pam: "we get smarter as we go" — these docs describe an earlier, less-informed version of the design.
**Where:** `docs/ARCHITECTURE.md`, `docs/whitepaper/WHITEPAPER.md`, `docs/specs/LAYER0_IDENTITY_AND_REPUTATION.md` through `LAYER6_GOVERNANCE.md`, `docs/specs/REF_CLIENT.md`, `docs/PROJECT_STRUCTURE.md`, `docs/diagrams/protocol-architecture.mmd`, `docs/diagrams/transaction-flow.mmd`.
**Status:** ✅ Fixed S44. Replaced by `docs/architecture/` (README, LAYERS, PAYMENTS_AND_FEES, ACTORS_AND_TRUST, LOGISTICS, COMMS_AND_NOSTR, REF_CLIENT, diagrams), a redrafted `docs/whitepaper/WHITEPAPER.md` and a rewritten `PROJECT_STRUCTURE.md`. The old `ARCHITECTURE.md`, `NOSTR_ARCHITECTURE_RATIONALE.md`, `diagrams/*.mmd` and `specs/` were removed or superseded.
**Fix:** Not yet scoped — open question whether this becomes one consolidated whitepaper + architecture doc (specs folded in) or stays as separate whitepaper/architecture/specs. Deliberately not decided tonight, per Pam (S33), to avoid scope creep mid-L15. Revisit as its own session once L15/L16 ship — same "explicitly deferred" pattern as L17's `LOGISTICS_ARCHITECTURE.md` consolidation was for L16.
**Priority:** Medium. Not blocking any current build work, but the drift is compounding — every session since S29 has been adding real decisions (fee model, terminology, Nostr rationale, this session's consolidation-vs-hub principle) that these master docs don't capture.

### B30. Search text is placed directly in the filter string
**What:** `.or('name.ilike.%${query}%, ...')` puts user input in the filter. A comma or bracket may break or alter it. Not tested.
**Where:** `search.service.ts` (line 211), and `getSuggestions`.
**Fix:** Escape, or replace with the database function from B29. Test with commas and brackets first.
**Status:** ✅ Fixed S45. Found larger than described: on the live `product_index`, searches such as `toys, games`, `red, green` and `24" ruler` made PostgREST refuse the query, a 500 on the public search endpoint. `buildTextSearchFilter()` now normalises the text, quotes and escapes it for the filter grammar and escapes LIKE wildcards. 17 unit tests, and live read-only checks on four hostile and three ordinary searches after the fix. Commit `d6a0fc5` (the fix) and `6104ea4` (a root `jest.config.js` so the tests can run). B29 replaces the whole text match and supersedes this. Done by the Pollen agent on Buzz, reviewed by Claude, merged by Pam.
**Priority:** Medium-High.

### B36. A rating caps the reputation score at 100, though the maximum is 500
**What:** `updateReputationFromRating` adds or subtracts a few points and then clamps to 0 to 100. The reputation formula has a maximum of 500. A seller at 300 falls to about 100 after one rating. It also writes the score directly, bypassing the formula (B43), and it looked the row up by `did`, a column the table does not have (B41).
**Where:** `src/core/layer4-trust/rating.service.ts` (lines 250 to 290), `layer0-identity/types.ts` (`DEFAULT_REPUTATION_PARAMS`).
**Fix:** Record the rating as a reputation event and recalculate with the formula. Check the column name.
**Status:** ✅ Fixed in code S44, but not yet reachable. The 0-100 clamp is gone: the cap is now `DEFAULT_REPUTATION_PARAMS.maxScore` (500), and the formula in `calculateReputationScore` is untouched; only the cap changed, per Pam. This does not mean ratings now move reputation: the same function looks the row up by `did`, and Pam confirmed in S44 that `reputations` has no `did` column, so the select fails, its error is discarded and the function returns before it ever reaches the cap. A rating currently writes nothing at all (B41). The score is still written directly rather than recalculated (B43), and the average-rating write in this path can store 0 (B42). 7 unit tests, 3 of which fail against the old clamp; they pass because the stub row carries both `did` and `vendor_did`, which is exactly what B41 must put a stop to. Done by the Pollen agent on Buzz, reviewed by Claude, merged by Pam.
**Priority:** Medium-High.

### B41. The rating path looks up `reputations` by `did`, so a rating writes nothing
**What:** `RatingService.updateReputationFromRating` selects the reputation row with `.eq('did', userDid)` (`rating.service.ts:261`) and updates it with `.eq('did', userDid)` (`:295`), but `reputations` has no `did` column. Pam ran the query in S44; the columns are `id`, `vendor_did`, `score`, `metrics`, `history`, `recent_events_hash`, `last_updated`. Every other place that touches `reputations` uses `vendor_did`: `reputation.service.ts:35` and `:400`, `proof.service.ts:339`, `search.service.ts:374`, and the row is created with `vendor_did: did` (`identity.service.ts:362`). So the select fails, and its error is discarded (`const { data: reputation } = ...`: no `error` is read), `reputation` is null and the function returns before it reaches the score. **A rating currently writes nothing at all**: no score, no metrics. The B36 cap is real code but unreachable on a real record, and the old symptom (300 falling to 100) never happened live. The update's `.eq('did', ...)` is wrong the same way and would still match nothing if only the select were fixed.
**Where:** `src/core/layer4-trust/rating.service.ts` (lines 253 to 297).
**Fix:** Use `vendor_did` in both queries, and read the select's `error` instead of dropping it, so a wrong column fails loudly next time.
**Status:** ✅ Fixed S44. Both queries now filter on `vendor_did`, the column the table has (Pam confirmed the columns in S44: `id`, `vendor_did`, `score`, `metrics`, `history`, `recent_events_hash`, `last_updated`), and the select's and the update's errors are read, so a bad column fails the rating loudly instead of writing nothing — `PGRST116` (no reputation row yet) still returns quietly, because that is a normal case. The B36 stub now models the real table: the row holds `vendor_did` only, and a filter on a column the table does not have is rejected, so putting `.eq('did', ...)` back fails a test. 11 tests in that file, 9 of which fail on the old code. This makes the rating write reach a real row for the first time, which is why B42 and B43 stay open and come next. Done by the Pollen agent on Buzz, reviewed by Claude, merged by Pam.
**Priority:** High. Moved up from the B36 report: on a real record a rating changed nothing at all.

### B40. `JwtPayload.type` uses the wrong vocabulary, one `tsc` error at the root
**What:** `JwtPayload.type` was `'user' | 'client' | 'service'`, but every token is signed with `type: identity.type` (`'kyc' | 'nostr' | 'anonymous'`). `catalog.routes.ts:305` compares `req.user?.type` with `'kyc'`, which was the only `tsc` error at the root. It worked at runtime; only the type was wrong.
**Where:** `src/api/core/auth.ts` (`JwtPayload` line 17, `TokenManager.generateToken` line 43), `src/api/routes/catalog.routes.ts` (line 305), and 17 `TokenManager.generateToken` call sites in eight files under `scripts/`: `diagnose-websocket.ts` (1), `test-catalog-routes.ts` (2), `test-governance-routes.ts` (4), `test-identity-routes.ts` (1), `test-logistics-routes.ts` (2), `test-order-routes.ts` (3), `test-trust-routes.ts` (2), `test-websocket.ts` (2).
**Fix:** Make the union say what tokens really carry.
**Status:** ✅ Fixed S44. The five `jwt.sign` sites (`identity.routes.ts:150`, `:167`, `:229`, `:241`, `:301`) sign `identity.type`, or a value carried over from a refresh token that was signed the same way. The second signing path, `TokenManager.generateToken` (`auth.ts:43`), is called by 17 sites in eight `scripts/` files, and every one of them passed `type: 'user'`. Nothing signs or passes `'user'`, `'client'` or `'service'` now, so the union is `IdentityType` (`'kyc' | 'nostr' | 'anonymous'`, imported type-only from `layer0-identity/types`) and `catalog.routes.ts:305` typechecks as written with no other comparison changed. In `src/` this is type only: no signing, verification, secret, expiry or runtime change. In `scripts/` the payload value is now `'anonymous'` instead of `'user'`, which behaves identically, because the only code that reads `type` is the `=== 'kyc'` publish gate (`catalog.routes.ts:305`) and the refresh route, and these are access tokens for neither. The root `tsc` baseline is now 0 errors, down from 1, but `scripts/` is not in the root `tsconfig.json` (`include: ["src/**/*"]`), so that 0 never covered it: a throwaway tsconfig including `scripts/**/*` reported 2 errors on `main` (the root B40 error and one unrelated pre-existing `'shipment' is possibly null`), 6 on this branch before the script fix (those 2 plus five `TS2322 Type '"user"' is not assignable to type 'IdentityType'`) and 1 after it (the unrelated one, `test-logistics-routes.ts:382`). Only 5 of the 17 sites produced a compile error, because the other twelve cast the payload `as any` at the call site, so the compiler never checked their value. Corrected S44 after review: the first version of this entry said the helper had no callers, having searched only `src/`. Done by the Pollen agent on Buzz, reviewed by Claude, merged by Pam.
**Priority:** Low-Medium.
