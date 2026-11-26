# Triage: open tech debt, for stage 2

**Status:** proposal, not approved. Session S44, written by the Pollen agent on Buzz.
**Source:** every open item in the index of `docs/working/tech_debt.md` at `main` = `419dae5`
("S44: stage 2 granted, pre-approved list B46 and B17, triage classes, B47 decided").
99 items: 27 B, 48 D (prefix), 24 R.
**What this is for:** Pam approves the A list. Only approved A items may be picked at stage 2
(`docs/working/agent_brief.md`, "Stage 2: how to pick"). This file changes nothing in
`tech_debt.md` and is not a plan of record until Pam says so.

---

## How to read it

Classes are the brief's (`Classifying open items`):

- **A, agent-safe:** concrete fix; code, tests, types, UI or docs; no money, escrow, payout,
  identity storage, keys or governance; no schema or database change; no product or design
  decision; verifiable by unit tests or `tsc` without live access.
- **B, needs a decision or a database check first.** The question is written out below.
- **C, Pam only:** money, identity, keys, governance, the council, schema or migrations, legal,
  "Pam decides", roadmap and v2.
- **D, verify first:** checked against the code below, with the file and line.

Two rules I applied, so the classes can be checked rather than guessed:

1. **A means the evidence can actually run here.** There is a test runner for the protocol
   (`npm test`, root jest) and for the SDK (`packages/sdk` jest). There is **no** test runner in
   `rangkai-marketplace` or `logistics-marketplace`, so a frontend fix can only be checked by
   `tsc`, which does not see behaviour. Those items are class B, with the question being the
   missing evidence rather than the missing design (see proposed item **B51**).
2. **Where an item's facts have moved, it is class B and the check is written in the reason.**
   Class D is kept for items that are closed or misdiagnosed: no code work left at all.

Not checked: no live database, no `.env`, no key, no running server or scheduler. Every check
below is a read of the code at `419dae5`, except where an item's own block records a live fact
from an earlier session (that is marked "per the item").

### Counts

| Class | Count |
|---|---|
| A | 5 |
| B | 20 |
| C | 71 |
| D | 3 |
| **Total** | **99** |

---

## The 99 items

