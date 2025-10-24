# Governance Specification (Layer 6)

## Overview

This document defines how protocol-level decisions are approved and executed in the Rangkai Protocol. Governance is designed to be minimal, auditable, and non-custodial while preventing single points of failure.

---

## 1. Purpose

Governance ensures that critical protocol parameters and treasury movements cannot be changed unilaterally. It provides a structured way to evolve the system without breaking existing clients or compromising security.

### Key Principles

- **Non-custodial**: The protocol never holds user funds; governance only controls protocol parameters
- **Transparent**: All proposals and votes are recorded in an immutable audit log
- **Minimal**: Only critical actions require governance approval
- **Safe**: 2-of-3 multisig prevents single points of failure

---

## 2. Governance Model

### 2.1 Multisig Council

**Structure:**
- 3 core team signers:
  - **Founder**: Strategic decisions and vision
  - **Technical Lead**: Technical parameters and upgrades
  - **Treasury Manager**: Financial operations and withdrawals

**Quorum:** 2 of 3 approvals required for execution

**Voting Period:** 72 hours (configurable per proposal)

**Storage:** Approval records stored in protocol database (off-chain for MVP)

### 2.2 Philosophy

Early-stage governance favors **operational safety over decentralization**. Once the ecosystem matures, voting or delegated models may be introduced.

This multisig model:
- Prevents unilateral actions by any single person
- Maintains operational efficiency (no 100-person DAO)
- Provides clear accountability
- Can evolve toward decentralization over time

---

## 3. Scope of Governance

### Actions Requiring Approval

| Action | Requires Approval | Notes |
|--------|------------------|-------|
| Change protocol fee (%) | ✅ | Adjust platform share of transactions (currently 3%) |
| Change client fee cap | ✅ | Default 0%, can be 0-5% |
| Treasury withdrawals | ✅ | Funding protocol maintenance or grants |
| Emergency marketplace pause | ✅ | Circuit breaker for critical bugs or attacks |
| Database schema migrations | ✅ | Ensures backward compatibility |
| Protocol upgrades (Layer logic) | ✅ | Versioned deployments only after quorum |
| Add/remove signers | ✅ | Governance self-amendment |
| Security parameter changes | ✅ | Escrow timeout, refund windows, etc. |

### Actions NOT Requiring Approval

- Individual order processing
- Product listings
- Identity verification
- Payment routing
- Day-to-day operations

---

## 4. Proposal Lifecycle

### 4.1 Draft Proposal

- Created by a council member
- Stored in `governance_proposals` table
- Includes:
  - **Action**: What will change
  - **Params**: Specific parameters (JSON)
  - **Rationale**: Why this change is needed
  - **Voting window**: Default 72 hours

### 4.2 Active Voting

- All active signers can vote (approve or reject)
- Each signer votes once (double-voting prevented)
- Vote includes optional comment and signature

### 4.3 Approval

- When quorum reached (≥2 approvals), status → `approved`
- Proposal ready for execution
- Cannot be modified after approval

### 4.4 Execution

- Any authorized party can trigger execution
- Action executed atomically
- Result logged immutably
- Proposal status → `executed`

### 4.5 Rejection / Expiry

- **Rejected**: If majority votes "no"
- **Expired**: If voting window closes without quorum

---

## 5. Data Model

### governance_proposals

```sql
id               UUID PRIMARY KEY
proposal_number  TEXT UNIQUE         -- Human-readable: 'GOV-001'
action           TEXT                -- 'update_protocol_fee', etc.
params           JSONB               -- Action-specific parameters
rationale        TEXT                -- Why this change is needed
proposed_by      TEXT                -- Signer ID who created proposal
status           TEXT                -- 'draft', 'active', 'approved', 'executed', 'rejected', 'expired'
required_approvals INT               -- Quorum threshold (2)
current_approvals INT                -- Current approval count
voting_starts_at TIMESTAMP
voting_ends_at   TIMESTAMP
executed_at      TIMESTAMP
```

