# Why Rangkai Uses Nostr as Transport and Communications Layer

**Document type:** Architecture rationale  
**Audience:** Future contributors, marketplace operators, Pam's reference  
**Last updated:** Session 29 (June 11, 2026)

---

## The problem this document answers

Anyone reading the Rangkai codebase will find Nostr primitives — secp256k1 keys, NIP-44 encrypted messages, relay references — and ask: why? Rangkai is a B2B trade protocol. Why does it use a social media protocol as plumbing?

This document answers that question completely. It covers what Nostr is, why it was chosen, exactly what it does and does not do in the Rangkai stack, and how the architecture uses it without becoming dependent on it.

---

## What Nostr actually is

Nostr is not a social network. It is a protocol — a set of rules for how clients and relays communicate. The social networks built on top of it (Primal, Damus, Amethyst) are applications, the same way Twitter is an application built on top of HTTP.

The protocol itself has three components:

**Relays** are simple servers that receive events, store them, and broadcast them to subscribers. Anyone can run a relay. There is no central relay. A message sent over Nostr goes to whichever relays the sender and receiver both connect to. If one relay goes offline, the message routes through others. There is no Nostr Inc. that can be pressured to remove content or block users.

**Events** are the data format. Every piece of data on Nostr — a message, a profile update, a product listing, anything — is a JSON object with a content field, a kind number (the type of event), a timestamp, a public key, and a cryptographic signature. The signature proves the event came from whoever controls that keypair. No one can forge an event without the private key.

**Keys** are secp256k1 keypairs — the same elliptic curve cryptography used by Bitcoin and Ethereum. A private key (nsec) signs events. A public key (npub) identifies the sender. There is no username/password. There is no "forgot password." The key IS the identity.

These three components together produce something unusual: a communications infrastructure with no central operator, no accounts that can be suspended, no single server that can be seized, and no company that can be pressured.

---

## Why Rangkai needs this

Pam stated the design constraint directly: *"I don't want to be the government's chopping board."*

This is not paranoia. It is an accurate reading of how trade platforms get attacked. Consider what happens to a conventional B2B marketplace when a government or regulator takes interest:

A **DNS seizure** takes down the domain. The platform is unreachable overnight. Vendors lose their storefronts. Buyers lose access to order history.

A **payment processor block** freezes all money movement. Stripe, PayPal, and traditional banking rails are regulated entities with compliance teams. They respond to legal pressure. They have deplatformed entire industries — adult content, firearms, crypto exchanges, political organisations — when pressured to do so.

A **server seizure** takes the entire platform: user data, product listings, order history, vendor identities. One warrant, one data centre visit.

A **platform account suspension** erases a vendor's presence. Their products disappear, their reputation disappears, their buyer relationships disappear. They cannot export their identity to another platform because their identity was the platform's account, not their own.

Rangkai is designed to serve small businesses in jurisdictions where banking infrastructure is exclusionary and where regulatory risk is real. A Penang batik weaver, a Sabah honey producer, a Klang furniture maker — these are the users. Building on infrastructure that can be choked at any of these four points would reproduce exactly the problem Rangkai exists to solve.

Nostr and Bitcoin address each chokepoint directly.

---

## The chokepoint map

| Chokepoint | Traditional platform | Rangkai's approach |
|---|---|---|
| DNS seizure | Platform unreachable | Marketplace URLs are one layer; identity and data live in the protocol. Vendors port to a new URL without losing anything. |
| Payment processor block | All payments frozen | Bitcoin on-chain has no payment processor. No entity can deplatform it. Stripe remains for KYC marketplaces where banking works, but is not the only rail. |
| Server seizure | All data lost | No single server holds everything. Protocol is passive infrastructure. Marketplace operators hold their own data. |
| Identity revocation | Vendor loses everything | Identity is a secp256k1 keypair. The vendor holds the private key. No platform can revoke it. They take their DID to any Rangkai-compatible marketplace. |
| Communications intercept | Messages on central server | NIP-44 encrypted DMs between order participants. The relay stores an encrypted blob it cannot read. Only the keypair holders can decrypt. |

---

## The two distinct roles Nostr plays

