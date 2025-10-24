# Progress & Roadmap  
## Layer 0 – Identity & Reputation  

---

### 🧭 Status Overview (as of Oct 2025)

| Metric | Description |
|--------|--------------|
| **Overall Completion** | ~70% (KYC-first MVP functional) |
| **Next Milestone** | Anonymous + Nostr identity support (Phase 2) |

---

## 🗺️ Phase Roadmap

### **Phase 1 (Current Phase) – MVP – KYC-First Path**
**Goal:** Enable verifiable identities + portable reputation for regulated clients.  

**Core Deliverables**
- ✅ `identity.service.ts` (KYC register/verify)
- ⚙️ `proof.service.ts` (crypto hardening)
- ⚙️ `reputation.service.ts` (integrate events)
- ⚙️ SQL migrations + RLS
- ⚙️ `test-layer0.ts` full pass  

**Pending**
- ❌ `verification.service.ts`
- ⚙️ Fix crypto WebCrypto import + deterministic JSON
- ⚙️ Tighten RLS for nostr/anon placeholder users

---

### **Phase 2 – Nostr & Anonymous Parity**
**Goal:** Introduce pseudonymous identity registration and ZK-proofed anonymity.  

**Deliverables**
- `registerNostrIdentity(pubkey, challengeSig)`
- `registerAnonymousIdentity(seedHash?)`
- Challenge-based Nostr flow (NIP-26)
- ZK uniqueness check (proof-of-consistency)
- Adjust verification + policy for these modes
- Integration tests for all 3 identity types (KYC / Nostr / Anon)

---

### **Phase 3 – Proof Portability & Hardening**
**Goal:** Move from off-chain proof to portable credential verification.  

**Deliverables**
- Canonical JSON signing (`json-stable-stringify`)
- Proof lineage (previous hash + revocation list)
- Public verify endpoint (`GET /proofs/:id`)
- On-chain anchoring prototype (Merkle root hash)
- **Option:** Soulbound Reputation NFT spec (if governance approved)

---

### **Phase 4 – Governance & Telemetry**
**Goal:** Operationalize DAO oversight and security controls.  

**Deliverables**
- Multisig key rotation for proof-signing keys
- Governance proposal templates for proof algorithm updates
- Metrics dashboard (identity volume, reputation decay, dispute false positives)
- Proof revocation governance flow

---

### **Phase 5 – ML & Adaptive Reputation (Stretch Goal)**
**Goal:** Create adaptive trust scoring based on long-term event data.  

**Deliverables**
- ML-assisted parameter tuning (reputation weights, decay)
- Bias detection and explainable AI outputs for reputation changes
- DAO approval before deployment of new scoring models

---

## ✅ Completion Tracker

| Component | Description | Status | Notes / Next Step |
|------------|--------------|--------|-------------------|
| `types.ts` | Identity, Reputation, Proof types + reputation calculation function | ✅ Complete (95%) | No action required |
| `identity.service.ts` | Register, verify, update, CRUD for identity | ⚙️ 75% | Add nostr/anon flows + stricter validation |
| `verification.service.ts` | KYC provider orchestration, async callback handling | ❌ 0% | Implement webhook handler + provider adapter |
| `reputation.service.ts` | Score aggregation + event triggers | ⚙️ 75% | Add more test coverage + integrate dispute events |
| `proof.service.ts` | Proof generation/verification, crypto ops | ⚙️ 65% | Fix crypto portability + canonical JSON signing |
| `index.ts` | Layer export + module registration | ✅ Done | Clean-up import order later |
| **SQL Schema (Postgres)** | Identities, reputations, proofs, verification records | ⚙️ 85% | Standardize extensions (uuid vs pgcrypto) |
| **RLS Policy** | Row-level access per identity role | ⚙️ 70% | Strengthen anon/nostr write rules |
| `test-layer0.ts` | Integration sanity test (register → verify → proof) | ⚙️ 60% | Add unit + negative tests |
| **Docs / Spec Alignment** | Full spec + narrative (this document) | ✅ 90% | Keep updated per milestone |

---

## 🧩 Feature Coverage

| Feature Area | Core KYC | Nostr (Pseudonymous) | Anonymous (ZK) | Notes |
|---------------|-----------|----------------------|----------------|-------|
| **Registration** | ✅ | 🚧 (planned) | 🚧 (planned) | Add `registerNostrIdentity()` and `registerAnonymousIdentity()` |
| **Verification** | ✅ via provider | 🚧 (challenge signature) | 🚧 (ZK proof) | Build flexible adapter layer |
| **Reputation Scoring** | ✅ | ⚙️ (partial) | ⚙️ (partial) | Add proof-of-performance rules for anon |
| **Proof Generation** | ✅ | 🚧 | 🚧 | Add ZK version of ProofService later |
| **NFT Credential** | ❌ (future) | ❌ | ❌ | Optional governance-approved later |
| **Governance Hooks** | ⚙️ partial | 🚧 | 🚧 | Add multisig control for revocation + DAO voting weight |

---

### 📘 Notes
- This document combines both **progress** and **roadmap** for simplicity.  
- Updated monthly or upon major milestone completion.  
- Future layers (Layer 1, Layer 2, etc.) should follow the same format for consistency.  
