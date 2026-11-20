# Operations and Standing Context

**Last updated:** 2026-11-11 (Session 43)
**Docs:** `tech_debt.md` (open items), `../archive/tech_debt_archive.md` (closed), `troubleshooting.md`, `session_template.md`, `project_structure.md`, the latest handover `<N>.md` (all in this folder), `../architecture/`

This file is what every session needs to know before starting. A handover links here and does not restate it. If something here changes, edit this file in the same commit.

---

## Why Rangkai exists

Global trade infrastructure was built for large corporations. Rangkai is infrastructure for the small businesses left out: **a protocol that enables marketplaces, not a marketplace itself.** Federation is the point from day one.

- Pam's 2025 piece, "When Global Trade Leaves Small Businesses Behind": https://medium.com/@christinepamela/when-global-trade-leaves-small-businesses-behind-d9e31b6c292a
- Pam's 2021 logistics piece, the domain framework behind the publish gate (segments A–F, Incoterm groups, landed cost): https://medium.com/@christinepamela/logistics-for-startups-f27df1e1e3a

---

## Principles (always on)

1. **Protocol is passive infrastructure.** 0.5% from the seller payout and 0.5% from the logistics payout at escrow release. Never added to the buyer's total.
2. **Federation is the goal.** Marketplaces are peers; every v1 decision must preserve the path to federation.
3. **Cryptographic identity (secp256k1).** The protocol never holds passwords, keys or KYC documents.
4. **Nostr is plumbing.** Rangkai owns UX and search.
5. **Small business first.** Hide complexity; check for the simpler framing first.
6. **Bitcoin is the invisible rail.** v1 pays out BTC/USD directly; invisible conversion is later (R11).
7. **Words: seller, buyer, logistics.** Not vendor, provider, courier. The code still uses the old words in places (`/app/vendor/`, `logistics_providers`, `provider_id`); that is cosmetic and tracked under D47.
8. **No centralised consolidation hubs.** Logistics stays inside the decentralised pool.
9. **The protocol owns rules and data; each marketplace owns the words.** Enforcement lives server-side at the protocol, never in UI copy, so every marketplace inherits it.

There are nine. (Principle 9 was added S39; check the latest handover before ever calling a standing item nonexistent.)

---

## Users

1. **Marketplace entrepreneurs** spin up Rangkai-powered marketplaces.
2. **Buyers** find products, order, pay, track.
3. **Sellers** list products, manage orders, ship.
4. **Logistics** see opportunities, quote, deliver. KYC is mandatory.

**Role model:** `businessType: 'buyer'` gets the buyer UI; any other businessType gets the seller UI. A seller acting as a buyer uses a separate account. KYC, Nostr and anonymous status are subtle context, not navigation.

---

## Working with Pam

- Pam is the founder and product owner. She is not a programmer by trade and is architecturally sharp: she pushes back when something is over-complicated or does not match what she sees.
- **For a design question, ask her to walk the seller or buyer flow in her own words. Her narration is the spec.** Write down what she says (see "Logistics rules" below) so she never has to explain it twice.
- **Windows command prompt only, not PowerShell.** `more +N file`, `findstr /n /c:"text" file`, `find /c /v "" file` (line count).
- **Handing over code:** exact file, exact line, find/paste blocks, one form per change (never a full file and blocks for the same change). Before pasting into a file already edited this session, `findstr` for one distinctive line of the new block. Check line counts afterwards.
- **Curl commands and IDs:** put the real values in; never leave placeholders.
- **She pastes files and terminal output.** If an attachment looks empty, say so before relying on it.
- **Commits:** one commit per logical change, only after it is tested. Plain one-line messages, no `Co-Authored-By` or session-link trailers, even if a tool reminder suggests them.
- **Prefers fixing things properly** over workarounds. A workaround that cannot be avoided gets a tech debt entry the same turn.
- **Questions:** ask directly in prose, not multi-question dropdowns.
- **Before asserting a fact about data, query it. Before reopening an entry, re-read it.** Check the most recent source, not an older one.
- **Session length:** at about 80% of context, stop, commit, and write the handover.

## Documents: one rule

Put anything durable in the right doc **the same turn** you find it, not at handover time. A handover holds only what became true for the first time that session.

| Doc | Job |
|---|---|
| `tech_debt.md` | Open problems only, numbered B / D / R. Check the highest ID before adding one. Fixed items move to `../archive/tech_debt_archive.md`. |
| `troubleshooting.md` | Symptom, cause, fix, for things that have bitten twice. |
| `operations.md` | This file. |
| `<N>.md` (latest, in this folder) | What happened in session N. Format in `session_template.md`. The previous one is moved to `../archive/session-handovers/`. |
| `../architecture/` | Current architecture, written from the code in S44. Where a doc and the code disagree, the code wins. |

