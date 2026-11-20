# Phase 8 API Reference: WebSocket Events

**Real-Time Notifications**  
**Status:** Complete ✅  
**Protocol:** WebSocket (ws library)  
**Tests:** 6 passing  

---

## Overview

The WebSocket API provides real-time event notifications for protocol activities. Clients can subscribe to specific channels to receive updates about orders, disputes, ratings, proposals, and shipments.

### Key Features
- **JWT Authentication** - Secure WebSocket connections
- **Channel Subscriptions** - Subscribe to specific events
- **Multi-cast Broadcasting** - Events sent to all relevant parties
- **Heartbeat/Keepalive** - Auto-detect dead connections
- **Graceful Reconnection** - Clients can reconnect anytime

---

## Connection

### Endpoint
```
ws://localhost:3000/ws?token=JWT_TOKEN
```

### Authentication
Pass JWT token as query parameter:
```javascript
const ws = new WebSocket('ws://localhost:3000/ws?token=YOUR_JWT_TOKEN');
```

### Connection Flow
```
Client connects → Server validates JWT → Connection established → Welcome message sent
```

### Welcome Message
```json
{
  "type": "connected",
  "userId": "did:rangkai:...",
  "timestamp": "2025-11-05T12:00:00Z"
}
```

---

## Channel Subscription

### Subscribe to Channels
```json
{
  "type": "subscribe",
  "channel": "order:ORDER_ID"
}
```

Or subscribe to multiple:
```json
{
  "type": "subscribe",
  "channels": ["order:ORDER_ID", "user:USER_DID"]
}
```

### Subscription Response
```json
{
  "type": "subscribed",
  "channel": "order:ORDER_ID",
  "timestamp": "2025-11-05T12:00:00Z"
}
```

### Unsubscribe
```json
{
  "type": "unsubscribe",
  "channel": "order:ORDER_ID"
}
```

---

## Channel Types

### 1. Order Channels
**Format:** `order:ORDER_ID`  
**Events:** order.created, order.paid, order.shipped, order.delivered, order.completed, order.cancelled

**Who can subscribe:**  
- Order buyer
- Order vendor

### 2. User Channels
**Format:** `user:USER_DID`  
**Events:** All events related to the user's orders, disputes, ratings

**Who can subscribe:**  
- The user themselves

### 3. Dispute Channels
**Format:** `dispute:DISPUTE_ID`  
**Events:** dispute.filed, dispute.vendor_responded, dispute.resolved

**Who can subscribe:**  
- Dispute buyer
- Dispute vendor

### 4. Proposal Channels
**Format:** `proposal:PROPOSAL_ID`  
**Events:** proposal.created, proposal.voted, proposal.approved, proposal.executed

**Who can subscribe:**  
- All governance signers

### 5. Shipment Channels
**Format:** `shipment:SHIPMENT_ID`  
**Events:** shipment.created, shipment.tracking_updated, shipment.delivered

**Who can subscribe:**  
- Order buyer
- Order vendor

### 6. Global Channel
**Format:** `global`  
**Events:** governance and protocol-wide announcements

**Who can subscribe:**  
- Anyone

---

## Event Types

### Order Events

#### order.created
Emitted when a new order is created.
```json
{
  "event": "order.created",
  "data": {
    "orderId": "uuid",
    "orderNumber": "ORD-2025-001",
    "status": "payment_pending",
    "buyerDid": "did:rangkai:...",
    "vendorDid": "did:rangkai:...",
    "total": { "amount": 100.00, "currency": "USD" },
    "timestamp": "2025-11-05T12:00:00Z"
  },
  "timestamp": "2025-11-05T12:00:00Z"
}
```

#### order.paid
Emitted when payment is confirmed.
```json
{
  "event": "order.paid",
  "data": {
    "orderId": "uuid",
    "orderNumber": "ORD-2025-001",
    "status": "paid",
    "buyerDid": "did:rangkai:...",
    "vendorDid": "did:rangkai:...",
    "timestamp": "2025-11-05T12:05:00Z"
  },
  "timestamp": "2025-11-05T12:05:00Z"
}
```

#### order.shipped
Emitted when order is shipped.

#### order.delivered
Emitted when order is marked as delivered.

#### order.completed
Emitted when order is completed and escrow released.

#### order.cancelled
Emitted when order is cancelled.

### Shipment Events

#### shipment.tracking_updated
Emitted when tracking info changes.
```json
{
  "event": "shipment.tracking_updated",
  "data": {
    "shipmentId": "uuid",
    "orderId": "uuid",
    "trackingNumber": "TRACK123",
    "status": "in_transit",
    "currentLocation": "Chicago, IL",
    "estimatedDelivery": "2025-11-10T12:00:00Z",
    "timestamp": "2025-11-05T14:00:00Z"
  },
  "timestamp": "2025-11-05T14:00:00Z"
}
```

### Dispute Events

#### dispute.filed
Emitted when a dispute is filed.
```json
{
  "event": "dispute.filed",
  "data": {
    "disputeId": "uuid",
    "disputeNumber": "DIS-001",
    "orderId": "uuid",
    "buyerDid": "did:rangkai:...",
    "vendorDid": "did:rangkai:...",
    "status": "open",
    "disputeType": "quality",
    "timestamp": "2025-11-05T15:00:00Z"
  },
  "timestamp": "2025-11-05T15:00:00Z"
}
```

#### dispute.vendor_responded
Emitted when vendor responds to dispute.

#### dispute.resolved
Emitted when dispute is resolved.

### Rating Events

