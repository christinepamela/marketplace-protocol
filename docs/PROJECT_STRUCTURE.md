# Rangkai Protocol - Complete File Structure

```
marketplace-protocol/
├── README.md
├── package.json
├── tsconfig.json
├── tsconfig.api.json              # ✨ NEW: API-specific TypeScript config
├── .gitignore
├── .env.example
│
├── docs/                           # Documentation
│   ├── ARCHITECTURE.md             # High-level architecture
│   ├── API.md                      # API documentation
│   ├── CONTRIBUTING.md             # Contribution guidelines
│   ├── diagrams/
│   │   ├── protocol-architecture.mmd
│   │   └── transaction-flow.mmd
│   ├── specs/                      # ✨ Layer specifications
│   │   ├── LAYER0_IDENTITY_AND_REPUTATION.md
│   │   ├── LAYER1_DISCOVERY_AND_CATALOG.md
│   │   ├── LAYER2_TRANSACTION.md
│   │   ├── LAYER3_LOGISTICS.md
│   │   ├── LAYER4_TRUST_AND_COMPLIANCE.md
│   │   ├── LAYER5_DEVELOPER_SDK.md           # ✨ NEW
│   │   └── LAYER6_GOVERNANCE.md
│   ├── progress_roadmap/                      # ✨ Progress tracking
│   │   ├── layer0-progress-roadmap.md
│   │   ├── layer1-progress-roadmap.md
│   │   ├── layer2-progress-roadmap.md
│   │   ├── layer3-progress-roadmap.md
│   │   ├── layer4-progress-roadmap.md
│   │   ├── layer5-progress-roadmap.md
│   │   └── layer6-progress-roadmap.md
│   └── whitepaper/
│       └── WHITEPAPER.md           # Full protocol specification
│
├── src/                            # Source code
│   │
│   ├── core/                       # Protocol core layers
│   │   │
│   │   ├── layer0-identity/        # Layer 0: Identity & Reputation
│   │   │   ├── types.ts            # TypeScript interfaces
│   │   │   ├── identity.service.ts # Identity management logic
│   │   │   ├── reputation.service.ts # Reputation calculation
│   │   │   ├── verification.service.ts # KYC/Nostr verification
│   │   │   ├── proof.service.ts    # Reputation proof signing
│   │   │   └── index.ts            # Layer exports
│   │   │
│   │   ├── layer1-catalog/         # Layer 1: Discovery & Catalog
│   │   │   ├── types.ts
│   │   │   ├── product.service.ts  # Product CRUD
│   │   │   ├── search.service.ts   # Federated search
│   │   │   ├── category.service.ts # Category management
│   │   │   └── index.ts
│   │   │
│   │   ├── layer2-transaction/     # Layer 2: Transaction & Settlement
│   │   │   ├── types.ts
│   │   │   ├── order.service.ts    # Order state machine
│   │   │   ├── escrow.service.ts   # Escrow management
│   │   │   ├── payment.service.ts  # Payment routing
│   │   │   ├── fee.service.ts      # Fee calculation & distribution
│   │   │   └── index.ts
│   │   │
│   │   ├── layer3-logistics/       # Layer 3: Logistics
│   │   │   ├── types.ts
│   │   │   ├── provider.service.ts # Logistics provider registry
│   │   │   ├── quote.service.ts    # Quote matching
│   │   │   ├── tracking.service.ts # Shipment tracking
│   │   │   └── index.ts
│   │   │
│   │   ├── layer4-trust/           # Layer 4: Trust & Compliance
│   │   │   ├── types.ts
│   │   │   ├── dispute.service.ts  # Dispute resolution
│   │   │   ├── rating.service.ts   # Rating system
│   │   │   ├── compliance.service.ts # Sanctions, tax advisory
│   │   │   └── index.ts
│   │   │
│   │   └── layer6-governance/      # Layer 6: Governance
│   │       ├── types.ts
│   │       ├── multisig.service.ts # Multisig operations
│   │       ├── upgrade.service.ts  # Protocol upgrades
│   │       └── index.ts
│   │
│   ├── api/                        # ✨ Layer 5: Developer SDK & API Gateway
│   │   │
│   │   ├── core/                   # ✨ NEW: Core API utilities
│   │   │   ├── config.ts           # Environment & configuration
│   │   │   ├── errors.ts           # Error handling system
│   │   │   ├── auth.ts             # JWT & API key management
│   │   │   ├── utils.ts            # Helper functions (retry, cache, etc.)
│   │   │   └── client.ts           # Base API client (future)
│   │   │
│   │   ├── routes/                 # REST API endpoints
│   │   │   ├── identity.routes.ts  # /api/v1/identity/*
│   │   │   ├── catalog.routes.ts   # /api/v1/catalog/*
│   │   │   ├── order.routes.ts     # /api/v1/orders/*
│   │   │   ├── logistics.routes.ts # /api/v1/logistics/*
│   │   │   ├── trust.routes.ts     # /api/v1/trust/*
│   │   │   ├── governance.routes.ts # ✨ NEW: /api/v1/governance/*
│   │   │   └── index.ts            # Route aggregator
│   │   │
│   │   ├── middleware/             # ✨ Request processing middleware
│   │   │   ├── auth.middleware.ts  # JWT/API key validation
│   │   │   ├── ratelimit.middleware.ts # 100 req/hour per client
│   │   │   ├── validation.middleware.ts # Zod schema validation
│   │   │   ├── error.middleware.ts # Global error handler
│   │   │   └── index.ts
│   │   │
│   │   ├── websocket/              # ✨ Real-time events
│   │   │   ├── server.ts           # WebSocket server setup
│   │   │   ├── events.ts           # Event definitions
│   │   │   ├── subscriptions.ts    # Event handlers per layer
│   │   │   └── index.ts
│   │   │
│   │   ├── __tests__/              # ✨ NEW: API integration tests
│   │   │   ├── health.test.ts      # Health check tests
│   │   │   ├── identity.test.ts    # Layer 0 endpoint tests
│   │   │   ├── catalog.test.ts     # Layer 1 endpoint tests
│   │   │   ├── orders.test.ts      # Layer 2 endpoint tests
│   │   │   └── ...
│   │   │
│   │   ├── index.ts                # Express app setup
│   │   └── server.ts               # ✨ NEW: Server entry point
│   │
│   ├── infrastructure/             # Infrastructure adapters
│   │   ├── database/
│   │   │   ├── client.ts           # Supabase client
│   │   │   ├── migrations/         # Database migrations
│   │   │   └── schema.sql          # Database schema
│   │   │
│   │   ├── storage/
│   │   │   ├── s3.client.ts        # S3/R2 client
│   │   │   └── ipfs.client.ts      # IPFS client (optional)
│   │   │
│   │   ├── payment/
│   │   │   ├── stripe.adapter.ts   # Stripe integration
│   │   │   ├── btcpay.adapter.ts   # BTCPay Server integration
│   │   │   ├── lightning.adapter.ts # Lightning Network
│   │   │   └── index.ts
│   │   │
│   │   ├── messaging/
│   │   │   ├── email.service.ts    # SendGrid/Resend
│   │   │   ├── sms.service.ts      # Twilio
│   │   │   ├── nostr.service.ts    # Nostr integration
│   │   │   └── index.ts
│   │   │
│   │   └── cache/
│   │       ├── redis.client.ts     # Redis for caching
│   │       └── index.ts
│   │
│   ├── utils/                      # Shared utilities
│   │   ├── crypto.ts               # Signing, hashing, encryption
│   │   ├── validation.ts           # Schema validation (Zod)
│   │   ├── logger.ts               # Winston/Pino logging
│   │   ├── errors.ts               # Custom error classes
│   │   ├── constants.ts            # Protocol constants
│   │   └── index.ts
│   │
│   ├── types/                      # Shared TypeScript types
│   │   ├── common.ts               # Common interfaces
│   │   ├── api.ts                  # API request/response types
│   │   ├── events.ts               # Event types
│   │   └── index.ts
│   │
│   └── index.ts                    # Main entry point
│
├── tests/                          # Test suite
│   ├── unit/                       # Unit tests
│   │   ├── layer0-identity/
│   │   │   ├── identity.service.test.ts
│   │   │   ├── reputation.service.test.ts
│   │   │   └── proof.service.test.ts
│   │   ├── layer1-catalog/
│   │   │   ├── product.service.test.ts
│   │   │   └── search.service.test.ts
│   │   ├── layer2-transaction/
│   │   │   ├── order.service.test.ts
│   │   │   └── escrow.service.test.ts
│   │   ├── layer3-logistics/
│   │   │   ├── provider.service.test.ts
│   │   │   └── tracking.service.test.ts
│   │   ├── layer4-trust/
│   │   │   ├── dispute.service.test.ts
│   │   │   └── rating.service.test.ts
│   │   ├── layer6-governance/
│   │   │   ├── multisig.service.test.ts
│   │   │   └── upgrade.service.test.ts
│   │   └── ...
│   │
│   ├── integration/                # Integration tests
│   │   ├── order-flow.test.ts     # Full order flow
│   │   ├── federated-search.test.ts
│   │   ├── dispute-resolution.test.ts
│   │   └── api-endpoints.test.ts  # ✨ NEW: API integration tests
│   │
│   ├── e2e/                        # End-to-end tests
│   │   ├── complete-transaction.test.ts
│   │   └── websocket-events.test.ts # ✨ NEW
│   │
│   └── fixtures/                   # Test data
│       ├── identities.json
│       ├── products.json
│       ├── orders.json
│       └── api-keys.json          # ✨ NEW
│
├── scripts/                        # Utility scripts
│   ├── setup-db.ts                 # Database setup
│   ├── seed-data.ts                # Seed test data
│   ├── generate-keys.ts            # Generate signing keys
│   ├── generate-api-keys.ts        # ✨ NEW: Generate API keys
│   └── migrate.ts                  # Run migrations
│
├── client-sdk/                     # ✨ SDK for client marketplaces
│   ├── typescript/
│   │   ├── src/
│   │   │   ├── client.ts           # Main SDK client
│   │   │   ├── identity.ts         # Identity methods (Layer 0)
│   │   │   ├── catalog.ts          # Catalog methods (Layer 1)
│   │   │   ├── orders.ts           # Order methods (Layer 2)
│   │   │   ├── logistics.ts        # ✨ NEW: Logistics methods (Layer 3)
│   │   │   ├── trust.ts            # ✨ NEW: Trust methods (Layer 4)
│   │   │   ├── governance.ts       # ✨ NEW: Governance methods (Layer 6)
│   │   │   ├── websocket.ts        # ✨ NEW: WebSocket client
│   │   │   └── index.ts
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── README.md               # ✨ NEW: SDK documentation
│   │
│   └── examples/                   # SDK usage examples
│       ├── create-product.ts
│       ├── process-order.ts
│       ├── federated-search.ts
│       ├── track-shipment.ts       # ✨ NEW
│       ├── file-dispute.ts         # ✨ NEW
│       └── listen-events.ts        # ✨ NEW: WebSocket example
│
├── reference-client/               # Rangkai reference client
│   ├── src/
│   │   ├── app/                    # Next.js app directory
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx
│   │   │   ├── vendors/
│   │   │   │   ├── dashboard/
│   │   │   │   └── onboarding/
│   │   │   ├── marketplace/
│   │   │   │   ├── search/
│   │   │   │   └── product/[id]/
│   │   │   └── admin/
│   │   │
│   │   ├── components/
│   │   │   ├── common/
│   │   │   ├── vendor/
│   │   │   ├── buyer/
│   │   │   └── logistics/
│   │   │
│   │   ├── services/
│   │   │   ├── api.ts              # API client (uses SDK)
│   │   │   └── protocol.ts         # Protocol integration
│   │   │
│   │   └── types/
│   │       └── client.ts
│   │
│   ├── public/
│   ├── package.json
│   └── next.config.js
│
├── deployments/                    # Deployment configs
│   ├── docker/
│   │   ├── Dockerfile
│   │   ├── Dockerfile.api          # ✨ NEW: API-specific Docker
│   │   └── docker-compose.yml
│   │
│   ├── kubernetes/
│   │   ├── api-deployment.yaml     # ✨ NEW
│   │   ├── api-service.yaml        # ✨ NEW
│   │   ├── websocket-service.yaml  # ✨ NEW
│   │   └── ingress.yaml
│   │
│   └── terraform/
│       ├── main.tf
│       ├── api.tf                  # ✨ NEW: API infrastructure
│       └── variables.tf
│
└── config/                         # Configuration files
    ├── development.json
    ├── staging.json
    └── production.json
```

