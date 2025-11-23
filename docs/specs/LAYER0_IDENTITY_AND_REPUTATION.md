# Layer 0: Identity & Reputation

### **Purpose**
To create a unified yet flexible framework for identifying participants, verifying trust, and enabling reputation portability across marketplaces built on the protocol.  

This layer establishes the foundational link between who a user is, what they've done, and how they're perceived — without compromising privacy or decentralization.

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
- Each user's performance (ratings, successful transactions, compliance records) is aggregated into a **Reputation Score**.  
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
Each participant's **Reputation NFT** acts as a verifiable credential containing encrypted metadata of performance and behavior. It is bound to the user's **DID**, not their wallet, preventing transfer or sale.

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

## 6.5. JWT Authentication for API Access

### **Purpose**
JWT (JSON Web Token) authentication provides secure, stateless API access for all identity types while maintaining the protocol's privacy guarantees. This system operates **independently** from DID-based identity verification — JWT handles API authentication, while DID handles identity representation.

### **Authentication vs. Identity**
- **DID (Decentralized Identifier):** Represents *who you are* in the protocol (KYC/Nostr/Anonymous)
- **JWT Token:** Proves you are *authenticated* to access the API
- **Relationship:** JWT contains the DID as the subject claim, linking authentication to identity

**Important:** All three identity types (KYC, Nostr, Anonymous) use JWT tokens for API authentication. The identity type affects token privileges and session duration, not whether JWT is used.

---

### **6.5.1. Token Architecture**

The protocol uses a **dual-token system** for security and user experience:

#### **Access Tokens (Short-Lived)**
- **Purpose:** Authorize API requests
- **Expiry:** 1 hour (KYC/Nostr) or 24 hours (Anonymous)
- **Usage:** Sent in `Authorization: Bearer <token>` header for all protected endpoints
- **Scope:** Limited to API operations (read products, create orders, etc.)

#### **Refresh Tokens (Long-Lived)**
- **Purpose:** Obtain new access tokens without re-authentication
- **Expiry:** 30 days (KYC/Nostr only)
- **Usage:** Sent to `/api/v1/identity/refresh` endpoint to get new access token
- **Scope:** Only for token refresh operations
- **Security:** Cannot be used for API requests directly

**Why Two Tokens?**
- Short-lived access tokens limit damage if stolen (expire in 1 hour)
- Long-lived refresh tokens provide convenience (30-day sessions)
- Separation allows refresh token revocation without affecting active access tokens

---

### **6.5.2. Token Generation (Registration Flow)**

When a user registers via `POST /api/v1/identity/register`, the protocol generates tokens based on identity type:

#### **For KYC and Nostr Users:**
```json
{
  "did": "did:rangkai:kyc:abc123",
  "token": "eyJhbGc...",           // Access token (1 hour)
  "refreshToken": "eyJhbGc...",    // Refresh token (30 days)
  "expiresIn": "1h",
  "identity": { ... }
}
```

#### **For Anonymous Users:**
```json
{
  "did": "did:rangkai:anonymous:xyz789",
  "token": "eyJhbGc...",           // Access token (24 hours)
  "refreshToken": null,            // No refresh token
  "expiresIn": "24h",
  "identity": { ... }
}
```

**Rationale for Anonymous Limitations:**
- 24-hour sessions enforce privacy-by-design (no long-term tracking)
- No refresh tokens prevent persistent session abuse
- Users must re-register daily to maintain anonymity guarantees
- Incentivizes upgrading to KYC/Nostr for persistent accounts

---

### **6.5.3. Token Structure & Claims**

#### **Access Token Payload:**
```json
{
  "sub": "did:rangkai:kyc:abc123",  // Subject: User's DID
  "type": "kyc",                     // Identity type
  "clientId": "marketplace-xyz",     // Which marketplace issued this
  "tokenType": "access",             // Distinguishes from refresh tokens
  "iat": 1234567890,                 // Issued at (Unix timestamp)
  "exp": 1234571490                  // Expires (1 hour later)
}
```

#### **Refresh Token Payload:**
```json
{
  "sub": "did:rangkai:kyc:abc123",
  "type": "kyc",
  "clientId": "marketplace-xyz",
  "tokenType": "refresh",            // Cannot be used for API requests
  "iat": 1234567890,
  "exp": 1237246290                  // Expires (30 days later)
}
```

**Key Claims:**
- `sub`: The user's DID, linking JWT to protocol identity
- `type`: Identity verification level (affects permissions)
- `tokenType`: Prevents refresh tokens from being used as access tokens
- `clientId`: Tracks which marketplace issued the token (for multi-tenant scenarios)

---

### **6.5.4. Token Storage & Usage**

#### **Client-Side Storage:**
- **Access Token:** Stored in `localStorage` as `rangkai_token`
- **Refresh Token:** Stored in `localStorage` as `rangkai_refresh_token`
- **User DID:** Stored in `localStorage` as `rangkai_user_did`

