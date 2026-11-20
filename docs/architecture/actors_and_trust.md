# Actors and Trust

**Status:** DRAFT, Session 44. Built from Pam's own words and the code at `958364a`. Items marked *Not enforced* are decided but not in code. Each is a tech-debt item.

---

## Who uses Rangkai

| Actor | What they do | Identity allowed |
|---|---|---|
| **Marketplace entrepreneurs** | Set up a marketplace on the protocol for an industry or a country. Earn the marketplace fee. Responsible for compliance and legality in their own country. Arbitrate disputes. | KYC |
| **Sellers** | Manufacturers and resellers who list products, confirm orders and ship. | KYC, Nostr, anonymous |
| **Buyers** | Businesses and individuals who find products, order, pay into escrow and track. | KYC, Nostr, anonymous |
| **Logistics providers** | Air, sea, road, rail and other carriers and intermediaries who quote and move goods. | **KYC only** |

The protocol itself has no people behind it. It is a system of rules. Anything that needs judgement belongs to a marketplace entrepreneur. The only exception is the small council that can pause the protocol in a technical emergency (see `layers.md`, Layer 6).

---

## Three identity types

All three exist in code and all three stay (`layer0-identity/types.ts`). Each identity is a DID of the form `did:rangkai:<uuid>`.

| | KYC | Nostr | Anonymous |
|---|---|---|---|
| **Who it is for** | Registered businesses and people willing to be verified | People who want a portable key-based identity | People in persecuted or unfairly sanctioned countries, or who need privacy, who would otherwise be shut out of trade |
| **Starting trust score** | 75 | 35 | 20 |
| **Reputation multiplier** | 1.2 | 1.0 | 0.8 |
| **Log in** | Email and password; access token 1 hour, refresh token 30 days (defaults) | Registered only. Key login not built (R26) | Access token at registration (24 hours by default), no refresh |
| **Can use the logistics pool** | Yes | **Yes, once KYC is done** through a marketplace | **No.** They arrange their own logistics |
| **Sanctions screening** | At registration | Not checked | Not checked |
| **Pays into escrow** | Yes | Yes | Yes |
| **Dispute ruling** | By the marketplace | By the marketplace | **Automatic rules only**, no person rules |

Reputation starts at 50, adds 2 per completed transaction (up to 200), adds ratings, and subtracts 25 or 50 for a minor or major dispute, then applies the multiplier. The maximum is 500. The protocol signs a reputation proof with its own key, so anyone holding the public key can check it.

Sign-up must be **simple and light**. It is built for phones and for people with no formal training. Phone first.

---

## Who is responsible for what

| | Protocol | Marketplace entrepreneur | Seller |
|---|---|---|---|
| Proof, integrity and traceability of transactions | **Yes** | | |
| Escrow, split payout and fees | **Yes** | | |
| Legality of goods and trade in their country | | **Yes** | Follows the rules |
| KYC of its users, under its own country's rules | | **Yes** | |
| Ruling on disputes | | **Yes** | |
| Choosing whether a product is visible | | | **Yes** |
| Keeping the published dos and don'ts | | Enforces | Follows |

The protocol is neutral. It does not judge goods, governments or politics. It is traceable: a record exists for every order.

---

## Dos and don'ts

These apply to **everyone**, including anonymous users. The marketplace entrepreneur, not the protocol, carries the responsibility to enforce them.

**Prohibited goods** (from the Layer 1 spec):
- Weapons, arms and explosives.
- Human trafficking, forced labour and organ trade.
- Endangered wildlife and products covered by CITES.
- Narcotics banned under UN conventions.
- Fraudulent or stolen financial assets.

*Not enforced:* the list is not built into code, and nothing blocks an anonymous user from the logistics pool today. (D55)

**Sanctions:** a KYC identity that matches the protocol's sanctions list is blocked at registration. The list is loaded by hand. A sanctions match is also one of the five reasons the protocol may freeze funds (`payments_and_fees.md`).

---

## Privacy and disclosure

- **Anonymous:** the protocol holds only what the user gave it. *You cannot disclose what does not exist.*
- **Court orders** (Pam, S44): the protocol has no people behind it. A court that wants to act against a party deals with the marketplace operator in its own jurisdiction. A court order is not a reason for the protocol to freeze funds.
- **KYC data and passwords** (Pam, S44): the protocol should store **no KYC personal data and no password hashes**. Marketplaces hold them. The protocol keeps the DID, the identity type, the public key, and a flag "verified by marketplace X on date Y" that the marketplace signs. History: the Session 28 design already said this ("marketplace stores verified business info, plus password hash"). The code put them in the protocol database as a v1 shortcut, because there is one marketplace, so marketplace and protocol are the same backend. Today the protocol stores a password hash and, for KYC identities, business name, registration number, owner name, address, phone, email, tax ID and document references. Fixing it is D58.
- **What the protocol does keep for logistics:** a provider's business profile (address, contacts, insurance details, routes), because a quote cannot work without it. That is operating data the provider chooses to publish in the pool, not identity documents.

---

## Where the code and the intent differ

| Intent | Code today | Item |
|---|---|---|
| Marketplaces verify KYC under their own rules | KYC verification is an empty stub | D59 |
| Protocol holds no passwords and no KYC personal data; marketplaces do | Protocol stores a password hash and KYC personal data | D58 |
| Nostr key login | Not built | R26 |
| Anonymous users cannot use logistics | Not blocked | D55 |
| Published prohibited-goods list | Not built | D55 |

---

## Registering a marketplace (proposal)

Buyers and sellers get a simple sign-up. A marketplace needs more, because it carries responsibility: compliance in its country, rulings on disputes and the trust of its users. Pam asked for my view on the minimum.

**In the protocol's public registry** (D50):

| Field | Why |
|---|---|
| Marketplace ID, name, website | Identify it |
| Country, and industries or countries it serves | Who it is for |
| The responsible person's DID, a KYC identity | A named owner of the responsibility |
| Contact email for disputes and legal notices | Users and other marketplaces can reach it |
| Marketplace fee (0 to 5%) and free-period end date | Needed for fee collection (B28) |
| Payout destination for the marketplace fee (Bitcoin address, Stripe account) | Where the fee goes |
| Version of the dos and don'ts and the marketplace terms it accepted, with date | Records that it took responsibility |
| Status (active, suspended) and date joined | Housekeeping |

**Held by the entrepreneur, not the protocol:** legal name, company registration, tax ID, address and ID documents. They are needed for their own country's regulators, and the protocol should not hold them (see above).

**Integrity (options, for Pam to choose):**
1. A **public track record** from day one: share of rulings for each side, how many were overturned, how fast it rules. A new marketplace starts empty and shows it.
2. A **refundable bond** (a small amount in Bitcoin) that is forfeited if the marketplace fails to rule within the deadline. It gives a real cost to doing the job badly and fits freeze reason 4 in `payments_and_fees.md`.
3. **Who checks the entrepreneur's KYC?** No one yet (D59). While there is one marketplace this is Pam. Later, signed attestations from other established marketplaces could do it.

---

## Open questions

1. Which integrity options for marketplaces: track record only, or also a bond?
2. How is the first KYC verification of a marketplace owner done while no other marketplace exists (D59)?
3. Should an anonymous or Nostr identity be allowed to open a marketplace? Proposal: no. Marketplace entrepreneurs carry legal responsibility, so they must be KYC.