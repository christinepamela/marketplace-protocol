/**
 * Bitcoin Payment Service
 * Handles on-chain Bitcoin payments with HD wallet and blockchain monitoring
 * 
 * Features:
 * - BIP32 HD wallet derivation (one address per order)
 * - Blockchain payment detection (Blockstream API)
 * - Escrow management (hold until delivery)
 * - Vendor payout (BTC or fiat conversion)
 * 
 * Phase 1 Implementation (Session 22):
 * - Wallet-to-wallet Bitcoin payments
 * - NO Lightning Network (Phase 4)
 * - On-chain only (3 confirmations required)
 */

import * as bitcoin from 'bitcoinjs-lib';
import * as bip32 from 'bip32';
import * as bip39 from 'bip39';
import axios from 'axios';
import type { Price } from '../layer1-catalog/types';

// ============================================================================
// TYPES
// ============================================================================

export interface BitcoinPaymentAddress {
  orderId: string;
  address: string; // Bitcoin address (bc1q...)
  derivationPath: string; // m/84'/0'/0'/0/N
  derivationIndex: number; // N
  expectedAmount: number; // Satoshis
  usdAmount: number; // USD equivalent at time of generation
  expiresAt: Date; // 24 hours from creation
  createdAt: Date;
}

export interface BitcoinPaymentStatus {
  address: string;
  confirmed: boolean;
  confirmations: number;
  amountReceived: number; // Satoshis
  txid?: string;
  blockHeight?: number;
  timestamp?: Date;
}

export interface BitcoinVendorPayout {
  orderId: string;
  vendorDid: string;
  payoutMethod: 'btc' | 'fiat';
  btcAddress?: string; // If payout method is BTC
  bankAccount?: string; // If payout method is fiat
  amount: number; // Satoshis
  usdEquivalent: number; // USD at time of payout
  status: 'pending' | 'processing' | 'completed' | 'failed';
  txid?: string; // If paid in BTC
  createdAt: Date;
  completedAt?: Date;
}

// ============================================================================
// BITCOIN SERVICE CLASS
// ============================================================================

export class BitcoinService {
  private dbClient: any;
  private network: bitcoin.Network;
  private masterNode?: bip32.BIP32Interface;
  
  // Blockstream API endpoints
  private readonly BLOCKSTREAM_API = 'https://blockstream.info/api';
  private readonly BLOCKSTREAM_TESTNET_API = 'https://blockstream.info/testnet/api';
  
  // Configuration
  private readonly REQUIRED_CONFIRMATIONS = 3;
  private readonly ADDRESS_EXPIRY_HOURS = 24;
  
  constructor(
    dbClient: any,
    mnemonic?: string,
    testnet: boolean = false
  ) {
    this.dbClient = dbClient;
    this.network = testnet ? bitcoin.networks.testnet : bitcoin.networks.bitcoin;
    
    // Initialize HD wallet from mnemonic (or generate new one)
    if (mnemonic) {
      this.initializeWallet(mnemonic);
    }
  }

  // ============================================================================
  // WALLET INITIALIZATION
  // ============================================================================

  /**
   * Initialize HD wallet from mnemonic
   */
  private initializeWallet(mnemonic: string): void {
    // Validate mnemonic
    if (!bip39.validateMnemonic(mnemonic)) {
      throw new Error('Invalid BIP39 mnemonic');
    }
    
    // Derive seed from mnemonic
    const seed = bip39.mnemonicToSeedSync(mnemonic);
    
    // Create master node (BIP84 - Native SegWit)
    this.masterNode = bip32.fromSeed(seed, this.network);
  }

  /**
   * Generate new mnemonic (for initial setup)
   */
  static generateMnemonic(): string {
    return bip39.generateMnemonic(256); // 24 words
  }

  // ============================================================================
  // ADDRESS GENERATION (ESCROW)
  // ============================================================================

