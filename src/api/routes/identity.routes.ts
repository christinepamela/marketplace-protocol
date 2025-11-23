/**
 * Identity Routes (Layer 0)
 * 
 * REST API endpoints for identity management and reputation
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';
import { config } from '../core/config';
import { getProofKeys } from '../core/proof-keys';
import { 
  IdentityService,
  ReputationService,
  ProofService
} from '../../core/layer0-identity';
import type {
  RegisterIdentityRequest,
  GenerateProofRequest,
} from '../../core/layer0-identity/types';
import {
  validateBody,
  validateParams,
} from '../middleware/validation.middleware';
import {
  authenticate,
  optionalAuth,
  requirePermissions,
} from '../middleware/auth.middleware';
import { asyncHandler } from '../middleware/error.middleware';
import { PERMISSIONS } from '../core/auth';
import { NotFoundError, ValidationError } from '../core/errors';

const router = Router();

// Initialize Supabase client
const supabase = createClient(
  config.supabaseUrl,
  config.supabaseServiceKey
);

// Initialize services with Supabase client
const identityService = new IdentityService(supabase);
const reputationService = new ReputationService(supabase);
const proofService = new ProofService(supabase);

// Initialize ProofService with signing keys
(async () => {
  try {
    const { privateKeyPem, publicKeyPem } = getProofKeys();
    await proofService.initialize(privateKeyPem, publicKeyPem);
    console.log('✓ ProofService initialized with signing keys');
  } catch (error) {
    console.error('✗ Failed to initialize ProofService:', error);
  }
})();

/**
 * Validation Schemas
 */

// Register identity schema (matches RegisterIdentityRequest)
const registerIdentitySchema = z.object({
  type: z.enum(['kyc', 'nostr', 'anonymous']),
  clientId: z.string(),
  publicProfile: z.object({
    displayName: z.string().min(1),
    country: z.string().optional(),
    businessType: z.enum(['manufacturer', 'artisan', 'trader', 'buyer']),
    avatarUrl: z.string().url().optional(),
    bio: z.string().optional(),
  }),
  kycData: z.any().optional(),
  nostrData: z.any().optional(),
  anonymousData: z.any().optional(),
});

// DID parameter schema
const didParamSchema = z.object({
  did: z.string().regex(/^did:[a-z0-9]+:[a-zA-Z0-9._-]+$/, 'Invalid DID format'),
});

// Generate proof schema (matches GenerateProofRequest)
const generateProofSchema = z.object({
  vendorDid: z.string(),
  validityDays: z.number().optional(),
});

/**
 * POST /api/v1/identity/register
 * Register a new identity
 * Public endpoint (no auth required)
 */
router.post(
  '/register',
  validateBody(registerIdentitySchema),
  asyncHandler(async (req: Request, res: Response) => {
    const requestData: RegisterIdentityRequest = req.body;
    
    // Register identity
    const identity = await identityService.registerIdentity(requestData);
    
    // Generate JWT token for immediate authentication
    const jwt = require('jsonwebtoken');
    const token = jwt.sign(
      { 
        sub: identity.did,  // Subject (user DID)
        type: identity.type,
        clientId: requestData.clientId
      },
      config.jwtSecret,
      { 
        expiresIn: config.jwtExpiry || '24h'
      }
    );
    
    res.status(201).json({
      success: true,
      data: {
        did: identity.did,
        token: token,  // ✅ NOW RETURNS TOKEN
        status: identity.status,
        initialTrustScore: identity.initialTrustScore,
        createdAt: identity.createdAt,
        identity: identity  // Include full identity for client
      },
    });
  })
);

/**
 * GET /api/v1/identity/:did
 * Get identity details
 * Optional auth (more details if authenticated)
 */
router.get(
  '/:did',
  validateParams(didParamSchema),
  optionalAuth(),
  asyncHandler(async (req: Request, res: Response) => {
    const { did } = req.params;
    
    // Get identity
    const identity = await identityService.getIdentityByDID(did);
    
    if (!identity) {
      throw new NotFoundError('Identity', did);
    }
    
    // Check if requester is viewing their own profile or has permissions
    const isOwnProfile = req.user?.sub === did;
    const hasReadPermission = req.permissions?.includes(PERMISSIONS.IDENTITY_READ);
    
    // Return different levels of detail based on auth
    const response: any = {
      did: identity.did,
      type: identity.type,
      verificationStatus: identity.verificationStatus,
      publicProfile: identity.publicProfile,
      createdAt: identity.createdAt,
    };
    
    // Add sensitive data only for own profile or with permissions
    if (isOwnProfile || hasReadPermission) {
      response.contactInfo = identity.contactInfo;
      response.metadata = identity.metadata;
    }
    
    res.json({
      success: true,
      data: response,
    });
  })
);

