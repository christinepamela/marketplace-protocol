# Operations and Standing Context

**Standing document — edited in place, never rewritten from scratch.**
Last updated: 2026-08-14 (Session 41)
Location: `docs/OPERATIONS.md`
Companion docs: `TECH_DEBT.md`, `TROUBLESHOOTING.md`, `SESSION_TEMPLATE.md`,
`specs/logistics-pool/LOGISTICS_ARCHITECTURE.md`

---

## What this document is for

Everything here is true across sessions. It was previously re-typed by hand into the top of
every session handover, which is how it decayed: the S39 → S40 crossing lost the entire
troubleshooting reference, the role model, the test-data inventory, half the credentials, three
"How Pam Works" rules, and — most seriously — an architectural principle, which a later session
then declared to have never existed.

**A session handover must not restate this document. It links to it.** If something here changes,
edit this file in the same commit, so the change is a reviewable diff rather than a transcription.

---

## Why Rangkai exists

Pam's 2025 Medium piece, **"When Global Trade Leaves Small Businesses Behind"** —
https://medium.com/@christinepamela/when-global-trade-leaves-small-businesses-behind-d9e31b6c292a

Global trade infrastructure was built for large corporations. Rangkai is infrastructure for the
small businesses left out — **a protocol that enables marketplaces, not a marketplace itself.**
Federation is the point, from day one.

The 2021 logistics piece is the canonical domain framework and is now load-bearing in the code —
R21's publish gate is derived directly from it:
https://medium.com/@christinepamela/logistics-for-startups-f27df1e1e3a
Six segments A–F, Incoterm groups (per IINO San: E/F buyer arranges main freight, D/C seller
arranges), landed cost calculation.

---

## Architectural principles (always-on)

1. **Protocol is passive infrastructure** — 0.5% + 0.5% from payouts at escrow release, never
   added to the buyer's total.
2. **Federation is the goal from day one.**
3. **Cryptographic identity (secp256k1)** — the protocol never holds passwords, keys or KYC docs.
4. **Nostr is plumbing** — Rangkai owns UX and search.
5. **Small business first** — hide complexity. If something seems hard, check for the simpler
   framing first.
6. **Bitcoin is the invisible rail** — v1 pays out BTC/USD directly; invisible conversion is v1.5
   (R11).
7. **Terminology: seller, buyer, logistics** — not vendor, provider, courier.
8. **No centralized consolidation hubs** — logistics stays inside the decentralized pool.
9. **(S39, R21):** protocol owns rules and data; each marketplace owns the words. Enforcement
   (like the publish gate) lives server-side at the protocol, never in UI copy — every
   marketplace inherits it for free (R20 in practice).

*(S40 originally struck principle 9 as a hallucination by checking against S37, which predates
it. It is real, added S39. Corrected S41. Check the most recent handover, not an older one,
before declaring standing knowledge nonexistent.)*

**There are nine.**

---

## The four types of users

1. **Marketplace entrepreneurs** — spin up Rangkai-powered marketplaces.
2. **Buyers** — find products, place orders, pay, track.
3. **Sellers** — list products, manage orders, ship.
4. **Logistics** — see opportunities, quote, accept, deliver. **KYC-mandatory.**

*Terminology migration is incomplete and cosmetic:* the codebase still uses `/app/vendor/...`,
`VendorSidebar`, `logistics_providers`, `provider_id`, `ProviderContext`. Principle 7 says
otherwise. Tracked under D47.

### Role model (confirmed S37)

`businessType: 'buyer'` → buyer UI. **Any other businessType → seller UI.** A seller acting as a
buyer uses a separate account. KYC / Nostr / Anon status is subtle context, not nav-level UI.

---

## About Pam (user)

Solo founder, self-funded, has vendors lined up to test.

### How Pam works

**Skill level and style**
- Self-rates **2/10 on software skills** but is **architecturally sharp** — pushes back
  productively when something seems overcomplicated, or when an explanation doesn't match what
  she is observing.
- **Thinks in real small-business terms.** When a design question touches how sellers or buyers
  actually behave, ask her rather than assuming a pattern.
