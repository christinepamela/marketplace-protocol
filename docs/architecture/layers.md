# Protocol Layers

**Status:** DRAFT, Session 44. All layers drafted. Layer 2 is in `payments_and_fees.md` and Layer 3 in `logistics.md`.

| Layer | Name | Folder | State of this doc |
|---|---|---|---|
| 0 | Identity and reputation | `src/core/layer0-identity` | **Drafted below**. Decided: keep all three identity types |
| 1 | Discovery and catalog | `src/core/layer1-catalog` | **Drafted below** |
| 2 | Transaction and settlement | `src/core/layer2-transaction` | See `payments_and_fees.md`. History to read in handovers |
| 3 | Logistics | `src/core/layer3-logistics` | See `logistics.md` |
| 4 | Trust and compliance | `src/core/layer4-trust` | **Drafted below** |
| 5 | Developer SDK | `packages/sdk` (no `layer5` folder in `src/core`) | **Drafted below** |
| 6 | Governance | `src/core/layer6-governance` | **Drafted below** |

---

## Layer 0: Identity and reputation

Three identity types exist in code and all three stay (Pam, S44): **KYC**, **Nostr** and **anonymous** (`layer0-identity/types.ts`). An identity is a DID of the form `did:rangkai:<uuid>`. Each type starts with a trust score (KYC 75, Nostr 35, anonymous 20).

### What exists

| Piece | State | Notes |
|---|---|---|
| Register an identity of any of the three types | **BUILT** | `POST /identity/register` |
| KYC login with email and password | **BUILT** | `POST /identity/login`. KYC only. |
| Access tokens (JWT), refresh tokens | **BUILT** | Anonymous users get an access token at registration and no refresh token. |
| Sanctions screening when a KYC identity registers | **BUILT** | Blocks a match. See Layer 4. |
| Reputation score from transactions, ratings, disputes | **BUILT** | Starts at 50, plus 2 per completed transaction (capped at 200), plus ratings, minus 25 or 50 per minor or major dispute, times 1.2 for KYC, 1.0 for Nostr, 0.8 for anonymous. Maximum 500. |
| Signed reputation proofs | **BUILT** | `proof.service.ts`. Signed with the protocol's own key, so anyone with the public key can check one. |
| KYC verification itself | **Stub** | `verification.service.ts` is empty. `POST /identity/:did/verify` replies "verification process initiated" and changes nothing. |
| Nostr identities logging in | **Not built** | A Nostr identity is registered with a free-form `nostrData` field. There is no key-signature login, and no Nostr code anywhere else in `src`. |

### Rules Pam stated (S44), not enforced in code

- Anonymous users cannot use the logistics pool. Logistics is KYC only: KYC identities, and Nostr identities once they have done KYC. Anonymous users arrange their own. (D55)
- Anonymous users still follow the protocol's published dos and don'ts (no weapons, no drugs, and so on). The marketplace entrepreneur, not the protocol, carries the responsibility. (D55)
- Anonymous exists so people in persecuted or unfairly sanctioned countries can trade.
- Sign-up must be simple and light, built for phones and for people with no formal training.

### Where the code and the principles differ

- **Passwords. To be corrected before v1 (Pam, S44, 20 Nov: this is a shortcut).** `operations.md` Principle 3 says the protocol never holds passwords. The code stores a bcrypt hash of each KYC user's password in the protocol database. Session 28 designed it the other way (the marketplace stores the hash and calls the protocol with the DID); the code kept it in the protocol as a v1 shortcut, with one marketplace. Pam, S44: it should move to the marketplaces. (D58)
- **Cryptographic identity.** The same principle says identity is cryptographic (secp256k1). The code's identity is a UUID-based DID with email and password. Nostr would give this, and is the point of R26. (D58)
- **Personal data in the protocol database.** A KYC identity stores business name, registration number, owner name, address, phone, email, tax ID and document references. The principle says the protocol never holds KYC documents. (D58)
- **Who verifies KYC.** The principle is that marketplaces do KYC under their own country's rules. The code has no way for a marketplace to mark an identity verified. (D59)

---

## Layer 1: Discovery and catalog

### Why search matters

Search is one of the main reasons the protocol exists. Around 90% of businesses in most countries are small, and most are invisible to buyers elsewhere. Buyers need to find products by what they are and where they come from.

### What exists today