### governance_approvals

```sql
id          UUID PRIMARY KEY
proposal_id UUID REFERENCES governance_proposals(id)
signer_id   TEXT                -- Signer who voted
approved    BOOLEAN             -- true = approve, false = reject
signature   TEXT                -- Optional cryptographic signature
comment     TEXT                -- Optional signer comment
approved_at TIMESTAMP

UNIQUE(proposal_id, signer_id)  -- Prevents double-voting
```

### governance_signers

```sql
id           UUID PRIMARY KEY
signer_id    TEXT UNIQUE        -- 'founder', 'tech_lead', 'treasury_manager'
identity_did TEXT               -- Optional link to protocol identity
public_key   TEXT               -- For signature verification (future)
role         TEXT               -- 'founder', 'technical', 'treasury'
active       BOOLEAN DEFAULT true
added_at     TIMESTAMP
removed_at   TIMESTAMP
```

### protocol_parameters

```sql
id             UUID PRIMARY KEY
parameter_name TEXT UNIQUE       -- 'protocol_fee_percentage', etc.
parameter_value JSONB            -- Current value
last_updated_by TEXT             -- Proposal ID that changed this
last_updated_at TIMESTAMP
previous_value JSONB             -- Audit trail
change_reason  TEXT
```

---

## 6. Example Proposal (JSON)

### Update Protocol Fee

```json
{
  "id": "uuid-here",
  "proposal_number": "GOV-001",
  "action": "update_protocol_fee",
  "params": {
    "new_fee_percent": 2.5
  },
  "rationale": "Reduce protocol fee to 2.5% to stay competitive with open marketplaces and encourage adoption.",
  "proposed_by": "founder",
  "status": "active",
  "required_approvals": 2,
  "current_approvals": 0,
  "voting_ends_at": "2025-10-26T12:00:00Z"
}
```

### Treasury Withdrawal

```json
{
  "proposal_number": "GOV-002",
  "action": "treasury_withdrawal",
  "params": {
    "amount": 0.5,
    "currency": "BTC",
    "recipient": "bc1q...",
    "purpose": "Q1 2025 protocol development"
  },
  "rationale": "Fund ongoing development, security audits, and infrastructure costs.",
  "proposed_by": "treasury_manager"
}
```

---

## 7. Execution Rules

A proposal **cannot execute** until:

1. ✅ Status = `approved`
2. ✅ Current approvals ≥ required quorum (2)
3. ✅ Action exists in allowed governance scope

The execution function verifies all conditions before taking action.

---

## 8. Supported Actions

### update_protocol_fee
**Params:**
- `new_fee_percent` (number, 0-10%)

**Effect:** Updates `protocol_parameters.protocol_fee_percentage`

---

### update_client_fee
**Params:**
- `new_fee_percent` (number, 0-5%)

**Effect:** Updates default client fee cap

---

### treasury_withdrawal
**Params:**
- `amount` (number)
- `currency` (string, e.g., 'BTC')
- `recipient` (string, wallet address or DID)
- `purpose` (string)

**Effect:** Creates approved `treasury_movements` record

**Note:** Actual Bitcoin transaction must be executed manually by treasury manager

---

### emergency_pause
**Params:** None

**Effect:** Sets `emergency_pause_enabled = true`

**Use case:** Critical bug, security breach, or systemic risk

---

### emergency_unpause
**Params:** None

**Effect:** Sets `emergency_pause_enabled = false`

---

### add_signer
**Params:**
- `signer_id` (string)
- `identity_did` (string, optional)
- `public_key` (string, optional)
- `role` ('founder' | 'technical' | 'treasury' | 'other')

**Effect:** Adds new signer to multisig council

---

### remove_signer
**Params:**
- `signer_id` (string)
- `reason` (string)

**Effect:** Marks signer as inactive

**Safety:** Cannot remove if it would leave fewer than 2 active signers

---

### update_escrow_duration
**Params:**
- `new_duration_days` (number, 1-30)

