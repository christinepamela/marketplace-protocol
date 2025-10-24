# Layer 2 – Payments (Bitcoin + Fiat)

**Purpose:**  
Layer 2 handles the movement of value between participants, enabling fast, low-fee, and secure settlement of transactions while bridging on-chain Bitcoin, Lightning Network payments, and fiat rails. This layer abstracts payment complexity for marketplaces and users while ensuring compliance, privacy, and seamless interaction with identity (Layer 0) and escrow (Layer 3).

---

## 1. Payment Modes

### 1.1 On-Chain Bitcoin
- Standard Bitcoin transactions settled directly on-chain.  
- Anchors transaction integrity on Layer 1.  
- Provides strong immutability, lower trust assumptions, but slower confirmation times.  
- Supports both standard P2PKH/P2WPKH and multisig addresses for added security.  

### 1.2 Lightning Network
- Off-chain Bitcoin payment channel network for instant transactions.  
- Reduces confirmation delays and transaction fees.  
- Integrates with participant wallets via LN node or custodial service.  
- Supports bidirectional microtransactions and invoice tracking.  

### 1.3 Fiat Integration
- Traditional payment rails (ACH, SEPA, wire, card) for participants without BTC access.  
- Fiat settlements are linked to identity via Layer 0 to comply with AML/KYC.  
- Optional gateway providers can handle conversion between BTC ↔ fiat for settlement purposes.  

---

## 2. Payment Registration & Binding

| Process               | Description                                       | Layer Connection                                         |
|-----------------------|---------------------------------------------------|---------------------------------------------------------|
| Wallet Registration   | User registers BTC and/or Lightning wallet addresses. | Anchored to Layer 0 DID for compliance & reputation mapping |
| Fiat Account Binding  | Users link bank accounts or card details.        | Layer 0 identity ensures KYC verification               |
| Address Validation    | On-chain: test transaction or signature verification. | Prevents fraud, enforces binding to verified identity |
| Lightning Channel Setup | Open, fund, and track Lightning channels.      | Optional: supports recurring micropayments, multi-hop routing |

---

## 3. Payment Routing & Settlement

### 3.1 Transaction Flow
1. Buyer initiates payment (BTC on-chain / Lightning / fiat).  
2. Payment address or invoice is validated against DID.  
3. Escrow (Layer 3) optionally holds payment until delivery confirmation.  
4. Settlement triggered via Lightning/Bitcoin network or fiat rails.  
5. Reputation events (Layer 0) updated on successful completion.  

### 3.2 Payment Validation
- Lightning invoices must match the expected amount and memo.  
- On-chain transactions verified for sufficient confirmations (configurable, default 3 blocks).  
- Fiat payments confirmed via gateway webhook and cross-checked with identity.  

### 3.3 Atomicity Guarantees
- Off-chain Lightning: Payment routed atomically via HTLCs.  
- Fiat: Reconciliation layer ensures delivery or rollback in case of failures.  
- Cross-layer settlement ensures identity-bound transactions cannot be double-spent.  

---

## 4. Security & Compliance

| Feature                | Description                                                                 |
|------------------------|-----------------------------------------------------------------------------|
| AML/KYC Checks          | Layer 0 DID-based verification required for fiat or large BTC transactions. |
| Multisig & Escrow       | Optional multisig addresses or Layer 3 escrow integration for high-value transactions. |
| Invoice Replay Protection | Each Lightning invoice or BTC address per transaction is single-use.        |
| Privacy Preservation    | BTC transactions do not link wallets to DIDs publicly; optional CoinJoin / Lightning onion routing. |
| Fiat Bridging           | Gateways must support transaction audit logging for regulatory reporting.  |

---

## 5. Fee & Incentive Model
- **On-chain BTC:** Network fee passed through or subsidized via marketplace policies.  
- **Lightning:** Minimal routing fees; optional fee rebates for early participants.  
- **Fiat:** Gateway fees included in settlement; transparent pass-through to user.  
- **Reputation impact:** Timely payments positively affect reputation NFT (Layer 0).  

---

## 6. Integration Points

| Layer    | Role                                                                 |
|----------|----------------------------------------------------------------------|
| Layer 0  | Identity-linked wallet & account verification, reputation updates.   |
| Layer 1  | Anchoring on-chain BTC transactions, Lightning settlements hashed on-chain optionally. |
| Layer 3  | Escrow auto-triggered by payment completion events.                  |
| Layer 4  | AML & sanction compliance, transaction monitoring.                  |
| Layer 6  | Governance controls for fee structures, payment dispute rules, Lightning node whitelist. |

---

## 7. Governance & Recovery
- Lost Lightning wallet / BTC address: recovery through Layer 0 DID verification and channel re-creation.  
- Fraudulent payments can trigger Layer 6 governance review.  
- Fee structures and routing policies are modifiable via DAO-approved proposals.  

---

## 8. Summary

| Goal                | Mechanism                                    | Outcome                                                  |
|--------------------|----------------------------------------------|----------------------------------------------------------|
| Fast Payments       | Lightning Network + fiat bridging           | Instant settlement for micropayments and cross-market transactions |
| Secure & Compliant  | Identity binding, AML/KYC, multisig         | Minimized fraud, regulatory compliance                  |
| Transparent Fees    | On-chain + Lightning + fiat fee recording   | Users can verify all costs                               |
| Reputation-Linked   | Payment events update Layer 0 NFT           | Incentivizes prompt, reliable payment behavior          |
| Resilient & Recoverable | Wallet/channel recovery through DID      | No permanent loss of user capability                     |
