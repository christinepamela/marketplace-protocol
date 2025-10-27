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
import { config } from './core/config';
import { generateRequestId } from './core/utils';
import { errorHandler, notFoundHandler } from './middleware/error.middleware';
import { standardRateLimit } from './middleware/ratelimit.middleware';

// Create Express app
const app = express();

/**
 * Request ID middleware - attach unique ID to each request
 */
app.use((req: Request, res: Response, next: NextFunction) => {
  req.requestId = generateRequestId();
  res.setHeader('X-Request-ID', req.requestId);
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
 * Apply rate limiting to all API routes
 */
app.use(`${config.apiPrefix}/*`, standardRateLimit);

/**
 * Mount API routes (will be added in next phase)
 */
// app.use(`${config.apiPrefix}/identity`, identityRoutes);
// app.use(`${config.apiPrefix}/catalog`, catalogRoutes);
// app.use(`${config.apiPrefix}/orders`, orderRoutes);
// app.use(`${config.apiPrefix}/logistics`, logisticsRoutes);
// app.use(`${config.apiPrefix}/trust`, trustRoutes);
// app.use(`${config.apiPrefix}/governance`, governanceRoutes);

/**
 * 404 handler
 */
app.use(notFoundHandler);

/**
 * Global error handler (must be last)
 */
app.use(errorHandler);

/**
 * Start server
 */
export function startServer(): void {
  app.listen(config.port, () => {
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
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  });
}

// Export app for testing
export { app };