#### rating.submitted
Emitted when a rating is submitted.
```json
{
  "event": "rating.submitted",
  "data": {
    "ratingId": "uuid",
    "orderId": "uuid",
    "buyerDid": "did:rangkai:...",
    "vendorDid": "did:rangkai:...",
    "revealed": false,
    "timestamp": "2025-11-05T16:00:00Z"
  },
  "timestamp": "2025-11-05T16:00:00Z"
}
```

#### rating.revealed
Emitted when both parties have rated (or 7 days passed).

### Proposal Events

#### proposal.created
Emitted when a governance proposal is created.

#### proposal.voted
Emitted when someone votes on a proposal.

#### proposal.approved
Emitted when proposal reaches quorum.

#### proposal.executed
Emitted when approved proposal is executed.

---

## Heartbeat

### Ping-Pong
Client can ping server to check connection:

**Send:**
```json
{
  "type": "ping"
}
```

**Receive:**
```json
{
  "type": "pong",
  "timestamp": "2025-11-05T12:00:00Z"
}
```

### Auto-Heartbeat
Server automatically pings clients every 30 seconds to detect dead connections.

---

## Error Handling

### Authentication Errors
```json
{
  "type": "error",
  "message": "Authentication required"
}
```
Connection will close with code 4001.

### Subscription Errors
```json
{
  "type": "error",
  "message": "Invalid channel format: invalid-channel"
}
```

### Authorization Errors
```json
{
  "type": "error",
  "message": "Not authorized to subscribe to: order:ORDER_ID"
}
```

---

## Client Examples

### JavaScript/Node.js
```javascript
const WebSocket = require('ws');

// Connect with JWT
const ws = new WebSocket('ws://localhost:3000/ws?token=YOUR_JWT_TOKEN');

ws.on('open', () => {
  console.log('Connected to WebSocket');
  
  // Subscribe to user channel
  ws.send(JSON.stringify({
    type: 'subscribe',
    channel: 'user:did:rangkai:YOUR_DID'
  }));
  
  // Subscribe to order channel
  ws.send(JSON.stringify({
    type: 'subscribe',
    channel: 'order:ORDER_ID'
  }));
});

ws.on('message', (data) => {
  const message = JSON.parse(data);
  
  if (message.type === 'subscribed') {
    console.log(`Subscribed to ${message.channel}`);
  }
  
  if (message.event) {
    console.log(`Event: ${message.event}`, message.data);
    
    // Handle specific events
    switch (message.event) {
      case 'order.shipped':
        console.log(`Order ${message.data.orderNumber} shipped!`);
        break;
      case 'dispute.filed':
        console.log(`Dispute filed on order ${message.data.orderId}`);
        break;
    }
  }
});

ws.on('close', (code, reason) => {
  console.log(`Connection closed: ${code} - ${reason}`);
});

ws.on('error', (error) => {
  console.error('WebSocket error:', error);
});
```

### React Hook
```javascript
import { useEffect, useState } from 'react';

function useWebSocket(token, channels) {
  const [ws, setWs] = useState(null);
  const [events, setEvents] = useState([]);

  useEffect(() => {
    const socket = new WebSocket(`ws://localhost:3000/ws?token=${token}`);
    
    socket.onopen = () => {
      // Subscribe to channels
      channels.forEach(channel => {
        socket.send(JSON.stringify({
          type: 'subscribe',
          channel
        }));
      });
    };
    
    socket.onmessage = (event) => {
      const message = JSON.parse(event.data);
      if (message.event) {
        setEvents(prev => [...prev, message]);
      }
    };
    
    setWs(socket);
    
    return () => socket.close();
  }, [token, channels]);
  
  return { ws, events };
}

// Usage
function OrderTracker({ orderId }) {
  const { events } = useWebSocket(userToken, [`order:${orderId}`]);
  
  return (
    <div>
      {events.map(event => (
        <div key={event.timestamp}>
          {event.event}: {JSON.stringify(event.data)}
        </div>
      ))}
    </div>
  );
}
```

---

## Testing

### Run Test Suite
```bash
npm run test:websocket
```

### Manual Testing with wscat
```bash
# Install wscat
npm install -g wscat

# Connect
wscat -c "ws://localhost:3000/ws?token=YOUR_JWT_TOKEN"

# Subscribe
> {"type":"subscribe","channel":"user:did:rangkai:YOUR_DID"}

# Ping
> {"type":"ping"}
```

---

## Best Practices

1. **Always Handle Reconnection**
   - WebSocket connections can drop
   - Implement exponential backoff for reconnects

2. **Subscribe to Minimal Channels**
   - Only subscribe to channels you need
   - Unsubscribe when done

3. **Handle All Event Types**
   - Don't assume only specific events will arrive
   - Use switch statements or event handlers

4. **Validate Event Data**
   - Don't trust event payloads blindly
   - Validate critical fields before using

5. **Use Heartbeat**
   - Send ping every 30 seconds
   - Reconnect if no pong received

6. **Clean Up on Unmount**
   - Close WebSocket connections properly
   - Prevents memory leaks

---

## Production Considerations

### Load Balancing
- Use sticky sessions (WebSocket doesn't work well with round-robin)
- Consider Redis pub/sub for multi-server setups

### Monitoring
- Track connection count
- Monitor event broadcast latency
- Alert on high disconnect rates

### Security
- Always validate JWT tokens
- Implement proper channel authorization
- Rate limit subscription requests

### Performance
- Batch events when possible
- Use binary protocols for high-frequency events
- Consider message compression

---

**Phase 8 Complete** ✅  
**Next:** Phase 9 - TypeScript SDK Package