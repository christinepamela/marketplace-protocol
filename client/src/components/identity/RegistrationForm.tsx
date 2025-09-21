'use client';

import { useState } from 'react';
import { api } from '@/services/api';
import { Identity } from '@/types/protocol';

export default function RegistrationForm({ onSuccess }: { onSuccess: (identity: Identity) => void }) {
  const [loading, setLoading] = useState(false);
  const [verificationMethod, setVerificationMethod] = useState<'nostr' | 'kyc' | 'none'>('none');

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    
    const identity = {
      type: 'anonymous',
      verification: {
        method: verificationMethod,
        status: 'pending',
      },
      public_profile: {
        display_name: formData.get('displayName') as string,
        location: formData.get('location') as string,
        business_type: formData.get('businessType') as 'manufacturer' | 'artisan' | 'trader',
      },
    };

    try {
      const registeredIdentity = await api.registerIdentity(identity);
      onSuccess(registeredIdentity);
      e.currentTarget.reset();
    } catch (error) {
      console.error('Error registering identity:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl mx-auto">
      <div className="bg-white px-4 py-5 shadow sm:rounded-lg sm:p-6">
        <div className="md:grid md:grid-cols-3 md:gap-6">
          <div className="md:col-span-1">
            <h3 className="text-lg font-medium leading-6 text-gray-900">Profile</h3>
            <p className="mt-1 text-sm text-gray-500">
              This information will be displayed publicly so be careful what you share.
            </p>
          </div>
          <div className="mt-5 md:col-span-2 md:mt-0">
            <div className="grid grid-cols-6 gap-6">
              <div className="col-span-6">
                <label htmlFor="displayName" className="block text-sm font-medium text-gray-700">
                  Display Name
                </label>
                <input
                  type="text"
                  name="displayName"
                  id="displayName"
                  required
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                />
              </div>

              <div className="col-span-6 sm:col-span-3">
                <label htmlFor="location" className="block text-sm font-medium text-gray-700">
                  Country
                </label>
                <select
                  id="location"
                  name="location"
                  required
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                >
                  <option value="MY">Malaysia</option>
                  <option value="US">United States</option>
                  <option value="SG">Singapore</option>
                  <option value="ID">Indonesia</option>
                </select>
              </div>

              <div className="col-span-6 sm:col-span-3">
                <label htmlFor="businessType" className="block text-sm font-medium text-gray-700">
                  Business Type
                </label>
                <select
                  id="businessType"
                  name="businessType"
                  required
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                >
                  <option value="manufacturer">Manufacturer</option>
                  <option value="artisan">Artisan</option>
                  <option value="trader">Trader</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        <div className="md:grid md:grid-cols-3 md:gap-6 mt-8">
          <div className="md:col-span-1">
            <h3 className="text-lg font-medium leading-6 text-gray-900">Verification</h3>
            <p className="mt-1 text-sm text-gray-500">
              Choose how you want to verify your identity.
            </p>
          </div>
          <div className="mt-5 md:col-span-2 md:mt-0">
            <div className="space-y-4">
              <div className="flex items-center">
                <input
                  id="verification-none"
                  name="verification"
                  type="radio"
                  checked={verificationMethod === 'none'}
                  onChange={() => setVerificationMethod('none')}
                  className="h-4 w-4 border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="verification-none" className="ml-3">
                  <span className="block text-sm font-medium text-gray-700">No Verification</span>
                  <span className="block text-sm text-gray-500">Limited features available</span>
                </label>
              </div>
              <div className="flex items-center">
                <input
                  id="verification-nostr"
                  name="verification"
                  type="radio"
                  checked={verificationMethod === 'nostr'}
                  onChange={() => setVerificationMethod('nostr')}
                  className="h-4 w-4 border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="verification-nostr" className="ml-3">
                  <span className="block text-sm font-medium text-gray-700">Nostr Verification</span>
                  <span className="block text-sm text-gray-500">Verify using your Nostr identity</span>
                </label>
              </div>
              <div className="flex items-center">
                <input
                  id="verification-kyc"
                  name="verification"
                  type="radio"
                  checked={verificationMethod === 'kyc'}
                  onChange={() => setVerificationMethod('kyc')}
                  className="h-4 w-4 border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="verification-kyc" className="ml-3">
                  <span className="block text-sm font-medium text-gray-700">KYC Verification</span>
                  <span className="block text-sm text-gray-500">Full identity verification</span>
                </label>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={loading}
          className="ml-3 inline-flex justify-center rounded-md border border-transparent bg-blue-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          {loading ? 'Registering...' : 'Register'}
        </button>
      </div>
    </form>
  );
}
