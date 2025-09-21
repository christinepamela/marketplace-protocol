'use client';

import { useState, useEffect } from 'react';
import { Order, Payment } from '@/types/protocol';
import { api } from '@/services/api';

interface BitcoinPaymentProps {
  order: Order;
  onPaymentComplete: (payment: Payment) => void;
}

export default function BitcoinPayment({ order, onPaymentComplete }: BitcoinPaymentProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bitcoinAddress, setBitcoinAddress] = useState<string | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<'pending' | 'confirming' | 'completed' | 'failed'>('pending');
  const [confirmations, setConfirmations] = useState(0);

  // Calculate total amount in BTC (this would normally come from an exchange rate API)
  const totalAmount = order.products.reduce((sum, product) => sum + product.price.amount, 0);
  
  useEffect(() => {
    const generatePaymentRequest = async () => {
      setLoading(true);
      try {
        // In a real implementation, this would:
        // 1. Generate a unique Bitcoin address for this payment
        // 2. Start watching for payments to this address
        // 3. Set up WebSocket connection for real-time updates
        setBitcoinAddress('bc1q...example...address'); // Placeholder
      } catch (err) {
        console.error('Error generating payment request:', err);
        setError('Failed to generate Bitcoin payment address');
      } finally {
        setLoading(false);
      }
    };

    generatePaymentRequest();
  }, []);

  // Simulate payment status updates
  useEffect(() => {
    if (!bitcoinAddress || paymentStatus === 'completed' || paymentStatus === 'failed') return;

    const interval = setInterval(() => {
      // This would normally check the Bitcoin network for confirmations
      if (confirmations < 6) {
        setConfirmations(prev => prev + 1);
        setPaymentStatus('confirming');
      } else {
        setPaymentStatus('completed');
        onPaymentComplete({
          type: 'bitcoin',
          amount: totalAmount,
          currency: 'BTC',
          status: 'completed',
          transaction_id: 'tx_example_hash'
        });
        clearInterval(interval);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [bitcoinAddress, paymentStatus, confirmations, totalAmount, onPaymentComplete]);

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-md bg-red-50 p-4">
        <div className="flex">
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">{error}</h3>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white shadow sm:rounded-lg">
      <div className="px-4 py-5 sm:p-6">
        <h3 className="text-lg font-medium leading-6 text-gray-900">
          Bitcoin Payment
        </h3>
        
        <div className="mt-5">
          <div className="rounded-md bg-gray-50 p-4">
            <div className="flex flex-col items-center">
              <div className="text-sm text-gray-900 mb-4">
                Please send exactly:
                <div className="text-2xl font-bold my-2">
                  {totalAmount} BTC
                </div>
                to the following address:
              </div>
              
              {bitcoinAddress && (
                <div className="w-full max-w-md bg-white rounded-lg border p-4 mt-2 font-mono text-sm break-all">
                  {bitcoinAddress}
                </div>
              )}

              <div className="mt-6 w-full">
                <div className="relative">
                  <div className="overflow-hidden h-2 text-xs flex rounded bg-gray-200">
                    <div
                      style={{ width: `${(confirmations / 6) * 100}%` }}
                      className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-blue-500 transition-all duration-500"
                    ></div>
                  </div>
                </div>
                <div className="text-sm text-gray-600 text-center mt-2">
                  {paymentStatus === 'pending' && 'Waiting for payment...'}
                  {paymentStatus === 'confirming' && `Confirming: ${confirmations}/6 confirmations`}
                  {paymentStatus === 'completed' && 'Payment confirmed!'}
                  {paymentStatus === 'failed' && 'Payment failed'}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-5">
          <h4 className="text-sm font-medium text-gray-900">Important Notes:</h4>
          <ul className="mt-2 text-sm text-gray-600 list-disc list-inside">
            <li>Send only Bitcoin (BTC) to this address</li>
            <li>Payment requires 6 confirmations to be considered final</li>
            <li>Address is valid for 24 hours</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
