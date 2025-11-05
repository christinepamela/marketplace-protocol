# Phase 7 API Reference: Governance Routes

**Layer 6: Governance & Multisig**  
**Status:** Complete ✅  
**Endpoints:** 5  
**Tests:** 8 passing  

---

## Overview

The Governance API enables decentralized protocol governance through a multisig council. Active signers can create proposals, vote on changes, and execute approved actions.

### Key Features
- **2-of-3 Multisig**: Requires majority approval (configurable based on signer count)
- **Transparent Voting**: All proposals and votes are publicly viewable
- **Time-bound Voting**: Proposals expire after voting window (default 72 hours)
- **Action Execution**: Automated execution of approved governance actions

### Governance Actions
- `update_protocol_fee` - Adjust protocol fee (0-10%)
- `update_client_fee` - Adjust client marketplace fee (0-5%)
- `treasury_withdrawal` - Withdraw funds from protocol treasury
- `emergency_pause` - Pause protocol operations
- `emergency_unpause` - Resume protocol operations
- `add_signer` - Add new signer to council
- `remove_signer` - Remove signer from council
- `update_escrow_duration` - Change escrow hold period
- `update_dispute_window` - Change dispute filing window
- `schema_migration` - Approve database schema changes

---

## Endpoints

### 1. Create Proposal

Create a new governance proposal (signers only).

**Endpoint:** `POST /api/v1/proposals`  
**Auth:** Required (active signer only)

**Request Body:**
```json
{
  "action": "update_protocol_fee",
  "params": {
    "new_fee_percent": 2.5
  },
  "rationale": "Adjusting fee to improve competitiveness",
  "voting_duration_hours": 72
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "proposalId": "uuid",
    "proposalNumber": "GOV-001",
    "action": "update_protocol_fee",
    "status": "active",
    "votingEndsAt": "2025-11-08T12:00:00Z",
    "requiredApprovals": 2
  }
}
```

**Validation:**
- `action`: Must be valid GovernanceAction enum
- `params`: Object (structure depends on action)
- `rationale`: 10-1000 characters
- `voting_duration_hours`: Optional, positive number

**Errors:**
- `403 FORBIDDEN` - Not an active signer
- `400 VALIDATION_ERROR` - Invalid input

---

### 2. List Proposals

Get all proposals with optional status filter (public).

**Endpoint:** `GET /api/v1/proposals`  
**Auth:** Not required (public endpoint)

**Query Parameters:**
- `status` (optional): Filter by status (`active`, `approved`, `executed`, `rejected`, `expired`)

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "proposal_number": "GOV-001",
      "action": "update_protocol_fee",
      "params": { "new_fee_percent": 2.5 },
      "rationale": "Adjusting fee...",
      "proposed_by": "did:rangkai:founder",
      "status": "active",
      "required_approvals": 2,
      "current_approvals": 1,
      "voting_starts_at": "2025-11-05T12:00:00Z",
      "voting_ends_at": "2025-11-08T12:00:00Z",
      "created_at": "2025-11-05T12:00:00Z"
    }
  ],
  "count": 1
}
```

---

### 3. Get Proposal Details

Get proposal with voting summary (public).

**Endpoint:** `GET /api/v1/proposals/:id`  
**Auth:** Not required (public endpoint)

**Response (200):**
```json
{
  "success": true,
  "data": {
    "proposal": {
      "id": "uuid",
      "proposal_number": "GOV-001",
      "action": "update_protocol_fee",
      "status": "approved",
      "current_approvals": 2,
      "required_approvals": 2
    },
    "approvals": [
      {
        "id": "uuid",
        "signer_id": "did:rangkai:founder",
        "approved": true,
        "comment": "I support this",
        "approved_at": "2025-11-05T13:00:00Z"
      }
    ],
    "approvers": ["did:rangkai:founder", "did:rangkai:tech"],
    "rejectors": [],
    "pending_signers": ["did:rangkai:treasury"],
    "can_execute": true,
    "time_remaining": 48
  }
}
```

**Errors:**
- `404 NOT_FOUND` - Proposal not found

---

### 4. Submit Vote

Vote on a proposal (signers only).

**Endpoint:** `POST /api/v1/proposals/:id/vote`  
**Auth:** Required (active signer only)

**Request Body:**
```json
{
  "approved": true,
  "signature": "optional_signature_string",
  "comment": "I support this change"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Vote submitted: APPROVED",
  "data": {
    "voteId": "uuid",
    "approved": true,
    "proposalStatus": "approved",
    "currentApprovals": 2,
    "requiredApprovals": 2
  }
}
```

**Status Changes:**
- After reaching quorum: `active` → `approved`
- Proposal can then be executed

**Errors:**
- `403 FORBIDDEN` - Not an active signer
- `400` - Voting window expired
- `409` - Already voted on this proposal

---

### 5. Execute Proposal

Execute an approved proposal (signers only).

**Endpoint:** `POST /api/v1/proposals/:id/execute`  
**Auth:** Required (active signer only)

**Response (200):**
```json
{
  "success": true,
  "message": "Proposal executed successfully",
  "data": {
    "executionId": "uuid",
    "action": "update_protocol_fee",
    "status": "success",
    "result": {
      "old_fee": 3.0,
      "new_fee": 2.5
    },
    "executedAt": "2025-11-05T15:00:00Z"
  }
}
```

**Errors:**
- `403 FORBIDDEN` - Not an active signer
- `400` - Proposal not approved or insufficient approvals
- `500` - Execution failed (check `error` field)

---

## Example Workflows

### Workflow 1: Update Protocol Fee

```bash
# 1. Signer 1 creates proposal
curl -X POST http://localhost:3000/api/v1/proposals \
  -H "Authorization: Bearer $SIGNER1_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "update_protocol_fee",
    "params": {"new_fee_percent": 2.5},
    "rationale": "Market research shows 2.5% is more competitive"
  }'

