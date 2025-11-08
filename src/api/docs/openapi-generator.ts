/**
 * OpenAPI 3.0 Specification Generator
 * Generates interactive API documentation from routes and schemas
 */

import { zodToJsonSchema } from 'zod-to-json-schema';
import { config } from '../core/config';
import type { OpenAPIV3 } from 'openapi-types';

export interface OpenAPIDocument extends OpenAPIV3.Document {}

/**
 * Generate complete OpenAPI specification
 */
export function generateOpenAPISpec(): OpenAPIDocument {
  return {
    openapi: '3.0.0',
    info: {
      title: 'Rangkai Protocol API',
      version: '1.0.0',
      description: `
# Rangkai Protocol REST API

Decentralized marketplace protocol for globalizing small businesses.

## Features

- **Non-Custodial:** 7-day escrow with auto-release
- **Bitcoin-Native:** Lightning Network & on-chain settlement  
- **Decentralized:** Federated search across marketplaces
- **Privacy-First:** DID-based identity, optional KYC
- **Fair Fees:** 3% protocol fee, 0-5% client fee

## Authentication

Most endpoints require JWT authentication:

\`\`\`
Authorization: Bearer <your-jwt-token>
\`\`\`

Public endpoints (no auth required):
- Product search
- Identity/reputation lookup
- Shipment tracking
- Governance proposals (read-only)

## Rate Limiting

- **100 requests per hour** per IP/API key
- Headers: \`X-RateLimit-Limit\`, \`X-RateLimit-Remaining\`

## Sandbox Mode

Use \`SANDBOX_MODE=true\` for testing without real transactions.
`,
      contact: {
        name: 'Rangkai Protocol',
        url: 'https://github.com/christinepamela/marketplace-protocol',
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT',
      },
    },
    servers: [
      {
        url: 'http://localhost:3000/api/v1',
        description: 'Development server',
      },
      {
        url: 'https://api.rangkai.protocol/api/v1',
        description: 'Production server',
      },
    ],
    tags: [
      { name: 'Identity', description: 'Identity & reputation management (Layer 0)' },
      { name: 'Catalog', description: 'Product discovery & search (Layer 1)' },
      { name: 'Orders', description: 'Order management & escrow (Layer 2)' },
      { name: 'Logistics', description: 'Shipping & tracking (Layer 3)' },
      { name: 'Trust', description: 'Disputes & ratings (Layer 4)' },
      { name: 'Governance', description: 'Protocol governance (Layer 6)' },
    ],
    paths: {
      // Identity endpoints (Layer 0)
      '/identity/register': identityRegister,
      '/identity/{did}': identityGetByDid,
      '/identity/{did}/reputation': identityReputation,
      '/identity/{did}/verify': identityVerify,
      '/identity/{did}/proof': identityProof,

      // Catalog endpoints (Layer 1)
      '/products': catalogCreate,
      '/products/search': catalogSearch,
      '/products/{id}': catalogGetById,
      '/products/vendor/{did}': catalogGetByVendor,

      // Order endpoints (Layer 2)
      '/orders': ordersCreate,
      '/orders/{id}': ordersGetById,
      '/orders/buyer/{did}': ordersGetByBuyer,
      '/orders/vendor/{did}': ordersGetByVendor,
      '/orders/{id}/pay': ordersPay,
      '/orders/{id}/confirm': ordersConfirm,
      '/orders/{id}/ship': ordersShip,
      '/orders/{id}/deliver': ordersDeliver,
      '/orders/{id}/complete': ordersComplete,
      '/orders/{id}/cancel': ordersCancel,
      '/orders/{id}/history': ordersHistory,

      // Logistics endpoints (Layer 3)
      '/logistics/providers': logisticsProviders,
      '/logistics/quotes': logisticsQuotes,
      '/logistics/quotes/order/{orderId}': logisticsQuotesByOrder,
      '/logistics/quotes/{id}/accept': logisticsAcceptQuote,
      '/logistics/shipments': logisticsShipments,
      '/logistics/shipments/{id}': logisticsGetShipment,
      '/logistics/shipments/order/{orderId}': logisticsShipmentByOrder,
      '/logistics/shipments/{id}/tracking': logisticsTracking,

      // Trust endpoints (Layer 4)
      '/disputes': disputesCreate,
      '/disputes/{id}': disputesGetById,
      '/disputes/order/{orderId}': disputesByOrder,
      '/disputes/{id}/vendor-response': disputesVendorResponse,
      '/disputes/{id}/resolve': disputesResolve,
      '/ratings': ratingsCreate,
      '/ratings/order/{orderId}': ratingsGetByOrder,
      '/ratings/vendor/{did}': ratingsGetByVendor,
      '/ratings/vendor/{did}/stats': ratingsStats,

      // Governance endpoints (Layer 6)
      '/proposals': governanceProposals,
      '/proposals/{id}': governanceGetProposal,
      '/proposals/{id}/vote': governanceVote,
      '/proposals/{id}/execute': governanceExecute,
    },
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT token from authentication',
        },
      },
      schemas: commonSchemas,
    },
  };
}

