import { ProductListing, Identity, Order, Payment } from '../types/protocol';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export const api = {
  // Product Listings
  async getProducts(): Promise<ProductListing[]> {
    const response = await fetch(`${API_BASE_URL}/products`);
    return response.json();
  },

  async createProduct(product: Omit<ProductListing, 'id'>): Promise<ProductListing> {
    const response = await fetch(`${API_BASE_URL}/products`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(product),
    });
    return response.json();
  },

  // Identity Management
  async registerIdentity(identity: Omit<Identity, 'did'>): Promise<Identity> {
    const response = await fetch(`${API_BASE_URL}/identity/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(identity),
    });
    return response.json();
  },

  // Orders
  async createOrder(order: Omit<Order, 'id' | 'created_at' | 'updated_at'>): Promise<Order> {
    const response = await fetch(`${API_BASE_URL}/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(order),
    });
    return response.json();
  },

  async getOrder(orderId: string): Promise<Order> {
    const response = await fetch(`${API_BASE_URL}/orders/${orderId}`);
    return response.json();
  },

  // Payments
  async processPayment(payment: Payment): Promise<Payment> {
    const response = await fetch(`${API_BASE_URL}/payments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payment),
    });
    return response.json();
  },
};