#### **API Request Pattern:**
```http
GET /api/v1/orders/buyer/did:rangkai:...
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

#### **Automatic Token Refresh (Client-Side):**
1. Client detects access token will expire in 5 minutes
2. Client sends refresh token to `/api/v1/identity/refresh`
3. Server validates refresh token and returns new access token
4. Client updates `localStorage` and continues operation
5. **User never notices** — seamless background refresh

**Security Note:** Tokens stored in `localStorage` are vulnerable to XSS attacks. Production deployments should:
- Implement Content Security Policy (CSP) headers
- Sanitize all user input to prevent script injection
- Consider `httpOnly` cookies for enhanced security (requires same-domain API)

---

### **6.5.5. Token Validation**

#### **Server-Side Validation Flow:**
1. Extract token from `Authorization: Bearer <token>` header
2. Verify signature using `JWT_SECRET` environment variable
3. Check token hasn't expired (`exp` claim)
4. Verify `tokenType` is "access" (reject refresh tokens)
5. Load user permissions based on `sub` (DID) and `type`
6. Attach user context to request object

#### **Validation Errors:**
- **Missing Token:** `401 Unauthorized - Authentication required`
- **Invalid Signature:** `401 Unauthorized - Invalid token`
- **Expired Token:** `401 Unauthorized - Token has expired`
- **Wrong Token Type:** `401 Unauthorized - Invalid token type. Use access token for API requests.`

---

### **6.5.6. Token Refresh Endpoint**

**Endpoint:** `POST /api/v1/identity/refresh`

**Request:**
```json
{
  "refreshToken": "eyJhbGc..."
}
```

**Response (Success):**
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGc...",      // New access token
    "expiresIn": "1h"
  }
}
```

**Response (Error - Expired Refresh Token):**
```json
{
  "success": false,
  "error": {
    "message": "Refresh token has expired. Please log in again."
  }
}
```

**Security Checks:**
- Validates `tokenType` is "refresh"
- Ensures user identity still exists in database
- Rejects refresh for anonymous users (design limitation)
- Generates fresh access token with updated expiry

---

### **6.5.7. Security Considerations**

#### **Token Secrets (Environment Variables):**
```bash
# Access tokens (1 hour)
JWT_SECRET=<32+ character random string>
JWT_EXPIRY=1h

# Refresh tokens (30 days)
JWT_REFRESH_SECRET=<different 32+ character random string>
JWT_REFRESH_EXPIRY=30d

# Anonymous users (24 hours, no refresh)
JWT_ANONYMOUS_EXPIRY=24h
```

**Best Practices:**
- Use separate secrets for access and refresh tokens
- Rotate secrets periodically (invalidates all tokens)
- Store secrets in secure environment variables, never in code
- Use strong, cryptographically random secrets (generated via `openssl rand -base64 32`)

#### **Production Security:**
- **HTTPS Required:** Tokens transmitted in plain text over HTTP are vulnerable to interception
- **Token Revocation:** Store refresh tokens in database to enable revocation on logout/compromise
- **Rate Limiting:** Prevent token refresh abuse (100 requests/hour per user)
- **Audit Logging:** Track token generation and refresh for security monitoring

#### **XSS Mitigation:**
- Sanitize all user-generated content before rendering
- Implement Content Security Policy (CSP) headers
- Consider moving to `httpOnly` cookies in production (prevents JavaScript access)
- Never log tokens in production (security vulnerability)

---

### **6.5.8. Identity Type Behavior Matrix**

| **Identity Type** | **Access Token Expiry** | **Refresh Token** | **Session Length** | **Use Case** |
|-------------------|-------------------------|-------------------|--------------------|--------------|
| **KYC** | 1 hour | ✅ 30 days | Persistent (30 days) | Businesses, high-value traders |
| **Nostr** | 1 hour | ✅ 30 days | Persistent (30 days) | Decentralized identity users |
| **Anonymous** | 24 hours | ❌ None | Single session (24h) | Privacy-focused, experimental users |

**Design Rationale:**
- **KYC/Nostr:** Long sessions encourage consistent participation and reputation building
- **Anonymous:** Short sessions enforce privacy guarantees and prevent long-term tracking
- **Token Refresh:** Balances security (short access tokens) with UX (long sessions)

---

### **6.5.9. Government Disclosure & Privacy**

**Question:** Can government force disclosure of user identity through JWT tokens?

**Answer:** It depends on the identity type, and JWT tokens themselves reveal minimal information.

#### **What JWT Tokens Contain:**
JWT tokens are **not** Personally Identifiable Information (PII). They contain:
- A DID (username-like identifier)
- Identity type (KYC/Nostr/Anonymous)
- Expiration timestamp
- Client ID (marketplace name)