  /**
   * Generate unique Bitcoin address for order (escrow address)
   */
  async generateEscrowAddress(
    orderId: string,
    amount: Price
  ): Promise<BitcoinPaymentAddress> {
    if (!this.masterNode) {
      throw new Error('Wallet not initialized. Please provide mnemonic.');
    }
    
    // Get next derivation index
    const derivationIndex = await this.getNextDerivationIndex();
    
    // Derivation path: m/84'/0'/0'/0/N (BIP84 - Native SegWit)
    const path = `m/84'/0'/0'/0/${derivationIndex}`;
    const child = this.masterNode.derivePath(path);
    
    if (!child.publicKey) {
      throw new Error('Failed to derive public key');
    }
    
    // Generate P2WPKH address (bc1q...)
    const { address } = bitcoin.payments.p2wpkh({
      pubkey: child.publicKey,
      network: this.network
    });
    
    if (!address) {
      throw new Error('Failed to generate address');
    }
    
    // Get current BTC/USD rate
    const btcPrice = await this.getBitcoinPrice();
    const satoshis = Math.round((amount.amount / btcPrice) * 100_000_000);
    
    const paymentAddress: BitcoinPaymentAddress = {
      orderId,
      address,
      derivationPath: path,
      derivationIndex,
      expectedAmount: satoshis,
      usdAmount: amount.amount,
      expiresAt: new Date(Date.now() + this.ADDRESS_EXPIRY_HOURS * 3600 * 1000),
      createdAt: new Date()
    };
    
    // Store in database
    await this.storePaymentAddress(paymentAddress);
    
    return paymentAddress;
  }

  // ============================================================================
  // PAYMENT MONITORING
  // ============================================================================

  /**
   * Check if payment received for address
   */
  async checkPaymentStatus(address: string): Promise<BitcoinPaymentStatus> {
    const apiUrl = this.network === bitcoin.networks.testnet
      ? this.BLOCKSTREAM_TESTNET_API
      : this.BLOCKSTREAM_API;
    
    try {
      // Get address info from Blockstream API
      const response = await axios.get(`${apiUrl}/address/${address}`);
      const data = response.data;
      
      // Check if any transactions exist
      if (!data.chain_stats?.tx_count && !data.mempool_stats?.tx_count) {
        return {
          address,
          confirmed: false,
          confirmations: 0,
          amountReceived: 0
        };
      }
      
      // Get transactions for this address
      const txResponse = await axios.get(`${apiUrl}/address/${address}/txs`);
      const transactions = txResponse.data;
      
      if (!transactions || transactions.length === 0) {
        return {
          address,
          confirmed: false,
          confirmations: 0,
          amountReceived: 0
        };
      }
      
      // Find the first incoming transaction
      const tx = transactions[0];
      
      // Calculate amount received (sum of outputs to this address)
      let amountReceived = 0;
      for (const output of tx.vout) {
        if (output.scriptpubkey_address === address) {
          amountReceived += output.value;
        }
      }
      
      // Get current block height
      const blockResponse = await axios.get(`${apiUrl}/blocks/tip/height`);
      const currentHeight = blockResponse.data;
      
      // Calculate confirmations
      const confirmations = tx.status.confirmed
        ? currentHeight - tx.status.block_height + 1
        : 0;
      
      return {
        address,
        confirmed: confirmations >= this.REQUIRED_CONFIRMATIONS,
        confirmations,
        amountReceived,
        txid: tx.txid,
        blockHeight: tx.status.block_height,
        timestamp: tx.status.block_time
          ? new Date(tx.status.block_time * 1000)
          : undefined
      };
    } catch (error) {
      console.error('Error checking Bitcoin payment:', error);
      throw new Error('Failed to check payment status');
    }
  }

