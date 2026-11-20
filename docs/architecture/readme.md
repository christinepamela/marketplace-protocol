# Rangkai Architecture

**Status:** DRAFT, Session 44. Built from the code at `958364a`, not from the old docs.
**Rule for this folder:** the code is the source of truth. Where a doc and the code disagree, the code wins, and the doc says so.

Each section is marked:
- **BUILT**: exists in code and works.
- **PARTIAL**: exists in code but unwired, mocked or incomplete.
- **PLANNED**: not in code.

---

## What Rangkai is

An open protocol for cross-border trade. It connects small manufacturers to global buyers through federated marketplaces, escrow payments (Bitcoin and fiat) and an open logistics pool.

It is a protocol that enables marketplaces, not a marketplace itself. Marketplace entrepreneurs set up their own marketplaces on it for their industry or country.

*(Pam's own words, S44. To be expanded with the "why", from the Medium pieces linked in `operations.md`.)*

## Who uses it

| Actor | What they do |
|---|---|
| Marketplace entrepreneurs | Set up marketplaces on the protocol and earn from them. Responsible for compliance in their own country. |
| Sellers | Manufacturers and resellers who list products. |
| Buyers | Businesses and individuals who find, order, pay and track. |
| Logistics | Air, sea, road and other carriers and intermediaries. KYC only. Full category list is parked under logistics. |

Sellers and buyers can be KYC, Nostr or anonymous (see `actors_and_trust.md`).

## Files in this folder

| File | Content | State |
|---|---|---|
| `readme.md` | This page | Draft |
| `payments_and_fees.md` | Payment rails, escrow, fee model, dispute and freeze model | **Drafted** |
| `layers.md` | Layers 0 to 6, each with status and code path | **All layers drafted**; 2 points to payments, 3 to logistics |
| `actors_and_trust.md` | KYC / Nostr / anonymous tiers, dos and don'ts, who is responsible | **Drafted** |
| `comms_and_nostr.md` | Merge of `NOSTR_ARCHITECTURE_RATIONALE.md` with what we learn from Buzz | **Drafted** |
| `ref_client.md` | How a marketplace entrepreneur builds on the protocol, from the real client code | **Drafted** |
| `logistics.md` | Logistics pool, categories, rules | **Drafted** |
| `diagrams/` | `01-global-trade-map.svg`, `02-functional.mmd`, `03-order-lifecycle.mmd` | **Drafted** |

## Diagrams

1. **Global trade map:** how small-business trade flows across countries through federated marketplaces, with the logistics pool underneath.
2. **Functional diagram:** federated marketplaces, buyers, sellers, search and logistics, and what each one talks to.
3. **Order lifecycle:** the order states, where the money sits and who triggers each step. Proposed third diagram, because the fee and escrow rules are the hardest part to hold in your head.

## Fate of the old docs (provisional)

| Old doc | Fate |
|---|---|
| `docs/ARCHITECTURE.md` | Replaced by this folder |
| `docs/NOSTR_ARCHITECTURE_RATIONALE.md` | Merged into `comms_and_nostr.md` |
| `docs/diagrams/*.mmd` | Replaced by new diagrams |
| `docs/specs/LAYER0` to `LAYER6` | Cross-checked against code, then folded into `layers.md` |
| `docs/specs/REF_CLIENT.md` | Replaced by `ref_client.md` here |
| `docs/specs/logistics-pool/*` | Folded into `logistics.md`. Removed S44. Parts 1 to 3 (screen and workflow detail) are in git history at `958364a` |
| `docs/project_structure.md` | Not yet checked |