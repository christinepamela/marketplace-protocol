/**
 * API Configuration Management
 * 
 * Manages environment variables, endpoints, and API settings
 * Supports sandbox mode for testing
 */

import { z } from 'zod';

// Environment validation schema
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.string().default('3000'),
  
  // Supabase
  SUPABASE_URL: z.string().url(),
  SUPABASE_ANON_KEY: z.string(),
  SUPABASE_SERVICE_KEY: z.string(),
  
  // JWT
  JWT_SECRET: z.string().min(32),
  JWT_EXPIRY: z.string().default('24h'),
  
  // API Keys
  API_KEY_SALT: z.string().min(32),
  
  // Proof Signing
  PROOF_SIGNING_KEY: z.string().min(64),
  
  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: z.string().default('3600000'), // 1 hour
  RATE_LIMIT_MAX_REQUESTS: z.string().default('100'),
  
  // CORS
  CORS_ORIGINS: z.string().default('http://localhost:3001'),
  
  // Sandbox Mode
  SANDBOX_MODE: z.string().default('false'),
});

type EnvConfig = z.infer<typeof envSchema>;

class Config {
  private config: EnvConfig;
  
  constructor() {
    // Validate environment variables
    const result = envSchema.safeParse(process.env);
    
    if (!result.success) {
      console.error('❌ Invalid environment variables:');
      console.error(result.error.format());
      throw new Error('Invalid environment configuration');
    }
    
    this.config = result.data;
  }
  
  // Environment
  get nodeEnv() { return this.config.NODE_ENV; }
  get port() { return parseInt(this.config.PORT); }
  get isDevelopment() { return this.config.NODE_ENV === 'development'; }
  get isProduction() { return this.config.NODE_ENV === 'production'; }
  get isTest() { return this.config.NODE_ENV === 'test'; }
  
  // Supabase
  get supabaseUrl() { return this.config.SUPABASE_URL; }
  get supabaseAnonKey() { return this.config.SUPABASE_ANON_KEY; }
  get supabaseServiceKey() { return this.config.SUPABASE_SERVICE_KEY; }
  
  // JWT
  get jwtSecret() { return this.config.JWT_SECRET; }
  get jwtExpiry() { return this.config.JWT_EXPIRY; }
  
  // API Keys
  get apiKeySalt() { return this.config.API_KEY_SALT; }
  
  // Proof Signing
  get proofSigningKey() { return this.config.PROOF_SIGNING_KEY; }
  
  // Rate Limiting
  get rateLimitWindowMs() { return parseInt(this.config.RATE_LIMIT_WINDOW_MS); }
  get rateLimitMaxRequests() { return parseInt(this.config.RATE_LIMIT_MAX_REQUESTS); }
  
  // CORS
  get corsOrigins() {
    return this.config.CORS_ORIGINS.split(',').map(origin => origin.trim());
  }
  
  // Sandbox
  get isSandboxMode() { return this.config.SANDBOX_MODE === 'true'; }
  
  
  // API Versioning
  get apiVersion() { return 'v1'; }
  get apiPrefix() { return `/api/${this.apiVersion}`; }
}

// Export singleton instance
export const config = new Config();

// Export types
export type { EnvConfig };