| ID | Item | Class | Reason |
|---|---|---|---|
| B1 | Logistics payment, two pieces left | C | The L17 doc half was resolved in S44; what is left is an end-to-end split payout on live BTC. Money, and needs live funds. |
| B4 | Tracking number not shown in buyer shipment UI | D | Code path is complete: `order.service.ts:608` maps `trackingNumber`, `app/orders/[id]/page.tsx:308` and `TrackingTimeline.tsx:95` render it. Needs a real shipped order to reproduce. |
| B17 | Buyer page swallows a broken `sdk.identity.getIdentity` | A | One rename to the real method, `getByDid`. Pre-approved. |
| B20 | RFQ matcher skips its filters for blank providers | B | Needs a decision on what a blank profile means; lands with B21, which is what produces blank profiles. |
| B21 | Provider registration collects no capability data | B | Which fields, in what operator wording. Backfilling existing providers is a live DB write. |
| B22 | Two live capability vocabularies | C | Moving `searchProviders` onto `routes`/`modes` and deriving or dropping two `NOT NULL` columns is a migration. |
| B23 | `rangkai-marketplace` never typechecked clean (15) | B | The one reported error hides three more (see "New problems"); and is `email`/`password`/`metadata` in the register contract? That is an identity-contract decision. |
| B24 | Buyer RFQ path mis-converts dimensions and fabricates values | B | Open S43 decision: shared server helper (option A) or both paths read the product row (option B). |
| B25 | Buyer pending list shows expired RFQs | B | What a buyer sees when their RFQ has expired is Pam's choice. |
| B26 | Stripe payout pays the seller the whole total | C | Money. |
| B27 | Governance fee changes have no effect | C | Money and governance. |
| B28 | Marketplace fee never collected | C | Money; needs the D50 registry. |
| B29 | Search loads every match, has no ranking | C | A `tsvector` column, GIN index and trigger change: schema, and a launch design. |
| B31 | Payout routes need only a login | C | Money and authorisation. |
| B32 | Release, completion and resolution move no money | C | Money. |
| B33 | Auto-release can pay inside the dispute window | C | Money and escrow timing. |
| B34 | Arbitration cannot be resolved | C | Disputes and money; also needs a scheduler job. |
| B35 | Governance actions are records only | C | Governance. |
| B37 | One-sided ratings are never revealed | C | A scheduler job (`autoRevealExpiredRatings` has no caller at all: `rating.service.ts:203`). The brief puts the scheduler in C. |
| B39 | `getSuggestions` has no caller | B | Wire it or delete it? Its only caller today is a test script (`scripts/test-layer1.ts:184`), so this is a small decision that also depends on B29/D54. |
| B42 | `calculateAverageRating` can write 0 | C | Decided (revealed ratings only); built inside B43. |
| B43 | Rating path writes `score` directly | C | Reputation design. Pam decides; split into branches before an agent starts. |
| B44 | Rating path does not update `last_updated` | A | One field in one update, testable in the existing stub. Superseded if B43 replaces the method first. |
| B45 | Reputation failure keeps the rating | C | Decided (log and return); built together with B43. |
| B46 | `JwtPayload` does not describe the payloads | A | Declare `clientId?: string`; type-only. Pre-approved. |
| B47 | Starting scores and the 500 maximum | C | Decided; identity seeding is human-decision first, built with B43. |
| B50 | Two signal handlers, the second kills shutdown | A | One handler set, verifiable by listener counts and an extracted helper. |
| D5 | No HS code on products | B | The field and form input exist (`ProductForm.tsx:68`, `:119`, `:160`); the open ask is "required for international", which is a decision. |
| D6 | Currency layer absent | C | FX design. |
| D7 | Provider rating field not populated | B | Who prompts, when, and from which write path: a product flow decision. |
| D8 | Estimated quotes (rate cards) | C | New table. |
| D10 | Lightning untested | C | Roadmap, hardware and money. |
| D12 | No quote refresh / expiry handling | B | Expiry is already computed at read time (`quote.service.ts:340`, `:376`, `:405`) and filtered (`:275`, `:301`); only the notification is missing, and `src` has no notification code. Which channel? |
| D13 | BIP84 coin type on testnet | C | Key derivation path. |
| D14 | `BitcoinService` instantiation inconsistent | C | Bitcoin and payout path. The count is also stale: 5 route sites (`bitcoin.routes.ts:79`, `:139`, `:238`, `:328`; `order.routes.ts:749`) plus `scheduler.ts:176`, not 3. |
| D15 | Trust and compliance, later pieces | C | Post-v1 features. |
| D16 | v2 search federation | C | Architecture decision, Pam leads. |
| D17 | v2 public channels | C | Architecture decision. |
| D18 | v2 Frostr multisig | C | Keys and auth. |
| D20 | Nostr data load | C | Cross-cutting design. |
| D23 | Firm quote expired, seller bears the risk | B | Confirmed: no notification code anywhere in `src`. Building even a minimal one is a decision. |
| D26 | Backend `tsc` output lands at repo root | D | No `packages/tsconfig.json` exists (see "New problems"). The root `outDir` is the backend build. Misdiagnosed. |
| D28 | `ownLogistics` is one checkbox for the cart | B | Frontend state and prop change with no test runner; also a checkout-screen UX choice. |
| D30 | Cart vendor name is a placeholder | B | Still literal at `cart.ts:139`; B17 now works, but making `addToCart` async (or resolving the name at render) is a store-shape decision. |
| D32 | `keys/` PEM pair at repo root | B | Only Pam can say whether a service references it; checking means reading `.env`, which agents may not do. |
| D33 | Root `dist/` is stale build output | D | Gitignored (`.gitignore:5`) and regenerable backend build output. Nothing to patch. |
| D34 | Opportunities "Submit quote" resets on refresh | B | The data is available (`logistics.routes.ts:208`–`:246`); the rest is frontend work with no test runner. |
| D35 | Abandoned checkout leaves open `quote_requests` | B | When to close (cart removal, logout, order, timer) is a flow decision; frontend plus DB writes, no tests. |
| D38 | ~116 untitled Supabase queries | C | Pam's dashboard. |
| D39 | Service errors surface as 500 | B | Still true: no service throws `ApiError` (0 matches under `src/core/**/*.service.ts`). The fix is to pick a pattern once, which is a decision. |
| D40 | `acceptQuote()` infers context | C | Schema (`quote_request_id` on `shipping_quotes`). |
| D41 | Estimate-priced orders | C | Design, plus escrow and money. |
| D42 | Buyer reminder to request a real quote | C | Depends on D41 and on a notification channel that does not exist. |
| D44 | Seller-side pool control | B | The opt-out alone is small; browse is blocked on B22, and persisting the preference needs a `products` column (a C part). |
| D45 | Quotes do not snapshot their basis | C | Columns on `shipping_quotes`: schema. |
| D46 | RFQ payload insufficient for a quote | C | `moq` and carton columns: schema. |
| D47 | Capability model gaps | C | Warehousing and `updated_at`: schema. |
| D48 | SDK discards envelope metadata | B | Return the envelope or add `requestWithMeta()`: a decision with different call-site impact. Shared SDK change. |
| D49 | Quotes carry no destination | C | Schema, and reproducing it needs two live buyers. |
| D50 | Marketplace registry | C | New table. |
| D51 | Fee ledger and live statistics | C | Money and schema. |
| D52 | Search: ships-to and Incoterm filter | C | `product_index` and trigger changes; part of B29. |
| D53 | Stripe Connect not set up | C | Money and external accounts. |
| D54 | Search: later steps | C | Roadmap; depends on B29. |
| D55 | Anonymous users not blocked from the pool | C | Identity check plus a published policy list. |
| D56 | Cannot dispute a non-delivery | C | Disputes and money. |
| D57 | Status changes logged as "system" | A | Thread the caller's DID through `updateStatus` (`order.service.ts:163`–`:214`, six internal callers). Unit-testable with a stub. |
| D58 | Identity drifted from Principle 3 | C | Identity storage. Required before v1. |
| D59 | KYC verification is a stub | C | Identity. |
| D60 | Rebuild disputes | C | Disputes and money. |
| D61 | Sample approval record | C | Schema and types, plus a v1-or-later decision. |
| D62 | Freeze model | C | Governance and escrow. |
| D63 | Seller-set advance | C | Money; needs B42 then B43. |
| D64 | Product visibility states differ | C | States, schema and the index trigger. |
| D65 | Reference client clean-up and tools | C | Bundle of UX decisions, a Supabase key in `.env.local.example`, and screens gated on D50/D51/D60. |
| R1 | Provider pitches sellers | C | Roadmap. |
| R2 | Multi-vendor consolidation | C | Roadmap and architecture. |
| R3 | Reverse logistics financial flow | C | Roadmap and money. |
| R4 | Landed cost API | C | Roadmap. |
| R5 | Commercial invoice auto-generation | C | Roadmap. |
| R6 | HS code auto-suggest | C | Roadmap. |
| R9 | Lightning as a rail | C | Roadmap and money. |
| R10 | BTCPay integration | C | Roadmap, payments and secrets. |
| R11 | Currency abstraction | C | Roadmap and money. |
| R12 | Insurance marketplace | C | Roadmap. |
| R13 | Customs broker integration | C | Roadmap. |
| R14 | ESG metadata | C | Roadmap. |
| R15 | EU IOSS | C | Roadmap and tax. |
| R16 | US de minimis | C | Roadmap. |
| R18 | Naming/branding | C | Pam's decision. |
| R19 | UX channel per user type | C | Design. |
| R21 | Two-door shipping-price UI | B | The item says the build order against B21 and D46 is Pam's call; the copy is a product choice; frontend, no tests. |
| R22 | Add to Cart placeholder | B | Still a placeholder (`app/products/[id]/page.tsx:224`–`:226`). Needs the L15 scoping answer; frontend, no tests. |
| R23 | Order-level RFQ for multi-product carts | C | New feature and design. |
| R24 | Buyer picks between quotes | C | Architecture change. |
| R25 | Destination and provider choice | C | Design session. |
| R26 | Nostr communications build | C | Roadmap and build decision. |
| R27 | Returns | C | Roadmap; part of D60. |
| R28 | Rating average for small counts | C | Roadmap; the formula is B43/B47 territory. |

