# Communications and Nostr

**Status:** DRAFT, Session 44. Merges `NOSTR_ARCHITECTURE_RATIONALE.md` (Session 29) with what Pam decided in S44 after looking at Buzz. Nothing here is built yet. Tracked as R26, with D16, D17, D20 and D58 as constraints.

**What is built today:** nothing for chat. The protocol has a WebSocket endpoint (`/ws`) for live updates, and a Nostr identity type that is only a registered record (`nostrData`, no key login). No code in `src` sends or receives a Nostr event.

---

## What changed in S44

The Session 29 rationale assumed **public Nostr relays**, with no central operator. Pam's S44 decision is different: **build it like Buzz, with a likely centralised relay that the protocol runs.**

| | Session 29 rationale | S44 decision |
|---|---|---|
| Relay | Public relays anyone can run | **One relay run for Rangkai** (likely centralised). Others may be added later |
| Why | No single server to seize | Reliable delivery, moderation of order rooms, audit evidence, and no dependence on strangers' relays |
| Source of truth | Not stated | **Postgres** in v1. Nostr carries identity and communication |
| Encryption | NIP-44 direct messages between two people | Still the goal for private threads; group rooms need a design (see open questions) |
| Search | Not Nostr: Rangkai owns the index | Unchanged |

The reasons in the old rationale for key-based identity still stand. The reasons for public relays are traded away, knowingly. A centralised relay can be seized, so the protocol must keep working if it is down (Postgres stays the record of orders and money).

---

## What Nostr is, in one paragraph

Nostr is a set of rules for **keys, events and relays**. A key pair (secp256k1, the same curve as Bitcoin) is an identity. An event is a signed message with a type number (its *kind*). A relay stores events and passes them to subscribers. Rangkai uses it as plumbing. Users see a chat window, not Nostr.

---

## What Nostr does and does not do in Rangkai

**Does:**
- Gives each user a key-based identity that no platform can revoke (target state, see D58).
- Carries order messaging between buyer, seller and logistics provider.
- Later: carries events between marketplaces (see D16).

**Does not:**
- **Search.** Nostr search is unreliable (every client indexes differently, relays come and go). Rangkai owns the index (`layers.md`, Layer 1).
- **Money.** Bitcoin and Stripe handle payments (`payments_and_fees.md`).
- **Sign users in today.** Users sign in with Rangkai. Key login is part of R26.
- **Expose users to the general Nostr network.** Rangkai clients never subscribe to the public firehose. Subscriptions are limited to specific kinds and specific authors. This is a hard rule (D20).
- **Force Nostr on every marketplace.** It is the reference approach, not a requirement.

---

## What we take from Buzz

Buzz (`block/buzz`, Apache-2.0) is a design reference, not a dependency. Pam chose these five ideas:

| Idea | What it means for Rangkai |
|---|---|
| **Centralised relay** | The protocol runs the relay for v1 |
| **Group rooms** | One room per order (buyer, seller, logistics provider) and one for each dispute (adds the marketplace arbiter) |
| **Media** | Photos and documents for evidence, tracking and samples are stored by the protocol, linked from the room |
| **Search over messages** | Search that respects who is allowed to read the room. Not the product search |
| **Audit log** | A tamper-evident record (each entry includes the hash of the one before) so dispute evidence can be trusted |

Buzz has **no commerce events**. Rangkai defines its own event kinds (for example order created, quote requested, quote given, shipped, dispute opened, ruling recorded). The Layer 5 spec's example kind `70001` is a placeholder, not a decision.

---

## How it fits with the money and the records

- **Postgres stays the source of truth** for orders, escrow, payouts, ratings and disputes. A message never moves money or changes an order by itself.
- A room is created when an order is created and closed some time after it completes. A dispute adds the marketplace arbiter to the room.
- The audit log is what a dispute ruling points to as evidence (`payments_and_fees.md`).

---

## Dispute evidence: unilateral disclosure (kept from S29)

If messages are private between the parties, a marketplace arbiter needs a way to see them.

- Either party can hand their copy of the thread to the arbiter **without the other party's consent**. They decrypt it with their own key.
- The other party is **told immediately** and can add their own context or messages.
- Refusing to take part counts against them.
- The arbiter cannot read order messages on their own. There must be a dispute and a party who hands the thread in.
- The promise to users is: *this conversation will not be made public.* It is not: *it can never be used in a dispute.*

Why this and not "both must agree": a bad actor would refuse and hide the evidence.

**Open:** in a centralised, group-room design, the relay operator could read rooms unless messages are encrypted to the members. Decide whether v1 rooms are encrypted end to end, or readable by the protocol and the marketplace. If readable, the privacy promise above must say so.

---

## Identity (target state)

Every identity type uses the same secp256k1 key underneath. By default each user gets a **fresh key**, separate from any public Nostr key, so a subpoena aimed at someone's public Nostr activity does not reveal their Rangkai trade. Using one key for both is opt-in.

Today the code uses UUID-based DIDs with email and password for KYC users. Key login for Nostr users is a build item (R26), and whether KYC users move to keys is D58.

---

## Open questions

1. **Encryption of rooms.** End-to-end among members, or readable by the protocol and marketplace? Affects the audit log, search over messages and the disclosure design.
2. **Public channels** (D17). Pam wants curated Rangkai channels (seller advice, reviews, regional groups), not general Nostr. Moderation, per-marketplace or shared, and spam are undecided.
3. **Federation** (D16). A shared index, peer queries, or product events on Nostr plus a Rangkai-owned index. Still undecided. A central relay makes the first and third easier.
4. **Data load** (D20). Scoped subscriptions only, server-side aggregation, small kind definitions.
5. **Key recovery** for non-technical users. Frostr 2-of-3 is deferred (D18).
6. **Who runs the relay** and what happens to rooms if it goes down.

---

Sources: `NOSTR_ARCHITECTURE_RATIONALE.md` (S29, folded in here), `tech_debt.md` items R26, D16, D17, D18, D20, D58, and Pam's S44 decisions.