  /**
   * Monitor payment for order (polling)
   * Call this periodically to check for payment
   */
  async monitorOrderPayment(orderId: string): Promise<BitcoinPaymentStatus | null> {
    // Get payment address for order
    const paymentAddress = await this.getPaymentAddress(orderId);
    
    if (!paymentAddress) {
      return null;
    }
    
    // Check if expired
    if (new Date() > paymentAddress.expiresAt) {
      return {
        address: paymentAddress.address,
        confirmed: false,
        confirmations: 0,
        amountReceived: 0
      };
    }
    
    // Check payment status
    const status = await this.checkPaymentStatus(paymentAddress.address);
    
    // If confirmed, update database
    if (status.confirmed) {
      await this.markPaymentConfirmed(orderId, status);
    }
    
    return status;
  }

  // ============================================================================
  // VENDOR PAYOUT
  // ============================================================================

  /**
   * Create vendor payout (called when order is delivered)
   */
  async createVendorPayout(
    orderId: string,
    vendorDid: string,
    payoutMethod: 'btc' | 'fiat',
    destination: string // BTC address or bank account
  ): Promise<BitcoinVendorPayout> {
    // Get payment info for order
    const paymentAddress = await this.getPaymentAddress(orderId);
    
    if (!paymentAddress) {
      throw new Error('Payment address not found for order');
    }
    
    // Verify payment was received
    const status = await this.checkPaymentStatus(paymentAddress.address);
    
    if (!status.confirmed) {
      throw new Error('Payment not confirmed. Cannot create payout.');
    }
    
    // Get current BTC price for fiat conversion
    const btcPrice = await this.getBitcoinPrice();
    
    // Calculate platform fee (0.5%)
    const feeAmount = Math.round(status.amountReceived * 0.005);
    const vendorAmount = status.amountReceived - feeAmount;
    const usdEquivalent = (vendorAmount / 100_000_000) * btcPrice;
    
    const payout: BitcoinVendorPayout = {
      orderId,
      vendorDid,
      payoutMethod,
      btcAddress: payoutMethod === 'btc' ? destination : undefined,
      bankAccount: payoutMethod === 'fiat' ? destination : undefined,
      amount: vendorAmount,
      usdEquivalent,
      status: 'pending',
      createdAt: new Date()
    };
    
    // Store payout request
    await this.storeVendorPayout(payout);
    
    return payout;
  }

  /**
   * Execute vendor payout (BTC transfer)
   */
  async executeVendorPayoutBTC(
    orderId: string,
    toAddress: string
  ): Promise<string> {
    if (!this.masterNode) {
      throw new Error('Wallet not initialized');
    }
    
    // Get payout info
    const payout = await this.getVendorPayout(orderId);
    
    if (!payout) {
      throw new Error('Payout not found');
    }
    
    if (payout.payoutMethod !== 'btc') {
      throw new Error('Payout method is not BTC');
    }
    
    // Get payment address (escrow source)
    const paymentAddress = await this.getPaymentAddress(orderId);
    
    if (!paymentAddress) {
      throw new Error('Payment address not found');
    }
    
    // Derive private key for escrow address
    const child = this.masterNode.derivePath(paymentAddress.derivationPath);
    
    if (!child.privateKey) {
      throw new Error('Failed to derive private key');
    }
    
    // Get UTXOs for escrow address
    const utxos = await this.getUTXOs(paymentAddress.address);
    
    if (utxos.length === 0) {
      throw new Error('No UTXOs found for escrow address');
    }
    
    // Create transaction
    const psbt = new bitcoin.Psbt({ network: this.network });
    
    // Add inputs
    let totalInput = 0;
    for (const utxo of utxos) {
      psbt.addInput({
        hash: utxo.txid,
        index: utxo.vout,
        witnessUtxo: {
          script: bitcoin.payments.p2wpkh({
            pubkey: child.publicKey!,
            network: this.network
          }).output!,
          value: utxo.value
        }
      });
      totalInput += utxo.value;
    }
    
    // Calculate fee (estimate: 10 sat/vByte for ~200 vByte tx)
    const estimatedFee = 2000; // 2000 satoshis
    const outputAmount = totalInput - estimatedFee;
    
    if (outputAmount < payout.amount) {
      throw new Error('Insufficient funds after fee deduction');
    }
    
    // Add output (vendor's address)
    psbt.addOutput({
      address: toAddress,
      value: payout.amount
    });
    
    // Add change output if needed
    const change = outputAmount - payout.amount;
    if (change > 1000) { // Only if change > dust limit
      psbt.addOutput({
        address: paymentAddress.address, // Send change back to escrow
        value: change
      });
    }
    
    // Sign all inputs
    for (let i = 0; i < utxos.length; i++) {
      psbt.signInput(i, child);
    }
    
    // Finalize and extract transaction
    psbt.finalizeAllInputs();
    const tx = psbt.extractTransaction();
    const txHex = tx.toHex();
    
    // Broadcast transaction
    const txid = await this.broadcastTransaction(txHex);
    
    // Update payout status
    await this.updatePayoutStatus(orderId, 'completed', txid);
    
    return txid;
  }