---

## The 20 B items: the question to answer

- **B20** — What should a blank provider profile mean: "match nothing until you declare"
  (honest, strands existing providers) or "see everything"? And are weight bounds required at
  registration, or does the matcher get a guard?
- **B21** — Which capability fields should registration collect, and in what operator wording?
  (The backfill of existing providers is a live DB write, so it is your step either way.)
- **B23** — Is `email`/`password`/`contactInfo`/`metadata` part of the register contract (then the
  SDK's `RegisterIdentityRequest` is wrong and should say so), or should the marketplace stop
  sending them? Also: approve exporting `SearchFilters`, `SearchResultItem` and `Review` from the
  SDK, which four of the 15 errors need.
- **B24** — The S43 open decision still stands: option A (one shared server-side conversion helper,
  buyer path only) or option B (both paths read the product row, seller form helpers become
  redundant)?
- **B25** — What does a buyer see when their RFQ has expired: greyed out with "expired, request
  again", hidden, or refreshed automatically?
- **B39** — Wire `getSuggestions` to a route (needs B29/D54) or delete it?
- **D5** — Should `hs_code` become required for international products (server-side validation),
  keeping the existing optional form field for domestic?
- **D7** — Who prompts for a provider rating, at what moment, and does it write a provider rating
  row or reuse the buyer/seller `ratings` path?
- **D12** — Is an expiry reminder worth building, and on which channel? No notification system
  exists in `src` today (checked).
- **D23** — Same missing plumbing: build a minimal notification system (table plus unread badge)
  first, or is a note somewhere else enough for v1?
- **D28** — Confirm the checkout screen you want: one `ownLogistics` checkbox per vendor group,
  state keyed by `vendorDid`?
- **D30** — Should `addToCart` become async and fetch the vendor's display name (a store-shape
  change), or should the cart resolve the name at render time from the product/vendor list it
  already has?
