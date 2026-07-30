/**
 * Trust & Compliance Routes (Layer 4)
 * Path: src/api/routes/trust.routes.ts
 *
 * D15a (S37): HTTP layer exposing ComplianceService — sanctions screening,
 * sanctions list management, tax rates, tax calculation.
 *
 * D15b: Sanctions list seeded with OFAC/UN/EU starter data (see session notes).
 * D15c: checkSanctions() called from identity.routes.ts on KYC registration.
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';
import { config } from '../core/config';
import { ComplianceService } from '../../core/layer4-trust/compliance.service';
import { validateBody, validateParams } from '../middleware/validation.middleware';
import { authenticate } from '../middleware/auth.middleware';
import { asyncHandler } from '../middleware/error.middleware';

const router = Router();

const supabase = createClient(
  config.supabaseUrl,
  config.supabaseServiceKey
);

const complianceService = new ComplianceService(supabase);

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const sanctionsCheckSchema = z.object({
  identity_did: z.string(),
  full_name: z.string().min(1),
  birth_date: z.string().optional().transform(v => v ? new Date(v) : undefined),
  national_id: z.string().optional(),
  passport_number: z.string().optional(),
  addresses: z.array(z.string()).optional(),
  check_type: z.enum(['kyc_onboarding', 'manual_review', 'periodic']),
});

const didParamSchema = z.object({
  did: z.string(),
});

const addEntitySchema = z.object({
  entity_name: z.string().min(1),
  entity_type: z.string().optional(),
  aliases: z.array(z.string()).optional(),
  passport_numbers: z.array(z.string()).optional(),
  national_ids: z.array(z.string()).optional(),
  addresses: z.array(z.string()).optional(),
  birth_date: z.string().optional().transform(v => v ? new Date(v) : undefined),
  list_source: z.enum(['OFAC', 'UN', 'EU', 'LOCAL']),
  program: z.string().optional(),
  added_date: z.string().transform(v => new Date(v)),
  active: z.boolean().default(true),
  notes: z.string().optional(),
});

const bulkUpdateSchema = z.object({
  entities: z.array(addEntitySchema),
});

const taxRateSchema = z.object({
  country_code: z.string().length(2),
  region: z.string().optional(),
  tax_type: z.enum(['VAT', 'GST', 'sales_tax', 'excise', 'customs']),
  rate: z.number().min(0).max(100),
  product_categories: z.array(z.string()).optional(),
  threshold_amount: z.number().optional(),
  effective_from: z.string().transform(v => new Date(v)),
  effective_until: z.string().optional().transform(v => v ? new Date(v) : undefined),
  active: z.boolean().default(true),
  description: z.string().optional(),
  source_url: z.string().optional(),
});

const taxCalculationSchema = z.object({
  country_code: z.string().length(2),
  subtotal: z.number().positive(),
  product_category: z.string().optional(),
});

const taxRatesQuerySchema = z.object({
  country_code: z.string().length(2),
  region: z.string().optional(),
  product_category: z.string().optional(),
  transaction_amount: z.string().optional().transform(v => v ? parseFloat(v) : undefined),
});

// ============================================================================
// SANCTIONS ENDPOINTS
// ============================================================================

/**
 * POST /api/v1/trust/sanctions-check
 * Run a sanctions check against an identity
 * Used during KYC onboarding and manual reviews
 * Requires authentication
 */
router.post(
  '/sanctions-check',
  authenticate(),
  validateBody(sanctionsCheckSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const result = await complianceService.checkSanctions(req.body);
    res.json({ success: true, data: result });
  })
);

/**
 * GET /api/v1/trust/sanctions-history/:did
 * Get sanctions check history for an identity
 * Requires authentication
 */
router.get(
  '/sanctions-history/:did',
  authenticate(),
  validateParams(didParamSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const history = await complianceService.getSanctionsHistory(req.params.did);
    res.json({ success: true, data: history });
  })
);

/**
 * POST /api/v1/trust/sanctions-list
 * Add a single sanctioned entity to the list
 * Requires authentication (governance/admin action)
 */
router.post(
  '/sanctions-list',
  authenticate(),
  validateBody(addEntitySchema),
  asyncHandler(async (req: Request, res: Response) => {
    const entity = await complianceService.addSanctionedEntity(req.body);
    res.status(201).json({ success: true, data: entity });
  })
);

/**
 * POST /api/v1/trust/sanctions-list/bulk-update
 * Bulk update sanctions list from external feed (OFAC/UN/EU)
 * Requires authentication (governance/admin action)
 */
router.post(
  '/sanctions-list/bulk-update',
  authenticate(),
  validateBody(bulkUpdateSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const added = await complianceService.updateSanctionsList(req.body.entities);
    res.json({ success: true, data: { added_count: added } });
  })
);

/**
 * GET /api/v1/trust/stats
 * Get compliance statistics
 * Requires authentication
 */
router.get(
  '/stats',
  authenticate(),
  asyncHandler(async (req: Request, res: Response) => {
    const stats = await complianceService.getComplianceStats();
    res.json({ success: true, data: stats });
  })
);

// ============================================================================
// TAX ENDPOINTS
// ============================================================================

/**
 * GET /api/v1/trust/tax-rates
 * Get applicable tax rates for a country/product
 * Query params: country_code (required), region, product_category, transaction_amount
 * Requires authentication
 */
router.get(
  '/tax-rates',
  authenticate(),
  asyncHandler(async (req: Request, res: Response) => {
    const parsed = taxRatesQuerySchema.parse(req.query);
    const rates = await complianceService.getTaxRates({
      country_code: parsed.country_code,
      region: parsed.region,
      product_category: parsed.product_category,
      transaction_amount: parsed.transaction_amount,
    });
    res.json({ success: true, data: rates });
  })
);

/**
 * POST /api/v1/trust/tax-rates
 * Add or update a tax rate
 * Requires authentication (governance action)
 */
router.post(
  '/tax-rates',
  authenticate(),
  validateBody(taxRateSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const rate = await complianceService.upsertTaxRate(req.body);
    res.status(201).json({ success: true, data: rate });
  })
);

/**
 * POST /api/v1/trust/tax-calculation
 * Calculate tax for a transaction
 * Requires authentication
 */
router.post(
  '/tax-calculation',
  authenticate(),
  validateBody(taxCalculationSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { country_code, subtotal, product_category } = req.body;
    const calculation = await complianceService.calculateTax(
      country_code,
      subtotal,
      product_category
    );
    res.json({ success: true, data: calculation });
  })
);

export default router;