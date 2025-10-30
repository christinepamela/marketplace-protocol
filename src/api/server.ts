/**
 * Server Entry Point
 * 
 * Loads environment variables and starts the API server
 */


// CRITICAL: Load dotenv FIRST, before ANY other imports
import dotenv from 'dotenv';
dotenv.config();

// NOW import everything else (after .env is loaded)
import { startServer } from './index';

// Handle uncaught errors
process.on('uncaughtException', (error: Error) => {
  console.error('❌ Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason: any) => {
  console.error('❌ Unhandled Rejection:', reason);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('\n🛑 SIGTERM received, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('\n🛑 SIGINT received, shutting down gracefully...');
  process.exit(0);
});

// Start the server
startServer();