  // ============================================================================
  // PRICE FEED
  // ============================================================================

  /**
   * Get current BTC/USD price from CoinGecko
   */
  private async getBitcoinPrice(): Promise<number> {
    try {
      const response = await axios.get(
        'https://api.coingecko.com/api/v3/simple/price',
        {
          params: {
            ids: 'bitcoin',
            vs_currencies: 'usd'
          }
        }
      );
      
      return response.data.bitcoin.usd;
    } catch (error) {
      console.error('Error fetching Bitcoin price:', error);
      // Fallback price if API fails
      return 50000; // Default $50k USD
    }
  }

  // ============================================================================
  // BLOCKCHAIN UTILITIES
  // ============================================================================

  /**
   * Get UTXOs for address
   */
  private async getUTXOs(address: string): Promise<Array<{
    txid: string;
    vout: number;
    value: number;
  }>> {
    const apiUrl = this.network === bitcoin.networks.testnet
      ? this.BLOCKSTREAM_TESTNET_API
      : this.BLOCKSTREAM_API;
    
    const response = await axios.get(`${apiUrl}/address/${address}/utxo`);
    return response.data.map((utxo: any) => ({
      txid: utxo.txid,
      vout: utxo.vout,
      value: utxo.value
    }));
  }

  /**
   * Broadcast transaction to network
   */
  private async broadcastTransaction(txHex: string): Promise<string> {
    const apiUrl = this.network === bitcoin.networks.testnet
      ? this.BLOCKSTREAM_TESTNET_API
      : this.BLOCKSTREAM_API;
    
    const response = await axios.post(`${apiUrl}/tx`, txHex);
    return response.data; // Returns txid
  }

  // ============================================================================
  // DATABASE OPERATIONS
  // ============================================================================

  /**
   * Get next derivation index
   */
  private async getNextDerivationIndex(): Promise<number> {
    const { data } = await this.dbClient
      .from('bitcoin_payment_addresses')
      .select('derivation_index')
      .order('derivation_index', { ascending: false })
      .limit(1)
      .single();
    
    return data ? data.derivation_index + 1 : 0;
  }

  /**
   * Store payment address in database
   */
  private async storePaymentAddress(address: BitcoinPaymentAddress): Promise<void> {
    await this.dbClient
      .from('bitcoin_payment_addresses')
      .insert({
        order_id: address.orderId,
        address: address.address,
        derivation_path: address.derivationPath,
        derivation_index: address.derivationIndex,
        expected_amount: address.expectedAmount,
        usd_amount: address.usdAmount,
        expires_at: address.expiresAt,
        created_at: address.createdAt
      });
  }

  /**
   * Get payment address for order
   */
  private async getPaymentAddress(orderId: string): Promise<BitcoinPaymentAddress | null> {
    const { data } = await this.dbClient
      .from('bitcoin_payment_addresses')
      .select('*')
      .eq('order_id', orderId)
      .single();
    
    if (!data) return null;
    
    return {
      orderId: data.order_id,
      address: data.address,
      derivationPath: data.derivation_path,
      derivationIndex: data.derivation_index,
      expectedAmount: data.expected_amount,
      usdAmount: data.usd_amount,
      expiresAt: new Date(data.expires_at),
      createdAt: new Date(data.created_at)
    };
  }