---

## Starting a session

After any gap (Supabase pauses after about a week, tokens last 36 hours, every RFQ expires after 30 days):

1. `git status` and `git log --oneline -5`.
2. Resume Supabase at supabase.com/dashboard, then prove it with the login curl below. `/health` says fine either way.
3. Start the API, log in again.
4. In `packages\sdk`: `npm run build`. In `rangkai-marketplace`: `npx tsc --noEmit`. **The baseline is 15 errors (B23).**
5. Re-broadcast any RFQ you need live (the same id comes back with a new `expires_at`).

Login curl (returns an identity payload and a token):
```
curl -s -X POST http://localhost:3000/api/v1/identity/login -H "Content-Type: application/json" -d "{\"email\":\"testBit2@test.com\",\"password\":\"bitshop123\"}"
```

## Servers

| Terminal | What | Command |
|---|---|---|
| 1 | Protocol API (3000) | `cd C:\Users\chris\marketplace-protocol` then `npm run dev:api` |
| 2 | Stripe listener (optional) | `stripe listen --forward-to localhost:3000/api/v1/payments/stripe/webhook` |
| 3 | Rangkai marketplace (3001) | `cd rangkai-marketplace` then `npm run dev` |
| 4 | Logistics marketplace (3002) | `cd logistics-marketplace` then `npm run dev` |

SDK rebuild after any SDK change: `cd packages\sdk && npm run build`. `dir node_modules\@rangkai` should show `<JUNCTION>`.

## Browsers and test accounts

| Browser | Role | Account |
|---|---|---|
| Firefox | Seller | Bitshop |
| Chrome | Buyer | Bitty Buy |
| Edge | Logistics | BitHaul |

**Check which account a browser is actually logged in as before testing.** Wrong-account mix-ups have corrupted records before.

| Name | Role | Login | IDs |
|---|---|---|---|
| Bitshop | Seller, KYC | `testBit2@test.com` / `bitshop123` | DID `did:rangkai:12a8b3ab-54f7-4133-ba8b-6b5ee2ae97c4` |
| Bitty Buy | Buyer, KYC | `bittybuy@bitbit.com` / `bittybuy123` | DID `did:rangkai:77216b3f-48bd-4c3f-ac47-6bf8f078c599` |
| BitHaul | Logistics, KYC | `BitHaul@123.com` / `BitHaul123` | Provider `4ac9c4ca-8022-4b9d-b12e-ce5200f39af1`, DID `did:rangkai:57cbd851-17fe-4a7d-80fb-83bd378bf8c1` |
| Hash Heel | Seller #2, KYC | `hashheel@test.com` / `hashheel123` | DID `did:rangkai:76f90715-8dfa-434f-8cec-7abd3e3a6eef` |
| SatsFleet Express | Logistics, **API-only, cannot log in** | none (registered before email and password existed; no `password_hash`) | Provider `199e37cb-a0a4-4962-9dc5-615991f617b1`, DID `did:rangkai:2366113c-959c-4285-90f0-e7f71432e20e` |

All UI logistics testing is done as BitHaul.

## Test data

Snapshot, verified S41. Re-run the ownership query in T13 before trusting it.

| Product | ID | Owner | Status | Incoterm |
|---|---|---|---|---|
| test incoterm FOB | `54b33fc2-022a-43db-b646-b82fa2cff071` | Bitshop | active | FOB |
| test incoterm without estimate | `2ad8bcda-f581-43d2-8497-20c66474e640` | Bitshop | draft | DAP |
| test incoterm | `4fbbea3f-0f2e-4a85-98d2-99faa1a4fa20` | Bitshop | active | DAP |
| r21 gate test | `4983c879-d91a-4d63-85d9-295482bdf636` | Bitshop | draft | DAP |
| estimate test boots | `305c3803-9c78-44b0-a1a6-fd2703ef54d8` | Hash Heel | active | DAP |
| brazilian leather sandals | `f4e8a3d2-9c1b-4a67-8e42-3d7f91a25b60` | Hash Heel | active | DAP |
| custom | `bad3b0e0-5b97-413a-8c5c-cfd3812a51bd` | Bitshop | active | DDP |
| handmade leather boots | `6652da96-3bad-4932-8a12-e56659bc0881` | Bitshop | active | DAP |

**RFQs:** do not trust a list here; it goes stale in days. As of 2026-10-21 only `cc2f9c9b` (r21 gate test) was live, expiring 2026-11-19. Seven older open RFQs have expired and are invisible to logistics. The leftover duplicate `de018eae` can stay or go; before deleting from `quote_requests`, check that nothing references it (T8).

