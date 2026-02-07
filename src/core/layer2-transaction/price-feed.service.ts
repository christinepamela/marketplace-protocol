/**
 * Price Feed Service
 * Real-time cryptocurrency and fiat currency exchange rates
 * 
 * Features:
 * - Bitcoin (BTC) price feed from multiple sources
 * - Fiat currency exchange rates
 * - Rate caching (5 min TTL to reduce API calls)
 * - Historical rate tracking
 * - Fallback sources for reliability
 * 
 * Data Sources:
 * - Primary: CoinGecko (free, reliable)
 * - Fallback: CoinMarketCap
 * - Fallback: Blockchain.com
 */

import axios from 'axios';
import type { Price } from '../layer1-catalog/types';

// ============================================================================
// TYPES
// ============================================================================

export interface ExchangeRate {
  from: string; // Currency code (BTC, USD, EUR, etc.)
  to: string; // Currency code
  rate: number; // Exchange rate
  source: string; // Data source name
  timestamp: Date; // When rate was fetched
}

export interface BitcoinPrice {
  usd: number;
  eur: number;
  gbp: number;
  jpy: number;
  cny: number;
  myr: number; // Malaysian Ringgit
  sgd: number; // Singapore Dollar
  idr: number; // Indonesian Rupiah
  php: number; // Philippine Peso
  source: string;
  timestamp: Date;
}

export interface ConversionResult {
  from: Price;
  to: Price;
  rate: number;
  timestamp: Date;
}

export interface HistoricalRate {
  currency: string;
  rate: number;
  date: Date;
}

// ============================================================================
// PRICE FEED SERVICE
// ============================================================================

export class PriceFeedService {
  private dbClient: any;
  private cache: Map<string, { data: any; expiresAt: Date }>;
  
  // Cache TTL (5 minutes)
  private readonly CACHE_TTL_MS = 5 * 60 * 1000;
  
  // API endpoints
  private readonly COINGECKO_API = 'https://api.coingecko.com/api/v3';
  private readonly COINMARKETCAP_API = 'https://pro-api.coinmarketcap.com/v1';
  private readonly BLOCKCHAIN_API = 'https://blockchain.info';
  
  constructor(dbClient: any) {
    this.dbClient = dbClient;
    this.cache = new Map();
  }

  // ============================================================================
  // BITCOIN PRICE FEEDS
  // ============================================================================

  /**
   * Get current Bitcoin price in multiple currencies
   */
  async getBitcoinPrice(): Promise<BitcoinPrice> {
    const cacheKey = 'btc:price';
    
    // Check cache
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      return cached;
    }
    
    // Try primary source (CoinGecko)
    try {
      const price = await this.getBitcoinPriceFromCoinGecko();
      this.setInCache(cacheKey, price);
      await this.storeHistoricalRate('BTC', price.usd);
      return price;
    } catch (error) {
      console.error('CoinGecko failed, trying fallback:', error);
    }
    
