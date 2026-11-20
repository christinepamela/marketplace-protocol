# Payments, Escrow and Fees

**Status:** DRAFT, Session 44. Fee section checked against the code at `958364a`. Escrow and dispute sections still to cross-check.

---

## Fee principles

*(Decided S28 to S30, recorded in `archive/session-handovers/28.md` and `30.md`.)*

- The protocol takes **0.5% from the seller's payout and 0.5% from the logistics payout**, at escrow release.
- **Nothing is added to the buyer's total.** The buyer pays product plus logistics only.
- Why so low: small businesses cannot afford more. This is part of the purpose of the protocol.
- v1 currency is USD.

## What the code actually does

| Piece | Status | Where |
|---|---|---|
| 0.5% off the seller on a Bitcoin payout | **BUILT** | `src/core/layer2-transaction/bitcoin.service.ts` line 334 (`0.005`) |
| 0.5% off both seller and logistics on a Bitcoin split payout | **BUILT, not tested end to end** (B1, L10) | same file, line 510 (`0.995`) |
| 0.5% off the seller on a Stripe payout | **PARTIAL** | `payment-router.service.ts` line 135, default in `stripe.adapter.ts` line 157 |
| Logistics 0.5% on a Stripe payout | **Not built** | see "Gaps" below |
| Marketplace (client) fee | **PARTIAL**: calculated and stored, never paid out | `order.service.ts` `calculateFees`, line 450 |
| Governance can change fees | **PARTIAL**: writes a setting nobody reads | `layer6-governance/execution.service.ts` lines 143 to 200 |
| Fee distribution to protocol, marketplace and seller | **Mock, never called** | `fee.service.ts` (only exported, no caller) |
| Payment processing fee (Stripe 2.9% + $0.30) | **Not applied by default** | `calculateFees` only runs it when `paymentMethodFees` is set, and the default config leaves it unset |

`DEFAULT_FEE_CONFIG` (`layer2-transaction/types.ts`) is protocol 0, marketplace 0. The comment above it records the S30 decision. The 0.5% is not part of this config. It is a hard-coded number in four places.

## Gaps found in S44

Found by reading the code. None have been run.

1. **The 0.5% is hard-coded in four places** (Bitcoin payout, Bitcoin split payout, payment router, Stripe adapter default). Nothing reads one setting.
2. **Governance fee changes do nothing.** `update_protocol_fee` and `update_client_fee` write to the `protocol_parameters` table. Nothing in `src` reads that table. `OrderService` takes its fees from `DEFAULT_FEE_CONFIG` or from a config passed in, and every caller constructs it with no config.
3. **Governance limits contradict the principle.** Governance accepts a protocol fee of 0 to 10%, while the principle says 0.5% and never higher. The marketplace fee limit is 0 to 5%.
4. **The marketplace fee is never collected.** It is computed and stored on the order, but no payout deducts it, and the code that would distribute it (`fee.service.ts`) is a mock that no route calls.
5. **Stripe payouts pay the whole order total to the seller.** `executeVendorPayout` passes `order.total`, which is product plus logistics, to the seller with 0.5% taken off. Logistics gets nothing and the second 0.5% is never taken. The Bitcoin path splits correctly.
6. **Stripe payouts are not live.** The adapter's transfer uses the seller's DID where a Stripe Connect account ID belongs, and its own comments say Connect is a "Phase 2 requirement". Failures fall back to a manual payout flag.
7. **Protocol fee income is not tracked.** On Bitcoin the fee stays behind in the escrow address "for periodic sweeping". Nothing records or sweeps it.

## Decisions (Pam, S44)

1. **The protocol fee is 0.5% and never higher.** Governance may not raise it above 0.5%. This replaces the current 0 to 10% limit. (Read as: governance may lower it, never raise it above 0.5%. Confirm.)
2. **The marketplace fee must be collected.** It is deducted at payout, like the protocol's 0.5%.
3. **Stripe payouts follow the Bitcoin payout:** seller and logistics paid separately, 0.5% off each.
4. **Fee income must be tracked,** including how many orders, sellers, buyers and marketplaces the protocol serves, in real time. Marketplaces get the same for their own marketplace.
5. **Marketplace fee:** default 2%, limit stays 0 to 5% (see below).