| Piece | State | Where |
|---|---|---|
| Search endpoint `GET /api/v1/catalog/search` | **BUILT** | `src/api/routes/catalog.routes.ts` line 423 |
| One central table, `product_index`, with a `client_id` per marketplace | **BUILT** | `search.service.ts` |
| Text match on name, short description, keywords | **BUILT**, substring only | `search.service.ts` line 211 (`ILIKE`) |
| Filters: category, price, origin country, sample available, lead time, seller reputation | **BUILT** | `search.service.ts` line 227 |
| Facet counts (countries, categories) | **BUILT** | `buildAggregations` |
| Relevance score | **BUILT**, calculated in application code | `calculateRelevanceScores` |
| Autocomplete suggestions | **BUILT**, prefix substring | `getSuggestions` |
| Redis search cache | **Written, not connected**: nothing imports it | `search-cache.service.ts` |
| Federation | **Schema only**: marketplaces sync into one central table. No cross-protocol query. | `syncProducts` |
| AI, semantic or multilingual search | **PLANNED** | none |

### Problems found in S44

Found by reading the code, not by running it.

1. **No ranking in the database.** Matching is `ILIKE '%text%'`, which cannot use an index and has no word handling (no plurals, no word order, no typos).
2. **It loads every matching row.** `search()` fetches all matches, then runs three extra queries per row (product, identity, reputation), scores in JavaScript, sorts, and only then paginates. This works with a handful of products and will not at scale.
3. **User text goes straight into the filter string** (`.or('name.ilike.%...%')`). A comma or bracket in a search could break or change the filter. Needs checking and fixing.
4. **No "ships to" country.** Only origin country can be filtered. Buyers need products by where they come from and where they can be delivered.
5. **No Incoterm filter**, although every product now carries one.
6. **The index is filled by a database trigger, and the index is thin.** Confirmed against the live database (Pam, S44):
   - The trigger `trigger_sync_product_to_index` copies a product into `product_index` only when it is `active` and `public`, and deletes it from the index otherwise.
   - `product_index` has no `search_vector` column. The `search_vector` that handover 21 described does not exist.
   - Its only text indexes are a full-text index on the **name** alone, using the **English** dictionary, and a keywords index. The application's `ILIKE` query cannot use either.
   - The index holds the short description but **not the full description**, and has no Incoterm, no "ships to" countries and no seller country. The new filters need new columns and a change to the trigger.
   - The English dictionary suits English text only. Many of our sellers describe products in other languages.

### Design intent from the Layer 1 spec (kept)

- **Responsibility split.** The protocol enforces proof, integrity and traceability. Marketplaces enforce legality in their own country. Sellers choose the visibility of their products.
- **Prohibited goods (published list).** Weapons, arms and explosives; human trafficking, forced labour and organ trade; endangered wildlife (CITES); narcotics banned under UN conventions; fraudulent or stolen financial assets. Not enforced in code today. (D55)
- **Politically induced black markets.** The protocol stays neutral but traceable. Marketplaces must ensure compliance and keep transactions auditable.
- **Visibility.** The spec has four states (public, restricted, private, paused). The code has three: `public`, `private`, `unlisted`, and only `public` products reach the index. They need to be reconciled. (D64)
- **Reputation in ranking.** Code adds up to 0.2 to the relevance score (reputation divided by 500). Keep.

### Launch scope

*(Pam, S44: Postgres full-text search with proper ranking is required for a basic launch.)*

**Step 1, launch:**
- A `tsvector` search column with a GIN index, over name, short description and keywords. Use the `simple` dictionary, or one per language, so non-English products are found. Keep it up to date from the trigger.
- Add the missing fields to the index and trigger: full description, ships-to countries, Incoterms and seller country.
- Query with `websearch_to_tsquery`, ranked with `ts_rank`, with weights (name over keywords over description).
- Do filtering, ranking, vendor join and pagination in SQL, in one database function, so the application stops looping.
- Search by product and by country, including "ships to".
- Escape or parameterise the user text.
- Keep the response shape, so the marketplaces do not change.

**Later steps (not decided):**
- Typo tolerance (`pg_trgm`).
- Synonyms and multilingual matching, possibly embeddings in Supabase (`pgvector`) with an open-source multilingual model. Needs a short evaluation of free options before choosing.
- Wire in the cache if load requires it.
- Real federation across separate protocol deployments, which depends on decision D16.

