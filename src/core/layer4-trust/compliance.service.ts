// Layer 4: Trust & Compliance - Compliance Service
// Path: src/core/layer4-trust/compliance.service.ts

import { SupabaseClient } from '@supabase/supabase-js';
import {
  SanctionedEntity,
  SanctionCheck,
  CheckSanctionsInput,
  SanctionCheckResult,
  TaxRate,
  GetTaxRatesInput,
  TaxCalculation,
  ComplianceStats,
} from './types';

export class ComplianceService {
  constructor(private supabase: SupabaseClient) {}

  // ============================================================================
  // SANCTIONS SCREENING
  // ============================================================================

  /**
   * Check identity against sanctions lists
   * Called during KYC onboarding
   */
  async checkSanctions(input: CheckSanctionsInput): Promise<SanctionCheckResult> {
    // Get all active sanctioned entities
    const { data: sanctionedEntities, error } = await this.supabase
      .from('sanctions_list')
      .select('*')
      .eq('active', true);

    if (error) {
      throw new Error(`Failed to query sanctions list: ${error.message}`);
    }

    // Perform matching
    const matches: { entity: SanctionedEntity; confidence: number }[] = [];

    for (const entity of sanctionedEntities || []) {
      const confidence = this.calculateMatchConfidence(input, entity);

      if (confidence > 0.7) {
        // High confidence match
        matches.push({ entity, confidence });
      }
    }

    // Determine action based on matches
    let action: 'blocked' | 'flagged' | 'passed' | 'pending';

    if (matches.length === 0) {
      action = 'passed';
    } else if (matches.some(m => m.confidence >= 0.95)) {
      action = 'blocked'; // High confidence match = block
    } else {
      action = 'flagged'; // Moderate match = flag for review
    }

    // Log check
    const { data: check, error: checkError } = await this.supabase
      .from('sanctions_checks')
      .insert({
        identity_did: input.identity_did,
        check_type: input.check_type,
        match_found: matches.length > 0,
        matched_entity_id: matches[0]?.entity.id,
        confidence_score: matches[0]?.confidence || 0,
        action,
      })
      .select()
      .single();

    if (checkError) {
      throw new Error(`Failed to log sanctions check: ${checkError.message}`);
    }

    return {
      match_found: matches.length > 0,
      matches: matches.map(m => m.entity),
      confidence_scores: matches.map(m => m.confidence),
      action,
      check_id: check.id,
    };
  }