## Marketplace fee

*(Pam, S44.)*

- **Default fee: 2%.** Decided.
- **Limit: 0 to 5%**, as the code has it today. Decided. The earlier idea of an 8% cap is withdrawn.
- **Free for the first few months:** a proposal, not agreed. It would be a per-marketplace end date.
- **Collected at payout,** deducted from the seller's payout like the protocol's 0.5%. Decided.
- **Each marketplace gets a live view** of its own income and orders, like the protocol's.

Why a limit at all: it protects small sellers and keeps marketplaces comparable. It only covers money that flows through the protocol, so a marketplace can still earn elsewhere (subscriptions, paid placement, logistics markups).

To build: a marketplace registry holding each marketplace's fee and free-period end date (D50), the payout deduction (B28), and the ledger and live statistics (D51).

## Payment rails

| Rail | Status |
|---|---|
| Stripe (card) | **PARTIAL**: payment in works, payout to sellers not live (gap 6) |
| Bitcoin on-chain | **BUILT and tested** |
| BTCPay | **PARTIAL**: adapter and webhook route exist |
| Lightning | **PLANNED**: the order route returns "not yet available". Needs a node; parked until hardware allows. On the checklist. |
| PayPal | Not built, not planned |

Block's tools: Cash App Pay is partner-only through payment providers, and Lightning Dev Kit's server states it is not production-ready. Neither is a v1 option. Check whether Stripe offers Cash App Pay on Pam's account.

## Custody (v1)

The Bitcoin escrow wallet is derived from a mnemonic held in the server environment, so the protocol controls the escrow addresses. **Accepted for v1** (Pam, S44). The end state is not yet decided.

## Escrow, order states and disputes

*Checked against the code at `958364a`, S44. Read, not run. Decisions Pam still has to make are at the end.*

### Order states

There are 12: `draft`, `payment_pending`, `payment_failed`, `paid`, `confirmed`, `processing`, `shipped`, `delivered`, `completed`, `cancelled`, `disputed`, `refunded` (`layer2-transaction/types.ts`, `VALID_STATE_TRANSITIONS`).

| Step | Who triggers it | Route |
|---|---|---|
| Paid | The system, when payment is confirmed (Bitcoin: scheduler checks every 60 seconds) | scheduler, Stripe webhook |
| Confirmed | Seller | `POST /orders/:id/confirm` |
| Shipped | Seller | `POST /orders/:id/ship` |
| Delivered | Buyer or the logistics provider, or the tracking service when a shipment is marked delivered | `POST /orders/:id/deliver`, `tracking.service.ts` |
| Completed | Buyer (releases escrow) | `POST /orders/:id/complete` |

The state machine allows a dispute from `confirmed`, `processing`, `shipped`, `delivered` and `completed`. The dispute service accepts only `delivered`.

### Escrow

- Escrow is a database record with a status: `held`, `released`, `refunded` or `disputed`. It is created when payment is confirmed.
- The default hold is 7 days from payment. A job runs every 5 minutes and releases a held escrow once its time has passed and the order is `delivered`.
- The buyer can also release it early by completing the order.
- **Release and refund change the database status only.** No code path moves money when escrow is released. Payout happens only if someone calls `POST /bitcoin/vendor-payout` or `/bitcoin/split-payout` by hand.

### Disputes

1. Only the buyer can open one, only on a `delivered` order, within **72 hours** of delivery, one per order. Opening it flags the order and the escrow as `disputed`.
2. The seller has **48 hours** to respond. The deadline is saved but nothing enforces it.
3. When the seller responds, the system tries to resolve it automatically:
   - non-receipt with a "delivered" tracking event: seller wins
   - non-receipt with no tracking number: full refund
   - quality with buyer photos and no seller counter-evidence: full refund
   - logistics issue: full refund
   - change of mind: no refund
   - anything else, or conflicting photos: escalate to arbitration