- **When a UX design question comes up, ask her to walk the seller/buyer flow in her own words
  before proposing. Her narration IS the spec.** In S39 she rejected an over-engineered "two-path"
  proposal and re-derived the correct design by narrating the flow step by step.
- Prefers fixing things properly over adding workarounds. If a workaround is unavoidable, log it
  in tech debt immediately with a clear explanation of why.

**How to hand over work**
- **Exact code, exact file path, exact line** — "find this → replace with this", step by step.
- **Give edits in ONE form, never two.** Either a complete file to overwrite, or find/paste
  blocks — never both for the same change. **Default to find/paste blocks.** See T16.
- **Before pasting into a file already modified this session,** `findstr` for one distinctive
  line from the new block. If it's already there, stop.
- **Verify line counts after any file handover.**
- **When giving curl commands with tokens or IDs, insert the real values yourself.** Placeholder
  text gets pasted literally — this happened twice in S38 and again in S39. If a value genuinely
  cannot exist yet (an ID created by the previous command), say so explicitly and re-issue the
  follow-up with the real value baked in once it exists.

**Terminal and environment**
- **Windows command prompt only — NOT PowerShell.** Documented in S37, S39 and S40; still
  violated in S40. cmd equivalents are in T15.
- **She is "Pam".** `chris` is the Windows username, not what to call her.
- Runs diagnostic commands herself when asked precisely — give exact commands, wait for exact
  output, don't assume.
- Pastes files and raw terminal output directly into chat. **Read these literally and completely
  before diagnosing.** Files pasted this way can be read fully — no `type` command needed.
- **Attachments sometimes arrive empty.** Say so before relying on them. See T14.

**Working rhythm**
- Cross-checks every file change before proceeding — and **cross-check her edits too.** S39's
  tech-debt paste landed R24 inside R23's body and was caught only on review.
- **Dislikes multi-question dropdown UI for simple clarifying questions.** Ask directly in prose.
- **ONE commit per logical change, only after full testing passes. Untested code is never
  committed.** S39 deliberately left drafted two-door edits out of its commit for this reason.
- Wants tech debt entries added **the same turn** something is deferred, with the ID checked
  against the live doc first — **never guess a number, view the doc.**
- **Watches session length.** Toward the end of a session, tell her honestly how much room
  remains and secure completed work (commit + handover) before starting anything new. She would
  rather stop clean than get cut off mid-build.

---

## Documentation discipline

Four documents, four jobs. Confusing them is what caused the S39 → S40 knowledge loss.

| Document | Job | Lifecycle |
|---|---|---|
| `TECH_DEBT.md` | Known problems, numbered B/D/R | Cumulative, never deleted, `✅ Fixed S<N>` |
| `TROUBLESHOOTING.md` | Symptom → cause → fix | Cumulative, never pruned |
| `OPERATIONS.md` (this file) | Standing context and working rules | Edited in place |
| `session-handovers/<N>.md` | What happened in session N only | Fresh each session, never restates the above |
| `specs/logistics-pool/LOGISTICS_ARCHITECTURE.md` | Logistics design spec — actor model, fee model, flows | Edited in place. **L17: Section 3 has a fee contradiction, and an "Architecture doc additions" block at ~line 305 was never merged in** |

**The promotion rule:** anything durable discovered mid-session goes into the right standing doc
**the same turn it is discovered**, not at handover time. A session handover may only contain
what became true for the first time in that session.

### Tech debt stance
Small fixes immediate. Architectural items go in `TECH_DEBT.md`, scheduled, never deleted.
Numbering (B / D / R series) must be checked against the live doc before assigning a new ID.

---

## Server start commands

| Terminal | What | Command |
|---|---|---|
| 1 | Protocol API (3000) | `cd C:\Users\chris\marketplace-protocol` → `npm run dev:api` |
| 2 | Stripe listener (optional) | `stripe listen --forward-to localhost:3000/api/v1/payments/stripe/webhook` |
| 3 | Rangkai marketplace (3001) | `cd rangkai-marketplace` → `npm run dev` |
| 4 | Logistics marketplace (3002) | `cd logistics-marketplace` → `npm run dev` |

