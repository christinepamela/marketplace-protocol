# Troubleshooting Reference

**Last updated:** 2026-11-11 (Session 43)
Companion docs: `operations.md`, `tech_debt.md`, `../archive/tech_debt_archive.md`, `session_template.md`, `../architecture/logistics.md`

---

## How to use this doc

Symptom, cause, fix, for things that have bitten us before. Look here before diagnosing from scratch. Add an entry the same turn you diagnose something non-obvious. When a cause is fixed, mark the entry `✅ Fixed S<N>` and leave it; the same symptom can come back from a different cause. (T1–T13 came from the S39 handover, T14–T23 from S40; they were pulled into this file in S41 so a handover can never drop them again.)

---

## Index

**Environment and servers** — T1, T14, T17, T26
**Publish, quotes and the gate** — T2, T3, T4, T5, T6, T7, T9
**RFQ pool and matching** — T18, T19, T20, T22, T25
**Database and test data** — T8, T13, T21, T24
**Build and tooling** — T11, T12, T10, T23
**Working-session mechanics** — T15, T16

---

## Environment and servers

### T1. Health endpoint says healthy but nothing works
**Symptom:** `/health` returns 200, but every real request fails or hangs.
**Cause:** the health check does not touch the database. Supabase pauses after ~1 week of
inactivity and `/health` cannot see it. The real tell is `[Scheduler] ... TypeError: fetch failed`
in the Terminal 1 (API) output.
**Fix:** restore the project at supabase.com/dashboard. Confirm real DB connectivity with a
login curl, never with `/health` — it returns an identity payload from the database *and*
hands you a working token in the same call:
```
curl -s -X POST http://localhost:3000/api/v1/identity/login -H "Content-Type: application/json" -d "{\"email\":\"testBit2@test.com\",\"password\":\"bitshop123\"}"
```
*Source: S39. Reaffirmed S40.*

### T14. An attachment or pasted document arrives empty
**Symptom:** a file is attached or a document block is pasted, but it has no content on the
other side. In S40 this silently blocked two tech debt items from being fixed at all, and S40
opened by claiming to have read the S39 handover when the attachment was in fact empty.
**Cause:** not fully understood. The observed pattern in S40: **files attached as files always
arrived intact; pasted document blocks arrived empty 7 times out of 7.**
**Fix:** **say out loud that the attachment is empty before doing anything else** — do not
proceed on an assumed reading. Ask for the content pasted into the message body, or attached
as a real file. Never infer content from a filename.
*Source: S40. Made an explicit opening check in S41.*

### T17. SatsFleet Express cannot log in / B5 403s on a fresh provider account
**Symptom:** login as SatsFleet Express fails; the logistics dashboard 403s on a provider
account that visibly exists in the database.
**Cause:** SatsFleet was registered 2026-07-02, **before B13 added email/password fields to the
logistics registration form.** Its identity row has `email: null` and no `password_hash`. It
has no credentials to log in with. This is also the root cause of the B5 dashboard 403s.
**Fix:** do not attempt a UI login as SatsFleet. **Decision taken S40: keep SatsFleet as an
API-only fixture and do all logistics UI testing as BitHaul.**
Provider `199e37cb-a0a4-4962-9dc5-615991f617b1`, identity
`did:rangkai:2366113c-959c-4285-90f0-e7f71432e20e`.
*Source: S40. Related: B5, B13.*

### T26. Coming back after weeks away
**Symptom:** after a gap, things are empty, rejected or oddly different.
**Cause:** Supabase pauses after about a week; access tokens last 36 hours; every open RFQ expires after 30 days and (since B25) vanishes from logistics' opportunities.
**Fix:** follow "Starting a session" in `operations.md`. Re-broadcasting an expired RFQ returns the same id with a new `expires_at` (D43).
*Source: S42.*

---

## Publish, quotes and the gate

### T2. Activating a product returns 400 "This product is sold DAP/DDP … it needs a shipping quote before it can go live"
**Symptom:** activation rejected with a long, specific error message.
**Cause:** R21's incoterm-aware publish gate, working exactly as designed. DAP/DDP means the
seller arranges main freight, so publish requires an accepted `seller_standing` quote.
**Fix:** satisfy it — either `POST /logistics/quotes/seller-estimate` (owner-only) or accept a
provider quote on the product's Quotes page — then re-activate. EXW/FOB products and anon
sellers are never gated.
*Source: S39.*

### T3. A product created via the API or the form is always `draft`
**Symptom:** you POST a product with `status: 'active'` and get back a draft.
**Cause:** by design. `createProduct()` hardcodes draft and the create schema strips `status`.
Activation is a separate `PUT {status:'active'}`, which is gated per T2. This is deliberate:
PUT is the *only* road to active, so a single gate at PUT covers the form's Publish button, the
eye-icon toggle on My Products, and raw API calls alike.
**Fix:** none needed. The form has done create-then-activate automatically since S39.
*Source: S39.*

