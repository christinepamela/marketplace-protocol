'use client';

import { Order } from '@/types/protocol';
import { useState } from 'react';

interface OrderDetailsProps {
  order: Order;
  onStatusUpdate?: (orderId: string, newStatus: Order['status']) => void;
}

export default function OrderDetails({ order, onStatusUpdate }: OrderDetailsProps) {
  const [loading, setLoading] = useState(false);

  const getStatusColor = (status: Order['status']) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800',
      paid: 'bg-blue-100 text-blue-800',
      shipped: 'bg-purple-100 text-purple-800',
      completed: 'bg-green-100 text-green-800',
      disputed: 'bg-red-100 text-red-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const handleStatusUpdate = async (newStatus: Order['status']) => {
    if (!onStatusUpdate) return;
    setLoading(true);
    try {
      await onStatusUpdate(order.id, newStatus);
    } catch (error) {
      console.error('Error updating order status:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white shadow sm:rounded-lg">
      <div className="px-4 py-5 sm:px-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium leading-6 text-gray-900">
              Order #{order.id}
            </h3>
            <p className="mt-1 max-w-2xl text-sm text-gray-500">
              Created at: {new Date(order.created_at).toLocaleDateString()}
            </p>
          </div>
          <span
            className={`inline-flex rounded-full px-3 py-1 text-sm font-semibold ${getStatusColor(
              order.status
            )}`}
          >
            {order.status}
          </span>
        </div>
      </div>
      
      <div className="border-t border-gray-200 px-4 py-5 sm:px-6">
        <dl className="grid grid-cols-1 gap-x-4 gap-y-8 sm:grid-cols-2">
          <div className="sm:col-span-1">
            <dt className="text-sm font-medium text-gray-500">Buyer</dt>
            <dd className="mt-1 text-sm text-gray-900">
              {order.buyer.public_profile.display_name}
              <br />
              <span className="text-gray-500">
                {order.buyer.public_profile.location}
              </span>
            </dd>
          </div>
          
          <div className="sm:col-span-1">
            <dt className="text-sm font-medium text-gray-500">Seller</dt>
            <dd className="mt-1 text-sm text-gray-900">
              {order.seller.public_profile.display_name}
              <br />
              <span className="text-gray-500">
                {order.seller.public_profile.business_type}
              </span>
            </dd>
          </div>

          <div className="sm:col-span-2">
            <dt className="text-sm font-medium text-gray-500">Products</dt>
            <dd className="mt-1 text-sm text-gray-900">
              <ul className="divide-y divide-gray-200 rounded-md border border-gray-200">
                {order.products.map((product) => (
                  <li
                    key={product.listing_id}
                    className="flex items-center justify-between py-3 pl-3 pr-4 text-sm"
                  >
                    <div className="flex w-0 flex-1 items-center">
                      <span className="ml-2 w-0 flex-1 truncate">
                        {product.listing_id} - Quantity: {product.quantity}
                      </span>
                    </div>
                    <div className="ml-4 flex-shrink-0">
                      {product.price.currency} {product.price.amount}
                    </div>
                  </li>
                ))}
              </ul>
            </dd>
          </div>

          {onStatusUpdate && (
            <div className="sm:col-span-2">
              <dt className="text-sm font-medium text-gray-500">Actions</dt>
              <dd className="mt-1 text-sm text-gray-900">
                <div className="flex space-x-3">
                  {order.status === 'pending' && (
                    <button
                      onClick={() => handleStatusUpdate('paid')}
                      disabled={loading}
                      className="inline-flex items-center rounded-md border border-transparent bg-blue-600 px-3 py-2 text-sm font-medium leading-4 text-white shadow-sm hover:bg-blue-700"
                    >
                      Mark as Paid
                    </button>
                  )}
                  {order.status === 'paid' && (
                    <button
                      onClick={() => handleStatusUpdate('shipped')}
                      disabled={loading}
                      className="inline-flex items-center rounded-md border border-transparent bg-purple-600 px-3 py-2 text-sm font-medium leading-4 text-white shadow-sm hover:bg-purple-700"
                    >
                      Mark as Shipped
                    </button>
                  )}
                  {order.status === 'shipped' && (
                    <button
                      onClick={() => handleStatusUpdate('completed')}
                      disabled={loading}
                      className="inline-flex items-center rounded-md border border-transparent bg-green-600 px-3 py-2 text-sm font-medium leading-4 text-white shadow-sm hover:bg-green-700"
                    >
                      Mark as Completed
                    </button>
                  )}
                  {['pending', 'paid', 'shipped'].includes(order.status) && (
                    <button
                      onClick={() => handleStatusUpdate('disputed')}
                      disabled={loading}
                      className="inline-flex items-center rounded-md border border-transparent bg-red-600 px-3 py-2 text-sm font-medium leading-4 text-white shadow-sm hover:bg-red-700"
                    >
                      Report Issue
                    </button>
                  )}
                </div>
              </dd>
            </div>
          )}
        </dl>
      </div>
    </div>
  );
}