  /**
   * Add sanctioned entity to list
   * Called by governance or automated feed
   */
  async addSanctionedEntity(entity: Omit<SanctionedEntity, 'id' | 'last_updated'>): Promise<SanctionedEntity> {
    const { data, error } = await this.supabase
      .from('sanctions_list')
      .insert(entity)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to add sanctioned entity: ${error.message}`);
    }

    return data;
  }

  /**
   * Update sanctions list from external feed
   * Run as cron job or triggered by governance
   */
  async updateSanctionsList(entities: Omit<SanctionedEntity, 'id' | 'last_updated'>[]): Promise<number> {
    let addedCount = 0;

    for (const entity of entities) {
      try {
        // Check if entity already exists
        const { data: existing } = await this.supabase
          .from('sanctions_list')
          .select('*')
          .eq('entity_name', entity.entity_name)
          .eq('list_source', entity.list_source)
          .single();

        if (!existing) {
          await this.addSanctionedEntity(entity);
          addedCount++;
        }
      } catch (error) {
        console.error(`Failed to add entity ${entity.entity_name}:`, error);
      }
    }

    return addedCount;
  }

  /**
   * Get sanctions check history for an identity
   */
  async getSanctionsHistory(identityDid: string): Promise<SanctionCheck[]> {
    const { data, error } = await this.supabase
      .from('sanctions_checks')
      .select('*')
      .eq('identity_did', identityDid)
      .order('checked_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to get sanctions history: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Get compliance statistics
   */
  async getComplianceStats(): Promise<ComplianceStats> {
    const { data: checks } = await this.supabase
      .from('sanctions_checks')
      .select('*');

    const { data: list } = await this.supabase
      .from('sanctions_list')
      .select('last_updated')
      .eq('active', true)
      .order('last_updated', { ascending: false })
      .limit(1)
      .single();

    const total = checks?.length || 0;
    const matches = checks?.filter(c => c.match_found).length || 0;
    const blocked = checks?.filter(c => c.action === 'blocked').length || 0;
    const flagged = checks?.filter(c => c.action === 'flagged').length || 0;

    return {
      total_sanctions_checks: total,
      matches_found: matches,
      blocked_identities: blocked,
      flagged_for_review: flagged,
      last_list_update: list?.last_updated || new Date(),
    };
  }

  /**
   * Private: Calculate match confidence
   */
  private calculateMatchConfidence(
    input: CheckSanctionsInput,
    entity: SanctionedEntity
  ): number {
    let confidence = 0;
    let checks = 0;

    // Name matching (primary)
    const inputName = input.full_name.toLowerCase();
    const entityName = entity.entity_name.toLowerCase();

    if (inputName === entityName) {
      confidence += 0.8;
    } else if (inputName.includes(entityName) || entityName.includes(inputName)) {
      confidence += 0.5;
    }
    checks++;

    // Check aliases
    if (entity.aliases) {
      for (const alias of entity.aliases) {
        if (inputName === alias.toLowerCase()) {
          confidence += 0.6;
          break;
        }
      }
    }

    // Birth date matching
    if (input.birth_date && entity.birth_date) {
      if (input.birth_date.toDateString() === new Date(entity.birth_date).toDateString()) {
        confidence += 0.15;
      }
      checks++;
    }

    // National ID matching
    if (input.national_id && entity.national_ids) {
      if (entity.national_ids.includes(input.national_id)) {
        confidence += 0.95; // Strong match
      }
      checks++;
    }

    // Passport matching
    if (input.passport_number && entity.passport_numbers) {
      if (entity.passport_numbers.includes(input.passport_number)) {
        confidence += 0.95; // Strong match
      }
      checks++;
    }

    // Address matching
    if (input.addresses && entity.addresses) {
      for (const inputAddr of input.addresses) {
        for (const entityAddr of entity.addresses) {
          if (inputAddr.toLowerCase().includes(entityAddr.toLowerCase())) {
            confidence += 0.1;
            break;
          }
        }
      }
      checks++;
    }

    // Normalize by number of checks performed
    return Math.min(1.0, confidence);
  }

  // ============================================================================
  // TAX ADVISORY
  // ============================================================================

  /**
   * Get applicable tax rates
   */
  async getTaxRates(input: GetTaxRatesInput): Promise<TaxRate[]> {
    let query = this.supabase
      .from('tax_rates')
      .select('*')
      .eq('country_code', input.country_code)
      .eq('active', true);

    if (input.region) {
      query = query.eq('region', input.region);
    }

    // Check transaction amount threshold
    if (input.transaction_amount) {
      query = query.or(`threshold_amount.is.null,threshold_amount.lte.${input.transaction_amount}`);
    }

    // Check product category
    if (input.product_category) {
      query = query.contains('product_categories', [input.product_category]);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to get tax rates: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Calculate tax for transaction
   */
  async calculateTax(
    countryCode: string,
    subtotal: number,
    productCategory?: string
  ): Promise<TaxCalculation> {
    const rates = await this.getTaxRates({
      country_code: countryCode,
      product_category: productCategory,
      transaction_amount: subtotal,
    });

    let totalTax = 0;
    const breakdown: TaxCalculation['breakdown'] = [];

    for (const rate of rates) {
      const taxAmount = (subtotal * rate.rate) / 100;
      totalTax += taxAmount;

      breakdown.push({
        tax_type: rate.tax_type,
        rate: rate.rate,
        amount: taxAmount,
      });
    }

    return {
      subtotal,
      tax_amount: totalTax,
      total: subtotal + totalTax,
      applicable_rates: rates,
      breakdown,
    };
  }

  /**
   * Add or update tax rate
   * Called by governance
   */
  async upsertTaxRate(rate: Omit<TaxRate, 'id' | 'last_updated'>): Promise<TaxRate> {
    // Check if rate exists
    const { data: existing } = await this.supabase
      .from('tax_rates')
      .select('*')
      .eq('country_code', rate.country_code)
      .eq('tax_type', rate.tax_type)
      .eq('active', true)
      .maybeSingle();

    if (existing) {
      // Update existing
      const { data, error } = await this.supabase
        .from('tax_rates')
        .update({
          ...rate,
          last_updated: new Date().toISOString(),
        })
        .eq('id', existing.id)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to update tax rate: ${error.message}`);
      }

      return data;
    } else {
      // Insert new
      const { data, error } = await this.supabase
        .from('tax_rates')
        .insert(rate)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to insert tax rate: ${error.message}`);
      }

      return data;
    }
  }

  /**
   * Get all active tax rates
   */
  async getAllActiveTaxRates(): Promise<TaxRate[]> {
    const { data, error } = await this.supabase
      .from('tax_rates')
      .select('*')
      .eq('active', true)
      .order('country_code', { ascending: true });

    if (error) {
      throw new Error(`Failed to get tax rates: ${error.message}`);
    }

    return data || [];
  }
}