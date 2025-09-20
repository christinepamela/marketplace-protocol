// Core type definitions for the marketplace protocol

// Product related types
export interface ProductListing {
    id: string;
    type: 'product' | 'service';
    category: {
        primary: string;
        sub: string;
    };
    specifications: {
        basic: {
            name: string;
            description: string;
            images: string[];
            price: {
                amount: number;
                currency: string;
            };
        };
        advanced: {
            customization_options?: string[];
            variants?: ProductVariant[];
            materials?: string[];
            certifications?: string[];
        };
    };
    logistics: {
        weight: number;
        dimensions: {
            length: number;
            width: number;
            height: number;
        };
        shipping_methods: string[];
    };
    vendor: Identity;
    created_at: Date;
    updated_at: Date;
    status: 'active' | 'inactive' | 'draft';
}

export interface ProductVariant {
    id: string;
    name: string;
    price_adjustment: number;
    attributes: Record<string, string>;
    stock?: number;
}

// Identity and verification types
export interface Identity {
    id: string;
    type: 'anonymous' | 'verified';
    did?: string;
    verification: {
        method: 'nostr' | 'kyc' | 'none';
        status: 'verified' | 'pending' | 'none';
        proof?: string;
    };
    public_profile: {
        display_name: string;
        location: string;
        business_type: 'manufacturer' | 'artisan' | 'trader';
        description?: string;
        contact?: {
            email?: string;
            phone?: string;
            website?: string;
        };
    };
    reputation: Reputation;
    created_at: Date;
}

export interface Reputation {
    score: number;
    transactions_completed: number;
    verification_level: 'basic' | 'enhanced' | 'premium';
    reviews: Review[];
    last_updated: Date;
}

export interface Review {
    id: string;
    transaction_id: string;
    rating: number;
    comment?: string;
    reviewer_id: string;
    signature: string;
    timestamp: Date;
}