**Before any testing:** confirm Supabase is awake. `/health` will not tell you — see T1.

**SDK rebuild (D25):** `cd packages\sdk && npm run build`. Verify with `dir node_modules\@rangkai`
→ `<JUNCTION>`. No reinstall needed since S37.

---

## Browsers and identities

| Browser | Role | Account |
|---|---|---|
| Firefox | Seller | Bitshop |
| Chrome | Buyer | Bitty Buy |
| Edge | Logistics | BitHaul |

**Always verify which account a browser is actually logged in as before UI testing** — see T13.

### Identities

| Name | Role | Credentials | IDs |
|---|---|---|---|
| **Bitshop** | Seller, KYC | `testBit2@test.com` / `bitshop123` | DID `did:rangkai:12a8b3ab-54f7-4133-ba8b-6b5ee2ae97c4` |
| **Bitty Buy** | Buyer, KYC | `bittybuy@bitbit.com` / `bittybuy123` | DID `did:rangkai:77216b3f-48bd-4c3f-ac47-6bf8f078c599` |
| **BitHaul** | Logistics, KYC | `BitHaul@123.com` / `BitHaul123` | Provider `4ac9c4ca-8022-4b9d-b12e-ce5200f39af1`, DID `did:rangkai:57cbd851-17fe-4a7d-80fb-83bd378bf8c1` |
| **Hash Heel** | Seller #2, KYC (confirmed S39) | `hashheel@test.com` / `hashheel123` | DID `did:rangkai:76f90715-8dfa-434f-8cec-7abd3e3a6eef` |
| **SatsFleet Express** | Logistics — **API-only, cannot log in** | none — see T17 | Provider `199e37cb-a0a4-4962-9dc5-615991f617b1`, DID `did:rangkai:2366113c-959c-4285-90f0-e7f71432e20e` |

**The SatsFleet / BitHaul inversion matters for B20 and B21:** SatsFleet has rich capability data
but cannot log in; BitHaul can log in but has none. S30 hand-wrote SatsFleet's routes, modes and
door flags via SQL. **No self-registered provider gets them.**

---

## Test data

### Products — verified S41 against the database

Ownership, status and incoterm confirmed by direct query. S39's record was accurate, including
the S38 ownership correction. Re-run the query in T13 rather than trusting this table blind —
it is a snapshot, and S41's own testing changed RFQ state on two of these products.

| Product | ID | Owner | Status | Incoterm |
|---|---|---|---|---|
| test incoterm FOB | `54b33fc2-022a-43db-b646-b82fa2cff071` | Bitshop | active | FOB |
| test incoterm without estimate | `2ad8bcda-f581-43d2-8497-20c66474e640` | Bitshop | draft | DAP |
| test incoterm | `4fbbea3f-0f2e-4a85-98d2-99faa1a4fa20` | Bitshop | active | DAP |
| r21 gate test | `4983c879-d91a-4d63-85d9-295482bdf636` | Bitshop | draft | DAP |
| estimate test boots | `305c3803-9c78-44b0-a1a6-fd2703ef54d8` | **Hash Heel** | active | DAP |
| brazilian leather sandals | `f4e8a3d2-9c1b-4a67-8e42-3d7f91a25b60` | **Hash Heel** | active | DAP |
| custom | `bad3b0e0-5b97-413a-8c5c-cfd3812a51bd` | Bitshop | active | **DDP** |
| handmade leather boots | `6652da96-3bad-4932-8a12-e56659bc0881` | Bitshop | active | DAP |

**Open RFQs after S41's D43 testing:**

| RFQ | Product | Requester | Target | Note |
|---|---|---|---|---|
| `abc27f8b` | custom | Bitshop | broadcast | refreshed in testing — weight now 2.4 kg |
| `de018eae` | custom | Bitshop | broadcast | **pre-existing duplicate**, not collapsed by D43 |
| `aa052543` | estimate test boots | Hash Heel | broadcast | — |
| `c6eb839c` | test incoterm | Bitshop | broadcast | — |
| `d4cc2d30` | handmade leather boots | Bitshop | broadcast | **expired 2026-08-01, still served** (B25); carries stale 1.5 kg |
| `cc2f9c9b` | r21 gate test | Bitshop | broadcast | created by S41 Test 3 |
| `c5d3f94c` | handmade leather boots | Bitty Buy | broadcast | created by S41 Test 5a, destination now MY |
| `deb26013` | handmade leather boots | Bitty Buy | BitHaul | created by S41 Test 5d — direct request |