**JWT tokens do NOT contain:**
- Real names, addresses, or contact information
- KYC documents or verification data
- Transaction history or financial data

#### **What Can Be Disclosed by Identity Type:**

**KYC Users:**
- **JWT Reveals:** DID format shows user is KYC-verified
- **Database Contains:** Full KYC data (name, address, business registration, ID documents)
- **Disclosure Obligation:** ✅ Must comply with valid court orders
- **How:** Query `identities` table in database using the DID from JWT
- **What's Provided:** All KYC data submitted during registration

**Nostr Users:**
- **JWT Reveals:** DID format shows Nostr identity
- **Database Contains:** Nostr public key, display name, country (if provided)
- **Disclosure Obligation:** ✅ Provide public key and metadata
- **Limitation:** Nostr is decentralized—protocol doesn't control user's activity elsewhere
- **Real Identity:** Unknown unless user KYC'd on another platform

**Anonymous Users:**
- **JWT Reveals:** DID format shows anonymous identity
- **Database Contains:** Transaction history, IP logs (if collected), reputation data
- **Disclosure Obligation:** ✅ Provide available data (transaction logs, timestamps)
- **Real Identity:** **Mathematically impossible to determine**
  - Zero-knowledge proofs don't store identity data
  - Court orders cannot force disclosure of data that doesn't exist
  - Even the protocol operator cannot link anonymous DID to real identity

#### **Key Principle: You Can't Disclose What Doesn't Exist**

Anonymous mode protects **both** the user and the protocol operator:
- **Users:** Real identity never collected, mathematically unlinkable
- **Operators:** Cannot be compelled to provide data that was never stored
- **Compliance:** Transparent about data limitations during registration

This is **by design**—anonymous mode provides genuine privacy, not just obscurity.

---

### **6.5.10. Token Lifecycle Example**

#### **Day 1 (Registration):**
1. User registers as KYC user at 10:00 AM
2. Receives access token (expires 11:00 AM) + refresh token (expires 30 days later)
3. Uses access token for API requests

#### **Day 1 (10:55 AM - Auto Refresh):**
1. Client detects token expires in 5 minutes
2. Sends refresh token to `/api/v1/identity/refresh`
3. Receives new access token (expires 11:55 AM)
4. Updates `localStorage`, continues operation
5. **User never notices interruption**

#### **Day 15 (Still Active):**
- Access token refreshed ~336 times (every 55 minutes)
- Same refresh token still valid (expires Day 30)
- User never had to re-login

#### **Day 30 (Refresh Token Expires):**
- Access token refresh fails with `Token has expired`
- Client redirects to login page
- User must re-authenticate

#### **Anonymous User (24 Hours):**
- No refresh token issued
- Access token expires after 24 hours
- Must re-register to continue (enforces privacy)

---

### **6.5.11. Relationship to Role-Based Access Control (RBAC)**

JWT authentication is **separate** from authorization (permissions). The protocol uses a role-based permission system:

**Authentication (JWT):** *"Who are you?"*
- JWT proves identity via signature validation
- Contains DID linking to protocol identity

**Authorization (RBAC):** *"What can you do?"*
- Permissions stored in database, linked to DID
- Examples: `order:create`, `product:write`, `admin`
- Checked **after** JWT authentication succeeds

**Flow:**
1. Request arrives with JWT token
2. JWT validated → Extract DID
3. Load permissions for DID from database
4. Check if user has required permission
5. Allow or deny request

**Example Permissions by Role:**
- **Buyer:** `product:view`, `order:create`
- **Vendor:** `product:create`, `order:manage`
- **Admin:** `*` (all permissions)

See **Section 8: Governance & Recovery** for detailed permission documentation.

---

### **6.5.12. Implementation Reference**

**Backend Implementation:**
- `marketplace-protocol/src/api/routes/identity.routes.ts` (Lines 112-145)
  - Token generation during registration
  - Refresh token endpoint

**Type Definitions:**
- `marketplace-protocol/src/core/layer0-identity/types.ts` (Line 364)
  - `RegisterIdentityResponse` includes `type` field

- `marketplace-protocol/src/api/core/auth.ts` (Line 13)
  - `JwtPayload` interface with `tokenType` field

**Configuration:**
- `marketplace-protocol/src/api/core/config.ts` (Lines 27-35)
  - JWT secrets and expiry settings

**SDK Methods:**
- `marketplace-protocol/packages/sdk/src/modules/identity.ts` (Lines 45-82)
  - `register()` - Returns both tokens
  - `refresh()` - Refreshes access token

**Frontend Integration:**
- `rangkai-marketplace/lib/contexts/AuthContext.tsx` (Lines 72-99)
  - Auto-refresh logic (55-minute interval)
  - Token storage management

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
| **Secure API Access** | JWT dual-token system | Seamless UX with strong security |
| **Privacy Protection** | Anonymous mode with ZK proofs | Genuine privacy, not just obscurity |