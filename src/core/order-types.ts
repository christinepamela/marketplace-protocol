// Order and payment related types

export interface Order {
    id: string;
    buyer: string; // buyer's Identity id
    seller: string; // seller's Identity id
    items: OrderItem[];
    status: OrderStatus;
    payment: PaymentInfo;
    shipping: ShippingInfo;
    created_at: Date;
    updated_at: Date;
    total_amount: number;
    currency: string;
}

export interface OrderItem {
    product_id: string;
    quantity: number;
    price: number;
    variant_id?: string;
    customization_details?: Record<string, string>;
}

export type OrderStatus = 
    | 'created'
    | 'payment_pending'
    | 'paid'
    | 'processing'
    | 'shipped'
    | 'delivered'
    | 'disputed'
    | 'completed'
    | 'cancelled';

export interface PaymentInfo {
    method: PaymentMethod;
    status: PaymentStatus;
    amount: number;
    currency: string;
    transaction_id?: string;
    lightning_invoice?: string;
    bitcoin_address?: string;
    escrow_id?: string;
    payment_proof?: string;
}

export type PaymentMethod = 
    | 'bitcoin'
    | 'lightning'
    | 'fiat';

export type PaymentStatus =
    | 'pending'
    | 'processing'
    | 'completed'
    | 'failed'
    | 'refunded';

export interface ShippingInfo {
    carrier: string;
    method: string;
    tracking_number?: string;
    estimated_delivery?: Date;
    shipping_address: Address;
    shipping_cost: number;
    customs_info?: CustomsInfo;
}

export interface Address {
    name: string;
    street: string;
    city: string;
    state: string;
    country: string;
    postal_code: string;
    phone?: string;
    instructions?: string;
}

export interface CustomsInfo {
    declaration_number?: string;
    hs_tariff_number?: string;
    content_type: 'merchandise' | 'gift' | 'documents' | 'sample';
    content_description: string;
    value: number;
    currency: string;
    origin_country: string;
}
