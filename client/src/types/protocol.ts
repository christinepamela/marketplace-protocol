// Protocol Types based on our specification
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
      customization_options?: any[];
      variants?: any[];
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
}

export interface Identity {
  type: 'anonymous' | 'verified';
  did: string;
  verification: {
    method: 'nostr' | 'kyc' | 'none';
    status: 'verified' | 'pending' | 'none';
    proof?: string;
  };
  public_profile: {
    display_name: string;
    location: string;
    business_type: 'manufacturer' | 'artisan' | 'trader';
  };
}

export interface Order {
  id: string;
  buyer: Identity;
  seller: Identity;
  products: {
    listing_id: string;
    quantity: number;
    price: {
      amount: number;
      currency: string;
    };
  }[];
  status: 'pending' | 'paid' | 'shipped' | 'completed' | 'disputed';
  created_at: string;
  updated_at: string;
}

export interface Payment {
  type: 'fiat' | 'bitcoin';
  amount: number;
  currency: string;
  status: 'pending' | 'completed' | 'failed';
  provider?: string;
  transaction_id?: string;
}
