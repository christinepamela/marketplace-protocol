# Layer 0: Identity & Reputation

### **Purpose**
To create a unified yet flexible framework for identifying participants, verifying trust, and enabling reputation portability across marketplaces built on the protocol.  

This layer establishes the foundational link between who a user is, what they’ve done, and how they’re perceived — without compromising privacy or decentralization.

---

## 1. Identity Modes

### 1.1 Verified (KYC-Based)
- For users who undergo identity verification through approved KYC providers.  
- Identity is bound to a **DID (Decentralized Identifier)** anchored on-chain.  
- Required for regulated markets (financial products, medical goods, high-value items).  
- Enables access to advanced reputation metrics, verified seller badges, and cross-market compliance privileges.

### 1.2 Anonymous (Zero-Knowledge Identity)
- For users who prefer pseudonymity while maintaining verifiable trustworthiness.  
- Uses **ZKPs (Zero-Knowledge Proofs)** to confirm uniqueness and credentials without revealing personal data.  
- Supports **Proof-of-Consistency**, ensuring the same anonymous user maintains a consistent pseudonymous reputation across marketplaces.  
- Anonymous users can still accrue reputation and complete transactions, but with limited dispute and compliance privileges.

### 1.3 Hybrid Identity
- Allows users to toggle between KYC and ZK modes, depending on context.  
- Example: A verified merchant may sell under an anonymous storefront but can reveal credentials in case of dispute.  
- Preserves privacy without forfeiting accountability.

---

## 2. Identity Registration

| **Process**         | **Description**                                                                 | **Layer Connection**                          |
|---------------------|---------------------------------------------------------------------------------|-----------------------------------------------|
| DID Creation        | Each participant (buyer, seller, marketplace operator) is issued a DID during onboarding. | Linked to **Layer 1** for transaction anchoring. |
| Credential Binding  | KYC providers or reputation oracles issue **Verifiable Credentials (VCs)** tied to the DID. | Feeds into **Layer 4 (Trust & Compliance)**.   |
| ZK Proof Generation | Anonymous users generate zero-knowledge proofs for identity uniqueness and reputation linkage. | Interacts with **Layer 3 (Escrow)** and **Layer 4 (Dispute Verification)**. |

---

## 3. Reputation Framework

### 3.1 Reputation Tokens (Non-Transferable)
- Each user’s performance (ratings, successful transactions, compliance records) is aggregated into a **Reputation Score**.  
- The score is stored as a **non-transferable, non-fungible token (NFT)**.  
- It cannot be sold, traded, or burned by the user — only updated through protocol-approved actions.  
- Functions as a **verifiable credential**, not a collectible.

### 3.2 Core Principles
- **Portability:** Users can carry their reputation across marketplaces built on the protocol.  
- **Integrity:** Only verified transactions can affect reputation.  
- **Privacy:** Data contributing to the score is hashed and partially encrypted.  
- **Immutability:** Historical reputation events are append-only and auditable.

### 3.3 Reputation Metrics

| **Category**           | **Data Source**                | **Weight Example** |
|------------------------|--------------------------------|--------------------|
| Transaction Success    | Escrow completion rate         | 30%               |
| Rating Score           | Buyer–Seller feedback          | 25%               |
| Dispute Resolution     | Ratio of resolved to raised disputes | 20%           |
| Compliance Standing    | Sanctions, tax adherence       | 15%               |
| Community Trust        | Peer or DAO validation         | 10%               |

---

## 4. Reputation Portability (NFT as Credential)

**Definition:**  
Each participant’s **Reputation NFT** acts as a verifiable credential containing encrypted metadata of performance and behavior. It is bound to the user’s **DID**, not their wallet, preventing transfer or sale.

**Structure:**
- **Token Type:** Soulbound NFT (ERC-721 non-transferable variant)

**Data Fields:**
- `reputation_score` (integer 0–1000)  
- `verified_status` (boolean)  
- `dispute_record` (hash pointer)  
- `rating_average` (float)  
- `compliance_flags` (array of booleans)  
- `marketplace_history` (Merkle root of past transactions)

**Usage:**
- Marketplaces query the NFT to verify reputation instantly, without central servers.  
- **Governance (Layer 6)** may grant voting weight based on verified reputation scores.  
- **Dispute Resolution (Layer 4)** references the NFT as part of the evidence stack.  
- For anonymous users, **ZK proofs** validate NFT authenticity without exposing metadata.

---

## 5. Reputation Updating Logic

1. **Transaction Completion → Update Trigger**  
   - Each successful escrow release sends a signed event to the reputation oracle.

2. **Oracle Validation**  
   - The oracle verifies authenticity and recalculates the score using the weighting matrix.

3. **NFT Update**  
   - The on-chain NFT metadata is updated immutably via smart contract.

4. **Dispute or Fraud Detection**  
   - Confirmed disputes or fraudulent activity trigger automatic score penalties.

5. **Appeal Path**  
   - Users can appeal reputation penalties through **Layer 6 Governance** (DAO or arbiter vote).

---

## 6. Integration Points

| **Layer** | **Integration Role** |
|------------|----------------------|
| **Layer 1 (Transactions)** | Anchors identity and reputation updates to transaction hashes. |
| **Layer 2 (Payments)** | Links verified identity to payment addresses for AML compliance. |
| **Layer 3 (Escrow)** | Auto-triggers reputation updates upon transaction release. |
| **Layer 4 (Trust & Compliance)** | Cross-validates KYC data and sanctions lists. |
| **Layer 5 (Tax Advisory)** | Inherits jurisdictional reputation data for tax compliance scoring. |
| **Layer 6 (Governance)** | Uses aggregated reputation as eligibility for voting or proposal access. |

---

## 7. Governance & Recovery

**Governance Oversight:**  
Layer 6 DAO defines criteria for KYC providers, oracles, and reputation algorithms.

**Recovery Mechanism:**  
- If a wallet is lost or compromised, the user can rebind their NFT-based reputation via DID verification.  
- Prevents loss of identity in self-custodial environments.

**Privacy Preservation:**  
- Reputation data is modular and redacted at source.  
- Only hashes and proofs live on-chain.

---

## 8. Summary

| **Goal** | **Mechanism** | **Outcome** |
|-----------|----------------|--------------|
| **Identity Flexibility** | KYC / ZK / Hybrid modes | Inclusive participation |
| **Trust Foundation** | Reputation NFT | Portable, verifiable credential |
| **Privacy** | ZK and hashed metadata | Anonymous yet accountable |
| **Incentive** | Reputation impacts access and privileges | Aligns behavior with trust |
| **Governance Alignment** | DAO oversight and oracle review | Transparent evolution |
