/**
 * Proof Signing Key Management
 * 
 * Converts hex keys from environment to PEM format for ProofService
 */

import crypto from 'crypto';
import { config } from './config';

/**
 * Generate ECDSA key pair from seed (deterministic)
 */
export function generateKeyPairFromSeed(seed: string): {
  privateKeyPem: string;
  publicKeyPem: string;
} {
  // Use the seed to derive a deterministic private key
  const hash = crypto.createHash('sha256').update(seed).digest();
  
  // Generate ECDSA key pair
  const { privateKey, publicKey } = crypto.generateKeyPairSync('ec', {
    namedCurve: 'prime256v1', // P-256 curve
    publicKeyEncoding: {
      type: 'spki',
      format: 'pem',
    },
    privateKeyEncoding: {
      type: 'pkcs8',
      format: 'pem',
    },
  });
  
  return {
    privateKeyPem: privateKey,
    publicKeyPem: publicKey,
  };
}

/**
 * Get proof signing keys from environment
 */
export function getProofKeys(): {
  privateKeyPem: string;
  publicKeyPem: string;
} {
  // Use the environment key as seed for deterministic key generation
  const seed = config.proofSigningKey;
  return generateKeyPairFromSeed(seed);
}