This distinction is critical and frequently confused. Nostr appears in Rangkai in two completely separate ways.

### Role 1: Identity posture (user-facing)

When a user registers on a Rangkai marketplace, they choose an identity type:

- **KYC** — business-verified identity, email and password, marketplace stores KYC documents
- **Nostr** — user brings an existing nsec or generates a fresh Rangkai key, optionally publishes their npub publicly
- **Anonymous** — fresh keys, session-only, no recovery, Bitcoin payments only

The "Nostr" type is about the user's *social posture* — whether they want their Rangkai identity to be linkable to a public Nostr profile. It is not about whether Nostr infrastructure is used underneath. A KYC user with a password still benefits from Nostr's relay network for their order messages without ever knowing Nostr exists.

All three types use the same cryptographic primitive underneath: **secp256k1 keypairs**. This is deliberate. The same curve Bitcoin uses. The same curve Nostr uses. This means:

- A user can optionally use one keypair for both their Nostr identity and their Rangkai identity (their choice, never forced)
- Future hardware wallet support is possible without changing the identity layer
- We are using cryptographic primitives with 15+ years of peer review, not inventing our own

**Privacy note:** The default is fresh keys per user, separate from any existing Nostr identity. This protects users from privacy correlation. If a vendor's Rangkai DID is the same as their public npub, then a subpoena against their Nostr activity surfaces their Rangkai transactions. Fresh keys by default mean these are separate observable identities. Unified identity is opt-in for users who explicitly want it.

### Role 2: Transport infrastructure (backend)

Regardless of what identity type a user chose, the Rangkai protocol uses Nostr's relay network as a transport layer for two things:

**v1 — Order messaging.** Encrypted direct messages between buyer and vendor, scoped to a specific order. The message travels over Nostr relays as a NIP-44 encrypted event. The relay stores an opaque blob it cannot read. Neither the relay operator nor Rangkai Protocol has access to the content. Only the two keypair holders — the buyer and the vendor — can decrypt.

Users never see this. They see a chat interface in the marketplace. The marketplace handles the UX. Nostr is the pipe underneath.

**v2 — Federation transport (planned).** When marketplace-Malaysia and marketplace-Germany federate, product listings and vendor discovery need to cross marketplace boundaries. Nostr events are one candidate transport mechanism for this. A vendor publishes their product as a custom Nostr kind event. Rangkai-specific aggregators index those events. Buyers on any federated marketplace can find the product through Rangkai's search layer, which happens to be backed by a Nostr-event index.

This is still under architectural discussion (documented as D16 in tech debt). The constraint is firm: Rangkai must own the search index quality regardless of the underlying transport. Buyers must be able to find a Malaysian batik weaver from Berlin without knowing Nostr exists.

---

## What Nostr does NOT do in Rangkai

This is as important as what it does.

**Nostr is not the search layer.** Pam has three years of experience as a Nostr user. She cannot find her own past posts. Nostr search is architecturally broken for discovery — every client indexes differently, relay coverage is inconsistent, content disappears when relays go offline. We cannot make buyers depend on Nostr search to find vendors. Rangkai owns the search index. If Nostr events are used as publication transport in v2, the indexing and query serving is Rangkai's, not Nostr's.

**Nostr is not the user-facing identity layer.** Users do not "sign in with Nostr." They sign in with Rangkai. The marketplace handles the UX. Some users happen to use a Nostr-compatible key underneath, but this is invisible to the experience.

**Nostr is not the payment layer.** Bitcoin handles payments. Nostr handles communications. These are separate.

**Nostr is not required for all Rangkai marketplaces.** A marketplace operator could choose to use different messaging infrastructure and still participate in the protocol. Nostr is the reference implementation and the recommended approach, not a hard dependency.

**Rangkai does not expose users to the general Nostr network.** Rangkai clients never subscribe to the general Nostr firehose. This is a hard architectural rule. Subscriptions are scoped tightly — only to specific event kinds (order chats, future product events) and specific authors (order participants, federated marketplaces). Pam noted the consequence of broad Nostr subscriptions directly: *"nostr has large data all the time. even when I run Primal my laptop is noisy."* A Penang batik weaver managing her listings should not have her machine grinding through relay history.

