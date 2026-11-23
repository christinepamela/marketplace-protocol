# Tech Debt: open items

**Last updated:** 2026-11-23 (Session 44)
**Closed items:** `../archive/tech_debt_archive.md`  |  **Companion docs:** `operations.md`, `troubleshooting.md`

---

## How to use this doc

This file holds only what is still open. Check it before starting work, and add an item the same turn something is deferred. Check the highest ID in use before numbering a new one (tails: **B45, D65, R27**).

When an item is fixed, copy its block to `../archive/tech_debt_archive.md` with `✅ Fixed S<N>` and remove it here.

Format for a new item:

```
### XN. Short title
**What:** one or two sentences.
**Where:** file path(s), or TBD.
**Fix:** what needs to happen.
**Priority:** Low / Medium / High.
```

B = broken but shipped. D = deferred or partial. R = roadmap, not v1.

---

## Index

| ID | Item | Priority |
|---|---|---|
| B1 | Logistics payment: two pieces remain | Medium |
| B4 | Tracking number not shown in buyer shipment UI | Medium |
| B17 | Buyer product page silently swallows a broken `sdk.identity.getIdentity` call | Low |
| B20 | RFQ matcher skips its filters for providers with no declared capabilities | High |
| B21 | Provider registration collects no capability data | High |
| B22 | Two live vocabularies for provider capability, read inconsistently by different code paths | High (Medium if D44 not built) |
| B23 | `rangkai-marketplace` has never typechecked clean (15 errors) | Medium |
| B24 | Buyer RFQ path converts weight units but not dimensions, and fabricates missing values | High |
| B25 | Buyer pending endpoint still shows a buyer their expired RFQs | Medium |
| B26 | Stripe payout pays the seller the whole order total | High |
| B27 | Governance fee changes have no effect; limits contradict the fee principle | High |
| B28 | Marketplace fee is calculated but never collected | High |
| B29 | Search loads every match, has no database ranking, cannot scale | High, launch blocker |
| B31 | Payout routes need only a login and take the destination from the request | High, before real funds |
| B32 | Release, completion and dispute resolution move no money | High |
| B33 | Auto-release can pay the seller inside the dispute window | Medium-High |
| B34 | Arbitration cannot be resolved; seller 48-hour deadline not enforced | High |
| B35 | Governance actions are records only; votes not cryptographically verified | Medium-High |
| B37 | One-sided ratings are never revealed | Medium |
| B38 | `npm test`: the API health test cannot load without test environment variables | Low-Medium |
| B39 | `getSuggestions` has no caller | Low |
| B40 | `JwtPayload.type` uses the wrong vocabulary, one `tsc` error at the root | Low-Medium |
| B42 | `calculateAverageRating` counts only revealed ratings, so a new rating can write 0 | Low-Medium |
| B43 | The rating path writes `score` directly instead of going through the reputation formula | Medium-High |
| B44 | The rating path changes a reputation row without updating `last_updated` | Low |
| B45 | A reputation failure after a rating is saved returns an error but keeps the rating | Low-Medium |
| D5 | No HS code on products | Medium-High |
| D6 | Currency layer absent | Medium |
| D7 | Provider rating field exists but isn't populated | Medium |
| D8 | Estimated quotes (rate cards) not implemented | Medium |
| D10 | Lightning untested | Low |
| D12 | No quote refresh / expiry handling | Low |
| D13 | BIP84 derivation path uses mainnet coin type on testnet | Low |
| D14 | BitcoinService instantiation pattern is inconsistent | Low |
| D15 | Trust and compliance: later pieces | Low until v1 ships |
| D16 | v2 search federation needs architectural decision (HIGH PRIORITY) | v2 |
| D17 | v2 public Rangkai channels architecture (HIGH PRIORITY) | v2 |
| D18 | v2 Frostr 2-of-3 multisig auth | v2 |
| D20 | Nostr data load management | Cross-cutting |
| D23 | Seller notification: firm quote expired → auto-converted to estimated, seller bears price risk | Low-Medium |
| D26 | Backend package's `tsc` output lands at repo root, not inside `packages/` | Low |
| D28 | `ownLogistics` is one checkbox for the whole cart — breaks with 2+ vendors | Low |
| D30 | Cart items carry a hardcoded "Vendor" placeholder name, never populated | Medium |
| D32 | `keys/` folder at repo root contains generated PEM key pair from early identity setup | Low |
| D33 | `dist/` folder at repo root is stale backend build output | Low |
| D34 | Opportunities page "Submit quote" button resets on refresh | Low |
| D35 | Abandoned checkout leaves open `quote_requests` rows behind | Medium |
| D38 | Supabase SQL editor has accumulated ~116 untitled test queries | Low |
| D39 | Service-layer errors surface as 500 INTERNAL_ERROR instead of 4xx | Low-Medium |
| D40 | `acceptQuote()` infers context from product-level RFQ history, misclassifying seller standin... | Medium-High |
| D41 | Estimate-priced orders: no confirmation step, final payment not updated by a later real quote | Medium-High |
| D42 | Buyer reminder to request a real quote when ordering against a seller estimate | Medium |
| D44 | Seller-side pool control — browse providers, direct-request, opt out of broadcast | Medium |
| D45 | Quotes do not snapshot the declared basis they were quoted against | Medium |
| D46 | RFQ payload is insufficient for a provider to actually quote a shipment | High for MOQ |
| D47 | Logistics capability model gaps: no warehousing, no `updated_at`, and Incoterm asked in the ... | Low-Medium |
| D48 | SDK discards response envelope metadata, so the protocol cannot tell a marketplace anything ... | Medium |
| D49 | Quotes carry no destination, and the buyer pending list is scoped by product only | High |
| D50 | Marketplace registry (fee, limit, free-period end) | High |
| D51 | Fee ledger and live protocol and marketplace statistics | High |
| D52 | Search: ships-to country and Incoterm filter | High |
| D53 | Stripe Connect not set up, card payouts not live | Medium-High |
| D54 | Search: later steps (typo tolerance, multilingual, cache) | Medium |
| D55 | Anonymous users not blocked from logistics pool; no prohibited-goods list | Medium-High |
| D56 | A buyer cannot dispute an order that never arrives | Medium-High |
| D57 | Order status changes logged as "system", not the person | Medium |
| D58 | Identity has drifted from Principle 3 (passwords, cryptographic identity) | Medium |
| D59 | KYC verification is a stub | Medium-High |
| D60 | Rebuild disputes to the confirmed model | High |
| D61 | Sample approval record linked to bulk orders | Medium-High |
| D62 | Freeze model | Medium-High |
| D63 | Seller-set advance (deposit) | Low, later |
| D64 | Product visibility states differ from the spec | Low-Medium |
| D65 | Reference client: clean-up and marketplace-entrepreneur tools | Medium |
| R1 | Provider pitches sellers (Scenario 4) | Roadmap |
| R2 | Multi-vendor logistics consolidation | Roadmap |
| R3 | Reverse logistics financial flow | Roadmap |
| R4 | Landed cost API integration | Roadmap |
| R5 | Commercial invoice auto-generation | Roadmap |
| R6 | HS code auto-suggest | Roadmap |
| R9 | Lightning Network as a payment rail | v1.5/v2 |
| R10 | BTCPay Server integration | v1.5 |
| R11 | Currency abstraction with Bitcoin settlement ("invisible Bitcoin") | v1.5 |
| R12 | Insurance marketplace | Roadmap |
| R13 | Customs broker integration | Roadmap |
| R14 | ESG / sustainability metadata | Roadmap |
| R15 | EU IOSS support for VAT collection | Roadmap |
| R16 | US de minimis policy changes | Roadmap |
| R18 | Naming/branding decision: rangkai.store | Pre-launch only |
| R19 | UX channel decision per user type | v2/v3 design consideration |
| R21 | Two-door shipping-price UI (what is left of the publish gate) | Medium |
| R22 | Buyer product-detail page "Add to Cart" button is a non-functional placeholder | Not triaged |
| R23 | Consolidated order-level RFQ for multi-product carts (bulk logistics quote) | Deferred |
| R24 | Buyer picks from multiple shipping quotes (sea/air, price vs speed) | v1.5/v2 |
| R25 | Destination and provider choice are single-valued where the flow needs several | Roadmap |
| R26 | Nostr communications build (relay, rooms, media, audit log) | Roadmap |
| R27 | Returns: replacement, credit, partial refund, optional physical return | Roadmap |

---

## 🔴 Broken but shipped

### B1. Logistics payment: two pieces remain
**What:** Buyer pays product + logistics at checkout and the order stores `logistics_quote_id` and `logistics_cost` (L1–L16, all done; full history in the archive). Two pieces are left:
- **L10 split payout is untested end to end.** `executeSplitPayoutBTC()` and `POST /api/v1/bitcoin/split-payout` exist; testing needs a delivered order with confirmed BTC.
- **L17 spec corrections.** `LOGISTICS_ARCHITECTURE.md` section 3 still shows the 0.5% as a checkout line, which contradicts the fee model, and its "Architecture doc additions" block at the bottom was never merged. Resolved in S44: the logistics architecture is folded into `docs/architecture/logistics.md`.
**Where:** `src/core/layer2-transaction/bitcoin.service.ts`, `docs/architecture/logistics.md`
**Priority:** Medium.

