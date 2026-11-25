# Actors and Trust

**Status:** DRAFT, Session 44. Built from Pam's own words and the code at `958364a`. Items marked *Not enforced* are decided but not in code. Each is a tech-debt item.

---

## Who uses Rangkai

| Actor | What they do | Identity allowed |
|---|---|---|
| **Marketplace entrepreneurs** | Set up a marketplace on the protocol for an industry or a country. Earn the marketplace fee. Responsible for compliance and legality in their own country. Arbitrate disputes. | KYC, Nostr or anonymous. The owner chooses. A marketplace for anonymous or Nostr users needs an operator who is one of them |
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

Reputation is computed by one formula: a base of 50, plus 2 per completed transaction (up to 200), plus 20 for each point of average rating (up to 100), minus 25 or 50 for a minor or major dispute, then multiplied by the identity multiplier. The cap is 500, though the formula itself tops out at 420 for KYC (B47). **Decided S44 (Pam):** a rating is one input to this formula, not a separate score. It counts once it is revealed (both parties rated, or 7 days passed), so the blind between the two parties holds. A transaction counts when its order completes. Buyers see reputation first (the score and what it is made of, with the identity type beside it, and "New" for a vendor with no ratings) and can then open the individual revealed ratings. **Not built yet** (B43): today a rating shortcut moves the score by +1 or -2 and nothing else feeds the formula, and the starting scores above (75, 35, 20) differ from the formula's value for a blank record (B47). The protocol signs a reputation proof with its own key, so anyone holding the public key can check it.

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
- **Nobody's legal details** (Pam, S44, 20 Nov): this covers buyers, sellers, logistics providers and marketplace operators alike. The protocol holds no legal name, company registration, tax ID, address or ID document. Their own country's regulators need them, and the marketplace holds them.
- **Metadata the protocol does keep, for its own improvement** (Pam, S44, 20 Nov): country and industry, order counts and values, payment rail, shipping routes and times, dispute grounds, rulings and timings, ratings. None of it names a person or company. Everything kept must be reachable only by DID, never by legal identity.
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

## Registering a marketplace

Buyers and sellers get a simple sign-up. A marketplace needs more, because it carries responsibility: compliance in its country, rulings on disputes and the trust of its users. The registry below is Pam's decision (S44, 20 Nov), on my proposal.

**In the protocol's public registry** (D50):

| Field | Why |
|---|---|
| Marketplace ID, name, website | Identify it |
| Country, and industries or countries it serves | Who it is for |
| The responsible person's DID, of any identity type, and the operator type shown to users (KYC-verified, Nostr or anonymous) | A named owner of the responsibility, and honesty to users about who runs it |
| Contact email for disputes and legal notices | Users and other marketplaces can reach it |
| Marketplace fee (0 to 5%) and free-period end date | Needed for fee collection (B28) |
| Payout destination for the marketplace fee (Bitcoin address, Stripe account) | Where the fee goes |
| Version of the dos and don'ts and the marketplace terms it accepted, with date | Records that it took responsibility |
| Status (active, suspended) and date joined | Housekeeping |

**Held by the entrepreneur, not the protocol:** legal name, company registration, tax ID, address and ID documents. They are needed for their own country's regulators, and the protocol should not hold them (see above).

**Integrity (decided, Pam, S44, 20 Nov):**
1. **Public track record only.** For every marketplace the protocol shows public statistics on how it handles disputes. For example: "40 disputes: 18 ruled for the buyer, 22 for the seller, 2 overturned by the protocol, median 3 days to rule." A new marketplace starts at zero and shows it. Buyers and sellers use it to choose a marketplace.
2. **No bond.** Starting a small marketplace must stay easy. A refundable bond is dropped for now and can be reconsidered later.
3. **KYC of a marketplace owner is checked by hand for now.** The people running the protocol work with each new entrepreneur: onboard them, check them and mark them verified. This is the one step that needs people, so it sits outside the "no people behind the protocol" rule on purpose, for the early phase only. After about the fifth marketplace, signed attestations from established marketplaces can take over (D59).
4. **Anonymous and Nostr marketplaces** are allowed. They are not manually verified. Users see the operator type, so they know what they are joining.

---

## Open questions

## Decisions (Pam, S44, 20 Nov)

1. Integrity: track record only, no bond.
2. First KYC of a marketplace owner: by hand, by the people running the protocol, until about the fifth marketplace.
3. Anonymous and Nostr identities may open marketplaces, because anonymous and Nostr sellers and buyers need somewhere to trade.

## Open questions

1. What exactly does a track record show, and from how many disputes does it count as meaningful?
2. Where do dos and don'ts enforcement and court contact sit for an anonymous operator? Proposal: the protocol cannot reach them, which is the point of anonymity, and users are told the operator type.