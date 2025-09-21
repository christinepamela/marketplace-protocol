'use client';

import { useState } from 'react';
import { ProductListing, Order, Identity } from '@/types/protocol';
import { api } from '@/services/api';

interface CreateOrderProps {
  product: ProductListing;
  buyer: Identity;
  seller: Identity;
  onOrderCreated: (order: Order) => void;
}

export default function CreateOrder({
  product,
  buyer,
  seller,
  onOrderCreated,
}: CreateOrderProps) {
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const orderData = {
        buyer,
        seller,
        products: [
          {
            listing_id: product.id,
            quantity,
            price: {
              amount: product.specifications.basic.price.amount * quantity,
              currency: product.specifications.basic.price.currency,
            },
          },
        ],
        status: 'pending' as const,
      };

      const order = await api.createOrder(orderData);
      onOrderCreated(order);
    } catch (err) {
      setError('Failed to create order. Please try again.');
      console.error('Error creating order:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white shadow sm:rounded-lg">
      <div className="px-4 py-5 sm:p-6">
        <h3 className="text-lg font-medium leading-6 text-gray-900">
          Create Order
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

        <form onSubmit={handleSubmit} className="mt-5">
          <div className="mt-6">
            <div className="flex items-center justify-between">
              <dt className="text-sm text-gray-600">Product</dt>
              <dd className="text-sm font-medium text-gray-900">
                {product.specifications.basic.name}
              </dd>
            </div>
            <div className="mt-1 flex items-center justify-between border-t border-gray-200 pt-2">
              <dt className="text-sm text-gray-600">Price per unit</dt>
              <dd className="text-sm font-medium text-gray-900">
                {product.specifications.basic.price.currency}{' '}
                {product.specifications.basic.price.amount}
              </dd>
            </div>

            <div className="mt-4">
              <label
                htmlFor="quantity"
                className="block text-sm font-medium text-gray-700"
              >
                Quantity
              </label>
              <div className="mt-1">
                <input
                  type="number"
                  min="1"
                  value={quantity}
                  onChange={(e) => setQuantity(parseInt(e.target.value, 10))}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                />
              </div>
            </div>

            <div className="mt-6 flex items-center justify-between border-t border-gray-200 pt-4">
              <dt className="text-base font-medium text-gray-900">Total</dt>
              <dd className="text-base font-medium text-gray-900">
                {product.specifications.basic.price.currency}{' '}
                {product.specifications.basic.price.amount * quantity}
              </dd>
            </div>
          </div>

          <div className="mt-6">
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-md border border-transparent bg-blue-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              {loading ? 'Creating Order...' : 'Create Order'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
