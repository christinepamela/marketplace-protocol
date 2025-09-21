'use client';

import { useState } from 'react';
import { Identity } from '@/types/protocol';

interface VerificationProps {
  identity: Identity;
  onVerificationComplete: (verifiedIdentity: Identity) => void;
}

export default function VerificationFlow({ identity, onVerificationComplete }: VerificationProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleNostrVerification = async () => {
    setLoading(true);
    setError(null);
    try {
      // Here we would integrate with Nostr
      // For now, we'll simulate the process
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const verifiedIdentity: Identity = {
        ...identity,
        type: 'verified',
        verification: {
          ...identity.verification,
          status: 'verified',
          proof: 'nostr-proof-placeholder' // This would be actual Nostr proof
        }
      };
      
      onVerificationComplete(verifiedIdentity);
    } catch (err) {
      setError('Failed to verify with Nostr. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleKYCVerification = async () => {
    setLoading(true);
    setError(null);
    try {
      // Here we would integrate with a KYC provider
      // For now, we'll simulate the process
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const verifiedIdentity: Identity = {
        ...identity,
        type: 'verified',
        verification: {
          ...identity.verification,
          status: 'verified',
          proof: 'kyc-proof-placeholder' // This would be actual KYC proof
        }
      };
      
      onVerificationComplete(verifiedIdentity);
    } catch (err) {
      setError('Failed to complete KYC verification. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto mt-8">
      <div className="bg-white shadow sm:rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg font-medium leading-6 text-gray-900">
            Complete Your Verification
          </h3>
          
          {error && (
            <div className="mt-2 rounded-md bg-red-50 p-4">
              <div className="flex">
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">{error}</h3>
                </div>
              </div>
            </div>
          )}

          {identity.verification.method === 'nostr' && (
            <div className="mt-5">
              <div className="rounded-md bg-gray-50 p-4">
                <div className="flex">
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-gray-800">Nostr Verification</h3>
                    <div className="mt-2 text-sm text-gray-500">
                      <p>Verify your identity using your Nostr account. This will:</p>
                      <ul className="list-disc pl-5 mt-2">
                        <li>Link your marketplace identity to your Nostr public key</li>
                        <li>Enable secure messaging with other users</li>
                        <li>Allow cross-platform reputation verification</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
              <div className="mt-5">
                <button
                  type="button"
                  onClick={handleNostrVerification}
                  disabled={loading}
                  className="inline-flex items-center justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                  {loading ? 'Verifying...' : 'Connect Nostr'}
                </button>
              </div>
            </div>
          )}

          {identity.verification.method === 'kyc' && (
            <div className="mt-5">
              <div className="rounded-md bg-gray-50 p-4">
                <div className="flex">
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-gray-800">KYC Verification</h3>
                    <div className="mt-2 text-sm text-gray-500">
                      <p>Complete KYC verification to:</p>
                      <ul className="list-disc pl-5 mt-2">
                        <li>Verify your business identity</li>
                        <li>Enable higher transaction limits</li>
                        <li>Access additional marketplace features</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
              <div className="mt-5">
                <button
                  type="button"
                  onClick={handleKYCVerification}
                  disabled={loading}
                  className="inline-flex items-center justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                  {loading ? 'Processing...' : 'Start KYC Process'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
