/**
 * Payment Scheduler
 * Path: src/api/scheduler.ts
 *
 * Runs background jobs that the system needs to operate without
 * developer involvement:
 *   1. Bitcoin payment monitoring (every 60s)
 *   2. Escrow auto-release (every 5 min)
 *   3. Governance proposal expiry (every 5 min)
 *
 * Usage: called once from src/api/index.ts after server starts.
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { BitcoinService } from '../core/layer2-transaction/bitcoin.service';
import { OrderService } from '../core/layer2-transaction/order.service';
import { EscrowService } from '../core/layer2-transaction/escrow.service';

// ─── Types ───────────────────────────────────────────────────────────────────

interface SchedulerOptions {
  supabase: SupabaseClient;
  bitcoinService: BitcoinService;
}

// ─── Scheduler ───────────────────────────────────────────────────────────────

export class PaymentScheduler {
  private timers: NodeJS.Timeout[] = [];
  private running = false;

  constructor(private opts: SchedulerOptions) {}

  start(): void {
    if (this.running) return;
    this.running = true;

    console.log('[Scheduler] Starting background jobs...');

    // Job 1: Bitcoin payment monitoring — every 60 seconds
    this.timers.push(
      setInterval(() => this.runBitcoinMonitor(), 60_000)
    );

    // Job 2: Escrow auto-release — every 5 minutes
    this.timers.push(
      setInterval(() => this.runEscrowAutoRelease(), 5 * 60_000)
    );

    // Job 3: Governance proposal expiry — every 5 minutes
    this.timers.push(
      setInterval(() => this.runProposalExpiry(), 5 * 60_000)
    );

    // Run immediately on startup so we don't wait for the first interval
    this.runBitcoinMonitor();
    this.runEscrowAutoRelease();
    this.runProposalExpiry();

    console.log('[Scheduler] All jobs started.');
  }

  stop(): void {
    this.timers.forEach(t => clearInterval(t));
    this.timers = [];
    this.running = false;
    console.log('[Scheduler] All jobs stopped.');
  }

  // ─── Job 1: Bitcoin Payment Monitor ───────────────────────────────────────

  private async runBitcoinMonitor(): Promise<void> {
    try {
      // Find all orders that are payment_pending with a bitcoin_onchain method
      // and have an unexpired payment address
      const { data: pendingAddresses, error } = await this.opts.supabase
        .from('bitcoin_payment_addresses')
        .select('order_id, address, expires_at, confirmed')
        .eq('confirmed', false)
        .gt('expires_at', new Date().toISOString());

      if (error) {
        console.error('[Scheduler] Bitcoin monitor query failed:', error.message);
        return;
      }

      if (!pendingAddresses || pendingAddresses.length === 0) return;

      console.log(`[Scheduler] Checking ${pendingAddresses.length} pending Bitcoin payment(s)...`);

      for (const record of pendingAddresses) {
        try {
          const status = await this.opts.bitcoinService.monitorOrderPayment(record.order_id);

          if (status?.confirmed) {
            // Payment confirmed — mark order as paid
            const orderService = new OrderService(this.opts.supabase);
            await orderService.markAsPaid(record.order_id, status.txid || `btc_${Date.now()}`);

            // Create escrow
            const escrowService = new EscrowService(this.opts.supabase);
            const order = await orderService.getOrderById(record.order_id);
            if (order) {
              await escrowService.createEscrow(record.order_id, order.total);
            }

            console.log(
              `[Scheduler] Bitcoin payment confirmed for order ${record.order_id} ` +
              `txid=${status.txid} confirmations=${status.confirmations}`
            );
          }
        } catch (err: any) {
          // Log per-order errors but continue checking other orders
          console.error(
            `[Scheduler] Error checking payment for order ${record.order_id}:`,
            err.message
          );
        }
      }
    } catch (err: any) {
      console.error('[Scheduler] Bitcoin monitor job failed:', err.message);
    }
  }

  // ─── Job 2: Escrow Auto-Release ───────────────────────────────────────────

  private async runEscrowAutoRelease(): Promise<void> {
    try {
      const escrowService = new EscrowService(this.opts.supabase);
      await escrowService.processAutoReleases();
    } catch (err: any) {
      console.error('[Scheduler] Escrow auto-release job failed:', err.message);
    }
  }

  // ─── Job 3: Governance Proposal Expiry ───────────────────────────────────

  private async runProposalExpiry(): Promise<void> {
    try {
      const { data, error } = await this.opts.supabase
        .from('governance_proposals')
        .update({ status: 'expired', updated_at: new Date().toISOString() })
        .eq('status', 'active')
        .lt('voting_ends_at', new Date().toISOString())
        .select('proposal_number');

      if (error) {
        console.error('[Scheduler] Proposal expiry job failed:', error.message);
        return;
      }

      if (data && data.length > 0) {
        console.log(`[Scheduler] Expired ${data.length} proposal(s):`, data.map(p => p.proposal_number));
      }
    } catch (err: any) {
      console.error('[Scheduler] Proposal expiry job failed:', err.message);
    }
  }
}

// ─── Factory ─────────────────────────────────────────────────────────────────

/**
 * Initialize and start the scheduler.
 * Call this once from src/api/index.ts after startServer().
 *
 * Example:
 *   import { initializeScheduler } from './scheduler';
 *   const scheduler = initializeScheduler(supabase);
 *   // scheduler is stopped automatically on SIGTERM/SIGINT via the server shutdown hooks
 */
export function initializeScheduler(
  supabase: SupabaseClient,
  bitcoinMnemonic?: string
): PaymentScheduler {
  const bitcoinService = new BitcoinService(
    supabase,
    bitcoinMnemonic,
    process.env.BITCOIN_NETWORK === 'testnet'
  );

  const scheduler = new PaymentScheduler({ supabase, bitcoinService });
  scheduler.start();
  return scheduler;
}
