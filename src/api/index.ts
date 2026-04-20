/// <reference path="./types/express.d.ts" />
/**
 * Main API Server
 * Path: src/api/index.ts
 *
 * UPDATED: Adds Stripe and BTCPay webhook routes with raw body parsing
 * Webhooks must receive raw Buffer bodies BEFORE express.json() runs
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
import { initializeScheduler, PaymentScheduler } from './scheduler';

const app = express();
const httpServer = createServer(app);
const supabase = createClient(config.supabaseUrl, config.supabaseServiceKey);

// ── Request ID & Supabase ──────────────────────────────────────────────────

app.use((req: Request, res: Response, next: NextFunction) => {
  req.requestId = generateRequestId();
  res.setHeader('X-Request-ID', req.requestId);
  next();
});

app.use((req: Request, res: Response, next: NextFunction) => {
  req.supabase = supabase;
  next();
});

// ── Security ──────────────────────────────────────────────────────────────

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

// ── WEBHOOK ROUTES (must come BEFORE express.json()) ──────────────────────
// Stripe and BTCPay verify signatures against the raw body.
// express.json() would parse the body first, breaking signature verification.

import stripeWebhookRoute from './routes/stripe.routes';
import btcpayWebhookRoute from './routes/btcpay.routes';

app.use(
  '/webhooks/stripe',
  express.raw({ type: 'application/json' }),  // raw Buffer for signature check
  stripeWebhookRoute
);

app.use(
  '/webhooks/btcpay',
  express.raw({ type: 'application/json' }),
  btcpayWebhookRoute
);

// ── Body Parsing (for all other routes) ──────────────────────────────────

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(compression());

// ── Request Logging (dev only) ────────────────────────────────────────────

if (config.isDevelopment) {
  app.use((req: Request, res: Response, next: NextFunction) => {
    const start = Date.now();
    res.on('finish', () => {
      console.log(`[${req.requestId}] ${req.method} ${req.path} ${res.statusCode} ${Date.now() - start}ms`);
    });
    next();
  });
}

// ── Health ────────────────────────────────────────────────────────────────

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

// ── API Docs ──────────────────────────────────────────────────────────────

import swaggerRoute from './docs/swagger.route';
app.use('/docs', swaggerRoute);

// ── API Routes ────────────────────────────────────────────────────────────

app.use(`${config.apiPrefix}/*`, standardRateLimit);

import apiRoutes from './routes';
app.use(config.apiPrefix, apiRoutes);

import bitcoinRoutes from './routes/bitcoin.routes';
app.use(`${config.apiPrefix}/bitcoin`, bitcoinRoutes);

// ── Error Handlers ────────────────────────────────────────────────────────

app.use(notFoundHandler);
app.use(errorHandler);

// ── WebSocket ─────────────────────────────────────────────────────────────

const wsManager = initializeWebSocket(httpServer);

// ── Scheduler ─────────────────────────────────────────────────────────────

let scheduler: PaymentScheduler | null = null;

// ── Start Server ──────────────────────────────────────────────────────────

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
    console.log(`Health:        http://localhost:${config.port}/health`);
    console.log(`API:           http://localhost:${config.port}${config.apiPrefix}`);
    console.log(`WS:            ws://localhost:${config.port}/ws`);
    console.log(`Docs:          http://localhost:${config.port}/docs`);
    console.log(`Stripe hook:   http://localhost:${config.port}/webhooks/stripe`);
    console.log(`BTCPay hook:   http://localhost:${config.port}/webhooks/btcpay`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    scheduler = initializeScheduler(supabase, process.env.BITCOIN_MNEMONIC);
  });
}

// ── Graceful Shutdown ─────────────────────────────────────────────────────

function shutdown(signal: string): void {
  console.log(`\n🛑 ${signal} received, shutting down gracefully...`);
  scheduler?.stop();
  wsManager.shutdown();
  httpServer.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT',  () => shutdown('SIGINT'));

export { app, httpServer, wsManager };