# 2. Signer 2 approves
curl -X POST http://localhost:3000/api/v1/proposals/$PROPOSAL_ID/vote \
  -H "Authorization: Bearer $SIGNER2_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "approved": true,
    "comment": "Agreed"
  }'

# 3. Signer 3 approves (reaches quorum)
curl -X POST http://localhost:3000/api/v1/proposals/$PROPOSAL_ID/vote \
  -H "Authorization: Bearer $SIGNER3_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"approved": true}'

# 4. Any signer executes
curl -X POST http://localhost:3000/api/v1/proposals/$PROPOSAL_ID/execute \
  -H "Authorization: Bearer $SIGNER1_TOKEN"
```

### Workflow 2: Emergency Pause

```bash
# Create and approve emergency pause (fast-track)
curl -X POST http://localhost:3000/api/v1/proposals \
  -H "Authorization: Bearer $SIGNER1_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "emergency_pause",
    "params": {},
    "rationale": "Security incident detected",
    "voting_duration_hours": 1
  }'

# Quick approval from 2 signers
curl -X POST http://localhost:3000/api/v1/proposals/$PROPOSAL_ID/vote \
  -H "Authorization: Bearer $SIGNER1_TOKEN" \
  -d '{"approved": true}'

curl -X POST http://localhost:3000/api/v1/proposals/$PROPOSAL_ID/vote \
  -H "Authorization: Bearer $SIGNER2_TOKEN" \
  -d '{"approved": true}'

# Execute immediately
curl -X POST http://localhost:3000/api/v1/proposals/$PROPOSAL_ID/execute \
  -H "Authorization: Bearer $SIGNER1_TOKEN"
```

---

## Action-Specific Parameters

### Update Protocol Fee
```json
{
  "action": "update_protocol_fee",
  "params": {
    "new_fee_percent": 2.5
  }
}
```
- Range: 0-10%
- Updates `protocol_parameters.protocol_fee_percentage`

### Treasury Withdrawal
```json
{
  "action": "treasury_withdrawal",
  "params": {
    "amount": 1000000,
    "currency": "USD",
    "recipient": "did:rangkai:recipient",
    "purpose": "Development grant Q4"
  }
}
```
- Creates `treasury_movements` record
- Actual Bitcoin transaction done manually

### Add Signer
```json
{
  "action": "add_signer",
  "params": {
    "signer_id": "did:rangkai:newsigner",
    "identity_did": "did:rangkai:newsigner",
    "role": "technical"
  }
}
```
- Roles: `founder`, `technical`, `treasury`, `other`
- Adjusts required quorum automatically

### Update Escrow Duration
```json
{
  "action": "update_escrow_duration",
  "params": {
    "new_duration_days": 10
  }
}
```
- Range: 1-30 days
- Affects future orders only

---

## Testing

Run the test suite:
```bash
npm run test:governance-routes
```

**Test Coverage:**
1. ✅ Create proposal (signer)
2. ✅ Non-signer blocked from proposing
3. ✅ Get proposal details
4. ✅ List all proposals
5. ✅ Submit approval vote (Signer 1)
6. ✅ Submit approval vote (Signer 2)
7. ✅ Duplicate vote blocked
8. ✅ Execute approved proposal

---

## Security Notes

1. **Signer Verification**: All write operations verify active signer status
2. **Quorum Enforcement**: Execution blocked until quorum reached
3. **Time Windows**: Proposals expire to prevent indefinite pending state
4. **Public Transparency**: Read operations require no auth (governance transparency)
5. **Audit Trail**: All votes and executions permanently logged

---

## Integration with Other Layers

### Layer 4 (Trust & Compliance)
- Governance can update `dispute_window_days` parameter
- Can pause dispute resolution during emergencies

### Layer 2 (Transactions)
- Governance controls `escrow_hold_duration_days`
- Can pause order processing via emergency actions

### Protocol Parameters
All parameter changes via governance are stored in `protocol_parameters` table with full history.

---

**Phase 7 Complete** ✅  
**Next:** Phase 8 - WebSocket Events