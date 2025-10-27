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
    it('should include CORS headers', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);
      
      expect(response.headers['access-control-allow-origin']).toBeDefined();
    });
    
    it('should handle OPTIONS preflight requests', async () => {
      const response = await request(app)
        .options('/api/v1/version')
        .expect(204);
      
      expect(response.headers['access-control-allow-methods']).toBeDefined();
    });
  });
});