- **D32** — Are `keys/private.pem` and `keys/public.pem` used by any service? Only you can check
  `.env`; if they are not used, deleting them is local housekeeping, not a patch.
- **D34** — Is `tsc`-only evidence acceptable for a frontend fix, or should a test runner land
  first (proposed B51)? The endpoint and filter already exist.
- **D35** — When exactly should an open buyer `quote_requests` row be closed: last cart item
  leaves, logout, order placed, or a timer?
- **D39** — Typed error classes in the services, or one mapping layer in the error handler?
  (Pick once, then apply incrementally.)
- **D44** — Is the broadcast opt-out a create-mode-only checkbox (no column) or a persisted
  preference (a `products` column, which is a migration)?
- **D48** — Return the envelope from `request()`, or add `requestWithMeta()`? The second keeps
  existing call sites untouched; the first changes every consumer's return shape.
- **R21** — Build order against B21 and D46, and is the drafted copy (two doors, the DAP note,
  shorter estimate copy) what you want?
- **R22** — Does L15/checkout already cover the detail page's add-to-cart, or does it need its
  own pass? The listing page's path already works and could be reused.

---

## The 5 A items: files and how to test without live access

1. **B17** — `rangkai-marketplace/lib/api/products.ts:155`, `getIdentity` -> `getByDid`.
   Evidence: `npx tsc --noEmit` in `rangkai-marketplace`, 15 -> 14 (this error is one of the 15;
   see the caveat in "New problems"). Optional stronger guard: an SDK test that `getByDid` issues
   `GET /identity/:did`, so a later rename breaks a test instead of silently re-breaking this
   call site. No test runner exists in the marketplace app itself.