### T4. `requireLogisticsQuote` sent to the API is silently ignored
**Symptom:** you set the field in a request and the stored value doesn't match.
**Cause:** by design since S39. It is **derived from the Incoterm** (DAP/DDP → true) at create
and on any incoterm change. Zod strips the field from incoming requests. The manual checkbox is
gone from the form. Rationale: Incoterm and "should the seller arrange shipping" are the same
question in two languages, and two controls could contradict each other.
**Fix:** none. Not a bug. Change the incoterm if you want to change the flag.
*Source: S39.*

### T5. Eye-icon "Activate" on My Products shows a long error message
**Symptom:** a wall of text in the alert instead of a short failure.
**Cause:** that is the server's gate reason, surfaced deliberately since S39. It was previously
swallowed behind a generic "Failed to update product status".
**Fix:** none. Read the message — it tells you what the product needs.
*Source: S39.*

### T6. Seller-estimate endpoint returns "already has a seller estimate" / "already has an accepted provider quote"
**Symptom:** cannot submit a second estimate.
**Cause:** working as designed — one accepted standing quote per product. D29's partial unique
index enforces this at schema level too.
**Fix:** to replace an estimate, accept a real provider quote; it auto-supersedes. There is no
edit-estimate path in v1.
*Source: S39.*

### T7. Product page shows no shipping block despite a known accepted quote
**Symptom:** the quote exists and is accepted, but the buyer-facing shipping block is absent.
**Cause:** check the quote's `context`. If it is `buyer_rfq`, display correctly ignores it. A
quote that *should* be `seller_standing` but is stamped `buyer_rfq` is **D40** — `acceptQuote()`
infers context from product-level RFQ history and misclassifies seller standing accepts.
**Fix (by hand, until D40 lands):**
```sql
UPDATE shipping_quotes SET context = 'seller_standing' WHERE id = '<id>';
```
*Source: S39. Related: D40, D35.*

### T9. A provider quote shows "(estimated)" unexpectedly
**Symptom:** a quote you know was firm now displays as estimated.
**Cause:** its `valid_until` has passed. This is L14's designed firm→estimated conversion, not a
bug. Note it is **not** the same as a seller estimate — those display "Seller's estimate".
**Fix:** none. D23 (notify the seller at the moment of conversion, since they bear the price
risk) is still open.
*Source: S39. Related: D23.*

---

## RFQ pool and matching

### T18. A logistics provider sees RFQs it does not match
**Symptom:** a provider sees an open RFQ that has nothing to do with it.
**Cause:** the matcher skips a filter when the provider has declared nothing for it. A provider with empty `routes` or `incoterms_supported` sees every RFQ (B20), and every provider who registers through the UI starts blank (B21). The incentive is inverted: a provider who declares its capabilities is the only kind that can be filtered out. A provider with declared capabilities **is** filtered: BitHaul (routes MY→SG, incoterms DAP/DDP) correctly did not see MY→MY or MY→DE requests on 2026-10-21.
**Fix:** open (B20 + B21 together). Do not read "a provider saw it" as proof that matching works. Query the provider row first (T25). The S40 claim that BitHaul was blank, and the D21 reopening built on it, were wrong and were withdrawn S42 (archive).
*Source: S40, corrected S42.*

### T19. An RFQ silently never reaches a provider that should match it
**Symptom:** a correctly configured provider does not see an opportunity, with no error anywhere.
**Cause:** `weight_min_kg` / `weight_max_kg` have **no degradation guard** — unlike routes and
incoterms, the bounds apply unconditionally whenever non-null. SatsFleet's 0.1 kg floor silently
drops any RFQ where weight arrived as `0`. Weight arrives as 0 or wildly wrong when the
unit-conversion bug fires (T22) or when MOQ is missing (D46) — a 0.7 kg unit at MOQ 35 is a
24.5 kg shipment, and volumetric at /5000 is 84 kg.
**Fix:** open, part of B20. When diagnosing a "missing" opportunity, check the RFQ's actual
`weight_kg` value in `quote_requests` before suspecting the matcher.
*Source: S40. Related: B20, D46.*

### T20. Duplicate open `quote_requests` rows for one product
**Symptom:** providers see the same opportunity two or more times.
**Cause:** before S41, each call to either RFQ endpoint inserted a new row (D43).
**Fix:** ✅ Fixed S41 (`1b247e6`). Both paths now refresh the existing open request and return `reused: true`. Duplicates created before S41 are not collapsed; `de018eae` is one. Find any with:
```sql
SELECT product_id, count(*) AS rfq_count,
       count(*) FILTER (WHERE status = 'open') AS open_count,
       min(created_at) AS first, max(created_at) AS last
FROM quote_requests
WHERE target_provider_id IS NULL
GROUP BY product_id
HAVING count(*) > 1;
```
*Source: S39, S40. Fixed S41.*

