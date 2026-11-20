# 📘 Phase 6 API Reference Card

Quick reference for Trust & Compliance endpoints.

---

## 🚨 Dispute Endpoints

### 1. File a Dispute
```http
POST /api/disputes
Authorization: Bearer {buyer_token}
Content-Type: application/json

{
  "order_id": "uuid",
  "dispute_type": "quality" | "non_receipt" | "logistics" | "change_of_mind" | "other",
  "description": "string (10-5000 chars)",
  "evidence": {
    "photo_urls": ["https://..."],
    "video_urls": ["https://..."],
    "tracking_number": "string",
    "description_details": "string"
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "dispute_number": "DIS-001",
    "status": "awaiting_vendor",
    "vendor_response_due_at": "2025-11-03T10:00:00Z",
    ...
  }
}
```

**Permissions:** Buyer only, within 72h of delivery  
**Status Codes:** 201 (success), 403 (forbidden), 400 (window expired)

---

### 2. Get Dispute Details
```http
GET /api/disputes/{dispute_id}
Authorization: Bearer {token}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "status": "under_review",
    "resolution": "partial_refund",
    "events": [
      {
        "event_type": "opened",
        "actor_did": "did:rangkai:...",
        "occurred_at": "2025-11-01T10:00:00Z"
      }
    ],
    ...
  }
}
```

**Permissions:** Buyer or Vendor (participants only)  
**Status Codes:** 200 (success), 403 (forbidden), 404 (not found)

---

### 3. Vendor Response
```http
POST /api/disputes/{dispute_id}/vendor-response
Authorization: Bearer {vendor_token}
Content-Type: application/json

{
  "response_text": "string (10-5000 chars)",
  "counter_evidence": {
    "photo_urls": ["https://..."]
  },
  "proposed_resolution": "full_refund" | "partial_refund" | "no_refund" | "vendor_wins"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "status": "under_review",
    "vendor_response": {...},
    ...
  }
}
```

**Permissions:** Vendor only, within 48h  
**Triggers:** Auto-resolution attempt  
**Status Codes:** 200 (success), 403 (forbidden), 400 (invalid status)

---

### 4. Get Disputes by Order
```http
GET /api/disputes/order/{order_id}
Authorization: Bearer {token}
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "dispute_type": "quality",
      "status": "resolved",
      ...
    }
  ]
}
```

**Permissions:** Buyer or Vendor (participants only)  
**Status Codes:** 200 (success), 403 (forbidden), 404 (order not found)

---

### 5. Get Dispute Statistics
```http
GET /api/disputes/stats
Authorization: Bearer {token}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "total_disputes": 42,
    "open_disputes": 5,
    "resolved_disputes": 37,
    "auto_resolved_count": 33,
    "arbitration_count": 4,
    "resolution_breakdown": {
      "full_refund": 15,
      "partial_refund": 10,
      "no_refund": 8,
      "vendor_wins": 4
    },
    "average_resolution_time_hours": 36.5,
    "top_dispute_reasons": [
      { "type": "quality", "count": 20 },
      { "type": "non_receipt", "count": 15 }
    ]
  }
}
```

**Permissions:** Any authenticated user  
**Status Codes:** 200 (success)

---

## ⭐ Rating Endpoints

### 6. Submit a Rating
```http
POST /api/ratings
Authorization: Bearer {token}
Content-Type: application/json

{
  "order_id": "uuid",
  "rating": 1-5,
  "comment": "string (max 1000 chars)",
  "categories": {
    "quality": 1-5,
    "delivery": 1-5,
    "communication": 1-5,
    "payment": 1-5
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "buyer_rating": 4,
    "buyer_comment": "Good product!",
    "vendor_rating": null,  // Hidden until both submit or 7 days
    "revealed_at": null,
    ...
  }
}
```

**Permissions:** Buyer or Vendor (participants only)  
**Requirements:** Order must be completed or refunded  
**Status Codes:** 201 (success), 403 (forbidden), 409 (already rated)

---

### 7. Get Rating by Order
```http
GET /api/ratings/order/{order_id}
Authorization: Bearer {token}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "buyer_rating": 4,
    "buyer_comment": "Good!",
    "vendor_rating": 5,
    "vendor_comment": "Great buyer!",
    "revealed_at": "2025-11-01T12:00:00Z",
    ...
  }
}
```

**Note:** If not revealed yet, other party's rating is hidden.

**Permissions:** Buyer or Vendor (participants only)  
**Status Codes:** 200 (success), 403 (forbidden), 404 (not found)

---

### 8. Get User Rating Statistics
```http
GET /api/ratings/user/{did}?role=vendor|buyer
```