---

## Why not build this ourselves?

The natural question: why use Nostr at all? Why not build a custom encrypted messaging system?

**Nostr gives us relay infrastructure for free.** Running a messaging infrastructure means servers, uptime, ops, scaling. Nostr relays already exist, are already maintained by others, and are already globally distributed. We get the network effect of existing infrastructure without the operational cost.

**Nostr gives us cryptographic messaging that is already audited.** NIP-44 (the encryption spec) went through public review and cryptographic analysis. We are not inventing an encryption scheme; we are using one that has been examined by the community.

**Nostr gives us censorship-resistance we could not build ourselves.** A single messaging server, no matter how well-intentioned, is a single point of failure and a single target for legal pressure. The Nostr relay network's value is precisely its distribution. No entity controls it. This is not something Rangkai could replicate by building its own server.

**Nostr gives us secp256k1 key compatibility.** The same key that signs a Nostr event can sign a Rangkai DID, can be imported into a Bitcoin hardware wallet, can be used with future Frostr threshold signing. By choosing Nostr's key format, we are choosing a key format that has broad ecosystem support. A Rangkai vendor's identity keypair is not locked to Rangkai.

**The cost is low.** Integrating Nostr for messaging adds NIP-44 encryption and relay connection management. It does not change the protocol's data model, the marketplace's UX, or the identity system. The integration surface is small and well-defined.

---

## The serverless marketplace vision

There is a broader architectural vision that Nostr enables which goes beyond messaging.

A marketplace entrepreneur in Indonesia wants to serve their country's small businesses. With traditional infrastructure, they need: a web server, a database, an auth service, a messaging service, a search service, a payment processor integration. Significant operational complexity and cost.

With Rangkai's architecture:

- **Identity** is cryptographic — no auth server required. The user's keypair IS their account.
- **Messaging** runs over public Nostr relays — no chat server required.
- **Search** federates across other Rangkai marketplaces — no proprietary index required to bootstrap.
- **Payments** use Bitcoin (permissionless) and Stripe (where banking works) — no payment processor integration required beyond what Rangkai provides.
- **Trust** is handled at the protocol layer — no compliance infrastructure to build.