### T22. Shipping weight or dimensions are wrong by a unit factor
**Symptom:** a seller enters 3 lb or 12 inches and providers quote against 3 kg or 12 cm.
**Cause:** the product record deliberately stores the seller's chosen unit for display, so anything that forwards the raw number has this bug.
**Status:** the seller broadcast path is fixed (S40: `toKg()` / `toCm()` in `ProductForm`). **The buyer RFQ path still has it for dimensions** and also invents a 1 kg or 1 cm value when data is missing (B24). It has never been observed in data, because the one product tested stores centimetres. To reproduce, create a product in lb and inches (FOB or EXW, so it skips the publish gate) and request quotes as a buyer.
*Source: S40, S41. Related: B24.*

---

## Database and test data

### T8. Deleting test `shipping_quotes` fails with an FK error on `orders`
**Symptom:** a cleanup DELETE fails on a foreign key constraint.
**Cause:** `orders.logistics_quote_id` references `shipping_quotes`.
**Fix:** always exclude order-referenced rows:
```sql
AND id NOT IN (SELECT logistics_quote_id FROM orders WHERE logistics_quote_id IS NOT NULL)
```
*Source: S38, carried S39.*

### T13. Seller UI shows products under the wrong seller, or handover records don't match the DB
**Symptom:** the products list doesn't look like what the handover says that seller owns.
**Cause:** almost always the browser is logged in as a different seller than assumed. The S38
handover recorded product ownership incorrectly for exactly this reason — Firefox was logged in
as Hash Heel for part of the session, and "estimate test boots" and "brazilian leather sandals"
were recorded as Bitshop's when they are Hash Heel's.
**Fix:** check which account the browser is actually logged in as before UI testing. Ground truth
(saved snippet `products — ownership/status check`):
```sql
SELECT basic->>'name' AS name, vendor_did, status, incoterm FROM products ORDER BY created_at DESC;
```
*Source: S38 error, corrected S39.*

### T21. A query you wrote in the Supabase SQL editor is gone
**Symptom:** yesterday's query can't be found.
**Cause:** the editor only keeps queries that are **actively saved as named snippets**. It has
accumulated ~116 untitled ones that are effectively unfindable (D38).
**Fix:** save every reusable query as a named snippet, prefixed with the session
(`S41 — <what it does>`). Named so far: `R21 — derive require_logistics_quote from incoterm`,
`products — ownership/status check`, `S40 — product full shape (MOQ check)`,
`S40 — quote_requests broadcast payload`, `S40 — D43 duplicate confirmation`,
`S40 — D43 duplicate product identity`, `S40 — logistics_providers schema`.
*Source: S39. Related: D38.*

### T24. An RFQ shows a weight or destination that does not match the product
**Symptom:** a provider is quoting against figures that disagree with the product page.
**Cause:** `quote_requests` snapshots the shipment details when it is created or re-broadcast. A seller who edits a product without re-publishing leaves the old RFQ carrying the old numbers. Since S42 an expired RFQ is hidden from providers, so a stale one drops out at expiry instead of lingering, but it stays stale until the requester re-broadcasts. Example: `d4cc2d30` carries `weight_kg: 1.50` from 2026-07-02 while the product now says 0.5 kg.
**Fix:** re-broadcast to refresh the row, or read the product's `logistics` blob for ground truth. This is not B24 (a unit bug at write time). Both can produce a wrong weight, so check the RFQ's timestamp first.
*Source: S41, S42. Related: B24, B25, D43.*

### T25. A provider doesn't see an RFQ it expected
**Symptom:** an open RFQ for a route the provider arguably serves does not appear in its
opportunities list, with no error anywhere.
**Cause — check in this order:**
1. **Destination.** An RFQ that *names* a destination needs an exact origin+destination match in
   the provider's `routes`. A provider with MY→SG will not see MY→MY or MY→DE. An RFQ with a *null*
   destination matches any route from that origin.
2. **Incoterm.** If the provider declares `incoterms_supported`, the RFQ's incoterm must be in it.
3. **Weight bounds.** No degradation guard — see T19.
4. **Expired.** Since B25 (S42), an RFQ past `expires_at` is hidden. It still has `status = 'open'`.
5. **Limit.** The query returns the newest 50 only.
6. **Blank provider.** Empty `routes` / `incoterms_supported` skips those filters entirely (B20), so
   a blank provider sees *everything* — the opposite symptom.
