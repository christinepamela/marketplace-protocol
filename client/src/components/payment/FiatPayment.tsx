'use client';

import { useState } from 'react';
import { Order, Payment } from '@/types/protocol';
import { api } from '@/services/api';

interface FiatPaymentProps {
  order: Order;
  onPaymentComplete: (payment: Payment) => void;
}

export default function FiatPayment({ order, onPaymentComplete }: FiatPaymentProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedMethod, setSelectedMethod] = useState<'card' | 'bank'>('card');

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    
    try {
      // In a real implementation, this would:
      // 1. Send payment details to a payment processor
      // 2. Handle 3D Secure if needed
      // 3. Process the payment
      
      // Simulate payment processing
      await new Promise(resolve => setTimeout(resolve, 2000));

      const totalAmount = order.products.reduce(
        (sum, product) => sum + product.price.amount,
        0
      );

      onPaymentComplete({
        type: 'fiat',
        amount: totalAmount,
        currency: order.products[0].price.currency,
        status: 'completed',
        provider: selectedMethod === 'card' ? 'stripe' : 'bank_transfer',
        transaction_id: `fiat_${Date.now()}`
      });
    } catch (err) {
      console.error('Payment processing error:', err);
      setError('Failed to process payment. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white shadow sm:rounded-lg">
      <div className="px-4 py-5 sm:p-6">
        <h3 className="text-lg font-medium leading-6 text-gray-900">
          Payment Details
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

        <div className="mt-6">
          <div className="flex space-x-4 mb-6">
            <button
              type="button"
              onClick={() => setSelectedMethod('card')}
              className={`flex-1 py-2 px-4 rounded-md ${
                selectedMethod === 'card'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-900'
              }`}
            >
              Credit Card
            </button>
            <button
              type="button"
              onClick={() => setSelectedMethod('bank')}
              className={`flex-1 py-2 px-4 rounded-md ${
                selectedMethod === 'bank'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-900'
              }`}
            >
              Bank Transfer
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {selectedMethod === 'card' ? (
              <>
                <div>
                  <label htmlFor="cardNumber" className="block text-sm font-medium text-gray-700">
                    Card Number
                  </label>
                  <input
                    type="text"
                    name="cardNumber"
                    id="cardNumber"
                    placeholder="1234 5678 9012 3456"
                    required
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="col-span-2">
                    <label htmlFor="expiry" className="block text-sm font-medium text-gray-700">
                      Expiry Date
                    </label>
                    <input
                      type="text"
                      name="expiry"
                      id="expiry"
                      placeholder="MM/YY"
                      required
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    />
                  </div>
                  <div>
                    <label htmlFor="cvc" className="block text-sm font-medium text-gray-700">
                      CVC
                    </label>
                    <input
                      type="text"
                      name="cvc"
                      id="cvc"
                      placeholder="123"
                      required
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    />
                  </div>
                </div>
              </>
            ) : (
              <div className="rounded-md bg-gray-50 p-4">
                <div className="text-sm text-gray-700">
                  <p className="font-medium mb-2">Bank Transfer Details:</p>
                  <p>Bank: Example Bank</p>
                  <p>Account Name: Marketplace Account</p>
                  <p>Account Number: 1234567890</p>
                  <p>Reference: ORDER-{order.id}</p>
                </div>
              </div>
            )}

            <div className="border-t border-gray-200 pt-4">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-gray-900">Total Amount:</span>
                <span className="font-bold text-gray-900">
                  {order.products[0].price.currency}{' '}
                  {order.products.reduce((sum, product) => sum + product.price.amount, 0)}
                </span>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || (selectedMethod === 'bank')}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-400"
            >
              {loading ? 'Processing...' : selectedMethod === 'card' ? 'Pay Now' : 'Awaiting Transfer'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
