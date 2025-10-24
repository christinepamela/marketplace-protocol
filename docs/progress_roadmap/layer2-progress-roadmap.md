# Layer 2 – Progress & Roadmap

## Status Overview (as of Oct 2025)
- **Overall Completion:** ~50%  
- **Current Status:** On-chain BTC MVP complete, Lightning integration in progress, fiat gateways partially integrated.  
- **Next Milestone:** Lightning Network channel support + fiat reconciliation.

---

## Phase Roadmap

### Phase 1 – On-Chain Bitcoin MVP
**Goal:** Enable basic BTC payments anchored to Layer 0 identity.

**Core Deliverables**
- ✅ BTC transaction service (`btc.service.ts`)
- ✅ Wallet registration + DID binding
- ⚙️ Reputation integration on successful payment
- ⚙️ Basic fee calculation + propagation

**Pending**
- ⚙️ Improve multi-wallet support
- ⚙️ Add optional multisig for high-value transactions

---

### Phase 2 – Lightning Network Integration
**Goal:** Enable off-chain BTC transactions for instant settlement.

**Deliverables**
- Open/fund Lightning channels
- Lightning invoice generation and verification
- HTLC-based atomic payments
- Integration tests with escrow triggers (Layer 3)
- Reputation impact mapping

---

### Phase 3 – Fiat Bridging & Compliance
**Goal:** Allow participants to transact using fiat while maintaining trust and compliance.

**Deliverables**
- Gateway API adapters (ACH, SEPA, wire, card)
- Fiat ↔ BTC reconciliation module
- AML/KYC validation via Layer 0
- Event logging for dispute resolution

---

### Phase 4 – Fee Optimization & Incentive Alignment
**Goal:** Align payment fees with marketplace incentives and reputation rewards.

**Deliverables**
- Fee rebate model for Lightning routing nodes
- Transparent on-chain fee reporting
- DAO approval for fee adjustments
- Integration with Layer 6 governance

---

### Phase 5 – Advanced Features (Stretch)
**Goal:** Resilient, privacy-focused, and multi-channel payment infrastructure.

**Deliverables**
- CoinJoin, ecash, Tor/VPN support for BTC privacy
- Lightning multi-path routing optimization
- Automated channel liquidity management
- AI-assisted fraud detection (layered with Layer 4)

---

## Completion Tracker

| Component           | Description                     | Status  | Next Step                           |
|--------------------|---------------------------------|--------|------------------------------------|
| `btc.service.ts`     | On-chain transaction handling    | ✅ 90% | Multisig + fee optimization        |
| `lightning.service.ts` | LN invoice & channel management | ⚙️ 40% | Channel lifecycle + HTLC tests     |
| `fiat.gateway.ts`     | Fiat API adapters               | ⚙️ 30% | Integration + AML checks           |
| `payment.types.ts`    | Payment types + events          | ✅ 85% | Minor adjustments for Lightning fields |
| `reconciliation.ts`   | Cross-layer BTC/fiat mapping    | ⚙️ 25% | Robust logging & error handling    |
| `test-layer2.ts`      | Integration tests               | ⚙️ 50% | Add Lightning + fiat test coverage |
| `docs/spec-layer2.md` | Full spec document              | ✅ 80% | Add Lightning diagrams + fiat workflow |

---

## Feature Coverage

| Feature Area         | On-Chain BTC | Lightning | Fiat | Notes |
|----------------------|-------------|----------|------|-------|
| Registration         | ✅          | 🚧       | 🚧   | Lightning & fiat pending wallet binding |
| Payment Execution    | ✅          | ⚙️ partial | ⚙️ partial | Lightning HTLC + fiat webhooks pending |
| Settlement Confirmation | ✅       | ⚙️       | ⚙️   | Atomicity tests for multi-path Lightning in progress |
| Reputation Impact    | ✅          | ⚙️       | ⚙️   | Reputation update integration with Layer 0 |
| Fee Handling         | ⚙️          | ⚙️       | ⚙️   | Fee transparency & governance approval pending |
| Recovery / Governance | ⚙️         | 🚧       | ⚙️   | Lightning wallet recovery TBD |