### B4. Tracking number not shown in buyer shipment UI
**What:** Buyer's order page renders shipment data, but tracking number doesn't appear. Likely a missing field in the hydrated query or a renderer that's looking at the wrong path.
**Where:** `rangkai-marketplace/app/orders/[id]/page.tsx`, `components/logistics/TrackingTimeline.tsx`
**Fix:** Trace the data path from `getShipmentByOrder` → component props → render. Add the `tracking_number` field where missing.
**Priority:** Medium. Buyer-facing bug, makes the buyer experience feel incomplete.
**Status:** 🟡 Code verified S37. `mapDatabaseToOrder` correctly maps `tracking_number`, `markAsShipped` correctly writes it, and the order detail page correctly renders it when present. No shipped orders exist in DB to test against — all 10 orders are `payment_pending` or `paid`. Needs end-to-end shipping test once an order reaches `shipped` status.

### B17. Buyer product page silently swallows a broken `sdk.identity.getIdentity` call
**What:** `getVendorIdentity()` in `products.ts` try/catches `sdk.identity.getIdentity()`, returning null on failure — which is why the page never visibly broke from this before. **Confirmed S33, post-B18-fix:** the error persisted even after `packages` build was cleaned, `packages/sdk` rebuilt, and the stale `node_modules` copy force-reinstalled (D25's workaround). Same shape as D22 — this is a real missing/misnamed method on `IdentityModule`, not a stale-build symptom.
**Where:** `rangkai-marketplace/lib/api/products.ts` `getVendorIdentity()`; `packages/sdk/src/modules/identity.ts` (not yet viewed — need to see it to confirm the correct method name, same way D22 was resolved by viewing `catalog.ts`).
**Fix:** View `packages/sdk/src/modules/identity.ts`, find the real method name (or confirm it needs adding), fix the call site.
**Priority:** Low — degrades gracefully (D30's cart-vendor-name issue is the visible symptom that made this worth fixing sooner rather than later, but nothing crashes).

### B20. RFQ matcher skips its filters for providers with no declared capabilities
**What:** `/logistics/opportunities` treats empty `routes` or `incoterms_supported` as "skip this filter", so a provider that declared nothing sees every open RFQ. Weight bounds have no such guard: `weight_min_kg` / `weight_max_kg` apply whenever they are non-null, so a wrong weight silently drops an RFQ from a provider's pool (SatsFleet's 0.1 kg floor drops any RFQ whose weight arrived as 0).
Providers with declared capabilities are filtered correctly: on 2026-10-21 BitHaul (routes MY→SG, incoterms DAP/DDP) was shown 6 of 8 open RFQs and correctly denied the MY→MY and MY→DE ones. Every provider who registers through the UI starts fully blank (B21), so behaviour differs from provider to provider. The incentive is inverted: a provider who declares its capabilities is the only kind that can be filtered out, while a blank one sees everything.
**Where:** `src/api/routes/logistics.routes.ts`, `/opportunities` handler (~626–713).
**Fix:** Decide what a blank profile should mean. "Match nothing until you declare" is the honest reading but strands existing providers, so it lands together with B21. Add a guard for weight, or make the bounds required at registration.
**Priority:** High.

### B21. Provider registration collects no capability data
**What:** Registration writes five fields: `business_name`, `identity_did`, `service_regions`, `shipping_methods`, `insurance_available`. Routes, modes, incoterms, door flags and weight bounds are never collected, and nothing in the routes file writes them. BitHaul's and SatsFleet's capability data were set by hand in SQL (S30 wrote SatsFleet's; when BitHaul's routes were set is unknown, because there is no `updated_at`, D47). A newly registered provider is fully blank (see B20). This is the residual of D2.
**Where:** `src/api/routes/logistics.routes.ts` registration schema (37–38), `src/core/layer3-logistics/provider.service.ts` (~38–54), `logistics-marketplace/app/auth/register/page.tsx`.
**Fix:** Collect them in operator language ("which countries do you collect from and deliver to?", "can you clear import customs and advance duty?", see D47), then backfill existing providers.
**Priority:** High. Blocks B20 and the browse half of D44.

### B22. Two live vocabularies for provider capability, read inconsistently by different code paths
**What:** `types.ts` marks `service_regions` deprecated in favour of `routes`, and `shipping_methods` deprecated in favour of `modes`. Both deprecated columns are still `NOT NULL`; all the canonical ones are nullable. Two code paths disagree on which to read:
- RFQ matching (`logistics.routes.ts` ~636) selects `routes, incoterms_supported, modes, weight_min_kg, weight_max_kg` — canonical.
- Provider search (`provider.service.ts` 95, 100) filters on `service_regions` and `shipping_methods` — deprecated.

Direct consequence for D44: a seller browsing the pool via `searchProviders` would see a list built from one vocabulary while their broadcast is matched against a different one. **The providers visible in the pool would not be the providers who receive the RFQ.**

**Observed live S42:** BitHaul's `service_regions` lists MY, SG, DE, GB, US, CA, NL, FR but its `routes` is MY→SG only. RFQ `d4cc2d30` (MY→DE) was withheld from BitHaul by the matcher, while a `searchProviders` browse would have listed BitHaul as serving DE. A seller would see one list and the matcher would use another — the failure predicted above, now seen rather than inferred.

Data-level symptom already present: SatsFleet's `service_regions` (MY, SG, US, CA, GB) and its `routes` (which include DE and AU) disagree, with no way to tell which is intended.
**Where:** `src/core/layer3-logistics/types.ts` 27–28, 46–47; `provider.service.ts` 95, 100, 206–207; `logistics.routes.ts` 37–38, 309–310, 636.
**Fix:** Pick canonical (`routes`/`modes`), migrate `searchProviders` onto it, derive or drop the deprecated columns. Do this before any capability filtering is built on top.
**Priority:** High if D44 is built, Medium otherwise.

### B23. `rangkai-marketplace` has never typechecked clean (15 errors)
**What:** `npx tsc --noEmit` in `rangkai-marketplace` reports 15 errors. The app runs anyway because Next dev skips typechecking. Breakdown (S42):
- 5: the SDK does not export `SearchFilters` (×3), `SearchResultItem`, `Review`
- 3: `FilterSidebar.tsx`, implicit `any` on three filter callbacks
- 3: `ProductForm.tsx` 144/145/161, SDK `Product` vs the local `FormData` type
- 2: `LogisticsProviderSelector.tsx`, `provider_id` / `order_id` are `string | null` in the SDK type (S38 made them nullable for seller estimates)
- 1: `lib/api/auth.ts:56`, `email` is not in `RegisterIdentityRequest`
- 1: `lib/api/products.ts:155`, `getIdentity` does not exist (B17)
**Where:** `rangkai-marketplace` (full list: `npx tsc --noEmit > tsc.txt 2>&1`).
**Fix:** Clear the 15, then add `tsc --noEmit` to a pre-commit or CI step for every package so it cannot recur.
**Priority:** Medium. 15 is the baseline: more means something broke.

### B24. Buyer RFQ path converts weight units but not dimensions, and fabricates missing values
**What:** `POST /logistics/quote-requests/buyer` derives shipment data server-side from the product row. It handles weight units correctly (kg/lb/g branches), but reads dimensions raw with no unit check at all — `logistics.dimensions?.length || 1`. Products store the seller's chosen display unit, so a seller who entered inches has those numbers filed as centimetres. A 12×8×6 in carton becomes 12×8×6 cm: an 84 kg volumetric shipment quoted as 0.1 kg.

Same block fabricates data rather than failing: `|| 1` on each dimension and `|| 1` on weight mean a product with missing logistics data silently produces a 1 kg 1×1×1 cm RFQ. A provider cannot tell that apart from a real tiny parcel.

This is the latent half of the S40 unit-conversion fix. S40 fixed the seller broadcast path in `ProductForm.tsx` with `toKg()`/`toCm()` helpers and flagged the buyer path as the likely second site. Confirmed by reading the code in S41. **Not yet observed in data** — the one product tested (`6652da96`) stores `unit: cm`, so the bug did not fire. It needs a product saved in inches to demonstrate.

Interacts with B20: weight bounds are the one matcher filter with no graceful-degradation guard, so a fabricated or mis-scaled weight silently drops RFQs out of providers' pools with no error anywhere.
**Where:** `src/api/routes/logistics.routes.ts` ~931–946 (weight and dimensions fallbacks in the buyer handler).
**Fix:** Port the `toKg()`/`toCm()` conversion server-side and share it between both paths — the conversion belongs at the protocol, not in each marketplace's form (principle 9). Replace the `|| 1` fallbacks with an explicit error when a product has no usable logistics data.
**Priority:** High. Silent wrong numbers reaching providers is worse than a visible failure.
**Open decision (S43):** where the conversion lives. Option A: a shared server-side helper used by the buyer path only (small; the seller path keeps trusting the form). Option B: both paths read the product row server-side and the form helpers become redundant (one source of truth, bigger change, touches the seller path). Recommendation: A now, log B.

### B25. Buyer pending endpoint still shows a buyer their expired RFQs
**What:** The provider side is fixed (S42: expired RFQs no longer appear in `/opportunities`). `GET /logistics/quote-requests/buyer/pending` still returns a buyer's expired open RFQs in checkout. Left alone on purpose, because filtering could strand a buyer mid-checkout. Expired rows keep `status = 'open'`; no job closes them.
**Background:** before the S42 fix, `d4cc2d30` expired on 2026-08-01 and was still served to providers on 2026-08-14, while carrying a stale `weight_kg: 1.50` (the product now says 0.5 kg). Read-time filtering was chosen over a scheduled job because a filter has nothing to fail silently.
**Needs:** Pam's decision on what a buyer sees when their RFQ has expired: greyed out with "expired, request again", hidden, or refreshed automatically.
**Where:** `src/api/routes/logistics.routes.ts` (~1038–1099).
**Priority:** Medium. Related: D35, D49.

### B26. Stripe payout pays the seller the whole order total
**What:** `executeVendorPayout` passes `order.total` (product plus logistics) to the seller with 0.5% off. Logistics gets nothing and the second 0.5% is never taken. The Bitcoin path splits correctly. Decision (S44): Stripe must follow the Bitcoin payout.
**Where:** `src/core/layer2-transaction/payment-router.service.ts` (line 135), `src/infrastructure/payment/stripe.adapter.ts` (line 157).
**Fix:** Pay seller and logistics separately, 0.5% off each, using the same split rules as `executeSplitPayoutBTC`. Needs D53 first for live payouts.
**Priority:** High.

### B27. Governance fee changes have no effect, and their limits contradict the fee principle
**What:** `update_protocol_fee` and `update_client_fee` write to `protocol_parameters`. Nothing in `src` reads that table. Orders use `DEFAULT_FEE_CONFIG` (0 and 0). The 0.5% is a hard-coded number in four places. Governance allows a protocol fee of 0 to 10%. Decision (S44): 0.5% and never higher.
**Where:** `src/core/layer6-governance/execution.service.ts` (lines 143 to 200), `layer2-transaction/types.ts`, `order.service.ts`, `bitcoin.service.ts` (lines 334, 510), `payment-router.service.ts`, `stripe.adapter.ts`.
**Fix:** One fee setting read by every payout path. Cap the protocol fee at 0.5% in governance. Decide whether the action is kept (lower only) or removed.
**Priority:** High.

### B28. Marketplace fee is calculated but never collected
**What:** `calculateFees` computes and stores the marketplace fee on the order. No payout deducts it, and `fee.service.ts`, which would distribute it, is a mock that no route calls. Decision (S44): it must be collected.
**Where:** `order.service.ts` (line 450), `fee.service.ts`, payout code.
**Fix:** Deduct at payout, record in the ledger (D51). Needs D50.
**Priority:** High.

### B29. Search loads every match, has no database ranking, and cannot scale
**What:** Matching is `ILIKE '%text%'`. `search()` fetches all matches, runs three more queries per row, scores in JavaScript and paginates last. Search is a launch requirement (S44: Postgres full-text search with proper ranking).
**Where:** `src/core/layer1-catalog/search.service.ts` (lines 25 to 64, 197, 276 to 372); the `product_index` table and its trigger `trigger_sync_product_to_index`.
**Fix:** A `tsvector` column with GIN index, `websearch_to_tsquery` with `ts_rank` and field weights, filtering, vendor join and pagination in one database function. Keep the response shape. Facts checked in the live database (S44): no `search_vector` column; the only text index is on `name` with the English dictionary; the index holds no full description, Incoterm, ships-to or seller country. The trigger `trigger_sync_product_to_index` must be extended too. Use a non-English-specific dictionary.
**Note (S45):** B30's `buildTextSearchFilter()` in `search.service.ts` is the interim safe text filter. Remove it when this replaces the text match.
**Priority:** High, launch blocker.

### B31. Payout routes need only a login, and take the destination from the request
**What:** `POST /api/v1/bitcoin/vendor-payout` and `/split-payout` use `requireAuth`, which accepts any valid token. They take the destination address (and, for split, the amounts) from the request body and check only that the order is `delivered` or `completed`. Neither service function checks that the caller is the seller or that the address belongs to the seller. Not tested. Sandbox and testnet today, so it matters before real funds.
**Where:** `src/api/routes/bitcoin.routes.ts` (lines 205 to 262, 290 to 345), `bitcoin.service.ts` (`executeVendorPayoutBTC`, `executeSplitPayoutBTC`).
**Fix:** Do not expose payout as a route. Run it inside the release step (B32), with the destination taken from the seller's and provider's stored payout details.
**Priority:** High, before any real funds.

### B32. Release, completion and dispute resolution move no money
**What:** `releaseEscrow`, `refundEscrow`, order completion and `executeResolution` only change statuses. Nothing calls `executeVendorPayout`, `executeSplitPayoutBTC` or a refund. Payout happens only if someone calls the routes in B31 by hand.
**Where:** `escrow.service.ts`, `order.routes.ts` (line 505), `dispute.service.ts` (`executeResolution`), `payment-router.service.ts`.
**Fix:** One release step: status change, then split payout, fees (B26, B28), ledger (D51). One refund step per rail. Partial refunds need split logic.
**Priority:** High. Related: B26, B28, B31.

### B33. Auto-release can pay the seller inside the dispute window
**What:** Release time is payment plus 7 days, and the only other condition is `delivered`. Delivered on day 6 means release on day 7, 24 hours into the 72-hour dispute window. The default escrow rules say a 7-day dispute window, the service hard-codes 72 hours, and governance's `update_dispute_window` is read by nothing.
**Where:** `escrow.service.ts` (lines 151 to 180, 206), `layer2-transaction/types.ts` (line 255), `dispute.service.ts` (line 41).
**Fix:** Release at the later of the hold time and delivery plus the dispute window. One dispute-window setting read by both.
**Priority:** Medium-High.

### B34. Disputes needing arbitration cannot be resolved, and the seller deadline is not enforced
**What:** `escalateToArbitration` sets status `arbitration`. `resolveDispute` is called only from auto-resolution, and no route exposes it, so an escalated dispute stays open with the escrow frozen. `vendor_response_due_at` is saved and never read, and no scheduler job checks it.
**Where:** `src/core/layer4-trust/dispute.service.ts`, `src/api/routes/dispute.routes.ts`, `src/api/scheduler.ts`.
**Fix:** An arbitrator route (operator in v1) and a job for the 48-hour deadline. Needs Pam's decisions in `docs/architecture/payments_and_fees.md`.
**Priority:** High.

### B35. Governance actions are records only, and votes are not cryptographically verified
**What:** An emergency pause sets `emergency_pause_enabled` and nothing reads it. Treasury withdrawal records an approved movement and makes no transaction. `update_escrow_duration` and `update_dispute_window` write settings nothing reads (see also B27, B33). A vote's `signature` is stored and never checked. A signer is any logged-in account on the council list, so "2 of 3" means two logged-in accounts.
**Where:** `src/core/layer6-governance/execution.service.ts` (lines 143 to 260), `proposal.service.ts` (`submitApproval`), `multisig.service.ts` (`verifySigner`), `src/api/routes/governance.routes.ts`.
**Fix:** Make each action change real behaviour: pause stops order creation, payouts and releases. Verify a signature per vote. Needed for the protocol freeze model.
**Priority:** Medium-High. High once real funds flow.
**Note (S44):** the council threshold stays 2 of 3, signers not yet named, number may grow later. Needed for D62. Until signers are named, Pam is the interim holder of the emergency pause (single point of control, accepted for now). The pause flag must also be read by the order and payout code, which it is not today.

### B37. One-sided ratings are never revealed
**What:** `autoRevealExpiredRatings` reveals a rating after 7 days when only one party has rated. Nothing calls it and no scheduler job runs it.
**Where:** `rating.service.ts` (line 202), `src/api/scheduler.ts`.
**Fix:** Add a scheduler job.
**Priority:** Medium.

---

## 🟡 Deferred or partial

### B38. `npm test`: the API health test cannot load without test environment variables
**What:** B30 (commit `6104ea4`) added a root `jest.config.js` (ts-jest, node, tests under `src`), so `npm test` now runs TypeScript tests. `src/api/__tests__/health.test.ts` fails to load: it imports the whole API, and the `Config` constructor validates required environment variables at import (`src/api/core/config.ts:60`, reached from `src/api/index.ts:15`). Before B30 no test under `src` ran at all.
**Where:** `src/api/__tests__/health.test.ts`, `src/api/core/config.ts`, `jest.config.js`.
**Fix:** Supply test-only environment values (a jest setup file or `.env.test` with fake values; never real keys), or stop the test importing the whole API. Decide which.
**Priority:** Low-Medium.

### B39. `getSuggestions` has no caller
**What:** `SearchService.getSuggestions` (autocomplete) is not called from any route or client. B30 hardened its text handling (same normalisation and LIKE escaping), but it remains unused.
**Where:** `src/core/layer1-catalog/search.service.ts` (line 176).
**Fix:** Wire it to a route with the search work (B29 and D54), or remove it.
**Priority:** Low.

### B40. `JwtPayload.type` uses the wrong vocabulary, one `tsc` error at the root
**What:** `JwtPayload.type` is `'user' | 'client' | 'service'`, but `catalog.routes.ts:305` compares `req.user?.type` with `'kyc'`, which is a `tsc` error and the only one at the root. Per the B30 review, tokens are signed with `type: identity.type` (`'kyc' | 'nostr' | 'anonymous'`), so it works at runtime and only the type is wrong. Not checked by us in the token-signing code.
**Where:** `src/api/core/auth.ts` (line 17), `src/api/routes/catalog.routes.ts` (line 305). Check every other use of `req.user?.type`.
**Fix:** Make the union say what tokens really carry. Confirm the signing code. Then check that nothing else relies on `'user' | 'client' | 'service'`.
**Priority:** Low-Medium.

### B42. `calculateAverageRating` counts only revealed ratings, so a new rating can write 0
**What:** `calculateAverageRating` (`rating.service.ts:301`) builds its average from `getRatingsForUser`, which filters `.not('revealed_at', 'is', null)`. A rating stays unrevealed until both parties rate or 7 days pass, so the rating just submitted is not counted, and a vendor with no revealed ratings has `metrics.average_rating = 0` written over whatever was there. Found while closing B36; not fixed there, because B36 was limited to the cap.
**Where:** `src/core/layer4-trust/rating.service.ts` (`calculateAverageRating`, `getRatingsForUser`).
**Fix:** Decide whether the average should include unrevealed ratings. If yes, read `ratings` directly instead of going through `getRatingsForUser`, which exists to hide unrevealed ratings from callers.
**Order:** decide together with B43. Which key the average lives under (`average_rating` or `averageRating`) depends on how Pam decides a rating should change reputation. Not urgent on its own.
**Deploy note:** B41 is fixed, so a rating now writes to a real row. For this item that means a vendor with no revealed ratings gets `metrics.average_rating = 0` written. Nothing reads that key (checked S44: the score formula, `VendorBadge` and the identity routes read the camelCase `averageRating`), so there is no visible effect today. The real effect is B43: the `averageRating` that the badge and the formula read is never updated by a rating.
**Priority:** Low-Medium.

### B43. The rating path writes `score` directly instead of going through the reputation formula
**What:** `updateReputationFromRating` adds `+1` (rating 4 or 5), `0` (rating 3) or `-2` (rating 1 or 2) to the stored score and writes it, instead of recording a reputation event and recalculating with `calculateReputationScore` (base 50, `+2` per completed transaction to a cap of 200, `averageRating` x 20, dispute penalties, then the identity multiplier). It also leaves `transactionsCompleted`, `totalRatings` and `onTimeDeliveryRate` untouched, all of which the formula reads.
**Would a later recalculation overwrite the rating deltas?** Yes, and it would drop the rating entirely rather than merge it. Recalculation happens only in `ReputationService.updateAfterTransaction`, `recordDispute` and `recordVerificationMilestone`; each computes `calculateReputationScore(metrics, identityType)` from scratch and writes the result through `saveReputation` (`reputation.service.ts:390`), replacing `score` and `metrics` wholesale. None of those three methods has a call site in `src/` today (checked S44: the only `ReputationService` method used from a route is `getReputation`, `identity.routes.ts:402` and `:493`), so today nothing recalculates and the delta is all a rating leaves. The moment one of them is wired up, every `+1` / `-2` the rating path wrote is discarded and replaced by formula output computed from metrics the rating path never updated.
**Does `average_rating` in metrics collide with the keys `reputation.service.ts` writes?** Not a collision: different keys, worse result. `ReputationMetrics` is camelCase (`averageRating`, `transactionsCompleted`, ...; `identity.service.ts:368` seeds a row in that shape), and the rating path writes a separate snake_case `metrics.average_rating`. `calculateReputationScore` reads `metrics.averageRating` (`types.ts:317`), so the key the rating path writes is never read by the formula: it is dead data, and the `averageRating` the formula would use stays where it was (0 for a new identity). Two averages now sit in the same `metrics` object and only one of them means anything to the score.
**Where:** `src/core/layer4-trust/rating.service.ts` (`updateReputationFromRating`), `src/core/layer0-identity/reputation.service.ts` (`updateAfterTransaction`, `saveReputation`), `src/core/layer0-identity/types.ts` (`calculateReputationScore`).
**Fix:** Have the rating path record a reputation event and recalculate, or move the whole thing into `ReputationService` and give that a call site. Settle the metrics key spelling in the same change so one average feeds the formula.
**Order:** third, after B42; doing it before the write reaches a row (B41, fixed S44) and before the average is settled (B42) proves nothing.
**Note (S44):** `VendorBadge` (`rangkai-marketplace/components/products/VendorBadge.tsx:69`) and `identity.routes.ts:416` show `metrics.averageRating`, which no rating updates. Decide this with B42. **Pam decides**: it changes how reputation is computed.
**Priority:** Medium-High.

### B44. The rating path changes a reputation row without updating `last_updated`
**What:** `updateReputationFromRating` writes `score` and `metrics` and leaves `last_updated` alone. The column exists (confirmed S44) and is set when the row is created (`identity.service.ts:380`, `last_updated: new Date()`), and `ReputationService.saveReputation` sets it on every recalculation (`reputation.service.ts:398`). So after a rating the score moves while the `lastUpdated` the API returns (`reputation.service.ts:417`) still reports the creation or last recalculation time. This only becomes visible now: until B41 was fixed the update reached no row (B41 fixed S44).
**Where:** `src/core/layer4-trust/rating.service.ts` (`updateReputationFromRating`).
**Fix:** Set `last_updated` in the same update, or confirm that a database trigger already does it (for example `moddatetime` on `reputations`) and close this as not a bug. Not checked: triggers are database state, and this branch had no live access.
**Priority:** Low. Found while fixing B41; reported, not fixed.

### B45. A reputation failure after a rating is saved returns an error but keeps the rating
**What:** `submitRating` stores the rating (the insert and update on `ratings`) and only then calls `updateReputationFromRating` (`rating.service.ts:120`). Since B41, that call throws when the reputation select or update fails with anything other than "no row". The route passes the error on (`rating.routes.ts:81`, `next(error)`), so the caller sees a failure, but the rating is already saved, and a retry is refused with "has already rated this order". The user is told it failed when it half worked.
**Where:** `src/core/layer4-trust/rating.service.ts` (`submitRating`, about lines 60 to 120), `src/api/routes/rating.routes.ts` (line 81).
**Fix:** Pam decides the behaviour. Options: catch and log the reputation failure and return the saved rating (reputation is retried later); make the two writes one unit (a database function); or make a retry harmless.
**Priority:** Low-Medium. Found while reviewing B41; reported, not fixed.

### D5. No HS code on products
**What:** Required for international shipping.
**Fix:** Add `hs_code: string` field. v1: free-text required for international products. v2: auto-suggest from product description.
**Priority:** Medium-High — required for international compliance.
**S43 note:** `products.hs_code` exists and the form has an optional free-text field (L12, S32). It is not required for international products, which is what this item asks for. See R6.

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

### D10. Lightning untested
**What:** Lightning is in the architecture but no flow has been built or tested.
**Update S44:** Lightning goes through BTCPay and needs a node. Parked until Pam's hardware allows.
**Priority:** Low until BTC on-chain is solid. See R9.

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

### D15. Trust and compliance: later pieces
**What:** The core is done (S37): sanctions endpoints, seeded sanctions list, automatic screening at KYC registration (full text in the archive). Still open: **D15d** operator dashboard for flagged identities (post-v1), **D15e** compliance events for real-time wiring (v1.5), **D15f** public sanctions-list transparency page (v1.5).
**Where:** `src/api/routes/trust.routes.ts`, `src/core/layer4-trust/compliance.service.ts`, `docs/architecture/layers.md` (Layer 4)
**Priority:** Low until v1 ships.

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

### D20. Nostr data load management
**What:** Nostr clients sync large amounts of historical data by default. Pam: *"nostr has large data all the time. even when i run primal my laptop is noisy."*
**Fix:** Scoped subscriptions only (never the general firehose), filtered relays, server-side aggregation, lightweight kind definitions for any Rangkai-specific Nostr usage.
**Priority:** Cross-cutting design concern. Must inform D16 (search federation) and v2 messaging decisions.

### D23. Seller notification: firm quote expired → auto-converted to estimated, seller bears price risk
**What:** When an accepted firm quote's `valid_until` passes, L14 auto-relabels it "estimated" for buyer display (computed at query time from `valid_until`, no schema change). Per Pam (S33): the seller should also get a notice at that moment — both that the conversion happened, and that they now bear the gap between the stale number shown to the buyer and the real logistics cost at fulfillment. A note may be gentler/sufficient rather than a full notification, per Pam's own framing.
**Where:** TBD — no notification system (email, in-app, or otherwise) has surfaced anywhere in the codebase so far.
**Fix:** Depends on whether a notification system already exists. **Open question for Pam: does one exist that I haven't seen yet?** If not, this needs its own minimal system (even just a `notifications` table + unread badge) before this specific reminder can be built.
**Priority:** Low-Medium. Doesn't block L14's display logic — the risk sits quietly on the seller's side either way — but worth not leaving open long, it's a trust issue.

### D26. Backend package's `tsc` output lands at repo root, not inside `packages/`
**What:** `packages/`'s `tsconfig.json` has `outDir` configured such that `npm run build` writes compiled output to `C:\Users\chris\marketplace-protocol\dist\` (repo root) rather than `packages/dist/`. Only noticed S33 because this was the first time that build succeeded all session (see B18) — first time `tsc` actually wrote anything. Purely a build-output location surprise, not a functional bug.
**Where:** `packages/tsconfig.json` (`outDir` / `rootDir` settings — not yet viewed to confirm the exact misconfiguration).
**Fix:** Set `outDir` to a path scoped inside `packages/` (e.g. `packages/dist`) so build artifacts don't leak into the repo root, where they could accidentally get committed or confused with `packages/sdk`'s separate `dist/`.
**Priority:** Low. Cosmetic/organizational, not causing any functional issue currently.

### D28. `ownLogistics` is one checkbox for the whole cart — breaks with 2+ vendors
**What:** `checkout/page.tsx`'s "I'll arrange my own logistics" checkbox is single, cart-wide state. Checkout creates one order per vendor, so a buyer with 2+ vendors in cart has no way to choose seller-shipping for one and own-logistics for another — it's all-or-nothing across every order the checkout submits.
**Where:** `rangkai-marketplace/app/checkout/page.tsx` (single `ownLogistics` state), `lib/api/cart.ts` (`createOrdersFromCart` passes the same `ownLogistics` value to every vendor's order).
**Fix:** Per-vendor `ownLogistics` state (e.g. a `Record<vendorDid, boolean>` instead of a single boolean), checkbox rendered per vendor group in checkout, passed through individually in `createOrderFromCart()` per vendor.
**Note (S44):** the multi-vendor logistics rule is in `logistics.md`: separate by default; one buyer may ask a provider to consolidate orders at the same port (R2).
**Priority:** Low today (all test data is single-vendor), but will silently misbehave the moment real multi-vendor carts are tested — worth fixing before then.

### D30. Cart items carry a hardcoded "Vendor" placeholder name, never populated
**What:** `addToCart()` in `lib/stores/cart.ts` sets `vendorName: 'Vendor'` literally, with a comment noting it was meant to be populated from real vendor data later — that follow-up never happened. Surfaced clearly S33 during multi-vendor cart testing: both vendors' cart/checkout lines read identically as "Vendor," making them indistinguishable without inspecting DIDs directly.
**Where:** `rangkai-marketplace/lib/stores/cart.ts` `addToCart()`.
**Fix:** Blocked on B17 (`sdk.identity.getIdentity` doesn't exist) — real fix is `addToCart()` fetching the vendor's actual display name via identity lookup when an item is added, which needs B17 resolved first. Short-term workaround shipped S33: fall back to a DID-suffix label when `vendorName === 'Vendor'`, so vendors are at least visually distinguishable in the meantime.
**Priority:** Medium — cosmetic today with 2 test vendors, but genuinely confusing at any real scale.

### D32. `keys/` folder at repo root contains generated PEM key pair from early identity setup
**What:** `C:\Users\chris\marketplace-protocol\keys\` contains `private.pem` and `public.pem` generated 19/10/2025. Not committed (correctly covered by `keys/` and `*.pem` in `.gitignore`), but the folder is sitting in the working tree with no cleanup plan.
**Where:** `C:\Users\chris\marketplace-protocol\keys\`
**Fix:** Confirm these keys are no longer needed (check whether any `.env` or service references them). If unused, delete the folder. If still needed, document what they're for in a comment in `.env.example`.
**Priority:** Low. Not a security risk (gitignored), but mystery key material in a repo root is worth understanding.

### D33. `dist/` folder at repo root is stale backend build output
**What:** `C:\Users\chris\marketplace-protocol\dist\` appeared after B18 was fixed in S33 and the backend `packages/` build ran successfully for the first time. This is the D26 symptom — `packages/tsconfig.json` writes output to repo root instead of inside `packages/`. Correctly covered by `dist/` in `.gitignore`, so it won't be committed.
**Where:** `C:\Users\chris\marketplace-protocol\dist\`, `packages/tsconfig.json`.
**Fix:** Fix `outDir` in `packages/tsconfig.json` to write inside `packages/` (see D26). Then delete the root `dist/` folder. Safe to delete now — it's just compiled output, always regenerable with `npm run build`.
**Priority:** Low. Cosmetic, not causing any functional issue. Bundle with D26 when that gets scheduled.

### D34. Opportunities page "Submit quote" button resets on refresh
**What:** The submitted state is local React state, so after a page refresh a provider can submit again. The backend blocks a duplicate while the earlier quote is still pending, but not once it has been accepted or rejected. (The other half of D34, wrong provider loaded, was fixed S36.)
**Where:** `logistics-marketplace/app/opportunities/page.tsx`, `OpportunityCard`.
**Fix:** On load, fetch the provider's pending quotes (`GET /logistics/providers/:id/quotes?status=pending`) and set `quoted = true` for any card whose `product_id` matches.
**Priority:** Low.

### D35. Abandoned checkout leaves open `quote_requests` rows behind
**What:** (The wrong-price half was fixed S36 with the `context` column.) When a buyer abandons checkout, by removing the item, navigating away or never ordering, their open `quote_requests` row is never closed. On the next visit polling finds the old accepted quote and jumps straight to "Shipping confirmed", possibly with stale pricing.
**Where:** checkout page, cart removal, logout, order placement; `quote_requests.status`.
**Fix:** Set `status = 'closed'` on the buyer's open `quote_requests` for a product when its last item leaves the cart, when an order is placed, and at logout. The column already allows `closed` (schema L3: open, closed, expired).
**Priority:** Medium. Related: B25, D49.

### D38. Supabase SQL editor has accumulated ~116 untitled test queries
**What:** The SQL editor has 116 private untitled queries from testing across
sessions. Most are one-off test queries with no lasting value. Hard to find
useful reference queries among the noise.
**Where:** Supabase dashboard SQL editor, private queries.
**Fix:** Review each query, delete pure test queries (one-off selects, data
cleanup runs). Keep only queries that are genuinely reusable (schema
inspection, data integrity checks, cleanup scripts). The cleanup SQLs from
each session's handover are the ones worth keeping — label them by session.
**Priority:** Low. Cosmetic, doesn't affect anything functional.

### D39. Service-layer errors surface as 500 INTERNAL_ERROR instead of 4xx
**What:** Plain `Error` throws from service classes (e.g. `quote.service.ts` "Provider already has a pending quote", "This product already has a seller estimate") reach the API error handler untyped and return as HTTP 500 `INTERNAL_ERROR`. These are client errors (conflict/validation) and should be 4xx with proper codes. Systemic across services — routes that throw `ApiError` directly are fine; only service-layer throws are affected. Noticed S38 during D24 testing.
**Where:** All `src/core/layer*/**.service.ts` throw sites; `src/api/core/errors.ts` / error-handler middleware.
**Fix:** Either typed error classes in the service layer (e.g. `ConflictError`, `ValidationError` mapped to 409/400) or a mapping layer in the error handler. Decide pattern once, apply incrementally.
**Priority:** Low-Medium. Cosmetic for dev, but misleading status codes are real API-quality debt for any future marketplace integrating against the protocol.

### D40. `acceptQuote()` infers context from product-level RFQ history, misclassifying seller standing accepts
**What:** `finalContext` in `acceptQuote()` (and the same inference in its guard and reject-competing-quotes logic) checks whether *any* `quote_requests` row exists for the product from a non-vendor requester — not whether *this specific quote* was submitted in response to an RFQ. Once any buyer has ever RFQ'd a product, every subsequent accept on it is stamped `buyer_rfq`, including a seller accepting a pool standing quote. Confirmed live S38: "custom"'s canonical BitHaul standing quote (`8a54f596`) had been misfiled as `buyer_rfq`, hiding the shipping line from the product page. Repaired by hand; the S37 handover's claim that it was `seller_standing` reflected design intent, not DB state.
**Where:** `src/core/layer3-logistics/quote.service.ts` `acceptQuote()` (three inference sites: guard, finalContext, reject-competing).
**Fix:** Stop inferring. Link quotes to their originating request: add nullable `quote_request_id` to `shipping_quotes`, set at submit time when the quote answers an RFQ. Context at accept time = `buyer_rfq` iff `quote_request_id` points to a buyer-created request, else `seller_standing`. Schema change — batch with next migration round.
**Priority:** Medium-High. Same class of bug as D35 and will keep silently mislabeling quotes (and hiding standing-quote display) any time a product has mixed RFQ history — which is every real product eventually.
**S43 note:** D49 builds on this. `quote_request_id` fixes which RFQ a quote answers; D49 adds the destination it covers.

### D41. Estimate-priced orders: no confirmation step, final payment not updated by a later real quote
**What:** A buyer can check out and pay against a seller estimate (L15a wires the estimated price into the order total). No flow exists for the buyer to request a real quote on an estimate-priced order, for the seller/pool to produce one, or for the final payment to be updated to the real amount — and the product page's "seller will confirm before fulfillment" line refers to a confirmation step that doesn't exist in code. Who bears an estimate-vs-actual difference is undefined behaviour. Design intent (Pam, S39): buyer requests the real shipment quote, seller produces it, and it overwrites the final payment.
**Where:** checkout/order flow (`order.service.ts`, `checkout/page.tsx`), quote flow (`quote.service.ts`), product page copy (`app/products/[id]/page.tsx`).
**Fix:** Design session needed — order state for "paid on estimate, awaiting firm quote", the quote-request trigger, and the payment adjustment mechanics (escrow implications included).
**Priority:** Medium-High. Real-money correctness gap; becomes live the first time a real buyer pays an estimated price.

### D42. Buyer reminder to request a real quote when ordering against a seller estimate
**What:** When a buyer orders (or is about to order) against a seller estimate, they should be nudged to request an actual quote from the pool. Transport idea (Pam, S39): Nostr messaging. Depends on D41's flow existing (something to nudge *into*) and relates to D23 (no notification system exists yet — same missing plumbing).
**Where:** TBD — no notification/messaging layer in the codebase yet (see D23).
**Fix:** After D41 defines the request-real-quote flow, add the nudge at order placement (and possibly in the cart when an estimated price is shown). Decide channel: in-app note vs Nostr DM vs both.
**Priority:** Medium. Pairs with D41; don't build separately.

### D44. Seller-side pool control — browse providers, direct-request, opt out of broadcast
**What:** Auto-broadcast on publish is currently the only route from a seller to the logistics pool. A seller has no way to (a) decline to broadcast at all, (b) browse the pool and choose, or (c) approach a specific provider directly — including one they already work with who has signed up.

Decision taken S40, recorded so it is not re-litigated: **auto-broadcast stays the default**, because logistics deserves the chance to pitch and the seller has final say on who ships. But the seller must have all three controls above. The "for now" in "keep broadcast as default for now" is doing real work — the default should be revisited once the pool has real depth.

Framing correction from the same discussion: auto-fire was already the status quo (S39's ProductForm fired it on every DAP/DDP publish), so "manual-only" would have meant *removing* working L12 behaviour, not declining to add something. Also revised: the empty-pool argument for a manual button is weak — an RFQ into an empty pool costs nothing, it just sits open. The button's real value is control and sequencing: a seller who wants real quotes *before* committing to a price gets to ask without publishing first. That justification survives once the pool fills.
**Where:** `rangkai-marketplace/components/vendor/ProductForm.tsx` (opt-out checkbox, manual request button), new seller-facing pool browse page, `GET /api/v1/logistics/providers` (exists, returns routes/modes/incoterms/door flags/weight bounds/service_regions — everything a filter needs), `quote_requests.target_provider_id` (exists, already renders an amber "direct request" badge on the opportunities page from L15d).
**Fix:** Opt-out as an unpersisted create-mode checkbox is ~10 lines; persisting the preference across edits needs a column on `products` and a migration. Browse is mostly a page plus a button setting `target_provider_id` — **but it must not be built until B22 is resolved**, or the browsable list and the matched list will be built from different vocabularies.
**Priority:** Medium. Blocked on B22 for the browse half.

### D45. Quotes do not snapshot the declared basis they were quoted against
**What:** Carriers re-measure at the sort hub or CFS, not at pickup, and issue post-shipment adjustments where declared and measured differ ("dimensional adjustment", "reweigh charge"). Tolerances exist but are carrier-specific and not consistently published. Accurate declarations mean nothing fires — exposure is proportional to how sloppy the declaration is.

Today a quote stores a price with no record of the weight, dimensions, quantity or chargeable weight it was calculated from, so when an adjustment lands there is no way to attribute the variance.
**Where:** `shipping_quotes` / quote creation path.
**Fix:** Snapshot the declared basis (weight, dims, MOQ, chargeable weight) onto the quote at creation. Same shape as D24's rule that a seller bears the difference when real cost exceeds their estimate.
**Priority:** Medium. Becomes important the first time a real shipment is re-measured.

### D46. RFQ payload is insufficient for a provider to actually quote a shipment
**What:** The broadcast carries `product_id`, `origin_country`, `destination_country` (null for global broadcast), `weight_kg`, `dimensions_cm`, `incoterm`, `hs_code`, `insurance_required`, `target_provider_id`. Missing, in priority order:

1. **MOQ / quantity.** Logistics quotes a shipment, not a unit. `formData.pricing.moq` already exists in the form and is simply not forwarded. A 0.7 kg product at MOQ 35 is a 24.5 kg shipment — different mode, different rate per kg, possibly a different provider.
2. **Carton spec and chargeable weight.** Chargeable weight = max(actual, volumetric). Volumetric = (L×W×H cm) ÷ divisor: 5000 courier express, 6000 air freight (IATA), sea LCL prices 1 CBM ≈ 1000 kg. Worked on the real product row (0.7 kg, 30×20×20 cm, MOQ 35): actual 24.5 kg, volume 0.42 CBM, volumetric at /5000 = **84 kg** — 3.4× actual. We currently broadcast the 0.7 and nothing else, i.e. the one number that most understates the job.
3. **Origin city.** Country alone cannot price door pickup — segment A is unquotable.
4. **Declared value.** Drives insurance and customs.
5. **Plain-language category** (fragile, perishable, battery, hazmat). HS technically encodes it, but no provider wants to decode HS to discover they cannot legally carry the goods.

**Explicitly do not build a packing optimiser.** Bin-packing is genuinely hard and a confident wrong answer is worse than none — the seller packs to our plan, the provider re-measures at the depot, the quote breaks. Instead collect the carton spec every manufacturer with an MOQ already has (units per carton, carton dimensions, carton gross weight) and compute cartons, CBM, actual, volumetric and chargeable weight from it. Arithmetic, not optimisation.
**Where:** `quote_requests` (needs `moq` and carton columns), `POST /logistics/quote-requests`, SDK `requestQuote` type, `ProductForm.tsx` broadcast payload, provider opportunities UI.
**Fix:** MOQ first as a vertical slice — column, route, SDK type, then one line in ProductForm. Note the client edit will not compile until the SDK type lands. Carton spec is a larger form change.
**Priority:** High for MOQ. Providers are currently quoting blind on the single most important variable.

### D47. Logistics capability model gaps: no warehousing, no `updated_at`, and Incoterm asked in the wrong language
**What:** Three small things on `logistics_providers`:
- No warehousing / bonded-storage capability field. Pam's land/port/air/storage distinction is otherwise well covered by `modes`, `door_pickup`, `door_delivery` and `routes`, but storage has no representation.
- No `updated_at`, so there is no way to tell when capability data was last touched — which made it impossible to distinguish "stale row" from "registration never collected this" when diagnosing B21.
- `incoterms_supported` is correct as a capability field and should not be removed. Incoterm defines where the logistics job starts and stops and who clears customs: DDP means the carrier clears import customs and fronts duty; DAP means they stop at the door with duty unpaid; FOB means origin-side only. Same two cities, three different jobs, three prices — and DDP requires an importer-of-record capability many carriers lack in the destination country. What is wrong is the *presentation*: it should be asked in operator language ("can you clear import customs and advance duty?") not as a bare Incoterm multi-select. Fold into B21's registration rework.

Also noted, cosmetic: the codebase uses `logistics_providers`, `provider_id`, `ProviderContext` where principle 7 says "logistics", not "provider". Same class as the `/app/vendor/...` migration already flagged under The Four Types of Users.
**Where:** `logistics_providers` schema, `logistics-marketplace/app/auth/register/page.tsx`.
**Priority:** Low-Medium.

### D48. SDK discards response envelope metadata, so the protocol cannot tell a marketplace anything about a request
**What:** `HttpClient.request()` ends with `return (data.data !== undefined ? data.data : data) as T`. Every endpoint's envelope is unwrapped to its `data` field and everything else is thrown away. A marketplace can receive rows; it cannot receive facts *about* the call.

Surfaced by D43, which returns `reused: true|false` alongside `data` to say whether an RFQ was created or refreshed. Visible to curl, invisible to any SDK consumer. Harmless today because the `ProductForm` call site discards the return value entirely — but D44's manual broadcast button needs exactly this to say "we refreshed your existing request" instead of "sent", and the alternative is folding meta into the row shape, which would leave consumers unable to distinguish row fields from metadata.
**Where:** `packages/sdk/src/client.ts`, `request()` return.
**Fix:** Return the envelope, or add a `requestWithMeta()` that does, so existing call sites keep working. Whichever way, it is a shared SDK change and needs a rebuild plus a check of every consuming call site — not a drive-by.
**Priority:** Medium. Blocks D44's button copy; nothing broken until then.

### D49. Quotes carry no destination, and the buyer pending list is scoped by product only
**What:** `shipping_quotes` has no destination or origin column (checked S43; columns: id, order_id, provider_id, method, estimated_days, insurance_included, price_sats, price_fiat, currency, status, valid_until, created_at, product_id, quote_type, context, is_seller_estimate). Per Pam, a logistics quote only makes sense for a destination. Two consequences:
1. `GET /quote-requests/buyer/pending` fetches pending quotes with `.in('product_id', ...)` and nothing else (~1067), so a buyer can be shown quotes written for another buyer's RFQ or for a different destination. This is from reading the code and has not been reproduced.
2. The accepted standing quote (L14) is shown to every buyer, whatever their country.
D40 (link a quote to the RFQ it answers with `quote_request_id`) fixes the first consequence. D49 adds the destination.
**Where:** `shipping_quotes` schema; `src/api/routes/logistics.routes.ts` (~1061–1075 pending, and the `/quotes` submit schema); `quote.service.ts`; product-page quote display (`getAcceptedQuoteForProduct`).
**Fix:** Reproduce first with two buyers on one product. Then add `destination_country` to quotes (required on submit, or inherited from the RFQ it answers), scope the buyer pending query by RFQ (D40), and show a standing quote only to buyers whose country it covers. Seller-set destination lists (R25) depend on this.
**Priority:** High.

### D50. Marketplace registry
**What:** No table records each marketplace with its fee, cap and free-period end date. Needed for B28. Proposed minimum registry fields are in `docs/architecture/actors_and_trust.md`, "Registering a marketplace" (public registry only; legal documents stay with the entrepreneur). Decided (Pam, S44, 20 Nov): public track record only, no bond; anonymous and Nostr operators may open marketplaces, shown by operator type; the registry holds no legal details.
**Fix:** A registry table and API. Decided (Pam, S44): default marketplace fee 2%, limit stays 0 to 5% as in code. Proposal, not agreed: free for the first few months, as a per-marketplace end date. The 8% cap idea is withdrawn.
**Priority:** High.

### D51. Fee ledger and live protocol statistics
**What:** Protocol fee income is not recorded. On Bitcoin it stays in the escrow address. Decision (S44): track income, and how many orders, sellers, buyers and marketplaces the protocol serves, in real time.
**Where:** `bitcoin.service.ts`, new ledger table, existing WebSocket server on `/ws`.
**Fix:** A ledger row for every fee taken (protocol and marketplace, per order, per rail). Live counts pushed over the WebSocket. Each marketplace gets the same live view of its own income and orders (Pam, S44). Sweep fee income out of escrow addresses.
**Priority:** High.

### D52. Search: "ships to" country and Incoterm filter
**What:** Only origin country can be filtered. No filter by delivery country or Incoterm.
**Where:** `search.service.ts` (line 227), `product_index`.
**Priority:** High, part of the launch search.

### D53. Stripe Connect not set up, so card payouts are not live
**What:** The adapter's transfer uses the seller's DID where a Stripe Connect account ID belongs. Failures fall back to a manual payout flag. Also check whether Stripe offers Cash App Pay on the account.
**Where:** `stripe.adapter.ts` (lines 139 to 213).
**Priority:** Medium-High.

### D54. Search: later steps
**What:** Typo tolerance (`pg_trgm`). Multilingual or semantic matching, possibly Supabase `pgvector` with an open-source multilingual model, after a short evaluation of free options. Wire in the Redis cache (`search-cache.service.ts` is written, nothing imports it) if load needs it.
**Priority:** Medium. Real cross-deployment federation stays under D16.

### D55. Anonymous users are not blocked from the logistics pool, and no prohibited-goods list exists
**What:** Rules (S44): logistics is KYC only, and anonymous users arrange their own. Anonymous users follow a published list of dos and don'ts. The code enforces neither.
**Where:** `src/core/layer3-logistics`, `src/api/routes/logistics.routes.ts`, `layer0-identity`.
**Fix:** Check identity type at pool entry. Publish the list and show it at sign-up.
**Priority:** Medium-High.

### D56. A buyer cannot dispute an order that never arrives
**What:** `openDispute` requires status `delivered`. The state machine allows disputes from `confirmed`, `shipped` and others. Non-receipt disputes are therefore only possible on orders marked delivered.
**Where:** `dispute.service.ts` (line 34), `VALID_STATE_TRANSITIONS`.
**Fix:** Pam to decide the pre-delivery path and the window after delivery.
**Priority:** Medium-High.

### D57. Order status changes are logged as "system", not the person
**What:** `updateStatus` always records `changedBy: 'system'` (the code comment says it should be the user's DID).
**Where:** `order.service.ts` (line 214).
**Fix:** Pass the caller's DID through. Matters for dispute evidence.
**Priority:** Medium.

### D58. Identity has drifted from Principle 3
**What:** `operations.md` Principle 3 says identity is cryptographic (secp256k1) and the protocol never holds passwords. The code stores a bcrypt hash of each KYC user's password, identities are UUID-based DIDs, and a Nostr identity cannot authenticate with its key. KYC identities also store personal data in the protocol database (business name, registration number, owner name, address, phone, email, tax ID, document references), which conflicts with "the protocol never holds KYC documents" and with the position that courts deal with the marketplace.
**Where:** `layer0-identity/identity.service.ts` (lines 45 to 70, 235), `src/api/routes/identity.routes.ts`.
**Decision (Pam, S44):** the protocol should not store KYC personal data or password hashes. This is what the Session 28 design intended (marketplace stores the hash and verified business info and calls the protocol with the DID); the code put it in the protocol as a v1 shortcut because there is one marketplace.
**Fix:** The marketplace verifies the password and its own KYC, then signs a short attestation or token. The protocol stores the DID, identity type, public key and a signed "verified by marketplace X" flag. Remove `password_hash` and the KYC personal fields from `identities` (migrate the existing rows to the marketplace). Login for Nostr and anonymous users by key signature (R26). Until then v1 keeps the shortcut, documented. Provider business profiles (address, contacts, insurance) stay, because quotes need them.
**Before v1:** Pam, S44 (20 Nov): the password and KYC storage in the protocol database is a shortcut and must be corrected before v1. A v1 release is blocked until this is done.
**Priority:** Medium, and required before v1.

### D59. KYC verification is a stub
**What:** `verification.service.ts` is empty. `POST /identity/:did/verify` returns "initiated" and changes nothing. Marketplaces have no way to mark an identity verified, though they do KYC under their own country's rules.
**Where:** `layer0-identity/verification.service.ts`, `src/api/routes/identity.routes.ts` (line 433).
**Fix:** An endpoint a marketplace calls to set a verification status and level. Decided (Pam, S44, 20 Nov): until there are about five marketplaces, the people running the protocol check each marketplace owner by hand (onboard, verify, mark verified). Signed attestations between established marketplaces can take over after that.
**Priority:** Medium-High.

### D60. Rebuild disputes to the confirmed model
**What:** Build the dispute model in `docs/architecture/payments_and_fees.md` (confirmed S44): a closed list of grounds (not shipped, not delivered, not as agreed, wrong quantity, damaged in transit); a seller-chosen window of 7, 14 or 30 days after delivery (default 7) saved on the order at checkout; objective grounds decided automatically from tracking; subjective grounds ruled by the marketplace; a 5-day seller response time; a marketplace may not rule on its own orders; each ruling saved with its reason; automatic payout (split, fees taken) after a 24-hour hold (a setting); a public ruling log and a track record per marketplace.
**Where:** `src/core/layer4-trust/dispute.service.ts`, `src/api/routes/dispute.routes.ts`, `escrow.service.ts`, `layer2-transaction/types.ts`, `src/api/scheduler.ts`.
**Fix:** In stages after B31 to B34, which it builds on. It includes D56 (disputes before delivery for non-performance). Also decided (S44): rulings that are large (order of USD 5,000 or more, a governance setting) or overridden by the protocol wait 24 hours before payout, smaller ones release at once; the grace period for "not shipped" and "not delivered" is automatic 3 days, and the seller can request an extension that the buyer must approve extensions are capped at 30 days in total. Anonymous parties: automatic rules only, no person rules. Long-term aim: 99% of disputes automatic, with rules extended from recorded rulings and changed only through governance.
**Priority:** High.

### D61. Sample approval record linked to bulk orders
**What:** `OrderType` has `sample` and products have a sample option, but nothing links an approved sample to a later bulk order. Decision (S44): keep a record of the approved sample (photos, specification, date) as the benchmark for "not as agreed" disputes.
**Where:** `layer2-transaction/types.ts` (`OrderType`), `layer1-catalog/types.ts` (sample pricing), order and dispute services.
**Priority:** Medium-High. Pam to decide whether v1 or later.

### D62. Freeze model
**What:** Funds can be frozen by the dispute itself (automatic), by a marketplace on its own orders (reason recorded, time-limited), and by the protocol, which may also override a marketplace. The protocol may act only for five justifications: sanctions match, payment fraud, technical emergency (council pause), a marketplace that has not ruled within about 30 days, and a ruling that breaks the rules. Court orders are deliberately not a justification (Pam, S44). A freeze never moves money to the protocol or a third party. Every freeze goes in a public log.
**Where:** `escrow.service.ts`, `dispute.service.ts`, `layer6-governance`, `layer4-trust/compliance.service.ts`.
**Fix:** Justifications 1, 2, 4 and 5 must be automatic rules (the protocol has no people behind it). Needs B35 first.
**Priority:** Medium-High.

### D63. Seller-set advance (deposit)
**What:** A seller-set advance of up to about 30%, released when the seller confirms the order, and only for sellers above a reputation threshold. Confirmed S44 as later, and kept simple.
**Fix:** Needs B42 and B43 first, because the threshold uses the reputation score and the rating path can still write the wrong value: it can overwrite the average with 0 (B42) and it bypasses the formula (B43). B41 (the write reaching no row) is fixed in S44, so the write does land now. Order: B42, then B43.
**Priority:** Low. Later.

### D64. Product visibility states differ from the spec
**What:** The Layer 1 spec has four states (public, restricted, private, paused). The code has `ProductVisibility = 'public' | 'private' | 'unlisted'`, and the index trigger copies only `public` products. Decide the states, then match code, trigger and docs.
**Where:** `layer1-catalog/types.ts`, trigger `trigger_sync_product_to_index`.
**Priority:** Low-Medium.

### D65. Reference client: clean-up and marketplace-entrepreneur tools
**What:** `docs/architecture/ref_client.md` lists the gaps. Marketplace entrepreneurs have no screens for dispute rulings, fee income or categories. The client has dead files (`bitcoin-payment-route.ts`, `bitcoin-status-route.ts`), two API URL variables (`NEXT_PUBLIC_API_URL` and `NEXT_PUBLIC_PROTOCOL_URL`), and a Supabase key in `.env.local.example` that a marketplace should not need. Sign-up must be simple, phone-first and light (Pam, S44).
**Where:** `rangkai-marketplace/app/api/orders/[id]/`, `.env.local.example`, `app/auth/register/page.tsx`.
**Fix:** Remove the dead files, use one variable, simplify sign-up, then add the entrepreneur screens after D50, D51 and D60.
**Priority:** Medium.

---

## 🟢 Roadmap, not v1

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
**S40 note:** HS entry is currently unassisted free text on the product form and optional, so the two most recent broadcasts carry `hs_code: null` while older ones carry `6403.99`. Providers are receiving RFQs with no customs classification at all. Pam flagged customs as a genuine pain point for both sides. Interim step short of the ML/rule-based auto-suggest: a category-driven shortlist (footwear → 6403.x) with the full code editable.

### R9. Lightning Network as a payment rail
**What:** BTC on-chain must be solid first (confirmed S29). Lightning solves on-chain's two problems for Rangkai — slow confirmations, high fees on small transactions.

**Original framing (superseded — see below):** Hardware-dependent, requires Pi 4/5 + 1TB SSD + Umbrel/Start9, ~USD 150-220. This was the consumer self-hosted-node framing and isn't the right shape for a hosted protocol backend.

**Researched S35 — LDK (Lightning Dev Kit):** Rust-based modular Lightning library (Rust/Swift/Java-Kotlin/JS-TS-WASM bindings), maintained by the Lightning Dev Kit org (Spiral/Block). Reportedly carries ~25% of Lightning Network volume as of mid-2026 (Cash App, Lightspark, Bitkit, Mutiny, Alby Hub). Not a full node like LND/Core Lightning — you own persistence, chain-data source, and key management; LDK handles the protocol state machine, routing, and on-chain punishment logic correctly underneath.

**Relevant new component — LDK Server:** headless Lightning node daemon (built on LDK-Node + a BDK on-chain wallet) exposing a gRPC API, announced by Spiral at Bitcoin 2026. Designed to run in a containerized backend environment, not a dedicated home appliance — a better architectural fit for Rangkai's hosted Node/TS stack than the Pi/Umbrel plan, since the Node backend could call it via gRPC without embedding Rust directly. **Caveat, straight from the project's own repo:** "APIs are under development, expect breaking changes, not tested for production use" — not something to build against yet.

**Relation to R11:** Lightspark (already under consideration for R11, confirmed Malaysia-viable) is itself built on LDK. So the real decision isn't "LDK vs Lightspark" — it's sovereignty vs convenience at the same architectural layer: Lightspark = managed service, less engineering, vendor dependency; self-run LDK Server = full control, more engineering, fits the "protocol never wants to be the government's chopping board" privacy stance more literally, since no third party ever sees routing.

**Fix / next step:** No action needed now — still not blocking v1. When R9 is actually scheduled, check LDK Server's production-readiness status first; if still pre-production, either wait or fall back to the managed-Lightspark path under R11 rather than the original Pi/Umbrel hardware plan.

**Priority:** v1.5/v2, dependent on B1 shipping first (unchanged). Re-evaluate LDK Server maturity when scheduled — don't build against it today.

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

### R18. Naming/branding decision: rangkai.store
**What:** Pam owns `rangkai.store`. Four options: (A) protocol=Rangkai + marketplace=Rangkai, rangkai.store = marketplace; (B) marketplace gets a Malay name (Lapak/Pasar/etc.), rangkai.store = protocol docs; (C) subdomains; (D) Bitcoin-themed protocol rename (Aksara, Lintas).
**Fix:** Pam's call. Not blocking technical work. Must resolve before any external launch or public announcement.
**Priority:** Pre-launch only.

### R19. UX channel decision per user type
**What:** Web, native app, PWA, or mix. Marketplace entrepreneurs → desktop web. Buyers → web + PWA. Sellers → PWA (installable, offline). Logistics → native mobile (driver/courier UX).
**Priority:** v2/v3 design consideration. Not blocking v1.

### R21. Two-door shipping-price UI (what is left of the publish gate)
**What:** The incoterm-aware publish gate is done (S39): a KYC seller selling DAP/DDP cannot activate a product without an accepted `seller_standing` quote; EXW/FOB and anonymous sellers are exempt; `require_logistics_quote` is derived from the incoterm. Left to build: an explicit "Request quotes from the logistics pool" button next to the estimate fields; both doors available when creating and when editing a draft (the estimate field is create-only today, which dead-ends a returning drafter); an interim estimate while waiting on pool quotes; gate-message copy that points to both doors; the DAP dropdown note "(most common, what buyers usually expect)"; shorter estimate copy. Drafted S39, never applied or tested. Auto-broadcast stays the default (D44).
**Where:** `rangkai-marketplace/components/vendor/ProductForm.tsx`
**Priority:** Medium. Build order against B21 and D46 is Pam's call.

### R22. Buyer product-detail page "Add to Cart" button is a non-functional placeholder
**What:** Hardcoded `Add to Cart (Coming Soon)` with no click handler on `app/products/[id]/page.tsx`. The listing page's Add to Cart buttons are a separate, working code path. Surfaced S33 during L14 testing — not caused by tonight's work.
**Where:** `rangkai-marketplace/app/products/[id]/page.tsx`
**Fix:** TBD whether L15 (checkout) implicitly covers this or it needs its own pass — check when L15 is scoped.
**Priority:** Not yet triaged — revisit at L15 scoping.

### R23. Consolidated order-level RFQ for multi-product carts (bulk logistics quote)
**What:** When a buyer's cart has 2+ products from the same vendor, each with its own accepted product-level quote (summed as "estimated" per L15 v1), the buyer can opt to request one consolidated quote for the whole bundle instead. Deliberately not a centralized consolidation-warehouse model — stays inside the decentralized logistics pool, broadcasting a bundled RFQ the same way L12 broadcasts single-product RFQs, just scoped to multiple products/one order.

**Algorithm (Pam, S33):**
1. Adding products to cart never silently invalidates an already-accepted per-product quote — it stays intact and usable as-is.
2. At 2+ products from one vendor, show a note offering to request a bulk quote. Opt-in only.
3. Once requested, the existing individual quote(s) are **blocked from completing purchase** — this is a one-way, deliberate action with a real consequence, not a free preview. Checkout stays blocked until a bulk quote comes back and is accepted.
4. UI copy must make the lockout consequence clear before the buyer confirms the request, so no one gets stuck waiting by accident.

**Where:** New backend — order/cart-level RFQ broadcast (variant of L12's `POST /logistics/quote-requests`, currently product-scoped only, needs a bundle-scoped sibling). New frontend — checkout note, request action, purchase-block state tied to request status.
**Priority:** Deferred. Real second feature, scope properly after L15 v1 ships.

### R24. Buyer picks from multiple shipping quotes (sea/air, price vs speed)
**What:** Per Pam (S39): instead of one accepted quote per product, show buyers up to ~5 accepted logistics options (e.g. sea freight cheap/slow vs air fast/expensive) to pick from at product/cart level. Directly conflicts with the current single-accepted-standing-quote model — D29's partial unique index enforces exactly one by design, and product page/cart display assume one. Real architecture change: quote display model, checkout selection, D29 index rescope, provider competition dynamics.
**Fix:** Own design session with Pam before any code. Relates to D35 (context model), D40 (quote_request linkage), and the mode/routes fields on logistics_providers (D2/L4).
**Priority:** v1.5/v2. Genuinely valuable — do not bolt onto v1.

### R25. Destination and provider choice are single-valued where the flow needs several
**What:** Per Pam (S43). Seller side: set a few destinations, or go global and let logistics respond for the destinations they serve (today: one destination or null). Buyer side: pick a fresh logistics quote when the place is covered, or ask the seller for a quote (nothing exists for this), or find their own logistics: aim at one provider, a few, or broadcast (`target_provider_id` takes one today).
**Fix:** Own design session after D49. Pam narrates the buyer flow first.
**Priority:** Roadmap.

### R26. Nostr communications build
**What:** Pam, S44: yes, we build this. Reference: Buzz (`block/buzz`), Apache-2.0. Take: a centralised relay, group rooms for orders and disputes, media storage, search over messages that respects who may read them, a hash-chained audit log for dispute evidence. Buzz has no commerce events, so Rangkai defines its own event kinds for orders, quotes and disputes. Postgres stays the source of truth for v1; Nostr carries identity and communication.
**Where:** `docs/architecture/comms_and_nostr.md` (the S29 rationale is merged into it). Nothing in `src` uses Nostr beyond the identity type.
**Fix:** Break into sub-items after the comms doc is written. Constraints: D17 (public channels), D20 (data load). Decided (Pam, S44, 20 Nov): the protocol runs the relay for now; marketplaces may later run their own small relays.
**Priority:** Roadmap.

### R27. Returns: replacement, credit, partial refund, optional physical return
**What:** B2B norm is replacement, credit or partial refund, with a physical return only for higher-value goods and with the seller's agreement. A ruling should be able to order any of these. See `docs/architecture/logistics.md` (Returns). Criteria decided in outline (Pam, S44, 20 Nov): confirm it is a real problem, find whose fault, the party at fault bears the cost (carrier for shipment faults, seller for seller faults, buyer for buyer faults). See `docs/architecture/payments_and_fees.md`, "Returns and who pays". Open: recovering money from a carrier already paid.
**Where:** Not built. Part of D60.
**Priority:** Roadmap.

**END OF OPEN TECH DEBT**