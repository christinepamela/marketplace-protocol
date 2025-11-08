/**
 * Rangkai SDK - Main Client
 * TypeScript client for Rangkai Protocol REST API
 */

import { mapApiError } from './errors';
import { IdentityModule } from './modules/identity';
import { CatalogModule } from './modules/catalog';
import { OrdersModule } from './modules/orders';
import { LogisticsModule } from './modules/logistics';
import { TrustModule } from './modules/trust';
import { GovernanceModule } from './modules/governance';

// ============================================================================
// CONFIGURATION TYPES
// ============================================================================

export interface RangkaiSDKConfig {
  /**
   * API base URL (e.g., 'https://api.rangkai.protocol' or 'http://localhost:3000')
   */
  apiUrl: string;

  /**
   * Authentication token (JWT)
   * If not provided, only public endpoints will be accessible
   */
  token?: string;

  /**
   * API version (default: 'v1')
   */
  apiVersion?: string;

  /**
   * Request timeout in milliseconds (default: 30000)
   */
  timeout?: number;

  /**
   * Custom headers to include in all requests
   */
  headers?: Record<string, string>;

  /**
   * Enable debug logging
   */
  debug?: boolean;
}

interface RequestOptions {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  path: string;
  body?: any;
  query?: Record<string, string | number | boolean | undefined>;
  headers?: Record<string, string>;
}

// ============================================================================
// HTTP CLIENT
// ============================================================================

export class HttpClient {
  private config: Required<Omit<RangkaiSDKConfig, 'token' | 'headers' | 'debug'>> & {
    token?: string;
    headers?: Record<string, string>;
    debug?: boolean;
  };

  constructor(config: RangkaiSDKConfig) {
    this.config = {
      apiUrl: config.apiUrl.replace(/\/$/, ''), // Remove trailing slash
      apiVersion: config.apiVersion || 'v1',
      timeout: config.timeout || 30000,
      token: config.token,
      headers: config.headers,
      debug: config.debug,
    };
  }

  /**
   * Update authentication token
   */
  setToken(token: string): void {
    this.config.token = token;
  }

  /**
   * Remove authentication token
   */
  clearToken(): void {
    this.config.token = undefined;
  }

  /**
   * Make HTTP request
   */
  async request<T = any>(options: RequestOptions): Promise<T> {
    const { method, path, body, query, headers: customHeaders } = options;

    // Build URL
    const baseUrl = `${this.config.apiUrl}/api/${this.config.apiVersion}`;
    let url = `${baseUrl}${path}`;

    // Add query parameters
    if (query) {
      const params = new URLSearchParams();
      Object.entries(query).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, String(value));
        }
      });
      const queryString = params.toString();
      if (queryString) {
        url += `?${queryString}`;
      }
    }

    // Build headers
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...this.config.headers,
      ...customHeaders,
    };

    // Add authentication
    if (this.config.token) {
      headers['Authorization'] = `Bearer ${this.config.token}`;
    }

    // Debug logging
    if (this.config.debug) {
      console.log(`[Rangkai SDK] ${method} ${url}`);
      if (body) console.log('[Rangkai SDK] Body:', JSON.stringify(body, null, 2));
    }

    try {
      // Make request using native fetch
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

      const response = await fetch(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Parse response
      const data: any = await response.json().catch(() => ({}));

      // Debug logging
      if (this.config.debug) {
        console.log(`[Rangkai SDK] Response:`, data);
      }

      // Handle errors
      if (!response.ok) {
        throw mapApiError({
          response: {
            status: response.status,
            data,
          },
          message: data.error?.message || 'Request failed',
        });
      }

      // Return data (most endpoints wrap response in { success, data })
      return (data.data !== undefined ? data.data : data) as T;
    } catch (error: any) {
      // Handle network errors
      if (error.name === 'AbortError') {
        throw mapApiError({
          message: `Request timeout after ${this.config.timeout}ms`,
        });
      }

      // Re-throw if already a Rangkai error
      if (error.name?.startsWith('Rangkai')) {
        throw error;
      }

      // Map other errors
      throw mapApiError(error);
    }
  }

  /**
   * GET request
   */
  async get<T = any>(path: string, query?: Record<string, any>): Promise<T> {
    return this.request<T>({ method: 'GET', path, query });
  }

  /**
   * POST request
   */
  async post<T = any>(path: string, body?: any): Promise<T> {
    return this.request<T>({ method: 'POST', path, body });
  }

  /**
   * PUT request
   */
  async put<T = any>(path: string, body?: any): Promise<T> {
    return this.request<T>({ method: 'PUT', path, body });
  }

  /**
   * PATCH request
   */
  async patch<T = any>(path: string, body?: any): Promise<T> {
    return this.request<T>({ method: 'PATCH', path, body });
  }

  /**
   * DELETE request
   */
  async delete<T = any>(path: string): Promise<T> {
    return this.request<T>({ method: 'DELETE', path });
  }
}

// ============================================================================
// MAIN SDK CLASS
// ============================================================================

export class RangkaiSDK {
  private httpClient: HttpClient;

  // Module instances
  public readonly identity: IdentityModule;
  public readonly catalog: CatalogModule;
  public readonly orders: OrdersModule;
  public readonly logistics: LogisticsModule;
  public readonly trust: TrustModule;
  public readonly governance: GovernanceModule;

  constructor(config: RangkaiSDKConfig) {
    // Validate config
    if (!config.apiUrl) {
      throw new Error('apiUrl is required');
    }

    // Initialize HTTP client
    this.httpClient = new HttpClient(config);

    // Initialize modules
    this.identity = new IdentityModule(this.httpClient);
    this.catalog = new CatalogModule(this.httpClient);
    this.orders = new OrdersModule(this.httpClient);
    this.logistics = new LogisticsModule(this.httpClient);
    this.trust = new TrustModule(this.httpClient);
    this.governance = new GovernanceModule(this.httpClient);
  }

  /**
   * Update authentication token
   * 
   * @example
   * sdk.setToken('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...');
   */
  setToken(token: string): void {
    this.httpClient.setToken(token);
  }

  /**
   * Remove authentication token
   */
  clearToken(): void {
    this.httpClient.clearToken();
  }

  /**
   * Health check
   */
  async health(): Promise<{
    status: string;
    timestamp: string;
    version: string;
    environment: string;
    sandbox: boolean;
  }> {
    // Health endpoint is at root, not /api/v1
    return this.httpClient.request({
      method: 'GET',
      path: '/health',
    });
  }
}