// ============================================================================
// IDENTITY ENDPOINTS (Layer 0)
// ============================================================================

const identityRegister: OpenAPIV3.PathItemObject = {
  post: {
    tags: ['Identity'],
    summary: 'Register new identity',
    description: 'Create a new identity (KYC, Nostr, or Anonymous). No authentication required.',
    requestBody: {
      required: true,
      content: {
        'application/json': {
          schema: {
            type: 'object',
            required: ['type', 'clientId', 'publicProfile'],
            properties: {
              type: { type: 'string', enum: ['kyc', 'nostr', 'anonymous'] },
              clientId: { type: 'string' },
              publicProfile: {
                type: 'object',
                required: ['displayName', 'businessType'],
                properties: {
                  displayName: { type: 'string' },
                  country: { type: 'string' },
                  businessType: { type: 'string', enum: ['manufacturer', 'artisan', 'trader', 'buyer'] },
                  avatarUrl: { type: 'string', format: 'uri' },
                  bio: { type: 'string' },
                },
              },
            },
          },
        },
      },
    },
    responses: {
      201: {
        description: 'Identity created successfully',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                success: { type: 'boolean' },
                data: {
                  type: 'object',
                  properties: {
                    did: { type: 'string', example: 'did:rangkai:abc123' },
                    status: { type: 'string' },
                    initialTrustScore: { type: 'number' },
                    createdAt: { type: 'string', format: 'date-time' },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
};

const identityGetByDid: OpenAPIV3.PathItemObject = {
  get: {
    tags: ['Identity'],
    summary: 'Get identity by DID',
    description: 'Returns public info for all. More details if authenticated and viewing own profile.',
    security: [{ bearerAuth: [] }, {}], // Optional auth
    parameters: [
      {
        name: 'did',
        in: 'path',
        required: true,
        schema: { type: 'string' },
        example: 'did:rangkai:abc123',
      },
    ],
    responses: {
      200: { description: 'Identity details' },
      404: { description: 'Identity not found' },
    },
  },
};

const identityReputation: OpenAPIV3.PathItemObject = {
  get: {
    tags: ['Identity'],
    summary: 'Get reputation score',
    description: 'Public endpoint - returns reputation metrics and score (0-500)',
    parameters: [
      {
        name: 'did',
        in: 'path',
        required: true,
        schema: { type: 'string' },
      },
    ],
    responses: {
      200: {
        description: 'Reputation details',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                success: { type: 'boolean' },
                data: {
                  type: 'object',
                  properties: {
                    vendorDid: { type: 'string' },
                    score: { type: 'number', minimum: 0, maximum: 500 },
                    metrics: { type: 'object' },
                    lastUpdated: { type: 'string', format: 'date-time' },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
};

const identityVerify: OpenAPIV3.PathItemObject = {
  post: {
    tags: ['Identity'],
    summary: 'Verify identity (KYC)',
    security: [{ bearerAuth: [] }],
    parameters: [
      { name: 'did', in: 'path', required: true, schema: { type: 'string' } },
    ],
    responses: {
      200: { description: 'Verification initiated' },
      401: { description: 'Unauthorized' },
    },
  },
};

const identityProof: OpenAPIV3.PathItemObject = {
  post: {
    tags: ['Identity'],
    summary: 'Generate reputation proof',
    description: 'Generate cryptographically signed reputation proof (valid 30 days)',
    security: [{ bearerAuth: [] }],
    parameters: [
      { name: 'did', in: 'path', required: true, schema: { type: 'string' } },
    ],
    requestBody: {
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              validityDays: { type: 'number', default: 30 },
            },
          },
        },
      },
    },
    responses: {
      200: { description: 'Signed proof generated' },
    },
  },
};

// ============================================================================
// CATALOG ENDPOINTS (Layer 1)
// ============================================================================

const catalogCreate: OpenAPIV3.PathItemObject = {
  post: {
    tags: ['Catalog'],
    summary: 'Create product listing',
    security: [{ bearerAuth: [] }],
    requestBody: {
      required: true,
      content: {
        'application/json': {
          schema: { $ref: '#/components/schemas/CreateProductRequest' },
        },
      },
    },
    responses: {
      201: { description: 'Product created' },
      400: { description: 'Validation error' },
      401: { description: 'Unauthorized' },
    },
  },
};

const catalogSearch: OpenAPIV3.PathItemObject = {
  post: {
    tags: ['Catalog'],
    summary: 'Search products',
    description: 'Federated search across all marketplaces. Public endpoint.',
    requestBody: {
      required: true,
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              query: { type: 'string', example: 'leather shoes' },
              filters: {
                type: 'object',
                properties: {
                  category: { type: 'string' },
                  minPrice: { type: 'number' },
                  maxPrice: { type: 'number' },
                  originCountry: { type: 'string' },
                  verifiedVendorsOnly: { type: 'boolean' },
                },
              },
              sortBy: {
                type: 'string',
                enum: ['relevance', 'price_asc', 'price_desc', 'newest', 'popular', 'vendor_reputation'],
              },
              limit: { type: 'number', default: 20 },
              offset: { type: 'number', default: 0 },
            },
          },
        },
      },
    },
    responses: {
      200: { description: 'Search results' },
    },
  },
};

const catalogGetById: OpenAPIV3.PathItemObject = {
  get: {
    tags: ['Catalog'],
    summary: 'Get product by ID',
    parameters: [
      { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
    ],
    responses: {
      200: { description: 'Product details' },
      404: { description: 'Product not found' },
    },
  },
};

const catalogGetByVendor: OpenAPIV3.PathItemObject = {
  get: {
    tags: ['Catalog'],
    summary: 'Get products by vendor',
    parameters: [
      { name: 'did', in: 'path', required: true, schema: { type: 'string' } },
      { name: 'limit', in: 'query', schema: { type: 'number', default: 20 } },
      { name: 'offset', in: 'query', schema: { type: 'number', default: 0 } },
    ],
    responses: {
      200: { description: 'List of products' },
    },
  },
};

// ============================================================================
// ORDER ENDPOINTS (Layer 2)
// ============================================================================

const ordersCreate: OpenAPIV3.PathItemObject = {
  post: {
    tags: ['Orders'],
    summary: 'Create order',
    security: [{ bearerAuth: [] }],
    requestBody: {
      required: true,
      content: {
        'application/json': {
          schema: { $ref: '#/components/schemas/CreateOrderRequest' },
        },
      },
    },
    responses: {
      201: { description: 'Order created' },
      400: { description: 'Validation error' },
      401: { description: 'Unauthorized' },
    },
  },
};

const ordersGetById: OpenAPIV3.PathItemObject = {
  get: {
    tags: ['Orders'],
    summary: 'Get order by ID',
    security: [{ bearerAuth: [] }],
    parameters: [
      { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
    ],
    responses: {
      200: { description: 'Order details' },
      401: { description: 'Unauthorized' },
      403: { description: 'Forbidden - not buyer or vendor' },
      404: { description: 'Order not found' },
    },
  },
};

const ordersGetByBuyer: OpenAPIV3.PathItemObject = {
  get: {
    tags: ['Orders'],
    summary: 'Get orders by buyer',
    security: [{ bearerAuth: [] }],
    parameters: [
      { name: 'did', in: 'path', required: true, schema: { type: 'string' } },
      { name: 'status', in: 'query', schema: { type: 'string' } },
      { name: 'limit', in: 'query', schema: { type: 'number', default: 10 } },
      { name: 'offset', in: 'query', schema: { type: 'number', default: 0 } },
    ],
    responses: {
      200: { description: 'List of orders' },
      403: { description: 'Can only view own orders' },
    },
  },
};

const ordersGetByVendor: OpenAPIV3.PathItemObject = {
  get: {
    tags: ['Orders'],
    summary: 'Get orders by vendor',
    security: [{ bearerAuth: [] }],
    parameters: [
      { name: 'did', in: 'path', required: true, schema: { type: 'string' } },
      { name: 'status', in: 'query', schema: { type: 'string' } },
      { name: 'limit', in: 'query', schema: { type: 'number', default: 10 } },
      { name: 'offset', in: 'query', schema: { type: 'number', default: 0 } },
    ],
    responses: {
      200: { description: 'List of orders' },
    },
  },
};

const ordersPay: OpenAPIV3.PathItemObject = {
  post: {
    tags: ['Orders'],
    summary: 'Mark order as paid',
    description: 'Creates escrow to hold funds. Buyer only.',
    security: [{ bearerAuth: [] }],
    parameters: [
      { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
    ],
    requestBody: {
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              paymentProof: {
                type: 'object',
                properties: {
                  stripePaymentIntentId: { type: 'string' },
                  timestamp: { type: 'string', format: 'date-time' },
                },
              },
            },
          },
        },
      },
    },
    responses: {
      200: { description: 'Payment confirmed, escrow created' },
      403: { description: 'Only buyer can pay' },
    },
  },
};

const ordersConfirm: OpenAPIV3.PathItemObject = {
  post: {
    tags: ['Orders'],
    summary: 'Confirm order',
    description: 'Vendor confirms order. Vendor only.',
    security: [{ bearerAuth: [] }],
    parameters: [
      { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
    ],
    responses: {
      200: { description: 'Order confirmed' },
      403: { description: 'Only vendor can confirm' },
    },
  },
};

const ordersShip: OpenAPIV3.PathItemObject = {
  post: {
    tags: ['Orders'],
    summary: 'Mark as shipped',
    description: 'Vendor marks order as shipped with tracking. Vendor only.',
    security: [{ bearerAuth: [] }],
    parameters: [
      { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
    ],
    requestBody: {
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              trackingNumber: { type: 'string' },
              logisticsProviderId: { type: 'string' },
            },
          },
        },
      },
    },
    responses: {
      200: { description: 'Order marked as shipped' },
    },
  },
};

