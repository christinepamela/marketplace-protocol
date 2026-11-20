# Order Lifecycle - API Quick Reference

## 🔄 Complete Order Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    SUCCESSFUL ORDER FLOW                         │
└─────────────────────────────────────────────────────────────────┘

1️⃣  CREATE ORDER (Buyer)
    POST /api/v1/orders
    Status: payment_pending
    Escrow: none
    
2️⃣  PAY ORDER (Buyer)
    POST /api/v1/orders/:id/pay
    Status: paid
    Escrow: held (7 days)
    
3️⃣  CONFIRM ORDER (Vendor)
    POST /api/v1/orders/:id/confirm
    Status: confirmed
    Escrow: held
    
4️⃣  SHIP ORDER (Vendor)
    POST /api/v1/orders/:id/ship
    Status: shipped
    Escrow: held
    Includes: tracking number, logistics provider
    
5️⃣  MARK DELIVERED (Buyer/Logistics)
    POST /api/v1/orders/:id/deliver
    Status: delivered
    Escrow: held (waiting for buyer confirmation)
    
6️⃣  COMPLETE ORDER (Buyer)
    POST /api/v1/orders/:id/complete
    Status: completed
    Escrow: released to vendor ✅
```

---

## ❌ Alternative Flows

### Cancel Before Payment
```
payment_pending → POST /cancel → cancelled
Escrow: none (no refund needed)
```

### Cancel After Payment
```
paid → POST /cancel → cancelled
Escrow: refunded to buyer ✅
```

### Auto-Release (No Dispute)
```
delivered → [Wait 7 days] → completed
Escrow: auto-released to vendor ✅
```

---

## 🔐 Permission Matrix

| Endpoint | Buyer | Vendor | Logistics | System |
|----------|-------|--------|-----------|--------|
| Create Order | ✅ | ❌ | ❌ | ❌ |
| View Order | ✅ (own) | ✅ (own) | ❌ | ✅ |
| Pay Order | ✅ (own) | ❌ | ❌ | ❌ |
| Confirm | ❌ | ✅ (own) | ❌ | ❌ |
| Ship | ❌ | ✅ (own) | ❌ | ❌ |
| Deliver | ✅ (own) | ❌ | ✅ | ❌ |
| Complete | ✅ (own) | ❌ | ❌ | ✅ |
| Cancel | ✅ (own) | ✅ (own) | ❌ | ✅ |

---

## 📊 State Machine

```
Valid Transitions:
─────────────────
draft              → payment_pending, cancelled
payment_pending    → paid, payment_failed, cancelled
payment_failed     → payment_pending, cancelled
paid               → confirmed, cancelled, refunded
confirmed          → processing, shipped, cancelled, disputed
processing         → shipped, cancelled, disputed
shipped            → delivered, disputed
delivered          → completed, disputed
completed          → disputed
cancelled          → [terminal]
disputed           → completed, cancelled, refunded
refunded           → [terminal]
```

---

## 🔍 API Endpoint Summary

### Order Management
```
POST   /api/v1/orders              Create new order
GET    /api/v1/orders/:id          Get order details
GET    /api/v1/orders/buyer/:did   List buyer orders
GET    /api/v1/orders/vendor/:did  List vendor orders
GET    /api/v1/orders/:id/history  Get status history
```

### Order Actions
```
POST   /api/v1/orders/:id/pay      Mark as paid (+ create escrow)
POST   /api/v1/orders/:id/confirm  Vendor confirms
POST   /api/v1/orders/:id/ship     Mark as shipped
POST   /api/v1/orders/:id/deliver  Mark as delivered
POST   /api/v1/orders/:id/complete Complete (+ release escrow)
POST   /api/v1/orders/:id/cancel   Cancel (+ refund if paid)
```

---

## 📦 Example Request/Response

### Create Order
**Request**:
```json
POST /api/v1/orders
Authorization: Bearer <buyer_jwt>

