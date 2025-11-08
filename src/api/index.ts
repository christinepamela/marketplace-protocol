/// <reference path="./types/express.d.ts" />
/**
 * Main API Server
 * 
 * Express application setup with middleware and routes
 */
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { createServer } from 'http';
import { createClient } from '@supabase/supabase-js';
import { config } from './core/config';
import { generateRequestId } from './core/utils';
import { errorHandler, notFoundHandler } from './middleware/error.middleware';
import { standardRateLimit } from './middleware/ratelimit.middleware';
import { initializeWebSocket } from './websocket/server';

// Create Express app
const app = express();

// Create HTTP server (needed for WebSocket)
const httpServer = createServer(app);

// Create Supabase client
const supabase = createClient(
  config.supabaseUrl,
  config.supabaseServiceKey
);

/**
 * Request ID middleware - attach unique ID to each request
 */
app.use((req: Request, res: Response, next: NextFunction) => {
  req.requestId = generateRequestId();
  res.setHeader('X-Request-ID', req.requestId);
  next();
});

/**
 * Supabase middleware - attach Supabase client to each request
 */
app.use((req: Request, res: Response, next: NextFunction) => {
  req.supabase = supabase;
  next();
});

/**
 * Security middleware
 */
app.use(helmet({
  contentSecurityPolicy: config.isProduction,
  crossOriginEmbedderPolicy: config.isProduction,
}));

/**
 * CORS configuration
 */
app.use(cors({
  origin: config.corsOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
  exposedHeaders: ['X-Request-ID', 'X-RateLimit-Limit', 'X-RateLimit-Remaining'],
}));

/**
 * Body parsing middleware
 */
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

/**
 * Compression middleware
 */
app.use(compression());

/**
 * Request logging (only in development)
 */
if (config.isDevelopment) {
  app.use((req: Request, res: Response, next: NextFunction) => {
    const start = Date.now();
    
    res.on('finish', () => {
      const duration = Date.now() - start;
      console.log(
        `[${req.requestId}] ${req.method} ${req.path} ${res.statusCode} ${duration}ms`
      );
    });
    
    next();
  });
}

/**
 * Health check endpoint (no rate limiting)
 */
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: config.apiVersion,
    environment: config.nodeEnv,
    sandbox: config.isSandboxMode,
  });
});

/**
 * API version endpoint
 */
app.get(`${config.apiPrefix}/version`, (req: Request, res: Response) => {
  res.json({
    version: config.apiVersion,
    environment: config.nodeEnv,
    sandbox: config.isSandboxMode,
  });
});

/**
 * API Documentation (Swagger UI)
 * Available at /docs
 */
import swaggerRoute from './docs/swagger.route';
app.use('/docs', swaggerRoute);

/**
 * Apply rate limiting to all API routes
 */
app.use(`${config.apiPrefix}/*`, standardRateLimit);

/**
 * Mount API routes
 */
import apiRoutes from './routes';
app.use(config.apiPrefix, apiRoutes);

/**
 * 404 handler
 */
app.use(notFoundHandler);

/**
 * Global error handler (must be last)
 */
app.use(errorHandler);

/**
 * Initialize WebSocket server
 */
const wsManager = initializeWebSocket(httpServer);

/**
 * Start server
 */
export function startServer(): void {
  httpServer.listen(config.port, () => {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🚀 Rangkai Protocol API Server');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`Environment: ${config.nodeEnv}`);
    console.log(`Port: ${config.port}`);
    console.log(`API Version: ${config.apiVersion}`);
    console.log(`Sandbox Mode: ${config.isSandboxMode ? 'ON' : 'OFF'}`);
    console.log(`Rate Limit: ${config.rateLimitMaxRequests} req/hour`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`Health: http://localhost:${config.port}/health`);
    console.log(`API Base: http://localhost:${config.port}${config.apiPrefix}`);
    console.log(`WebSocket: ws://localhost:${config.port}/ws`);
    console.log(`📚 API Docs: http://localhost:${config.port}/docs`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  });
}

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('\n🛑 SIGTERM received, shutting down gracefully...');
  wsManager.shutdown();
  httpServer.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('\n🛑 SIGINT received, shutting down gracefully...');
  wsManager.shutdown();
  httpServer.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

// Export app for testing
export { app, httpServer, wsManager };