/**
 * SDK Integration Tests
 * Tests SDK against live API (requires server running)
 */

import { RangkaiSDK, RangkaiNotFoundError, RangkaiAuthError } from '../src';

describe('Rangkai SDK', () => {
  let sdk: RangkaiSDK;

  beforeAll(() => {
    sdk = new RangkaiSDK({
      apiUrl: process.env.API_URL || 'http://localhost:3000',
      debug: true,
    });
  });

  describe('Initialization', () => {
    it('should initialize SDK', () => {
      expect(sdk).toBeDefined();
      expect(sdk.identity).toBeDefined();
      expect(sdk.catalog).toBeDefined();
      expect(sdk.orders).toBeDefined();
      expect(sdk.logistics).toBeDefined();
      expect(sdk.trust).toBeDefined();
      expect(sdk.governance).toBeDefined();
    });

    it('should throw error without apiUrl', () => {
      expect(() => {
        new RangkaiSDK({ apiUrl: '' });
      }).toThrow();
    });
  });

  describe('Health Check', () => {
    it('should check API health', async () => {
      const health = await sdk.health();
      
      expect(health).toHaveProperty('status');
      expect(health).toHaveProperty('version');
      expect(health.status).toBe('healthy');
    });
  });

  describe('Error Handling', () => {
    it('should throw RangkaiNotFoundError for 404', async () => {
      await expect(
        sdk.identity.getByDid('did:rangkai:nonexistent')
      ).rejects.toThrow(RangkaiNotFoundError);
    });

    it('should throw RangkaiAuthError for unauthorized requests', async () => {
      await expect(
        sdk.orders.create({
          vendorDid: 'did:rangkai:...',
          clientId: 'test',
          type: 'wholesale',
          items: [],
          shippingAddress: {} as any,
          paymentMethod: 'stripe',
        })
      ).rejects.toThrow(RangkaiAuthError);
    });
  });

  describe('Token Management', () => {
    it('should set token', () => {
      const token = 'test-token';
      sdk.setToken(token);
      // Token is set internally, no public getter
    });

    it('should clear token', () => {
      sdk.clearToken();
      // Token is cleared internally
    });
  });

  // Add more integration tests here
  // These would test actual API calls with test data
});

// Example: Testing with mock data
describe('SDK Modules', () => {
  let sdk: RangkaiSDK;

  beforeAll(() => {
    sdk = new RangkaiSDK({
      apiUrl: 'http://localhost:3000',
    });
  });

  describe('Identity Module', () => {
    it('should have register method', () => {
      expect(sdk.identity.register).toBeDefined();
    });

    it('should have getByDid method', () => {
      expect(sdk.identity.getByDid).toBeDefined();
    });

    it('should have getReputation method', () => {
      expect(sdk.identity.getReputation).toBeDefined();
    });

    it('should have verify method', () => {
      expect(sdk.identity.verify).toBeDefined();
    });

    it('should have generateProof method', () => {
      expect(sdk.identity.generateProof).toBeDefined();
    });
  });

  describe('Catalog Module', () => {
    it('should have create method', () => {
      expect(sdk.catalog.create).toBeDefined();
    });

    it('should have search method', () => {
      expect(sdk.catalog.search).toBeDefined();
    });

    it('should have getById method', () => {
      expect(sdk.catalog.getById).toBeDefined();
    });

    it('should have getByVendor method', () => {
      expect(sdk.catalog.getByVendor).toBeDefined();
    });

    it('should have update method', () => {
      expect(sdk.catalog.update).toBeDefined();
    });

    it('should have delete method', () => {
      expect(sdk.catalog.delete).toBeDefined();
    });
  });

  describe('Orders Module', () => {
    it('should have create method', () => {
      expect(sdk.orders.create).toBeDefined();
    });

    it('should have getById method', () => {
      expect(sdk.orders.getById).toBeDefined();
    });

    it('should have markAsPaid method', () => {
      expect(sdk.orders.markAsPaid).toBeDefined();
    });

    it('should have confirm method', () => {
      expect(sdk.orders.confirm).toBeDefined();
    });

    it('should have markAsShipped method', () => {
      expect(sdk.orders.markAsShipped).toBeDefined();
    });

    it('should have complete method', () => {
      expect(sdk.orders.complete).toBeDefined();
    });

    it('should have cancel method', () => {
      expect(sdk.orders.cancel).toBeDefined();
    });

    it('should have getHistory method', () => {
      expect(sdk.orders.getHistory).toBeDefined();
    });
  });

  describe('Logistics Module', () => {
    it('should have registerProvider method', () => {
      expect(sdk.logistics.registerProvider).toBeDefined();
    });

    it('should have searchProviders method', () => {
      expect(sdk.logistics.searchProviders).toBeDefined();
    });

    it('should have submitQuote method', () => {
      expect(sdk.logistics.submitQuote).toBeDefined();
    });

    it('should have createShipment method', () => {
      expect(sdk.logistics.createShipment).toBeDefined();
    });

    it('should have updateTracking method', () => {
      expect(sdk.logistics.updateTracking).toBeDefined();
    });
  });

  describe('Trust Module', () => {
    it('should have openDispute method', () => {
      expect(sdk.trust.openDispute).toBeDefined();
    });

    it('should have submitRating method', () => {
      expect(sdk.trust.submitRating).toBeDefined();
    });

    it('should have getRatingsForVendor method', () => {
      expect(sdk.trust.getRatingsForVendor).toBeDefined();
    });
  });

  describe('Governance Module', () => {
    it('should have createProposal method', () => {
      expect(sdk.governance.createProposal).toBeDefined();
    });

    it('should have listProposals method', () => {
      expect(sdk.governance.listProposals).toBeDefined();
    });

    it('should have vote method', () => {
      expect(sdk.governance.vote).toBeDefined();
    });

    it('should have executeProposal method', () => {
      expect(sdk.governance.executeProposal).toBeDefined();
    });
  });
});