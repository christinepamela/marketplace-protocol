# @rangkai/sdk

Official TypeScript SDK for [Rangkai Protocol](https://github.com/christinepamela/marketplace-protocol) - A decentralized marketplace protocol for globalizing small businesses.

## Features

✅ **Full Type Safety** - Complete TypeScript types for all API endpoints  
✅ **Promise-based** - Modern async/await API  
✅ **Error Handling** - Automatic error mapping with helpful messages  
✅ **Authentication** - JWT token management built-in  
✅ **Zero Dependencies** - Only requires `zod` for validation  
✅ **Tree-shakeable** - Import only what you need  

## Installation

```bash
npm install @rangkai/sdk
```

## Quick Start

```typescript
import { RangkaiSDK } from '@rangkai/sdk';

// Initialize SDK
const sdk = new RangkaiSDK({
  apiUrl: 'https://api.rangkai.protocol',
  token: 'your-jwt-token', // Optional
});

// Search products
const products = await sdk.catalog.search({
  query: 'leather shoes',
  filters: {
    category: 'footwear',
    minPrice: 50,
    maxPrice: 200,
  },
});

// Create order
const order = await sdk.orders.create({
  vendorDid: 'did:rangkai:...',
  clientId: 'my-marketplace',
  type: 'wholesale',
  items: [...],
  shippingAddress: {...},
  paymentMethod: 'stripe',
});
```

## Configuration

```typescript
const sdk = new RangkaiSDK({
  // Required: API base URL
  apiUrl: 'http://localhost:3000',
  
  // Optional: JWT token for authenticated requests
  token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  
  // Optional: API version (default: 'v1')
  apiVersion: 'v1',
  
  // Optional: Request timeout in ms (default: 30000)
  timeout: 30000,
  
  // Optional: Custom headers
  headers: {
    'X-Client-ID': 'my-app',
  },
  
  // Optional: Enable debug logging
  debug: true,
});
```

## Modules

The SDK is organized into 6 modules, one for each protocol layer:

### 1. Identity (`sdk.identity`)

Manage identities, reputation, and proofs.

```typescript
// Register new identity
const identity = await sdk.identity.register({
  type: 'kyc',
  clientId: 'my-marketplace',
  publicProfile: {
    displayName: 'Acme Corp',
    country: 'US',
    businessType: 'manufacturer',
  },
});

// Get identity by DID
const identity = await sdk.identity.getByDid('did:rangkai:...');

// Get reputation score
const reputation = await sdk.identity.getReputation('did:rangkai:...');
console.log(`Score: ${reputation.score}/500`);

// Generate reputation proof
const proof = await sdk.identity.generateProof({
  vendorDid: 'did:rangkai:...',
  validityDays: 30,
});
```

### 2. Catalog (`sdk.catalog`)

Product discovery and search.

```typescript
// Create product
const product = await sdk.catalog.create({
  vendorDid: 'did:rangkai:...',
  clientId: 'my-marketplace',
  category: {
    primary: 'footwear',
    subcategory: 'leather-shoes',
  },
  basic: {
    name: 'Custom Leather Oxford Shoes',
    description: 'Handcrafted leather shoes...',
    images: { primary: 'https://...' },
    condition: 'new',
  },
  pricing: {
    basePrice: { amount: 150, currency: 'USD' },
    moq: 1,
  },
  logistics: {
    weight: { value: 1, unit: 'kg' },
    dimensions: { length: 30, width: 20, height: 10, unit: 'cm' },
    originCountry: 'US',
    leadTime: 14,
  },
});

// Search products
const results = await sdk.catalog.search({
  query: 'leather shoes',
  filters: {
    category: 'footwear',
    originCountry: 'US',
    verifiedVendorsOnly: true,
  },
  sortBy: 'price_asc',
  limit: 20,
});

// Get product by ID
const product = await sdk.catalog.getById('product-uuid');

// Update product
await sdk.catalog.update('product-uuid', {
  status: 'active',
  pricing: { basePrice: { amount: 140, currency: 'USD' }, moq: 1 },
});
```

### 3. Orders (`sdk.orders`)

Order management, payments, and escrow.

```typescript
// Create order
const order = await sdk.orders.create({
  vendorDid: 'did:rangkai:...',
  clientId: 'my-marketplace',
  type: 'wholesale',
  items: [{
    productId: 'product-uuid',
    productName: 'Leather Shoes',
    quantity: 10,
    pricePerUnit: { amount: 100, currency: 'USD' },
    totalPrice: { amount: 1000, currency: 'USD' },
  }],
  shippingAddress: {
    name: 'John Doe',
    addressLine1: '123 Main St',
    city: 'New York',
    postalCode: '10001',
    country: 'US',
    phone: '+1234567890',
  },
  paymentMethod: 'stripe',
});

// Mark as paid (creates escrow)
await sdk.orders.markAsPaid('order-uuid', {
  paymentProof: {
    stripePaymentIntentId: 'pi_...',
    timestamp: new Date().toISOString(),
  },
});

// Vendor confirms order
await sdk.orders.confirm('order-uuid');

// Mark as shipped
await sdk.orders.markAsShipped('order-uuid', '1Z999AA10123456784', 'provider-uuid');

// Complete order (releases escrow)
await sdk.orders.complete('order-uuid');

// Get order history
const history = await sdk.orders.getHistory('order-uuid');
```

### 4. Logistics (`sdk.logistics`)

Shipping quotes, tracking, and providers.

```typescript
// Register as logistics provider
const provider = await sdk.logistics.registerProvider({
  business_name: 'Fast Shipping Co',
  identity_did: 'did:rangkai:...',
  service_regions: ['US', 'CA', 'MX'],
  shipping_methods: ['standard', 'express'],
  insurance_available: true,
});

// Search providers
const providers = await sdk.logistics.searchProviders({
  service_region: 'US',
  shipping_method: 'express',
  insurance_required: true,
});

// Submit shipping quote
const quote = await sdk.logistics.submitQuote({
  order_id: 'order-uuid',
  provider_id: 'provider-uuid',
  method: 'express',
  price_fiat: 50,
  currency: 'USD',
  estimated_days: 3,
  insurance_included: true,
  valid_hours: 24,
});

// Update tracking
await sdk.logistics.updateTracking('shipment-uuid', {
  status: 'in_transit',
  location: 'Los Angeles, CA',
  notes: 'Package departed facility',
});

// Get tracking history
const events = await sdk.logistics.getTrackingHistory('shipment-uuid');
```

### 5. Trust (`sdk.trust`)

Disputes, ratings, and compliance.

```typescript
// Open dispute
const dispute = await sdk.trust.openDispute({
  order_id: 'order-uuid',
  dispute_type: 'quality',
  description: 'Product does not match description',
  evidence: {
    photo_urls: ['https://...'],
    description_details: 'Expected leather, received synthetic',
  },
});

// Submit vendor response
await sdk.trust.submitVendorResponse('dispute-uuid', {
  response_text: 'We shipped the correct product',
  counter_evidence: {
    photo_urls: ['https://...'],
  },
  proposed_resolution: 'no_refund',
});

// Submit rating
const rating = await sdk.trust.submitRating({
  order_id: 'order-uuid',
  rating: 5,
  comment: 'Excellent quality and fast shipping!',
  categories: {
    quality: 5,
    delivery: 5,
    communication: 5,
  },
});

// Get vendor ratings
const ratings = await sdk.trust.getRatingsForVendor('did:rangkai:...');

// Get rating stats
const stats = await sdk.trust.getVendorRatingStats('did:rangkai:...');
```

### 6. Governance (`sdk.governance`)

Protocol governance and multisig voting.

```typescript
// Create proposal
const proposal = await sdk.governance.createProposal({
  action: 'update_protocol_fee',
  params: { new_fee_percent: 2.5 },
  rationale: 'Adjusting fee to remain competitive',
  voting_duration_hours: 72,
});

// List proposals
const proposals = await sdk.governance.listProposals({
  status: 'active',
});

// Vote on proposal
await sdk.governance.vote('proposal-uuid', {
  approved: true,
  comment: 'I support this change',
});

// Execute approved proposal
await sdk.governance.executeProposal('proposal-uuid');

// Get governance stats
const stats = await sdk.governance.getStats();
```

## Authentication

### Setting Token

```typescript
// Set token during initialization
const sdk = new RangkaiSDK({
  apiUrl: 'http://localhost:3000',
  token: 'your-jwt-token',
});

// Or set/update token later
sdk.setToken('new-jwt-token');

// Clear token
sdk.clearToken();
```

### Public Endpoints

Some endpoints don't require authentication:

- Identity search and reputation
- Product search
- Shipment tracking
- Governance proposals (read-only)

## Error Handling

The SDK provides typed error classes:

```typescript
import {
  RangkaiSDKError,
  RangkaiAuthError,
  RangkaiNotFoundError,
  RangkaiValidationError,
  RangkaiRateLimitError,
} from '@rangkai/sdk';

try {
  const order = await sdk.orders.getById('invalid-uuid');
} catch (error) {
  if (error instanceof RangkaiNotFoundError) {
    console.error('Order not found');
  } else if (error instanceof RangkaiAuthError) {
    console.error('Authentication failed');
  } else if (error instanceof RangkaiValidationError) {
    console.error('Invalid input:', error.details);
  } else if (error instanceof RangkaiRateLimitError) {
    console.error('Rate limit exceeded, retry after:', error.retryAfter);
  } else {
    console.error('Unknown error:', error);
  }
}
```

## TypeScript Support

The SDK is written in TypeScript and provides complete type definitions:

```typescript
import type {
  Order,
  OrderStatus,
  Product,
  Identity,
  Reputation,
  SearchQuery,
  SearchResults,
} from '@rangkai/sdk';

// All types are exported and fully documented
const order: Order = await sdk.orders.getById('uuid');
const status: OrderStatus = order.status;
```

## Development

```bash
# Install dependencies
npm install

# Build
npm run build

# Watch mode
npm run build:watch

# Run tests
npm test
```

## License

MIT

## Support

- **Documentation:** https://github.com/christinepamela/marketplace-protocol
- **Issues:** https://github.com/christinepamela/marketplace-protocol/issues
- **Community:** [Coming soon]

## Related

- [Rangkai Protocol](https://github.com/christinepamela/marketplace-protocol) - Core protocol implementation
- [API Documentation](../docs/api/) - REST API reference
- [Whitepaper](../docs/whitepaper/) - Protocol design and architecture