const ordersDeliver: OpenAPIV3.PathItemObject = {
  post: {
    tags: ['Orders'],
    summary: 'Mark as delivered',
    description: 'Buyer or logistics provider marks as delivered.',
    security: [{ bearerAuth: [] }],
    parameters: [
      { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
    ],
    responses: {
      200: { description: 'Order marked as delivered' },
    },
  },
};

const ordersComplete: OpenAPIV3.PathItemObject = {
  post: {
    tags: ['Orders'],
    summary: 'Complete order',
    description: 'Releases escrow to vendor. Buyer only (or auto-release after 7 days).',
    security: [{ bearerAuth: [] }],
    parameters: [
      { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
    ],
    responses: {
      200: { description: 'Order completed, funds released' },
    },
  },
};

const ordersCancel: OpenAPIV3.PathItemObject = {
  post: {
    tags: ['Orders'],
    summary: 'Cancel order',
    description: 'Buyer or vendor can cancel. Refunds escrow if payment was made.',
    security: [{ bearerAuth: [] }],
    parameters: [
      { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
    ],
    requestBody: {
      required: true,
      content: {
        'application/json': {
          schema: {
            type: 'object',
            required: ['reason'],
            properties: {
              reason: { type: 'string' },
            },
          },
        },
      },
    },
    responses: {
      200: { description: 'Order cancelled' },
    },
  },
};

const ordersHistory: OpenAPIV3.PathItemObject = {
  get: {
    tags: ['Orders'],
    summary: 'Get order status history',
    security: [{ bearerAuth: [] }],
    parameters: [
      { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
    ],
    responses: {
      200: { description: 'Status change log' },
    },
  },
};

// ============================================================================
// LOGISTICS ENDPOINTS (Layer 3)
// ============================================================================

const logisticsProviders: OpenAPIV3.PathItemObject = {
  post: {
    tags: ['Logistics'],
    summary: 'Register logistics provider',
    security: [{ bearerAuth: [] }],
    responses: { 201: { description: 'Provider registered' } },
  },
  get: {
    tags: ['Logistics'],
    summary: 'Search logistics providers',
    parameters: [
      { name: 'service_region', in: 'query', schema: { type: 'string' } },
      { name: 'shipping_method', in: 'query', schema: { type: 'string' } },
      { name: 'insurance_required', in: 'query', schema: { type: 'boolean' } },
    ],
    responses: { 200: { description: 'List of providers' } },
  },
};

const logisticsQuotes: OpenAPIV3.PathItemObject = {
  post: {
    tags: ['Logistics'],
    summary: 'Submit shipping quote',
    security: [{ bearerAuth: [] }],
    responses: { 201: { description: 'Quote submitted' } },
  },
};

const logisticsQuotesByOrder: OpenAPIV3.PathItemObject = {
  get: {
    tags: ['Logistics'],
    summary: 'Get quotes for order',
    security: [{ bearerAuth: [] }],
    parameters: [
      { name: 'orderId', in: 'path', required: true, schema: { type: 'string' } },
    ],
    responses: { 200: { description: 'List of quotes' } },
  },
};

const logisticsAcceptQuote: OpenAPIV3.PathItemObject = {
  post: {
    tags: ['Logistics'],
    summary: 'Accept shipping quote',
    security: [{ bearerAuth: [] }],
    parameters: [
      { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
    ],
    responses: { 200: { description: 'Quote accepted' } },
  },
};

const logisticsShipments: OpenAPIV3.PathItemObject = {
  post: {
    tags: ['Logistics'],
    summary: 'Create shipment',
    security: [{ bearerAuth: [] }],
    responses: { 201: { description: 'Shipment created' } },
  },
};

const logisticsGetShipment: OpenAPIV3.PathItemObject = {
  get: {
    tags: ['Logistics'],
    summary: 'Get shipment by ID',
    parameters: [
      { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
    ],
    responses: { 200: { description: 'Shipment details' } },
  },
};

const logisticsShipmentByOrder: OpenAPIV3.PathItemObject = {
  get: {
    tags: ['Logistics'],
    summary: 'Get shipment by order ID',
    parameters: [
      { name: 'orderId', in: 'path', required: true, schema: { type: 'string' } },
    ],
    responses: { 200: { description: 'Shipment details' } },
  },
};

const logisticsTracking: OpenAPIV3.PathItemObject = {
  post: {
    tags: ['Logistics'],
    summary: 'Update tracking',
    security: [{ bearerAuth: [] }],
    parameters: [
      { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
    ],
    responses: { 200: { description: 'Tracking updated' } },
  },
  get: {
    tags: ['Logistics'],
    summary: 'Get tracking history',
    parameters: [
      { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
    ],
    responses: { 200: { description: 'Tracking events' } },
  },
};

// ============================================================================
// TRUST ENDPOINTS (Layer 4)
// ============================================================================

const disputesCreate: OpenAPIV3.PathItemObject = {
  post: {
    tags: ['Trust'],
    summary: 'Open dispute',
    security: [{ bearerAuth: [] }],
    responses: { 201: { description: 'Dispute created' } },
  },
};

const disputesGetById: OpenAPIV3.PathItemObject = {
  get: {
    tags: ['Trust'],
    summary: 'Get dispute by ID',
    security: [{ bearerAuth: [] }],
    parameters: [
      { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
    ],
    responses: { 200: { description: 'Dispute details' } },
  },
};

const disputesByOrder: OpenAPIV3.PathItemObject = {
  get: {
    tags: ['Trust'],
    summary: 'Get disputes by order',
    security: [{ bearerAuth: [] }],
    parameters: [
      { name: 'orderId', in: 'path', required: true, schema: { type: 'string' } },
    ],
    responses: { 200: { description: 'List of disputes' } },
  },
};

const disputesVendorResponse: OpenAPIV3.PathItemObject = {
  post: {
    tags: ['Trust'],
    summary: 'Submit vendor response',
    security: [{ bearerAuth: [] }],
    parameters: [
      { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
    ],
    responses: { 200: { description: 'Response submitted' } },
  },
};

const disputesResolve: OpenAPIV3.PathItemObject = {
  post: {
    tags: ['Trust'],
    summary: 'Resolve dispute',
    security: [{ bearerAuth: [] }],
    parameters: [
      { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
    ],
    responses: { 200: { description: 'Dispute resolved' } },
  },
};

const ratingsCreate: OpenAPIV3.PathItemObject = {
  post: {
    tags: ['Trust'],
    summary: 'Submit rating',
    security: [{ bearerAuth: [] }],
    responses: { 201: { description: 'Rating submitted' } },
  },
};

const ratingsGetByOrder: OpenAPIV3.PathItemObject = {
  get: {
    tags: ['Trust'],
    summary: 'Get rating by order',
    parameters: [
      { name: 'orderId', in: 'path', required: true, schema: { type: 'string' } },
    ],
    responses: { 200: { description: 'Rating details' } },
  },
};

const ratingsGetByVendor: OpenAPIV3.PathItemObject = {
  get: {
    tags: ['Trust'],
    summary: 'Get ratings for vendor',
    parameters: [
      { name: 'did', in: 'path', required: true, schema: { type: 'string' } },
      { name: 'limit', in: 'query', schema: { type: 'number' } },
      { name: 'offset', in: 'query', schema: { type: 'number' } },
    ],
    responses: { 200: { description: 'List of ratings' } },
  },
};

const ratingsStats: OpenAPIV3.PathItemObject = {
  get: {
    tags: ['Trust'],
    summary: 'Get rating statistics',
    parameters: [
      { name: 'did', in: 'path', required: true, schema: { type: 'string' } },
    ],
    responses: { 200: { description: 'Rating stats' } },
  },
};

// ============================================================================
// GOVERNANCE ENDPOINTS (Layer 6)
// ============================================================================

const governanceProposals: OpenAPIV3.PathItemObject = {
  post: {
    tags: ['Governance'],
    summary: 'Create proposal',
    security: [{ bearerAuth: [] }],
    responses: { 201: { description: 'Proposal created' } },
  },
  get: {
    tags: ['Governance'],
    summary: 'List proposals',
    description: 'Public endpoint for transparency',
    parameters: [
      { name: 'status', in: 'query', schema: { type: 'string' } },
      { name: 'limit', in: 'query', schema: { type: 'number' } },
    ],
    responses: { 200: { description: 'List of proposals' } },
  },
};

const governanceGetProposal: OpenAPIV3.PathItemObject = {
  get: {
    tags: ['Governance'],
    summary: 'Get proposal details',
    description: 'Public endpoint for transparency',
    parameters: [
      { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
    ],
    responses: { 200: { description: 'Proposal with voting summary' } },
  },
};

const governanceVote: OpenAPIV3.PathItemObject = {
  post: {
    tags: ['Governance'],
    summary: 'Vote on proposal',
    description: 'Signers only. Submit approval or rejection.',
    security: [{ bearerAuth: [] }],
    parameters: [
      { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
    ],
    requestBody: {
      required: true,
      content: {
        'application/json': {
          schema: {
            type: 'object',
            required: ['approved'],
            properties: {
              approved: { type: 'boolean' },
              comment: { type: 'string' },
              signature: { type: 'string' },
            },
          },
        },
      },
    },
    responses: { 200: { description: 'Vote recorded' } },
  },
};

const governanceExecute: OpenAPIV3.PathItemObject = {
  post: {
    tags: ['Governance'],
    summary: 'Execute proposal',
    description: 'Signers only. Proposal must have quorum.',
    security: [{ bearerAuth: [] }],
    parameters: [
      { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
    ],
    responses: { 200: { description: 'Proposal executed' } },
  },
};

// ============================================================================
// COMMON SCHEMAS
// ============================================================================

const commonSchemas: Record<string, OpenAPIV3.SchemaObject> = {
  CreateProductRequest: {
    type: 'object',
    required: ['vendorDid', 'clientId', 'category', 'basic', 'pricing', 'logistics'],
    properties: {
      vendorDid: { type: 'string', example: 'did:rangkai:abc123' },
      clientId: { type: 'string', example: 'my-marketplace' },
      category: {
        type: 'object',
        properties: {
          primary: { type: 'string', enum: ['footwear', 'bags', 'textiles', 'electronics', 'home', 'craft', 'other'] },
          subcategory: { type: 'string' },
          tags: { type: 'array', items: { type: 'string' } },
        },
      },
      basic: {
        type: 'object',
        required: ['name', 'description', 'images', 'condition'],
        properties: {
          name: { type: 'string', maxLength: 200 },
          description: { type: 'string', maxLength: 5000 },
          shortDescription: { type: 'string', maxLength: 300 },
          images: {
            type: 'object',
            required: ['primary'],
            properties: {
              primary: { type: 'string', format: 'uri' },
              gallery: { type: 'array', items: { type: 'string', format: 'uri' } },
              thumbnail: { type: 'string', format: 'uri' },
            },
          },
          condition: { type: 'string', enum: ['new', 'used', 'refurbished'] },
          sku: { type: 'string' },
          brand: { type: 'string' },
        },
      },
      pricing: {
        type: 'object',
        required: ['basePrice', 'moq'],
        properties: {
          basePrice: {
            type: 'object',
            required: ['amount', 'currency'],
            properties: {
              amount: { type: 'number', minimum: 0 },
              currency: { type: 'string', enum: ['USD', 'EUR', 'GBP', 'MYR', 'SGD', 'AUD', 'BTC'] },
            },
          },
          moq: { type: 'number', minimum: 1, description: 'Minimum order quantity' },
        },
      },
      logistics: {
        type: 'object',
        required: ['weight', 'dimensions', 'originCountry', 'leadTime'],
        properties: {
          weight: {
            type: 'object',
            properties: {
              value: { type: 'number' },
              unit: { type: 'string', enum: ['kg', 'lb', 'g'] },
            },
          },
          dimensions: {
            type: 'object',
            properties: {
              length: { type: 'number' },
              width: { type: 'number' },
              height: { type: 'number' },
              unit: { type: 'string', enum: ['cm', 'in'] },
            },
          },
          originCountry: { type: 'string', minLength: 2, maxLength: 2, description: 'ISO country code' },
          leadTime: { type: 'number', minimum: 0, description: 'Production lead time in days' },
        },
      },
      visibility: { type: 'string', enum: ['public', 'private', 'unlisted'], default: 'public' },
    },
  },

  CreateOrderRequest: {
    type: 'object',
    required: ['vendorDid', 'clientId', 'type', 'items', 'shippingAddress', 'paymentMethod'],
    properties: {
      vendorDid: { type: 'string' },
      clientId: { type: 'string' },
      type: { type: 'string', enum: ['sample', 'wholesale', 'custom'] },
      items: {
        type: 'array',
        minItems: 1,
        items: {
          type: 'object',
          required: ['productId', 'productName', 'quantity', 'pricePerUnit', 'totalPrice'],
          properties: {
            productId: { type: 'string', format: 'uuid' },
            productName: { type: 'string' },
            quantity: { type: 'number', minimum: 1 },
            pricePerUnit: {
              type: 'object',
              properties: {
                amount: { type: 'number' },
                currency: { type: 'string' },
              },
            },
            totalPrice: {
              type: 'object',
              properties: {
                amount: { type: 'number' },
                currency: { type: 'string' },
              },
            },
          },
        },
      },
      shippingAddress: {
        type: 'object',
        required: ['name', 'addressLine1', 'city', 'postalCode', 'country', 'phone'],
        properties: {
          name: { type: 'string' },
          addressLine1: { type: 'string' },
          addressLine2: { type: 'string' },
          city: { type: 'string' },
          state: { type: 'string' },
          postalCode: { type: 'string' },
          country: { type: 'string', minLength: 2, maxLength: 2 },
          phone: { type: 'string' },
        },
      },
      paymentMethod: { 
        type: 'string', 
        enum: ['lightning', 'bitcoin_onchain', 'stripe', 'paypal', 'bank_transfer', 'other'] 
      },
      buyerNotes: { type: 'string' },
    },
  },

  ErrorResponse: {
    type: 'object',
    properties: {
      error: {
        type: 'object',
        properties: {
          code: { type: 'string', example: 'VALIDATION_ERROR' },
          message: { type: 'string', example: 'Invalid input data' },
          details: { type: 'object' },
          timestamp: { type: 'string', format: 'date-time' },
          requestId: { type: 'string' },
        },
      },
    },
  },
}