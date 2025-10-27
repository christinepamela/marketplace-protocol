# Trust & Compliance  
**File:** `docs/TRUST_AND_COMPLIANCE.md`

## Purpose
To enable trust, accountability, and compliance **without centralizing control**, using automated dispute flows, transparent rating signals, and modular compliance checks.

This layer prevents single points of failure and ensures **self-resolving accountability** across all network participants.

---

## 1. Dispute Resolution (`dispute.service.ts`)

### 1.1 Design Philosophy
- Disputes should rarely require human intervention.
- Target automation: **85–95%** early → improving toward **99%** as evidence standardization matures.
- Decisions are driven by deterministic logic tied to:
  - Escrow state
  - Transaction status
  - Standardized evidence inputs

### 1.2 Dispute Types

| Type | Resolution Source | Description |
|------|------------------|-------------|
| Quality issues | Escrow + auto-evidence | Buyer uploads proof (photo/video). Refund triggered by mismatch or damage. |
| Change of mind | Non-refundable | Buyer responsibility once production/dispatch begins. |
| Logistics failure | Courier / Insurance | Courier fault → insurance claim; vendor/buyer unaffected once tracking is valid. |
| Non-receipt | Escrow timer | If delivery not confirmed within SLA, auto-refund. |

### 1.3 Evidence Schema (Mandatory)

```json
{
  "$id": "https://rangkai.org/schemas/dispute-evidence.json",
  "type": "object",
  "properties": {
    "orderId": { "type": "string" },
    "didBuyer": { "type": "string" },
    "didVendor": { "type": "string" },
    "disputeType": { "enum": ["quality","non_receipt","logistics","change_of_mind","other"] },
    "description": { "type": "string", "maxLength": 5000 },
    "photoUrls": { "type": "array", "items": { "type": "string", "format": "uri" } },
    "videoUrls": { "type": "array", "items": { "type": "string", "format": "uri" } },
    "trackingNumber": { "type": "string" },
    "trackingEvents": { "type": "array" },
    "messageThreadId": { "type": "string" },
    "timestamp": { "type": "string", "format": "date-time" }
  },
  "required": ["orderId","didBuyer","didVendor","disputeType","timestamp"]
}
### 1.4 Arbitration Model

| Mode                      | Who Handles            | Conditions                                       |
|--------------------------|------------------------|--------------------------------------------------|
| Auto-resolution (default) | Protocol logic tree     | Evidence clear or timeout-based closure          |
| Client-managed escalation | Marketplace operator    | KYC users only; used when automated rules fail   |
| Protocol-level fallback   | Arbitrator Registry     | Only when the client cannot resolve              |

#### Non-KYC Disputes
- Automated only
- No human arbitration (legally neutral, reduced liability)

#### Arbitrator Registry (KYC-enabled clients)
- Verified DID identity
- Minimum reputation threshold
- Randomized rotation
- Conflict-of-interest declarations
- Fees paid by losing party or split (client-defined)

---

### 1.5 Timeframes

| Stage                       | Duration              | Action                              |
|----------------------------|-----------------------|-------------------------------------|
| Buyer may open dispute     | Within 72h of delivery | Dispute ticket created              |
| Vendor response            | 48h                   | Vendor provides counter-evidence    |
| Arbitration window         | Up to 7 days          | Arbitrator decision (if escalated)  |
| No dispute → Auto-release  | 48–72h                | Escrow released                     |

---

### 1.6 Outcomes

- ✅ Full refund  
- ⚖️ Partial refund  
- 🚫 No refund  

Each outcome updates:
- Escrow state (`escrow.service.ts`)
- Reputation (`layer0-identity/reputation.service.ts`)
- Rating eligibility (`rating.service.ts`)

---

### 1.7 Example Decision Logic

```ts
if (disputeType === "non_receipt") {
  if (tracking.delivered && proof.exists) vendorWins();
  else if (!tracking.exists || overdueSLA) buyerRefund();
}

if (disputeType === "quality") {
  if (buyer.photos.showDamage && !vendor.counterProof) refundBuyer();
  else if (conflict) escalate();
}

if (disputeType === "logistics") {
  if (courier.fault) provisionalRefund();
}

This resolves 80–90% of cases deterministically.

---

## 2. Rating System (`rating.service.ts`)