**Rules:** never DELETE from `shipping_quotes` without excluding rows referenced by orders (T8). Name test users thematically ("Bit*" for payment tests, "Logi*" for logistics) so ghost data is easy to spot. Save reusable Supabase queries as named snippets prefixed with the session (T21).

**`logistics_providers` columns:** `id`, `business_name`, `identity_did`, `service_regions` (NOT NULL), `shipping_methods` (NOT NULL), `insurance_available`, `average_rating`, `total_deliveries`, `created_at`, `routes` (jsonb), `modes`, `incoterms_supported`, `door_pickup`, `door_delivery`, `weight_min_kg`, `weight_max_kg`. No `updated_at`, no warehousing field (D47).

**Fixture providers.** Both were configured by hand in SQL, so a newly registered provider gets none of this (B21). When BitHaul's routes were set is unknown, because `logistics_providers` has no `updated_at` (D47).
- **SatsFleet (current):** full capability data. Its `service_regions` (MY, SG, US, CA, GB) and `routes` (include DE, AU) disagree (B22).
- **BitHaul (current):** routes MY→SG, incoterms DAP/DDP, `modes` empty, no weight bounds, door flags false. Its `service_regions` (8 countries) and `routes` (one pair) disagree (B22).
- **Target, not done.** The two should differ on purpose, so a filter is provably working and not just rendering:
  - SatsFleet, full service: `air_express` + `air_freight` + `sea_lcl`, door pickup and delivery, DAP/DDP/FOB, wide routes, 0.1–500 kg.
  - BitHaul, deliberately narrow: `sea_lcl` only, no door pickup, DAP/DDP only, MY→SG only, 0.5–30 kg. It still needs `modes` and the weight bounds.
  - Then a 24.5 kg / 0.42 CBM footwear RFQ matches both, a 300 kg one matches only SatsFleet, and an FOB one matches only SatsFleet.
  - A fixture with empty fields bypasses the filter instead of testing it. Wait until B22 settles which field pair is authoritative.

---

## Logistics rules, as Pam stated them

*(S43, design intent. Where the code does not do this yet, the tech debt item is named. These move into the logistics spec once it is cleaned up.)*

1. **A logistics quote only makes sense for a destination.** A quote with no destination means nothing. (Code gap: D49.)
2. **Seller side:** the seller can set a few destinations, or make a global request and leave it to logistics to pass on the ones they do not serve. (Code: one destination or none; R25.)
3. **Buyer side:** a buyer can pick a logistics quote if the place is covered and the quote is fresh; or request a quote from the seller; or find their own logistics by aiming at specific companies, broadcasting, or selecting a few. (Code: broadcast and one provider exist; "a few" and "ask the seller" do not; R25.)
4. **KYC sellers** need at least one quote before a DAP/DDP product goes live (firm, or the seller's own estimate). **Anonymous sellers** manage their own logistics and cannot use the pool. **KYC buyers** who arrange their own logistics still go through the pool; only non-KYC buyers can fully opt out.
5. A product can carry several quotes (providers compete). v1 currency is USD.

## Standing design decisions

- **Auto-broadcast on publish stays the default (D44),** but a seller must also be able to not broadcast, browse the pool, and approach a provider directly. The empty-pool argument against a manual button is weak: an RFQ into an empty pool costs nothing.
- **Logistics do need Incoterms (D47).** Incoterm sets where the job starts and stops and who clears customs. Ask in operator language ("can you clear import customs and advance duty?"), not as a bare multi-select.
- **No packing optimiser (D46).** Collect the carton spec manufacturers already have (units per carton, carton dimensions, gross weight) and compute from it. Arithmetic, not optimisation.
- **Four v1 Incoterms:** EXW, FOB, DAP, DDP.
- **Federation is the goal, not a roadmap item** (R8 and R20 in the archive). Identity is DID-based, the logistics pool is shared across marketplaces, trust screening is per protocol, and search schema must extend to federation (D16).

---

## Bitcoin runbook

**Rotate the mnemonic** (burned wallet, mainnet launch, security): generate with `node -e "const bip39 = require('bip39'); console.log(bip39.generateMnemonic(256));"`, put it in `.env` as `BITCOIN_MNEMONIC`, set `BITCOIN_START_INDEX=0`, restart the API (it scans and skips burned addresses). Never use a mnemonic from documentation: the `abandon abandon...` test vector is burned worldwide. On mainnet the mnemonic must also be stored offline (paper, hardware backup or password manager export), never in version control, cloud notes or email.

**Clean burn-scan noise** (safe any time; real orders have UUID `order_id`s):
```
DELETE FROM bitcoin_payment_addresses WHERE order_id LIKE 'burned-placeholder-%';
```
The current testnet mnemonic is in Pam's `.env`; the mainnet one is in her password manager. Do not use the mainnet one for development.

---

**END OF OPERATIONS**