/**
 * GET /api/v1/identity/:did/reputation
 * Get reputation score
 * Public endpoint
 */
router.get(
  '/:did/reputation',
  validateParams(didParamSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { did } = req.params;
    
    // Verify identity exists
    const identity = await identityService.getIdentityByDID(did);
    if (!identity) {
      throw new NotFoundError('Identity', did);
    }
    
    // Get reputation
    const reputation = await reputationService.getReputation(did);
    
    if (!reputation) {
      throw new NotFoundError('Reputation', did);
    }
    
    res.json({
      success: true,
      data: {
        vendorDid: reputation.vendorDid,
        score: reputation.score,
        metrics: {
          transactionsCompleted: reputation.metrics.transactionsCompleted,
          totalTransactionValue: reputation.metrics.totalTransactionValue,
          averageRating: reputation.metrics.averageRating,
          totalRatings: reputation.metrics.totalRatings,
          onTimeDeliveryRate: reputation.metrics.onTimeDeliveryRate,
          responseTimeAvg: reputation.metrics.responseTimeAvg,
          disputesTotal: reputation.metrics.disputesTotal,
        },
        lastUpdated: reputation.lastUpdated,
      },
    });
  })
);

/**
 * POST /api/v1/identity/:did/verify
 * Verify identity (KYC)
 * Requires authentication and verify permission
 */
router.post(
  '/:did/verify',
  validateParams(didParamSchema),
  authenticate(),
  requirePermissions(PERMISSIONS.IDENTITY_VERIFY),
  asyncHandler(async (req: Request, res: Response) => {
    const { did } = req.params;
    
    // Verify identity exists
    const identity = await identityService.getIdentityByDID(did);
    if (!identity) {
      throw new NotFoundError('Identity', did);
    }
    
    // Check if requester can verify this identity
    const isOwnIdentity = req.user?.sub === did;
    const hasVerifyPermission = req.permissions?.includes(PERMISSIONS.IDENTITY_VERIFY);
    
    if (!isOwnIdentity && !hasVerifyPermission) {
      throw new ValidationError('You can only verify your own identity');
    }
    
    // In a real implementation, this would trigger KYC process
    // For now, just return success
    res.json({
      success: true,
      data: {
        message: 'Verification process initiated',
        did,
        status: 'pending',
      },
    });
  })
);

/**
 * POST /api/v1/identity/:did/proof
 * Generate reputation proof
 * Requires authentication
 */
router.post(
  '/:did/proof',
  validateParams(didParamSchema),
  authenticate(),
  asyncHandler(async (req: Request, res: Response) => {
    const { did } = req.params;
    const { validityDays } = req.body;
    
    // Verify identity exists
    const identity = await identityService.getIdentityByDID(did);
    if (!identity) {
      throw new NotFoundError('Identity', did);
    }
    
    // Only allow generating proof for own identity
    if (req.user?.sub !== did) {
      throw new ValidationError('You can only generate proofs for your own identity');
    }
    
    // Get reputation
    const reputation = await reputationService.getReputation(did);
    if (!reputation) {
      throw new NotFoundError('Reputation', did);
    }
    
    // Generate signed proof
    const proofRequest: GenerateProofRequest = {
      vendorDid: did,
      validityDays: validityDays || 30,
    };
    
    const proof = await proofService.generateProof(proofRequest);
    
    res.json({
      success: true,
      data: {
        vendorDid: proof.vendorDid,
        score: proof.score,
        transactionsCompleted: proof.transactionsCompleted,
        averageRating: proof.averageRating,
        generatedAt: proof.generatedAt,
        validUntil: proof.validUntil,
        signature: proof.signature,
        proofVersion: proof.proofVersion,
        protocolVersion: proof.protocolVersion,
      },
    });
  })
);

export default router;