## Key Design Principles

### 1. **Layer Isolation**
Each protocol layer is self-contained in `src/core/layerX-name/`:
- Has its own types
- Has its own services
- Exports a clean interface
- Can be tested independently

### 2. **Infrastructure Separation**
All external dependencies (database, storage, payments) are in `src/infrastructure/`:
- Adapters can be swapped without touching core logic
- Easy to mock for testing
- Clear boundaries

### 3. **API as Gateway**
The `src/api/` directory is the only entry point:
- All core logic is hidden behind REST endpoints
- Middleware handles cross-cutting concerns
- WebSocket for real-time events

### 4. **SDK for Clients**
The `client-sdk/` directory provides:
- TypeScript SDK for marketplace builders
- Abstracts API calls
- Handles authentication, retries, errors
- Future: Python, Go SDKs

### 5. **Reference Client Separate**
The `reference-client/` (Rangkai) is a separate Next.js app:
- Uses the SDK, never calls protocol directly
- Demonstrates how to build on the protocol
- Can be forked by other marketplace builders

## File Naming Conventions

- **Services**: `*.service.ts` - Business logic
- **Routes**: `*.routes.ts` - API endpoints
- **Types**: `types.ts` - TypeScript interfaces
- **Tests**: `*.test.ts` - Test files
- **Adapters**: `*.adapter.ts` - External integrations
- **Clients**: `*.client.ts` - Database/API clients
- **Middleware**: `*.middleware.ts` - Express middleware

## Import Structure

```typescript
// Core services
import { IdentityService } from '@/core/layer0-identity';
import { ProductService } from '@/core/layer1-catalog';

// Infrastructure
import { DatabaseClient } from '@/infrastructure/database';
import { StripeAdapter } from '@/infrastructure/payment';

// Utilities
import { logger } from '@/utils/logger';
import { ValidationError } from '@/utils/errors';

// Types
import type { Identity, Reputation } from '@/types';
```

## Environment Variables

```bash
# .env.example
NODE_ENV=development
PORT=3000

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/rangkai
SUPABASE_URL=
SUPABASE_KEY=

# Storage
S3_BUCKET=
S3_ACCESS_KEY=
S3_SECRET_KEY=

# Payment
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
BTCPAY_SERVER_URL=
BTCPAY_API_KEY=

# Messaging
SENDGRID_API_KEY=
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=

# Protocol
PROTOCOL_SIGNING_KEY=
PROTOCOL_FEE_PERCENTAGE=3
JWT_SECRET=

# Redis
REDIS_URL=redis://localhost:6379
```