**Fix:** look at the provider row and the RFQ row side by side.
```sql
SELECT business_name, routes, modes, incoterms_supported, door_pickup, door_delivery,
       weight_min_kg, weight_max_kg, service_regions
FROM logistics_providers
WHERE id = '4ac9c4ca-8022-4b9d-b12e-ce5200f39af1';
```
```sql
SELECT id, origin_country, destination_country, weight_kg, incoterm, expires_at, status
FROM quote_requests
WHERE id::text LIKE '<first 8 characters of the RFQ id>%';
```
To see exactly what a provider sees, log in as BitHaul and call the endpoint (cmd, one line):
```
node -e "(async()=>{const L=await fetch('http://localhost:3000/api/v1/identity/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:'BitHaul@123.com',password:'BitHaul123'})}).then(r=>r.json());if(!L.data){console.log(JSON.stringify(L));return}const O=await fetch('http://localhost:3000/api/v1/logistics/opportunities',{headers:{Authorization:'Bearer '+L.data.token}}).then(r=>r.json());if(!O.data){console.log(JSON.stringify(O));return}console.log('count',O.data.length);O.data.forEach(x=>console.log(x.id.slice(0,8),x.target_provider_id?'direct':'broadcast','expires',x.expires_at))})()"
```
It prints a count, then one line per RFQ: short id, direct or broadcast, expiry. Needs Node with
built-in `fetch` (the SDK already requires it). If it prints a JSON error object instead of a list,
that is the API's response — paste it, don't guess.
**Example (S42):** BitHaul saw 6 of 8 open RFQs. `c5d3f94c` (MY→MY) and `d4cc2d30` (MY→DE) were
withheld — cause 1 — because BitHaul's only route is MY→SG.
*Source: S42. Related: B20, B21, B22, B25, T18, T19.*

---

## Build and tooling

### T10. "getIdentity is not a function" in the browser console on product pages
**Symptom:** console error on every buyer product page; page still renders.
**Cause:** B17 — `sdk.identity.getIdentity` is missing or misnamed. It fails gracefully.
**Fix:** open. View `packages/sdk/src/modules/identity.ts`, find the real method name, fix the
call site in `rangkai-marketplace/lib/api/products.ts`. Unblocks D30 (vendor placeholder names).
*Source: S39. Related: B17, D30.*

### T11. SDK changes not taking effect
**Symptom:** you edit the SDK, the consuming app still runs the old code.
**Fix:**
```
cd packages\sdk && npm run build
```
Verify the junction with `dir node_modules\@rangkai` — it should show `<JUNCTION>`. No reinstall
has been needed since S37.
*Source: S39, D25. Reaffirmed S40.*

### T12. Trust / sanctions endpoint returns UNAUTHORIZED
**Cause:** no Bearer token.
**Fix:** log in first — see the curl in T1, which returns a usable token.
*Source: S39.*

### T23. `tsc --noEmit` reports errors even though the dev server runs fine
**Symptom:** the app builds and runs, but typechecking fails.
**Cause:** **Next dev transpiles via SWC without typechecking.** `rangkai-marketplace` has never
typechecked clean — 15 errors (B23). This is how a reference to a nonexistent
`formData.requireLogisticsQuote` field survived a commit in S39.
**Fix:** open (B23). Get the full list with `npx tsc --noEmit > tsc.txt 2>&1`. A green dev server
proves nothing about types.
*Source: S40. Related: B23, B18.*

---

## Working-session mechanics

### T15. A command fails with a syntax error in the terminal
**Symptom:** a command that "should work" errors out on Windows.
**Cause:** it was a PowerShell command. **Pam works exclusively in Windows command prompt.**
This has been documented in S37, S39 *and* S40, and was still repeatedly violated in S40.
**Fix:** cmd equivalents:

| Need | cmd |
|---|---|
| Print from line N+1 | `more +N file` |
| Numbered copy to select from | `findstr /n "." file > lines.txt` then open in notepad |
| Count lines | `find /c /v "" file` |
| Locate a string with line number | `findstr /n /c:"text" file` |

*Source: S37, S39, S40.*

### T16. A file has duplicated functions after applying an edit
**Symptom:** helpers appear twice; line count jumped unexpectedly.
**Cause:** the same change was handed over in **two incompatible forms** — a complete file, then
find/paste blocks for the same change, one message apart. In S40 this duplicated
`logisticsMaterialFieldsChanged`, `toKg` and `toCm`, and created a second
`sdk.logistics.requestQuote` call that would have **silently double-broadcast every publish**.
**Fix / prevention:**
- **Give edits in ONE form only.** Default to find/paste blocks. Never both for one change.
- **Before pasting into a file already modified this session,** `findstr` for one distinctive
  line from the new block. If it is already there, stop.
- **Verify line counts after any file handover.** The S40 duplication was caught only because
  1052 became 1112.
- Recovery, if it happens: revert to the last known-good complete file.
*Source: S40.*

---

**END OF TROUBLESHOOTING REFERENCE**