4. Resolution updates the dispute, the escrow and the order (`refunded` or `completed`). It does not move money. A partial refund is only flagged as needing a manual split.
5. Evidence is stored on the dispute, and every step is logged as a dispute event.

### Gaps found

Logged in `tech_debt.md` as B31 to B34, D56 and D57.

1. **The payout routes need only a login.** Anyone with a valid token can call them, and they take the destination address and amounts from the request. They check only that the order is delivered or completed (B31).
2. **No money moves automatically** on release, completion or dispute resolution (B32).
3. **Auto-release can pay the seller inside the dispute window.** The release time is payment plus 7 days, and the only other check is "delivered". An order delivered on day 6 is released on day 7, 24 hours into the 72-hour window (B33).
4. **Arbitration is a dead end.** Nothing calls `resolveDispute` outside the service, and no route lets anyone resolve one. The 48-hour seller deadline is never checked (B34).
5. **A buyer cannot dispute an order that never arrives** (D56).
6. **The window is stated three ways:** 72 hours in the service, 7 days in the default escrow rules, and a governance action to change it that nothing reads.
7. **Status changes are logged as made by "system"** and not by the person (D57).

## Dispute and freeze model (S44)

**Status:** Confirmed by Pam on 19 Nov 2026 unless marked **Proposal**. None of it is built yet (see D60 to D63 in `tech_debt.md`).

**Design rule (Pam, S44):** assume the protocol has no people behind it, only a system. Anything the protocol does on its own must therefore be an automatic rule, not a judgement call.

### Starting point: B2B, not B2C

Orders are between businesses, and a manufacturer spends real money to make the goods. A buyer cannot return goods because they changed their mind. A dispute needs a clear reason that was agreed beforehand.

For reference, Alibaba's Trade Assurance covers non-shipment by the agreed date and mismatch with the agreed quality specification. It does not cover a change of mind, or quality preferences that were not written into the contract (Alibaba seller guides, linked in Sources). Alibaba also supports deposit and balance terms such as 30/70 and 50% deposit, so "no deposit option" is not quite right.

### Grounds for dispute (Proposal)

A closed list, each one tied to something agreed at order time:

1. **Not shipped** by the agreed ship-by date (order date plus lead time, plus the grace period below).
2. **Not delivered** by the expected delivery date plus the grace period below, shown by tracking.
3. **Not as agreed:** goods do not match the listed specification, or the approved sample.
4. **Wrong quantity.**
5. **Damaged in transit.**

Not a ground: change of mind, or a preference that was not in the listing or the sample. The code's `change_of_mind` type is already an automatic "no refund". It can stay as a recorded rejection.

### Samples (Confirmed)

`OrderType` already has `sample`, `wholesale` and `custom`, and products already have a sample option and price. What is missing is the link between them.

When a buyer approves a sample, the protocol stores a record of that sample (photos, specification, date). A later bulk order refers to it. That record is the benchmark for ground 3, so a bulk order that matches the approved sample cannot be disputed for quality.

### Deposits (Confirmed: later, and keep it simple)

v1 stays full payment into escrow, as now. Small manufacturers who must buy materials first are the real need, so a seller-set advance (for example up to 30%, released when the seller confirms the order) is a later option. It needs a reputation threshold, because an advance is money the buyer cannot get back from escrow.

### The window after delivery (Confirmed)

Default **7 days**. The seller can offer 14 or 30 days. The window is shown to the buyer before paying and saved on the order at checkout, so the seller cannot change it afterwards. A shorter window pays the seller sooner, and a longer one is more reassuring to the buyer. If the buyer confirms receipt early, escrow releases immediately.

### Who decides (Confirmed)