{
  "vendorDid": "did:rangkai:vendor_abc",
  "clientId": "marketplace-xyz",
  "type": "wholesale",
  "items": [
    {
      "productId": "prod_123",
      "productName": "Handcrafted Basket",
      "quantity": 50,
      "pricePerUnit": { "amount": 10, "currency": "USD" },
      "totalPrice": { "amount": 500, "currency": "USD" }
    }
  ],
  "shippingAddress": {
    "name": "Jane Buyer",
    "addressLine1": "123 Main St",
    "city": "Seattle",
    "postalCode": "98101",
    "country": "US",
    "phone": "+1234567890"
  },
  "paymentMethod": "stripe",
  "buyerNotes": "Please use eco-friendly packaging"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "orderId": "ord_abc123",
    "orderNumber": "ORD-2025-123456-XYZ",
    "total": {
      "amount": 515,
      "currency": "USD"
    },
    "paymentRequired": {
      "amount": 515,
      "currency": "USD"
    },
    "status": "payment_pending"
  }
}
```

---

### Pay Order
**Request**:
```json
POST /api/v1/orders/ord_abc123/pay
Authorization: Bearer <buyer_jwt>

{
  "paymentProof": {
    "stripePaymentIntentId": "pi_abc123",
    "receiptUrl": "https://stripe.com/receipts/...",
    "timestamp": "2025-01-15T10:30:00Z"
  }
}
```

**Response**:
```json
{
  "success": true,
  "message": "Payment confirmed, funds held in escrow",
  "data": {
    "orderId": "ord_abc123",
    "escrowId": "escrow_xyz789",
    "status": "paid"
  }
}
```

---

### Ship Order
**Request**:
```json
POST /api/v1/orders/ord_abc123/ship
Authorization: Bearer <vendor_jwt>

{
  "trackingNumber": "1Z999AA1234567890",
  "logisticsProviderId": "did:logistics:ups"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Order marked as shipped",
  "data": {
    "trackingNumber": "1Z999AA1234567890",
    "logisticsProviderId": "did:logistics:ups"
  }
}
```

---

## 💰 Escrow Timing

```
Payment Received
    ↓
Escrow Created (7-day hold)
    ↓
[Option 1] Buyer completes → Release immediately
[Option 2] 7 days pass + no dispute → Auto-release
[Option 3] Order cancelled → Refund to buyer
[Option 4] Dispute raised → Hold until resolved
```

---

## 🧪 Testing Commands

```bash
# Start API server
npm run dev:api

# Run order route tests
npm run test:order-routes

# Test specific flow manually
curl -X POST http://localhost:3000/api/v1/orders \
  -H "Authorization: Bearer YOUR_JWT" \
  -H "Content-Type: application/json" \
  -d @order-data.json
```

---

## ⚠️ Important Notes

1. **Non-Custodial**: The protocol doesn't hold actual funds - escrow is tracked for settlement
2. **7-Day Window**: Default escrow hold period (configurable per order)
3. **Payment Methods**: Support for Lightning, Bitcoin, Stripe, PayPal, bank transfer
4. **Ownership Validation**: All mutations check buyer/vendor ownership
5. **State Machine**: Invalid transitions throw errors
6. **Audit Trail**: All status changes logged in `order_status_log`

---

## 🎯 Success Criteria

✅ Order created with status `payment_pending`  
✅ Payment creates escrow in `held` status  
✅ Order progresses through states sequentially  
✅ Escrow released when order `completed`  
✅ Escrow refunded when order `cancelled`  
✅ History shows all status transitions  
✅ Unauthorized access blocked with 403  

---

## 📚 Related Documentation

- Layer 2 Spec: `docs/architecture/payments_and_fees.md`
- Order Types: `src/core/layer2-transaction/types.ts`
- Order Service: `src/core/layer2-transaction/order.service.ts`
- Escrow Service: `src/core/layer2-transaction/escrow.service.ts`

---

**Built in Phase 4** | **12 Tests** | **6 Endpoints** | **Non-Custodial Escrow** ✅