  /**
   * Mark payment as confirmed
   */
  private async markPaymentConfirmed(
    orderId: string,
    status: BitcoinPaymentStatus
  ): Promise<void> {
    await this.dbClient
      .from('bitcoin_payment_addresses')
      .update({
        confirmed: true,
        confirmations: status.confirmations,
        amount_received: status.amountReceived,
        txid: status.txid,
        block_height: status.blockHeight,
        confirmed_at: new Date()
      })
      .eq('order_id', orderId);
  }

  /**
   * Store vendor payout
   */
  private async storeVendorPayout(payout: BitcoinVendorPayout): Promise<void> {
    await this.dbClient
      .from('bitcoin_vendor_payouts')
      .insert({
        order_id: payout.orderId,
        vendor_did: payout.vendorDid,
        payout_method: payout.payoutMethod,
        btc_address: payout.btcAddress,
        bank_account: payout.bankAccount,
        amount: payout.amount,
        usd_equivalent: payout.usdEquivalent,
        status: payout.status,
        created_at: payout.createdAt
      });
  }

  /**
   * Get vendor payout
   */
  private async getVendorPayout(orderId: string): Promise<BitcoinVendorPayout | null> {
    const { data } = await this.dbClient
      .from('bitcoin_vendor_payouts')
      .select('*')
      .eq('order_id', orderId)
      .single();
    
    if (!data) return null;
    
    return {
      orderId: data.order_id,
      vendorDid: data.vendor_did,
      payoutMethod: data.payout_method,
      btcAddress: data.btc_address,
      bankAccount: data.bank_account,
      amount: data.amount,
      usdEquivalent: data.usd_equivalent,
      status: data.status,
      txid: data.txid,
      createdAt: new Date(data.created_at),
      completedAt: data.completed_at ? new Date(data.completed_at) : undefined
    };
  }

  /**
   * Update payout status
   */
  private async updatePayoutStatus(
    orderId: string,
    status: 'pending' | 'processing' | 'completed' | 'failed',
    txid?: string
  ): Promise<void> {
    const update: any = { status };
    
    if (txid) {
      update.txid = txid;
    }
    
    if (status === 'completed') {
      update.completed_at = new Date();
    }
    
    await this.dbClient
      .from('bitcoin_vendor_payouts')
      .update(update)
      .eq('order_id', orderId);
  }
}

// ============================================================================
// USAGE EXAMPLE
// ============================================================================

/**
 * Example usage:
 * 
 * // 1. Initialize service (one-time setup)
 * const mnemonic = BitcoinService.generateMnemonic();
 * // Store mnemonic securely (environment variable, vault, etc.)
 * 
 * const bitcoinService = new BitcoinService(
 *   supabaseClient,
 *   process.env.BITCOIN_MNEMONIC,
 *   false // mainnet
 * );
 * 
 * // 2. Buyer checkout - Generate escrow address
 * const paymentAddress = await bitcoinService.generateEscrowAddress(
 *   orderId,
 *   { amount: 150, currency: 'USD' }
 * );
 * // Show paymentAddress.address to buyer
 * 
 * // 3. Monitor payment (polling every 30 seconds)
 * const status = await bitcoinService.monitorOrderPayment(orderId);
 * if (status?.confirmed) {
 *   // Mark order as paid
 *   await orderService.markAsPaid(orderId, status.txid);
 * }
 * 
 * // 4. Delivery confirmed - Create vendor payout
 * const payout = await bitcoinService.createVendorPayout(
 *   orderId,
 *   vendorDid,
 *   'btc', // or 'fiat'
 *   vendorBtcAddress
 * );
 * 
 * // 5. Execute payout
 * if (payout.payoutMethod === 'btc') {
 *   const txid = await bitcoinService.executeVendorPayoutBTC(
 *     orderId,
 *     vendorBtcAddress
 *   );
 *   console.log('Payout sent:', txid);
 * }
 */
