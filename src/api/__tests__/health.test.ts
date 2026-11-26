/**
 * Health Check Tests
 * 
 * Tests for basic API functionality and health endpoints
 */

import request from 'supertest';
import { app } from '../index';

describe('Health Check Endpoints', () => {
  describe('GET /health', () => {
    it('should return healthy status', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);
      
      expect(response.body).toMatchObject({
        status: 'healthy',
        version: 'v1',
      });
      
      expect(response.body.timestamp).toBeDefined();
      expect(response.body.environment).toBeDefined();
    });
    
    it('should not require authentication', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);
      
      expect(response.body.status).toBe('healthy');
    });
    
    it('should include sandbox mode status', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);
      
      expect(response.body.sandbox).toBeDefined();
      expect(typeof response.body.sandbox).toBe('boolean');
    });
  });
  
  describe('GET /api/v1/version', () => {
    it('should return API version', async () => {
      const response = await request(app)
        .get('/api/v1/version')
        .expect(200);
      
      expect(response.body).toMatchObject({
        version: 'v1',
      });
    });
  });
  
  describe('404 Handling', () => {
    it('should return 404 for unknown endpoints', async () => {
      const response = await request(app)
        .get('/api/v1/unknown-endpoint')
        .expect(404);
      
      expect(response.body.error).toBeDefined();
      expect(response.body.error.code).toBe('NOT_FOUND');
      expect(response.body.error.message).toContain('not found');
    });
  });
  
  describe('Request ID', () => {
    it('should add request ID header to all responses', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);
      
      expect(response.headers['x-request-id']).toBeDefined();
      expect(response.headers['x-request-id']).toMatch(/^req_\d+_[a-z0-9]+$/);
    });
  });
  
  describe('CORS', () => {
    // B48: the app configures `cors({ origin: config.corsOrigins })`
    // (src/api/index.ts), and `corsOrigins` is `CORS_ORIGINS` split on commas
    // (src/api/core/config.ts). jest.setup-env.js sets CORS_ORIGINS
    // explicitly, so this test reads the same variable the app reads rather
    // than relying on the schema's default and drifting from it.
    const allowedOrigin = (process.env.CORS_ORIGINS as string).split(',')[0].trim();
    const foreignOrigin = 'https://test-only-foreign-origin.example';

    it('should echo an allowed origin back in access-control-allow-origin', async () => {
      const response = await request(app)
        .get('/health')
        .set('Origin', allowedOrigin)
        .expect(200);

      expect(response.headers['access-control-allow-origin']).toBe(allowedOrigin);
    });

    it('should send no access-control-allow-origin for a foreign origin', async () => {
      const response = await request(app)
        .get('/health')
        .set('Origin', foreignOrigin)
        .expect(200);

      expect(response.headers['access-control-allow-origin']).toBeUndefined();
    });

    it('should handle OPTIONS preflight requests', async () => {
      const response = await request(app)
        .options('/api/v1/version')
        .expect(204);
      
      expect(response.headers['access-control-allow-methods']).toBeDefined();
    });
  });
});