2. **B46** — `src/api/core/auth.ts`, `JwtPayload`. Evidence: `tsc`; a file reading
   `req.user?.clientId` fails before and passes after. Type-only.
3. **D57** — `src/core/layer2-transaction/order.service.ts` (`updateStatus` at `:163` and its six
   internal callers at `:230`, `:252`, `:275`, `:287`, `:298`, `:320`), `UpdateOrderStatusRequest`
   in the same layer's types, and the route call sites in `src/api/routes/order.routes.ts`.
   Evidence: a unit test with the stub Supabase pattern already used in
   `src/core/layer4-trust/__tests__/rating-reputation-cap.test.ts`, asserting
   `status_history.changed_by` is the caller's DID rather than `'system'`.
4. **B44** — `rating.service.ts` (`updateReputationFromRating`) and the existing B41 test file,
   which already models the `reputations` columns and would assert `last_updated` is written.
   Runs under `npm test`. If B43 replaces this method first, fold B44 into that branch instead.
5. **B50** — `src/api/index.ts:159`–`:172` and `src/api/server.ts:26`–`:34`. Extract the shutdown
   into a function, then unit-test: one `SIGTERM`/`SIGINT` listener after import, and the handler
   awaits `httpServer.close()` and `wsManager.shutdown()` before exiting (fake server, fake exit).
   The test must not import `server.ts`, which starts the scheduler.

---

## The 3 D items: checked, and the verdict