- **The marketplace entrepreneur arbitrates.** Funds stay with the protocol. When the marketplace records its ruling and its reason, **the protocol releases the funds automatically**, to the buyer, the seller, or a split. **Large or overridden rulings wait 24 hours first** (Pam, S44: "just to be safe"). Bitcoin payouts cannot be reversed, and the hold gives time to freeze a ruling that breaks the rules. **Large** means an order worth **USD 5,000 or more** (**Confirmed by Pam, 19 Nov 2026**; it is one governance setting and can change later). **Overridden** means the payout follows a protocol freeze or override. Smaller rulings release at once. The 24-hour period is also a setting that can be shortened later.
- **Release runs the payout automatically** (seller and logistics paid separately, fees taken). No manual call.
- **Nobody is trusted to be honest, so the rails limit what a ruling can do (Proposal).** A ruling can only direct funds to the buyer's or seller's (and logistics provider's) payout details already on the order. A dishonest marketplace can pick the wrong winner. It cannot send the money anywhere else.
- A marketplace cannot rule on an order where it, or an account it controls, is the seller or the buyer (Proposal).
- Every ruling is a public record with its reason, and each marketplace has a track record (share of rulings for each side, how many were overturned). A new marketplace's record starts empty (Proposal).

### Automatic or by a person (Proposal)

To keep this about 99% automatic, split disputes by what decides them:

- **Decided by data, automatically:** not shipped by the date; not delivered per tracking; delivered per tracking with no counter-claim.
- **Decided by a person (the marketplace):** not as agreed, wrong quantity, damaged in transit.

### If the seller does not respond (Confirmed: 5 days)

*Scenario:* a buyer in Germany orders 500 ceramic mugs from a one-person workshop in Malaysia. On day 3 the buyer opens a dispute with photos of roughly 100 cracked mugs. The seller is at a trade fair, runs the business from a phone, and usually answers on WhatsApp, not the platform. Forty-eight hours pass.

- **Automatic full refund** would refund 500 mugs because of 100 cracked ones, and punishes a small seller for being away.
- **Escalating straight to the marketplace** is fairer but gives the seller no real chance to answer.

Proposal: silence is not an admission.
- Give a response time of **5 days**, not 48 hours, with reminders on every channel the seller has.
- After that, escalate to the marketplace flagged "seller did not respond". The arbiter rules on the buyer's evidence.
- Automatic outcomes stay only for the data-decided grounds above.

### Disputes where a party is anonymous (Pam, S44: automatic only)

No person rules on a dispute where the buyer or the seller is anonymous. The protocol decides by rule alone. This is the old Layer 4 spec's position, and it fits the protocol having no people behind it.

- **Facts decided by data, as for everyone:** not shipped by the date plus grace, not delivered by tracking plus grace.
- **Judgement grounds** (not as agreed, wrong quantity, damaged in transit) cannot be judged by a rule. Proposal, to confirm: the buyer files evidence in the window, the seller has 5 days to respond. If the seller accepts, the protocol pays out as accepted. If the parties agree on a split in the room, it pays out the split. If they do not agree within 30 days of the window ending, the funds follow the tracking: released to the seller if delivered, refunded to the buyer if not.
- This is weaker protection than a marketplace ruling, by design. It is part of why anonymous identities start with the lowest trust score.

### Goal: 99% automatic, and learning

The aim is that the protocol resolves about 99% of disputes automatically, fairly and correctly (Pam, S44, matching the old Layer 4 spec). It gets there in steps:
1. Every ruling and its reason is recorded, with the evidence type and the outcome.
2. Rules are extended where the rulings show a clear pattern, for example which evidence a marketplace accepted for damage in transit.
3. A model may suggest new rules from the history. It only suggests. A rule change goes through governance, so the protocol never changes how it rules silently.
4. Fairness is measured: share of rulings for each side, how many were overturned, and how often automatic outcomes were disputed.

### Grace periods (Confirmed: automatic 3 days; extension by approval)

- **Automatic grace: 3 days** after the ship-by date and after the expected delivery date. No one has to ask.
- **Extension:** the seller can ask for more time. The **buyer must approve**. Without approval, the dispute can be opened once the 3 days end.
- **Extensions are capped at 30 days in total** per order (Pam, S44). Each extension names a new date, and the request and the buyer's approval are both recorded on the order.

### Who can freeze funds

Freezing is where governments or bad actors can step in, so it is limited and always visible.

| Who | Can freeze | Limits (Proposal) |
|---|---|---|
| The dispute itself | Yes, automatically when a dispute opens | Neutral, nobody chooses it |
| The marketplace | Yes, on orders in its own marketplace | Reason recorded, time-limited, cannot touch another marketplace's orders |
| The protocol | Yes, and can override a marketplace | Only for the justifications below, each one logged |

A freeze only holds money. It never moves money to the protocol or to a third party. When it ends, the funds go to the buyer or the seller.

**Justifications for a protocol freeze or override (Confirmed: these five only):**

1. A party matches the sanctions screening the protocol already runs.
2. Evidence of payment fraud (for example a stolen card or a chargeback reported by the card network).
3. A technical emergency (a bug or exploit), using the emergency pause. Until signers are named, **Pam holds the pause** (Pam, S44: "me for now"). Once signers exist it needs 2 of the 3.
4. The marketplace has not ruled within a deadline (for example 30 days). The protocol applies a default rule.
5. A ruling breaks the rules (for example the conflict-of-interest rule above).

**Court orders are not a justification (Pam, S44).** The protocol has KYC and anonymous users and no people behind it. A court that wants to act against a party deals with the marketplace operator in its own jurisdiction.

Not justifications either: political requests, a government request without legal process, or disapproval of the goods (that is the marketplace's job).

Because the protocol has no people behind it, justifications 1, 2, 4 and 5 must be automatic rules. Only 3 involves people, and they are the council.

Each freeze goes in a public log with its justification (names may be hidden). Governance changes and the emergency pause need 2 of the 3 council signers. The signers are not named yet. The threshold holds as the number of signers grows, like Bitcoin's.

### Returns and who pays (Proposal, built on Pam's S44 rule, 20 Nov)

Pam's rule: **find out whether it is a real problem, then whose fault it is. The party at fault bears the cost.** A shipment fault is paid by the shipment side, a seller fault by the seller.

**Step 1. Is it a real problem?** All of these must hold.
- The reason is on the closed list of grounds (not shipped, not delivered, not as agreed, wrong quantity, damaged in transit).
- It is raised inside the window (7, 14 or 30 days after delivery).
- There is evidence: tracking, delivery paperwork, photos or video of the goods and packaging, the agreed specification or approved sample. Missing evidence is not proof of fault, and the claim fails.
- It is not a change of mind. That is never a ground.

**Step 2. Whose fault?**

| Cause | Evidence points to | Who bears the cost |
|---|---|---|
| Not as agreed, wrong quantity, defect, poor packing | The seller | **Seller** |
| Damaged or lost in transit, delay beyond the quote | The carrier | **Logistics provider**, through their insurance |
| Wrong address or order details, or buyer unavailable | The buyer | **Buyer** |
| No fault can be shown | Nobody | The party who bore the loss; no refund |

**Step 3. Remedy.** The ruling picks the lightest one that fixes the loss: replacement, credit, partial refund, or full refund. A physical return happens only for high-value goods and only if the seller agrees. **Return freight is paid by the party at fault.** If nobody is at fault there is no return.

**Step 4. Paying it.** The seller's share comes out of the seller's payout, held in escrow. The carrier's share is the hard part: the carrier is normally paid at delivery, before a damage claim. Proposal: hold back from the carrier payout only an amount covering a claim that is open, and otherwise settle with the carrier's insurance outside the protocol. Not decided.

### Still open

1. Whether the sample approval record is in v1 or later.
2. The automatic rule for judgement grounds when a party is anonymous (proposal above).
3. Pam as the only holder of the emergency pause is a single point of control. It is acceptable until signers are named, and is recorded in B35.
4. Returns: the criteria are below (Proposal). Open inside them: how the protocol recovers money from a carrier that has already been paid (R27).

---

Sources: `archive/session-handovers/28.md` (purpose), `30.md` (fee model), `31.md` (split payout), and the code paths named above. Alibaba Trade Assurance coverage and deposit terms: [T/T and Trade Assurance payment guide](https://seller.alibaba.com/blogs/2026/southeast-asia/b2b-trade/tt-trade-assurance-payment-security-guide-alibaba), [30% deposit terms](https://seller.alibaba.com/blogs/2026/southeast-asia/apparel-accessories/30-percent-deposit-payment-terms-guide-alibaba-b2b).