**Effect:** Changes how long funds are held in escrow after delivery

---

### update_dispute_window
**Params:**
- `new_window_days` (number, 1-30)

**Effect:** Changes how long buyers can dispute after delivery

---

### schema_migration
**Params:**
- `migration_file` (string)
- `description` (string)
- `breaking_change` (boolean)

**Effect:** Records approval for database schema change

**Note:** Actual migration must be run manually by technical lead

---

## 9. Upgrade Path

### Phase 1: MVP (Current)
- **Approval Storage:** Database records
- **Signatures:** Optional plaintext (not verified)
- **Enforcement:** Logical (code checks quorum)

### Phase 2: Cryptographic Verification
- **Signatures:** PGP or DID-based signatures
- **Verification:** Cryptographic proof of signer identity
- **Enforcement:** Signature verification before execution

### Phase 3: On-Chain / Federated
- **Storage:** Fedimint, RGB, or Bitcoin-native multisig
- **Enforcement:** Trust-minimized (math, not trust)
- **Transparency:** Publicly auditable on Bitcoin

---

## 10. Testing

### Local Development

Use mock signers for testing:
- `signer_1`, `signer_2`, `signer_3`
- Plain text signatures (no verification)
- Simulate approvals until quorum reached
- Verify automatic execution triggers

### Test Scenarios

1. ✅ Create proposal
2. ✅ Submit 2 approvals → auto-approve
3. ✅ Execute proposal → parameter updated
4. ✅ Prevent double-voting
5. ✅ Prevent non-signers from proposing
6. ✅ Verify audit logs

---

## 11. Security Considerations

### Signer Security
- **Never** allow a single signer to push code or treasury changes
- Keep signer credentials offline or hardware-protected
- Rotate keys periodically
- Use 2FA on all signer accounts

### Audit Trail
- All proposals, approvals, and executions are timestamped
- Maintain encrypted backups of governance tables
- Log to append-only storage for forensic review
- Export to IPFS or Arweave for public audit

### Emergency Procedures
- **Circuit Breaker:** Emergency pause can be activated with 2-of-3 approval
- **Key Compromise:** Remove compromised signer via governance proposal
- **System Failure:** Manual database rollback procedures documented

---

## 12. Future Decentralization

As the ecosystem grows:

### Stakeholder Voting
- Introduce reputation-weighted voting for ecosystem contributors
- Vendors with high transaction volume get voting power
- Bitcoin holders can delegate to representatives

### Public Transparency
- Publish proposals to Nostr for community review
- Store proposals on IPFS for censorship resistance
- Allow public comment period before execution

### DAO Transition
- Migrate to on-chain governance when ready
- Use Bitcoin-native contracts (Taproot, RGB, Fedimint)
- Maintain backward compatibility during transition

---

## 13. API Examples

### Create Proposal

```typescript
const proposal = await proposalService.createProposal({
  action: 'update_protocol_fee',
  params: { new_fee_percent: 2.5 },
  rationale: 'Reduce fee to stay competitive',
  proposed_by: 'founder',
  voting_duration_hours: 72
});
```

### Submit Approval

```typescript
await proposalService.submitApproval({
  proposal_id: proposal.id,
  signer_id: 'tech_lead',
  approved: true,
  comment: 'I support this change'
});
```

### Execute Proposal

```typescript
const execution = await executionService.executeProposal(
  proposal.id,
  'founder'
);

console.log('New fee:', execution.result.new_fee);
```

---

## 14. Governance Dashboard (Future)

Visual interface for:
- Viewing active proposals
- Voting on proposals
- Tracking proposal history
- Monitoring treasury balance
- Exporting audit logs

---

## 15. Contact

For governance questions or proposals:
- **GitHub Issues:** https://github.com/christinepamela/marketplace-protocol/issues
- **Email:** governance@rangkai.network

---

**Document Version:** 1.0  
**Last Updated:** October 2025  
**Next Review:** When transitioning to Phase 2 (cryptographic signatures)