**Response:**
```json
{
  "success": true,
  "data": {
    "total_ratings": 25,
    "average_rating": 4.3,
    "rating_distribution": {
      "1": 1,
      "2": 2,
      "3": 5,
      "4": 8,
      "5": 9
    },
    "recent_ratings": [...]
  }
}
```

**Permissions:** Public (no authentication)  
**Required:** `role` query parameter (buyer or vendor)  
**Status Codes:** 200 (success), 400 (missing role)

---

### 9. Get User Rating List
```http
GET /api/ratings/user/{did}/list?role=vendor|buyer
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "buyer_rating": 5,
      "buyer_comment": "Excellent!",
      "revealed_at": "2025-10-30T10:00:00Z",
      ...
    }
  ]
}
```

**Permissions:** Public (no authentication)  
**Note:** Only returns revealed ratings  
**Status Codes:** 200 (success), 400 (missing role)

---

## 🔑 Common Error Codes

| Code | Status | Meaning |
|------|--------|---------|
| `UNAUTHORIZED` | 401 | Missing or invalid token |
| `FORBIDDEN` | 403 | Not allowed (wrong role) |
| `ORDER_NOT_FOUND` | 404 | Order doesn't exist |
| `DISPUTE_NOT_FOUND` | 404 | Dispute doesn't exist |
| `DISPUTE_ALREADY_EXISTS` | 409 | Can't file duplicate |
| `DISPUTE_WINDOW_EXPIRED` | 400 | Past 72h deadline |
| `ALREADY_RATED` | 409 | Can't rate twice |
| `RATING_NOT_ALLOWED` | 400 | Order not completed |
| `VALIDATION_ERROR` | 400 | Invalid input data |

---

## 🕐 Time Windows

| Action | Window | Consequence |
|--------|--------|-------------|
| File dispute | Within 72h of delivery | Auto-rejected after |
| Vendor response | Within 48h of filing | Auto-escalates if missed |
| Rating submission | After order completion | No deadline (encouraged within 7 days) |
| Rating reveal | 7 days after first rating | Auto-reveals if second party doesn't submit |

---

## 📝 Dispute Types

| Type | Description | Auto-Resolution |
|------|-------------|-----------------|
| `quality` | Product defect/damage | 80% (evidence-based) |
| `non_receipt` | Never arrived | 95% (tracking-based) |
| `logistics` | Shipping problem | 90% (courier fault) |
| `change_of_mind` | Buyer regret | 100% (non-refundable) |
| `other` | Miscellaneous | 60% (case-by-case) |

---

## 📊 Resolution Types

| Resolution | Meaning | Escrow Action |
|-----------|---------|---------------|
| `full_refund` | 100% to buyer | Release all to buyer |
| `partial_refund` | Split 50-50 | Split between parties |
| `no_refund` | 0% to buyer | Release all to vendor |
| `vendor_wins` | Vendor correct | Release all to vendor |

---

## 🎯 Best Practices

### **For Buyers:**
- File disputes **quickly** (within 72h)
- Upload **clear photos/videos** as evidence
- Write **detailed descriptions** (10+ chars minimum)
- Be **factual** (not emotional)

### **For Vendors:**
- Respond **promptly** (within 48h)
- Provide **counter-evidence** if needed
- Suggest **fair resolutions**
- Maintain **professional tone**

### **For Ratings:**
- Rate **honestly** (dual-blind protects you)
- Use **category ratings** for detailed feedback
- Submit **within 7 days** for mutual reveal
- Remember ratings affect **reputation scores**

---

## 🔗 Webhook Events (Future)

Coming in Phase 8:

```
dispute.opened
dispute.vendor_responded
dispute.escalated
dispute.resolved
rating.submitted
rating.revealed
reputation.updated
```

---

## 🛠️ Testing Tips

### **Quick Test Flow:**

```bash
# 1. Complete an order first
curl -X POST http://localhost:3000/api/orders/.../complete \
  -H "Authorization: Bearer $TOKEN"

# 2. File dispute
curl -X POST http://localhost:3000/api/disputes \
  -H "Authorization: Bearer $BUYER_TOKEN" \
  -d '{"order_id":"...","dispute_type":"quality","description":"Damaged"}'

# 3. Vendor responds
curl -X POST http://localhost:3000/api/disputes/.../vendor-response \
  -H "Authorization: Bearer $VENDOR_TOKEN" \
  -d '{"response_text":"Properly packaged"}'

# 4. Submit ratings
curl -X POST http://localhost:3000/api/ratings \
  -H "Authorization: Bearer $BUYER_TOKEN" \
  -d '{"order_id":"...","rating":4,"comment":"Good!"}'
```

---

**Need Help?** Check the full implementation guide or open an issue on GitHub.