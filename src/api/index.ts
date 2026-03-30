/// <reference path="./types/express.d.ts" />
/**
 * Main API Server
 * Adds: PaymentScheduler wired after server start
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
import { initializeScheduler, PaymentScheduler } from './scheduler'; // ← NEW

const app = express();
const httpServer = createServer(app);

const supabase = createClient(config.supabaseUrl, config.supabaseServiceKey);

// ── Middleware ────────────────────────────────────────────────────────────────

app.use((req: Request, res: Response, next: NextFunction) => {
  req.requestId = generateRequestId();
  res.setHeader('X-Request-ID', req.requestId);
  next();
});

app.use((req: Request, res: Response, next: NextFunction) => {
  req.supabase = supabase;
  next();
});

app.use(helmet({
  contentSecurityPolicy: config.isProduction,
  crossOriginEmbedderPolicy: config.isProduction,
}));

app.use(cors({
  origin: config.corsOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
  exposedHeaders: ['X-Request-ID', 'X-RateLimit-Limit', 'X-RateLimit-Remaining'],
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(compression());

if (config.isDevelopment) {
  app.use((req: Request, res: Response, next: NextFunction) => {
    const start = Date.now();
    res.on('finish', () => {
      console.log(`[${req.requestId}] ${req.method} ${req.path} ${res.statusCode} ${Date.now() - start}ms`);
    });
    next();
  });
}

// ── Routes ────────────────────────────────────────────────────────────────────

app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: config.apiVersion,
    environment: config.nodeEnv,
    sandbox: config.isSandboxMode,
  });
});

app.get(`${config.apiPrefix}/version`, (req: Request, res: Response) => {
  res.json({ version: config.apiVersion, environment: config.nodeEnv, sandbox: config.isSandboxMode });
});

import swaggerRoute from './docs/swagger.route';
app.use('/docs', swaggerRoute);

app.use(`${config.apiPrefix}/*`, standardRateLimit);

import apiRoutes from './routes';
app.use(config.apiPrefix, apiRoutes);

import bitcoinRoutes from './routes/bitcoin.routes';
app.use(`${config.apiPrefix}/bitcoin`, bitcoinRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

// ── WebSocket ─────────────────────────────────────────────────────────────────

const wsManager = initializeWebSocket(httpServer);

// ── Scheduler (declared at module scope so shutdown hooks can stop it) ────────

let scheduler: PaymentScheduler | null = null; // ← NEW

// ── Start ─────────────────────────────────────────────────────────────────────

export function startServer(): void {
  httpServer.listen(config.port, () => {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🚀 Rangkai Protocol API Server');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`Environment: ${config.nodeEnv}`);
    console.log(`Port:        ${config.port}`);
    console.log(`API Version: ${config.apiVersion}`);
    console.log(`Sandbox:     ${config.isSandboxMode ? 'ON' : 'OFF'}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`Health:  http://localhost:${config.port}/health`);
    console.log(`API:     http://localhost:${config.port}${config.apiPrefix}`);
    console.log(`WS:      ws://localhost:${config.port}/ws`);
    console.log(`Docs:    http://localhost:${config.port}/docs`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // ← NEW: Start background scheduler after server is listening
    scheduler = initializeScheduler(supabase, process.env.BITCOIN_MNEMONIC);
  });
}

// ── Graceful Shutdown ─────────────────────────────────────────────────────────

function shutdown(signal: string): void {
  console.log(`\n🛑 ${signal} received, shutting down gracefully...`);
  scheduler?.stop(); // ← NEW: stop scheduler before closing server
  wsManager.shutdown();
  httpServer.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT',  () => shutdown('SIGINT'));

export { app, httpServer, wsManager };