The only thing the marketplace truly needs to operate is a small database for KYC documents (per their jurisdiction's legal requirement) and a frontend. The Nostr relay network, the Bitcoin network, and the Rangkai protocol handle everything else.

This dramatically lowers the barrier to launching a Rangkai-powered marketplace. A developer in Ghana, a cooperative in Vietnam, a trade association in Mexico — any of them can spin up a marketplace serving their local small businesses and have it immediately federate with every other Rangkai marketplace in the world. Their vendors are visible to buyers in Germany, Japan, and Brazil from day one.

This is why Pam described it as *"entrepreneurs who setup marketplaces can now enjoy a more serverless benefit / option."* Nostr's relay infrastructure is the key enabler of this.

---

## The identity sovereignty guarantee

This deserves its own section because it is the deepest reason for the architectural choices.

In every conventional marketplace — Alibaba, Amazon, Shopify, Etsy — the vendor's identity is the platform's account. When the vendor joins, they receive an account. When they build a reputation, that reputation lives in the platform's database. When they get deplatformed, they lose everything: their product listings, their reviews, their order history, their buyer relationships.

They cannot take their identity elsewhere because their identity was never theirs. It was a row in the platform's users table.

Rangkai inverts this. The vendor's identity is a secp256k1 keypair that they generate and hold. Their DID (`did:rangkai:<uuid>`) is derived from that key. Their reputation score lives in the protocol layer, portable across all Rangkai marketplaces. Their products can be re-listed on any compatible marketplace. Their order history follows their DID.

If a marketplace shuts down, the vendor does not lose their identity. They take their keypair to another Rangkai marketplace and their history comes with them.

If a government pressures a marketplace to deplatform a vendor, the vendor's identity still exists. Another marketplace can onboard them. Their reputation is intact. Their buyers can find them again.

This is the cryptographic guarantee that Nostr's key format enables. It is not theoretical — it is the specific architecture of how Rangkai DIDs are constructed and how reputation is stored at the protocol level rather than the marketplace level.

---

## Dispute mediation: how encrypted messages and resolution coexist

A natural question arises: if order messages are end-to-end encrypted between buyer and vendor, how does a marketplace mediator resolve a dispute?

The answer is by design, not by breaking the encryption.

NIP-44 uses ECDH (Elliptic Curve Diffie-Hellman) shared secrets. Both the buyer and the vendor independently hold everything they need to decrypt every message in their shared thread. Encryption protects the message from the relay operator, from Rangkai Protocol, and from anyone outside the conversation. It does not create a situation where one party "controls" the conversation — both parties always have full access to their shared thread.

**How dispute disclosure works (Pattern 2 — unilateral disclosure with notification):**

When a dispute arises, either the buyer or the vendor can submit their decrypted message thread to the marketplace mediator. They do not need the other party's consent to do this. They decrypt the thread using their own private key and hand the plaintext to the mediator.

The submitting party stakes their own privacy alongside the other party's — their messages are exposed too, not just the other party's. This is not surveillance; it is the same principle as admissibility in real-world commercial dispute resolution. A text message someone sent you is admissible in a dispute without their consent. They can object to context or counter with their own evidence, but they cannot prevent the message from existing as evidence.

When disclosure happens, the other party is **notified immediately** that the thread has been submitted. They then have the opportunity to submit their own context, additional messages, or counter-evidence. Refusing to engage with the dispute process weighs against them in the mediator's assessment.

**What the marketplace mediator sees:**

The mediator receives the decrypted thread from the disclosing party. They see the conversation exactly as it happened. They can request the other party's version of the same thread to cross-check for completeness. If both versions are consistent, the thread is verified. If one party has selectively omitted messages, the other party's submission will reveal the gaps.

**What the marketplace mediator never has:**

The marketplace does not have unilateral surveillance access. They cannot read order messages without a party initiating disclosure. They cannot access the thread retroactively without a dispute. The relay stores an encrypted blob the marketplace cannot read. This is a meaningful protection against both overreach and against being compelled to hand over communications — there is nothing to hand over until a party decrypts and discloses.

**Why this design solves the con artist problem:**

An earlier design considered requiring both parties to consent to disclosure before any messages could be used in a dispute. Pam correctly identified the flaw: *"in the event one is a con artist who knows and does not reveal the details."* A bad actor would simply withhold consent, knowing their messages contained evidence against them.

The unilateral disclosure design removes this lever. The honest party reveals their copy. The bad actor's refusal to engage is itself evidence. The mediator sees a complete, signed thread from the honest party and silence from the other. This maps to how commercial dispute resolution actually works in the real world — not to an idealised model where both parties cooperate equally.

**The privacy guarantee that remains:**

The privacy expectation in Rangkai order messaging is: *"this conversation is between us and will not be made public."* It is not: *"you can never use this against me in a dispute."* These are different guarantees. The first is meaningful and maintained. The second would make the platform unusable for legitimate dispute resolution.

Marketplace mediators are not law enforcement. They are dispute resolvers for commercial disagreements — late shipments, product quality, order cancellations. The disclosure mechanism is scoped to that context.

---

## Summary: the one paragraph version

Nostr contributes two things to Rangkai. First, its secp256k1 key format gives every user a self-sovereign identity that no platform can revoke and that is compatible with Bitcoin, hardware wallets, and future threshold signing schemes. Second, its relay network gives Rangkai censorship-resistant, operator-free transport for order messaging and (in v2) cross-marketplace federation — without requiring Rangkai to run and operate messaging servers. Users never interact with Nostr directly. They use Rangkai's UX. Nostr is the pipe underneath. This architectural choice, combined with Bitcoin as the payment rail, means there is no central server to seize, no payment processor to deplatform, no account system to block, and no identity that can be revoked — which is the specific infrastructure stack required to serve small businesses in jurisdictions where traditional platforms have failed them.

---

*This document is part of the Rangkai Protocol architecture documentation. For the implementation details of how Nostr is integrated, see `docs/ARCHITECTURE.md`. For the v2 search federation decision (which may use Nostr events as publication transport), see `docs/TECH_DEBT.md` item D16.*