`de018eae` is worth understanding before cleaning it up. D43 stops new duplicates; it does not
collapse existing ones, because the oldest open row is the one it refreshes and the rest are
left alone. Confirm nothing references `quote_requests` before deleting — the T8 lesson.

### Test-data rules
- **Never DELETE from `shipping_quotes`** without excluding order-referenced rows — see T8.
- **Test user naming convention:** thematic names tied to what is being tested ("Bit*" for Bitcoin
  payment tests, "Logi*" for logistics flows), so ghost data stays identifiable in DB queries.
- **Save every reusable Supabase query as a named snippet** prefixed with the session — see T21.

### `logistics_providers` columns (confirmed S40)
`id`, `business_name`, `identity_did`, `service_regions` (NOT NULL), `shipping_methods` (NOT NULL),
`insurance_available`, `average_rating`, `total_deliveries`, `created_at`, `routes` (jsonb),
`modes`, `incoterms_supported`, `door_pickup`, `door_delivery`, `weight_min_kg`, `weight_max_kg`.
**No `updated_at`. No warehousing field** (D47).

**Known inconsistency:** SatsFleet's `service_regions` (MY, SG, US, CA, GB) and its `routes`
(which include DE and AU) disagree, with no way to tell which is intended — B22.

### Provider fixture cleanup — designed S40, NOT executed
Set the two providers deliberately different so a capability filter is provably *working* rather
than provably *rendering*:
- **SatsFleet** — full service: `air_express` + `air_freight` + `sea_lcl`, door pickup and
  delivery, DAP/DDP/FOB, wide routes, 0.1–500 kg.
- **BitHaul** — deliberately narrow: `sea_lcl` only, no door pickup, DAP/DDP only, MY→SG only,
  0.5–30 kg.

Then a 24.5 kg / 0.42 CBM footwear RFQ matches both; a 300 kg one matches only SatsFleet; an FOB
one matches only SatsFleet.

**BitHaul must be given explicit narrow capabilities, not left empty** — per B20, empty bypasses
the filter rather than testing it. **Do not run this until B22 resolves which field pair is
authoritative.**

---

## Standing design decisions

Recorded so they are not re-litigated. Full reasoning in the linked tech debt entries.

**Auto-broadcast stays the default, with seller control added (D44).** Logistics deserves the
chance to pitch and the seller has final say on who ships. But the seller must also be able to
not broadcast at all, browse the pool, and approach a specific provider directly. The framing that
settled it: **auto-fire was already the status quo**, so "manual-only" would have meant *removing*
working L12 behaviour, not declining to add something. The empty-pool argument for a manual button
is weak — an RFQ into an empty pool costs nothing; the button's real value is control and
sequencing, which survives once the pool fills.

**Logistics genuinely do need Incoterms (D47).** Incoterm defines where the logistics job starts
and stops and who clears customs. DDP means the carrier clears import customs and fronts duty;
DAP means they stop at the door with duty unpaid; FOB is origin-side only. Same two cities, three
different jobs, three prices. What is wrong is the *presentation* — ask it in operator language
("can you clear import customs and advance duty?"), not as a bare Incoterm multi-select.

**Do not build a packing optimiser (D46).** Bin-packing is hard and a confident wrong answer is
worse than none. Collect the carton spec every manufacturer with an MOQ already has (units per
carton, carton dimensions, carton gross weight) and compute cartons, CBM, actual, volumetric and
chargeable weight from it. Arithmetic, not optimisation.

**Four v1 Incoterms only** — EXW, FOB, DAP, DDP. No expansion to all 11 yet.

---

**END OF OPERATIONS AND STANDING CONTEXT**