---

## Layer 2: Transaction and settlement

See `payments_and_fees.md`: fees, escrow, order states, payment rails and the dispute model.

Kept from the old Layer 2 spec: payment modes are on-chain Bitcoin, Lightning and fiat; fiat or large Bitcoin amounts need AML/KYC checks; each order gets a single-use invoice or address; optional multisig escrow is a later option. The spec's fee section (old percentages) is replaced by `payments_and_fees.md`.

---

## Layer 3: Logistics

See `logistics.md`: the pool, provider categories, quote and shipment flow, KYC-only rule, and what is built.

---

## Layer 4: Trust and compliance

| Piece | State | Notes |
|---|---|---|
| Disputes | **PARTIAL** | Open, seller response, automatic resolution all exist. Arbitration cannot be resolved and no money moves. See `payments_and_fees.md`. |
| Sanctions screening | **BUILT** | A `sanctions_list` table, checked when a KYC identity registers. The list is loaded by hand through an admin route (`POST` on the trust routes). There is no automatic feed from any official list. |
| Tax rates and tax calculation | **BUILT** | Rates per country and category in a table, with a calculation function. Not checked whether orders use it. |
| Ratings | **PARTIAL** | Buyer and seller each rate the other. Ratings stay hidden until both have rated, or 7 days pass. Two faults, below. |
| Prohibited-goods list | **Not built** | See D55. |

Faults found in ratings:
1. The rating step adds or subtracts a few points and then **limited the reputation score to 0 to 100**, though the reputation formula's maximum is 500, so a seller with a score of 300 dropped to about 100 on their next rating. **Fixed in code S44** (B36): the cap is now `DEFAULT_REPUTATION_PARAMS.maxScore`, though it is not reachable yet: the same function looks the row up by `did`, which the table does not have, so a rating currently writes nothing (B41), the average-rating write in the same update can store 0 (B42), and the score is still written directly rather than recalculated (B43).
2. The job that reveals one-sided ratings after 7 days exists, and **nothing calls it**, so those ratings stay hidden. (B37)

---

## Layer 5: Developer SDK

Marketplaces talk to the protocol through the REST API at `/api/v1`, and most use the TypeScript SDK `@rangkai/sdk` (version 1.0.0) in `packages/sdk`. There is no `layer5` folder in `src/core`: the API lives in `src/api` and the SDK in `packages/sdk`.

### What exists

| Piece | State | Notes |
|---|---|---|
| TypeScript SDK client (`client.ts`), config: API URL, token, version, timeout, headers, debug | **BUILT** | Typed errors in `errors.ts` |
| Identity module | **BUILT** | register, get by DID, reputation, proof, verify (stub, D59), refresh |
| Catalog module | **BUILT** | create, update, delete, get, by vendor, search, stats |
| Orders module | **BUILT** | create, get, by buyer or vendor, history, confirm, pay, ship, deliver, complete, cancel |
| Logistics module | **BUILT** | providers, quotes, quote requests, opportunities, shipments, tracking, favourites |
| Trust module | **BUILT** | disputes, ratings, vendor responses. Follows the current dispute code, so it changes with D60 |
| Governance module | **BUILT** | proposals, votes, execute, stats |
| Payments module (Bitcoin, Stripe, BTCPay) | **Not built** | The API has `bitcoin`, `stripe` and `btcpay` routes with no SDK wrapper |
| WebSocket client (`websocket.ts`) and server at `/ws` | **BUILT** | Live updates |
| SDK tests | **PARTIAL** | One file, `tests/sdk.test.ts` |
| OpenAPI description | **BUILT** | `docs/api/openapi.json` and `.yaml` |
| Webhooks for marketplaces | **Not built** | See below |
| Nostr event subscription | **Not built** | See `comms_and_nostr.md` |
| SDKs for React, Vue, Svelte, iOS, Android | **Not built** | See below |

### Known problems

- `rangkai-marketplace` fails to compile against the SDK in 15 places (B23), including missing `SearchFilters` and `SearchResultItem` types. Search is changing (Layer 1), so fix the types together with it.
- The SDK has no payments module, so marketplaces call those routes by hand.

### Design intent from the Layer 5 spec