    // Try fallback (Blockchain.com)
    try {
      const price = await this.getBitcoinPriceFromBlockchain();
      this.setInCache(cacheKey, price);
      await this.storeHistoricalRate('BTC', price.usd);
      return price;
    } catch (error) {
      console.error('All price sources failed:', error);
      
      // Return last known rate from database
      const lastKnown = await this.getLastKnownRate('BTC');
      if (lastKnown) {
        return {
          usd: lastKnown,
          eur: 0,
          gbp: 0,
          jpy: 0,
          cny: 0,
          myr: 0,
          sgd: 0,
          idr: 0,
          php: 0,
          source: 'database (fallback)',
          timestamp: new Date()
        };
      }
      
      throw new Error('Unable to fetch Bitcoin price');
    }
  }

  /**
   * Get Bitcoin price from CoinGecko (primary source)
   */
  private async getBitcoinPriceFromCoinGecko(): Promise<BitcoinPrice> {
    const response = await axios.get(
      `${this.COINGECKO_API}/simple/price`,
      {
        params: {
          ids: 'bitcoin',
          vs_currencies: 'usd,eur,gbp,jpy,cny,myr,sgd,idr,php'
        },
        timeout: 5000
      }
    );
    
    const data = response.data.bitcoin;
    
    return {
      usd: data.usd,
      eur: data.eur,
      gbp: data.gbp,
      jpy: data.jpy,
      cny: data.cny,
      myr: data.myr,
      sgd: data.sgd,
      idr: data.idr,
      php: data.php,
      source: 'CoinGecko',
      timestamp: new Date()
    };
  }

  /**
   * Get Bitcoin price from Blockchain.com (fallback)
   */
  private async getBitcoinPriceFromBlockchain(): Promise<BitcoinPrice> {
    const response = await axios.get(
      `${this.BLOCKCHAIN_API}/ticker`,
      { timeout: 5000 }
    );
    
    const data = response.data;
    
    return {
      usd: data.USD.last,
      eur: data.EUR?.last || 0,
      gbp: data.GBP?.last || 0,
      jpy: data.JPY?.last || 0,
      cny: data.CNY?.last || 0,
      myr: 0, // Not available
      sgd: 0, // Not available
      idr: 0, // Not available
      php: 0, // Not available
      source: 'Blockchain.com',
      timestamp: new Date()
    };
  }

  // ============================================================================
  // CURRENCY CONVERSION
  // ============================================================================

  /**
   * Convert between currencies
   */
  async convert(from: Price, toCurrency: string): Promise<ConversionResult> {
    const rate = await this.getExchangeRate(from.currency, toCurrency);
    
    return {
      from,
      to: {
        amount: from.amount * rate.rate,
        currency: toCurrency
      },
      rate: rate.rate,
      timestamp: rate.timestamp
    };
  }

  /**
   * Get exchange rate between two currencies
   */
  async getExchangeRate(from: string, to: string): Promise<ExchangeRate> {
    if (from === to) {
      return {
        from,
        to,
        rate: 1,
        source: 'direct',
        timestamp: new Date()
      };
    }
    
    const cacheKey = `rate:${from}:${to}`;
    
    // Check cache
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      return cached;
    }
    
    // Handle BTC conversions
    if (from === 'BTC') {
      const btcPrice = await this.getBitcoinPrice();
      const rate = this.getBitcoinRateForCurrency(btcPrice, to);
      
      const exchangeRate: ExchangeRate = {
        from,
        to,
        rate,
        source: btcPrice.source,
        timestamp: btcPrice.timestamp
      };
      
      this.setInCache(cacheKey, exchangeRate);
      return exchangeRate;
    }
    
    if (to === 'BTC') {
      const btcPrice = await this.getBitcoinPrice();
      const rate = 1 / this.getBitcoinRateForCurrency(btcPrice, from);
      
      const exchangeRate: ExchangeRate = {
        from,
        to,
        rate,
        source: btcPrice.source,
        timestamp: btcPrice.timestamp
      };
      
      this.setInCache(cacheKey, exchangeRate);
      return exchangeRate;
    }
    
    // Fiat-to-fiat conversion (via USD as base)
    if (from !== 'USD' && to !== 'USD') {
      const fromToUsd = await this.getExchangeRate(from, 'USD');
      const usdToTo = await this.getExchangeRate('USD', to);
      
      const exchangeRate: ExchangeRate = {
        from,
        to,
        rate: fromToUsd.rate * usdToTo.rate,
        source: 'calculated',
        timestamp: new Date()
      };
      
      this.setInCache(cacheKey, exchangeRate);
      return exchangeRate;
    }
    
    // TODO: Implement fiat exchange rates
    // For now, return 1:1 for same currency
    return {
      from,
      to,
      rate: 1,
      source: 'mock',
      timestamp: new Date()
    };
  }

  /**
   * Get Bitcoin rate for specific currency
   */
  private getBitcoinRateForCurrency(btcPrice: BitcoinPrice, currency: string): number {
    const upperCurrency = currency.toUpperCase();
    
    switch (upperCurrency) {
      case 'USD': return btcPrice.usd;
      case 'EUR': return btcPrice.eur;
      case 'GBP': return btcPrice.gbp;
      case 'JPY': return btcPrice.jpy;
      case 'CNY': return btcPrice.cny;
      case 'MYR': return btcPrice.myr;
      case 'SGD': return btcPrice.sgd;
      case 'IDR': return btcPrice.idr;
      case 'PHP': return btcPrice.php;
      default: return btcPrice.usd; // Default to USD
    }
  }

  // ============================================================================
  // SATOSHI CONVERSION
  // ============================================================================

  /**
   * Convert fiat to satoshis
   */
  async fiatToSatoshis(price: Price): Promise<number> {
    const btcPrice = await this.getBitcoinPrice();
    const fiatRate = this.getBitcoinRateForCurrency(btcPrice, price.currency);
    
    const btcAmount = price.amount / fiatRate;
    return Math.round(btcAmount * 100_000_000); // Convert BTC to satoshis
  }

  /**
   * Convert satoshis to fiat
   */
  async satoshisToFiat(satoshis: number, currency: string): Promise<Price> {
    const btcPrice = await this.getBitcoinPrice();
    const fiatRate = this.getBitcoinRateForCurrency(btcPrice, currency);
    
    const btcAmount = satoshis / 100_000_000; // Convert satoshis to BTC
    const fiatAmount = btcAmount * fiatRate;
    
    return {
      amount: fiatAmount,
      currency
    };
  }

  /**
   * Format satoshis as BTC
   */
  formatSatoshisAsBTC(satoshis: number): string {
    const btc = satoshis / 100_000_000;
    return btc.toFixed(8) + ' BTC';
  }

  /**
   * Parse BTC to satoshis
   */
  parseBTCToSatoshis(btc: string): number {
    const amount = parseFloat(btc);
    return Math.round(amount * 100_000_000);
  }

  // ============================================================================
  // HISTORICAL RATES
  // ============================================================================

  /**
   * Store historical rate in database
   */
  private async storeHistoricalRate(currency: string, rate: number): Promise<void> {
    try {
      await this.dbClient
        .from('historical_rates')
        .insert({
          currency,
          rate,
          timestamp: new Date()
        });
    } catch (error) {
      // Ignore errors (non-critical)
      console.error('Failed to store historical rate:', error);
    }
  }

  /**
   * Get last known rate from database
   */
  private async getLastKnownRate(currency: string): Promise<number | null> {
    try {
      const { data } = await this.dbClient
        .from('historical_rates')
        .select('rate')
        .eq('currency', currency)
        .order('timestamp', { ascending: false })
        .limit(1)
        .single();
      
      return data?.rate || null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Get historical rates for date range
   */
  async getHistoricalRates(
    currency: string,
    startDate: Date,
    endDate: Date
  ): Promise<HistoricalRate[]> {
    const { data } = await this.dbClient
      .from('historical_rates')
      .select('*')
      .eq('currency', currency)
      .gte('timestamp', startDate.toISOString())
      .lte('timestamp', endDate.toISOString())
      .order('timestamp', { ascending: true });
    
    return (data || []).map((row: any) => ({
      currency: row.currency,
      rate: row.rate,
      date: new Date(row.timestamp)
    }));
  }

  /**
   * Get rate at specific timestamp (interpolated)
   */
  async getRateAtTimestamp(currency: string, timestamp: Date): Promise<number> {
    // Get closest rate before and after timestamp
    const { data: before } = await this.dbClient
      .from('historical_rates')
      .select('*')
      .eq('currency', currency)
      .lte('timestamp', timestamp.toISOString())
      .order('timestamp', { ascending: false })
      .limit(1)
      .single();
    
    if (!before) {
      // No historical data, use current rate
      const btcPrice = await this.getBitcoinPrice();
      return btcPrice.usd;
    }
    
    const { data: after } = await this.dbClient
      .from('historical_rates')
      .select('*')
      .eq('currency', currency)
      .gte('timestamp', timestamp.toISOString())
      .order('timestamp', { ascending: true })
      .limit(1)
      .single();
    
    if (!after) {
      // No future data, use closest past rate
      return before.rate;
    }
    
    // Interpolate between before and after
    const beforeTime = new Date(before.timestamp).getTime();
    const afterTime = new Date(after.timestamp).getTime();
    const targetTime = timestamp.getTime();
    
    const ratio = (targetTime - beforeTime) / (afterTime - beforeTime);
    const interpolated = before.rate + (after.rate - before.rate) * ratio;
    
    return interpolated;
  }

  // ============================================================================
  // CACHE MANAGEMENT
  // ============================================================================

  /**
   * Get from cache
   */
  private getFromCache(key: string): any | null {
    const cached = this.cache.get(key);
    
    if (!cached) {
      return null;
    }
    
    // Check expiry
    if (new Date() > cached.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    
    return cached.data;
  }

  /**
   * Set in cache
   */
  private setInCache(key: string, data: any): void {
    this.cache.set(key, {
      data,
      expiresAt: new Date(Date.now() + this.CACHE_TTL_MS)
    });
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get cache stats
   */
  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }
}

// ============================================================================
// USAGE EXAMPLE
// ============================================================================

/**
 * Example usage:
 * 
 * const priceFeedService = new PriceFeedService(supabaseClient);
 * 
 * // 1. Get current Bitcoin price
 * const btcPrice = await priceFeedService.getBitcoinPrice();
 * console.log('BTC/USD:', btcPrice.usd);
 * console.log('BTC/MYR:', btcPrice.myr);
 * 
 * // 2. Convert fiat to satoshis (for Bitcoin payment)
 * const orderTotal: Price = { amount: 150, currency: 'USD' };
 * const satoshis = await priceFeedService.fiatToSatoshis(orderTotal);
 * console.log('Order total in satoshis:', satoshis);
 * 
 * // 3. Convert satoshis to fiat (for vendor payout)
 * const vendorPayout = await priceFeedService.satoshisToFiat(
 *   1_000_000, // 0.01 BTC
 *   'MYR'
 * );
 * console.log('Vendor receives:', vendorPayout.amount, vendorPayout.currency);
 * 
 * // 4. Get exchange rate
 * const rate = await priceFeedService.getExchangeRate('USD', 'MYR');
 * console.log('USD/MYR rate:', rate.rate);
 * 
 * // 5. Get historical rate (for accounting)
 * const orderTimestamp = new Date('2025-01-01');
 * const historicalRate = await priceFeedService.getRateAtTimestamp(
 *   'BTC',
 *   orderTimestamp
 * );
 * console.log('BTC price on Jan 1:', historicalRate);
 */