### 2.1 Core Logic

| Feature | Description |
|--------|-------------|
| Trigger | After escrow release or refund |
| Scale | ⭐ 1–5 (optional: Quality, Delivery, Communication) |
| Visibility | Hidden until both sides submit or after 7 days |
| Storage | Immutable record with timestamp and proof |
| Weight | Based on transaction size, KYC level, account age |

### 2.2 Anti-Gaming Rules

| Exploit | Mitigation |
|--------|------------|
| Fake transactions | Ratings only from verified escrow IDs |
| Retaliation | Delayed visibility |
| Sockpuppet accounts | DID graph + transaction linkage |
| Manipulation | Weighted scoring |

### 2.3 Integration

**Ratings feed Reputation (Layer 0)**

Reputation affects:
- Search ranking
- Buyer/vendor trust signals

Webhook events:
- `reputation.updated`

---
## 3. Compliance (`compliance.service.ts`)

### 3.1 Sanctions and KYC

| Aspect | Handling |
|--------|----------|
| Supported lists | OFAC, UN, EU, Local JSON feeds |
| Checkpoint | At KYC onboarding, not per transaction |
| Integration | Real-time API or daily cached feed |
| If match | Identity blocked and flagged notification |
| Anonymous mode | Client-defined risk acceptance |

```ts
if (user.KYC) {
  const sanctioned = await sanctionsService.check(user.identity);
  if (sanctioned) flagForReview(user.id);
}


**Note:** Protocol advises. Clients enforce.

---

### 3.2 Tax Advisory

- Vendors handle tax filings themselves.
- Protocol provides optional tax tagging plugins.
- Governance may publish verified tax rate feeds.

```json
{
  "tax_tag": {
    "country": "MY",
    "rate": 6,
    "type": "VAT",
    "updated": "2025-10-01"
  }
}


## 4. Integration Points

| Integration           | Description                                         |
|----------------------|-----------------------------------------------------|
| Escrow               | Dispute pauses release                               |
| Ratings → Reputation | Mutual feedback affects trust graph                 |
| Compliance → Identity| Sanctions checks bind to DID                         |
| Governance           | Arbitrators, tax schemas, sanctions feeds via multisig |

**Events emitted:**


```text
dispute.opened
dispute.resolved
escrow.paused
reputation.updated
```



---

## 5. Automation Flow (Sequence)

1. Buyer → Protocol: Open dispute and upload evidence  
2. Protocol → Escrow: Pause release  
3. Protocol → Vendor: Request counter-evidence  
4. Auto-resolution → Escrow: Process refund (partial or full)  
5. Escalation → Arbitrator: Execute payout  
6. Escrow → Buyer: Notify resolution  
7. Protocol → Layer0: Update reputation  

---

## 6. Design Priorities

- Zero operational burden: Core team never mediates  
- Evidence-driven closure (85–99% automation)  
- Vendor fairness: prevent abuse  
- Logistics neutrality: courier carries physical risk  
- Transparent auditability (API-ready)  

---

## 7. Observability & KPIs

Track continuously:

- Percentage of auto-resolved cases  
- Average resolution duration  
- Dispute reason distribution  
- False-positive / false-negative rate  
- Reputation drift  

> Metrics used to tune deterministic logic (not replace it).

---

## 8. Governance Notes

| Case                   | Responsible Party                  |
|------------------------|-----------------------------------|
| Auto-resolution        | Protocol logic                     |
| KYC arbitration         | Client marketplace                 |
| Non-KYC disputes        | Automatic only (no humans)        |
| Escalation fallback     | Protocol arbitrator registry       |

> This maintains legal neutrality and decentralization.

---

## 9. Future: Self-Evolving Rules

When dataset > ~10,000 dispute events:

- ML suggests rule adjustments (does **not** override deterministic rules)  
- Detects bias patterns (courier reliability, vendor behavior)  
- Uses explainable models only  

> Deterministic rules remain the source of truth.

---

## 10. Summary

✅ Rule-based dispute engine  
✅ 85–95% automation (aspirational 99%)  
✅ Escrow-integrated & transparent  
✅ Modular compliance (non-enforcing)  
✅ Decentralized governance & arbitration  
✅ Client retains control for KYC  
✅ Non-KYC = algorithmic resolution only