- **Events by webhook first.** Marketplaces receive protocol events (order paid, shipped, dispute opened) over HTTPS webhooks by default. Nostr subscription is an optional second way. Neither is built. The live-update channel today is the WebSocket.
- **Feature flags** `enableWebhooks` and `enableNostr` to choose the delivery method.
- **Framework wrappers** for React, Vue, Svelte, iOS and Android on top of the TypeScript SDK. Not planned for v1. The two existing marketplaces use Next.js (React).
- **Rating schema and buyer override rules** are covered in Layer 4 and `logistics.md`.

See `ref_client.md` for how a marketplace entrepreneur builds a marketplace on the SDK.

---

## Layer 6: Governance

### What exists

- A council of exactly **3 signers**. Quorum is 2 of 3.
- Proposals have a voting period (72 hours by default) and expire if not decided. A scheduler job expires them every 5 minutes.
- Any active signer can create a proposal, vote, and execute an approved one.

### What each action really does

| Action | Effect |
|---|---|
| Update protocol fee | Records a setting that nothing reads (B27) |
| Update marketplace fee | Same |
| Update escrow duration, update dispute window | Same |
| Emergency pause and unpause | Sets a flag, `emergency_pause_enabled`. Nothing reads the flag, so the protocol keeps running (B35) |
| Treasury withdrawal | Records an approved movement. No bitcoin transaction is made |
| Add or remove a signer | Works on the signer table |
| Schema migration | Not checked |

### The "multisig" is not cryptographic

A vote stores a `signature` field that nothing verifies. A signer is a logged-in account whose DID is on the council list. In practice, quorum is two logged-in accounts. (B35)

### Why this matters for freezing funds

The dispute and freeze model (`payments_and_fees.md`) says a protocol freeze or override needs 2 of the 3 council signers, and that an emergency pause is the switch for a technical emergency. Neither works today.

### Council (Pam, S44)

There are no named signers yet. The aim is to work like Bitcoin: the threshold of **2 of 3** holds, and the number of signers can grow later. Because the protocol is meant to have no people behind it, the council should do as little as possible: the emergency pause and changes to settings. Everything else should be an automatic rule.

### Open question

Who can trigger the emergency pause while the council has no named signers?

---

## Spec check (S44): where the old specs and the code disagree

The old `docs/specs/LAYER0` to `LAYER6` are older than the code. Their useful design intent is folded in above. These are the places where they conflict with the code or with Pam's decisions. The code and Pam's decisions win.

| Topic | Old spec says | Now |
|---|---|---|
| Reputation | Soulbound NFT, score 0 to 1000, oracle, appeals through Layer 6 | Signed proof from the protocol's key, score 0 to 500, kept in the database |
| Identity modes | KYC, anonymous (zero-knowledge), hybrid | KYC, Nostr, anonymous. No zero-knowledge, no hybrid |
| Court orders | KYC user data is disclosed on a court order; "you can't disclose what doesn't exist" for anonymous | Pam: courts deal with the marketplace, not the protocol. The protocol still stores KYC data (D58) |
| Logistics providers | Anonymous providers allowed | Pam: logistics is KYC only (D55) |
| Dispute arbitration | Automatic by default; client-managed escalation for KYC users only; arbitrator registry; no human arbitration for anonymous parties | Pam: the marketplace arbitrates for KYC and Nostr parties, the protocol pays out automatically. **Anonymous parties: automatic rules only**, as in the spec. The long-term aim is 99% automatic (`payments_and_fees.md`) |
| Dispute times | 72h, 48h, 7-day arbitration, auto-release 48 to 72h | Seller window 7, 14 or 30 days; seller response 5 days; grace 3 days |
| Protocol fee | 3% | 0.5% of seller payout plus 0.5% of logistics payout |
| Custody | "Non-custodial: the protocol never holds user funds" | v1 uses a server-held wallet, accepted by Pam for v1 |
| Governance roles | Founder, Technical Lead, Treasury Manager | Council of 3 signers, 2 of 3, not yet named |
| Governance upgrade path | Phase 1 database, Phase 2 cryptographic signatures, Phase 3 on-chain or federated | Still at Phase 1. Phase 2 is B35 |
| Developer events | HTTPS webhooks by default, optional Nostr subscription | Not built. WebSocket `/ws` only (Layer 5) |
| Layer numbers | Inconsistent between specs | The numbering in the table at the top of this page is the one to use |

Future ideas in the specs, not planned: reputation-weighted voting, Nostr-published proposals, a DAO, self-evolving dispute rules after 10,000 events.