- **B4** — Checked `order.service.ts:588` and `:608` (`mapDatabaseToOrder` maps `trackingNumber`
  from `tracking_number`), `rangkai-marketplace/app/orders/[id]/page.tsx:308`–`:313` (renders
  `order.trackingNumber`), `components/logistics/TrackingTimeline.tsx:88`–`:95` (renders
  `shipment.tracking_number`). **Verdict:** the code path is complete; it is not reproducible
  without a shipped order. No code work identified; needs live data (S37's finding stands).
- **D26** — Checked: there is **no** `packages/tsconfig.json`; `packages/` holds only `sdk`, whose
  own `packages/sdk/tsconfig.json` writes `outDir: "./dist"`. The root `tsconfig.json:5`
  (`outDir: "./dist"`, `rootDir: "./src"`) is the backend build. **Verdict:** misdiagnosed; the
  root `dist/` is the backend build output by design. Recommend closing D26 and D33.
- **D33** — Checked: `.gitignore:5` ignores `dist/`; the folder is regenerable backend build
  output. **Verdict:** no repo work; deleting it is local housekeeping for Pam.

---

## Dependencies

An item that must wait, and why:

- **B20** waits for **B21** (blank profiles are what B21 produces).
- **B21** waits for **D47** (which fields; `updated_at`).
- **B22** before **D44**'s browse half, and before any capability filtering is built on top.
- **B26** waits for **D53** for live payouts.
- **B28** waits for **D50** (registry) and **D51** (ledger).
- **B32** after **B26**, **B28** and **B31** (one release step with split payout, fees, ledger).
- **B33**, **B34** are part of that release step; **B34** also with **D60**.
- **B35** before **D62**.
- **B37** before **B43** step 3 (a revealed rating is what counts).
- **B42**, **B43**, **B45**, **B47** are one ordered plan (B47 -> B37 -> rating event ->
  transaction count, which needs B32 -> one key spelling -> recompute -> display).
- **B44** is superseded if **B43** step 3 replaces `updateReputationFromRating` first.
- **D40** before **D49** (D49's first consequence is D40's fix).
- **D49** before **R25** (destination lists need a destination on a quote).
- **D41** before **D42**; **D42** also needs a notification channel (D23).
- **D52** with **B29**; **D54** after **B29**; **B39** after that decision.
- **D50**, **D51**, **D60** before **D65**'s entrepreneur screens.
- **D56** inside **D60**.
- **D63** after **B42** then **B43**.
- **B1**'s remaining piece needs live funds and a delivered order (Pam).
- Everything in the B43 plan waits for **B47**.

---

## Proposed top ten A items, ranked

Only five items qualify as A under the rules above. The list stops there rather than padding it
with B items, which would break the "when unsure, class it B or C" rule. Items 1 and 2 are the
two pre-approved ones and are already being delivered in this session.

| # | ID | Why this one |
|---|---|---|
| 1 | B46 | Two lines of type declaration; makes `req.user.clientId` readable at all. |
| 2 | B17 | One rename; clears a marketplace `tsc` error and unblocks D30's vendor name. |
| 3 | D57 | Small threading change; makes status history real dispute evidence instead of "system". |
| 4 | B44 | One field in one update plus a test in the existing stub; low risk, real correctness. |
| 5 | B50 | One handler set; stops shutdown cutting a scheduler job (a payout) in half. |

**What would create the other five.** A test runner for the two Next apps (proposed item **B51**
below) makes **D34**, **D28**, **D30**, **D35** and **R22** checkable as A with real evidence
rather than `tsc` alone. Alternatively, approving `tsc`-only evidence for frontend items would do
it too, but it trades evidence for speed; that is your call, not mine to assume.

---

## New problems found while triaging (reported, not fixed)

1. **Proposed B51: neither Next app has a test runner.** `rangkai-marketplace` and
   `logistics-marketplace` have no jest config and no test files, so a frontend fix can only be
   checked by `tsc`, which does not see behaviour. Six items sit in B for that reason alone
   (D28, D30, D34, D35, R21, R22). A runner (jest + testing-library, one smoke test per app) would
   move them into reach. It is a setup decision, so I did not class it A.
2. **Two wrong session labels already in the docs.** `docs/working/tech_debt.md:237` says
   "Note (S45)" and `docs/archive/tech_debt_archive.md:493` says "Fixed S45". Both concern B30. I
   can find no other reference to a session S45 anywhere in `docs/`, and this session is S44, so
   both look like the same labelling mistake. Reported, not fixed (this branch does not touch
   either file).
3. **B23's error list understates the register mismatch.** TypeScript reports only the first
   excess property, so `lib/api/auth.ts:56` (`email`) hides `password`, `contactInfo` and
   `metadata`: the marketplace sends four fields the SDK's `RegisterIdentityRequest` does not
   declare (`packages/sdk/src/modules/identity.ts:18`–`:27`). Fixing only `email` will surface the
   next three. That is why B23 is B, not a mechanical clean-up.
4. **D14's count is stale.** It says three route sites; there are five
   (`bitcoin.routes.ts:79`, `:139`, `:238`, `:328`; `order.routes.ts:749`) plus
   `scheduler.ts:176`.
5. **D26 and D33 are misdiagnosed** (see the D items above). Recommend closing both, with the
   note that the root `dist/` is the backend build, not a `packages/` misconfiguration.

---

## What I did not check

- No live database, no read-only query, no schema inspection. Schema questions are written as
  questions for Pam (B44's trigger, B22's columns, anything in C).
- No `.env`, no key, no service. Nothing was run except `git`, `tsc`, `npm test` and code reads.
- No Next app was built or run, and no UI behaviour was observed; frontend verifications are
  `tsc` and code reading only.
- Twice I record a fact from an item's own block (B4's S37 verification, B24's S41 confirmation)
  rather than re-deriving it; both were re-checked in the code, and B4's verdict is mine.
