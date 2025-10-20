/**
 * Test Layer 1 Services
 */

// Load environment variables FIRST
import * as dotenv from 'dotenv';
dotenv.config();

import { getSupabaseClient } from '../src/infrastructure/database/client';
import { ProductService, SearchService, CategoryService } from '../src/core/layer1-catalog';
import type { CreateProductRequest } from '../src/core/layer1-catalog/types';

async function testLayer1() {
  console.log('🧪 Testing Layer 1: Discovery & Catalog\n');

  // Initialize Supabase
  const db = getSupabaseClient();
  console.log('✅ Supabase client initialized');

  // Initialize services
  const productService = new ProductService(db);
  const searchService = new SearchService(db);
  const categoryService = new CategoryService(db);
  console.log('✅ Services initialized\n');

  // Get a test vendor DID from Layer 0
  const { data: vendors } = await db
    .from('identities')
    .select('did')
    .eq('type', 'kyc')
    .limit(1);

  if (!vendors || vendors.length === 0) {
    throw new Error('No vendors found. Please run test-layer0.ts first');
  }

  const testVendorDid = vendors[0].did;
  console.log(`Using test vendor: ${testVendorDid}\n`);

  // Test 1: Get all categories
  console.log('--- Test 1: Get All Categories ---');
  const categories = await categoryService.getAllCategories();
  console.log(`✅ Found ${categories.length} categories`);
  console.log('   Categories:', categories.map(c => c.displayName).join(', '));

  // Test 2: Get category metadata
  console.log('\n--- Test 2: Get Footwear Category Metadata ---');
  const footwearMeta = await categoryService.getCategoryMetadata('footwear');
  console.log('✅ Footwear metadata retrieved');
  console.log(`   Subcategories: ${footwearMeta?.subcategories.length}`);

  // Test 3: Get suggested attributes
  console.log('\n--- Test 3: Get Suggested Attributes for Leather Shoes ---');
  const attributes = await categoryService.getSuggestedAttributes('footwear', 'leather-shoes');
  console.log(`✅ Found ${attributes.length} suggested attributes`);
  console.log('   Attributes:', attributes.map(a => a.displayName).join(', '));

  // Test 4: Create a product
  console.log('\n--- Test 4: Create Product ---');
  const createRequest: CreateProductRequest = {
    vendorDid: testVendorDid,
    clientId: 'rangkai-client',
    category: {
      primary: 'footwear',
      subcategory: 'leather-shoes',
      tags: ['formal', 'handmade', 'leather']
    },
    basic: {
      name: 'Premium Oxford Leather Shoes',
      description: 'Handcrafted premium full-grain leather Oxford shoes. Perfect for formal occasions and business wear. Made with traditional techniques by skilled artisans.',
      shortDescription: 'Premium handcrafted leather Oxford shoes',
      images: {
        primary: 'https://example.com/oxford-main.jpg',
        gallery: ['https://example.com/oxford-1.jpg', 'https://example.com/oxford-2.jpg'],
        thumbnail: 'https://example.com/oxford-thumb.jpg'
      },
      condition: 'new'
    },
    advanced: {
      attributes: {
        material: 'Full Grain Leather',
        sizes: ['39', '40', '41', '42', '43', '44'],
        colors: ['Black', 'Brown', 'Tan'],
        sole_material: 'Rubber',
        gender: 'Men',
        style: 'Formal'
      },
      keywords: ['oxford', 'leather', 'formal', 'handmade', 'premium']
    },
    pricing: {
      basePrice: { amount: 89.99, currency: 'USD' },
      moq: 10,
      tiers: [
        { minQuantity: 10, maxQuantity: 49, pricePerUnit: 89.99, currency: 'USD' },
        { minQuantity: 50, maxQuantity: 99, pricePerUnit: 79.99, currency: 'USD' },
        { minQuantity: 100, pricePerUnit: 69.99, currency: 'USD' }
      ],
      sample: {
        available: true,
        price: { amount: 95.00, currency: 'USD' },
        leadTime: 7,
        maxQuantity: 2
      }
    },
    logistics: {
      weight: { value: 0.8, unit: 'kg' },
      dimensions: { length: 30, width: 15, height: 12, unit: 'cm' },
      originCountry: 'MY',
      leadTime: 14,
      shippingMethods: ['air', 'sea', 'express']
    },
    visibility: 'public'
  };

  const createResponse = await productService.createProduct(createRequest);
  console.log('✅ Product created:', createResponse.productId);
  console.log('   Status:', createResponse.status);

  // Test 5: Get product by ID
  console.log('\n--- Test 5: Get Product by ID ---');
  const product = await productService.getProductById(createResponse.productId);
  console.log('✅ Product retrieved:', product?.basic.name);
  console.log('   Price:', product?.pricing.basePrice.amount, product?.pricing.basePrice.currency);
  console.log('   MOQ:', product?.pricing.moq);
  console.log('   Sample available:', product?.pricing.sample?.available);

  // Test 6: Publish product
  console.log('\n--- Test 6: Publish Product ---');
  await productService.publishProduct(createResponse.productId);
  console.log('✅ Product published (draft → active)');

  // Wait a moment for index to update
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Test 7: Search for products
  console.log('\n--- Test 7: Search for "leather shoes" ---');
  const searchResults = await searchService.search({
    query: 'leather shoes',
    limit: 10
  });
  console.log(`✅ Search completed in ${searchResults.executionTime}ms`);
  console.log(`   Found ${searchResults.total} products`);
  if (searchResults.items.length > 0) {
    const firstResult = searchResults.items[0];
    console.log('   Top result:', firstResult.product.basic.name);
    console.log('   Relevance score:', firstResult.score.toFixed(2));
    console.log('   Vendor:', firstResult.vendor.displayName);
  }

  // Test 8: Search with filters
  console.log('\n--- Test 8: Search with Filters (footwear, sample available) ---');
  const filteredResults = await searchService.search({
    filters: {
      category: 'footwear',
      sampleAvailable: true,
      originCountry: 'MY'
    },
    sortBy: 'price_asc',
    limit: 5
  });
  console.log(`✅ Filtered search found ${filteredResults.total} products`);
  console.log(`   Execution time: ${filteredResults.executionTime}ms`);

  // Test 9: Get products by vendor
  console.log('\n--- Test 9: Get Products by Vendor ---');
  const vendorProducts = await productService.getProductsByVendor(testVendorDid, {
    status: 'active',
    limit: 10
  });
  console.log(`✅ Vendor has ${vendorProducts.length} active products`);

  // Test 10: Update product stats
  console.log('\n--- Test 10: Increment Product Stats ---');
  await productService.incrementStat(createResponse.productId, 'views');
  await productService.incrementStat(createResponse.productId, 'views');
  await productService.incrementStat(createResponse.productId, 'inquiries');
  const updatedProduct = await productService.getProductById(createResponse.productId);
  console.log('✅ Stats updated');
  console.log('   Views:', updatedProduct?.stats?.views);
  console.log('   Inquiries:', updatedProduct?.stats?.inquiries);

  // Test 11: Get search suggestions
  console.log('\n--- Test 11: Get Search Suggestions for "leath" ---');
  const suggestions = await searchService.getSuggestions('leath', 5);
  console.log('✅ Suggestions retrieved:', suggestions.length);
  if (suggestions.length > 0) {
    console.log('   Suggestions:', suggestions.join(', '));
  }

  // Test 12: Create a second product (different category)
  console.log('\n--- Test 12: Create Textile Product ---');
  const textileRequest: CreateProductRequest = {
    vendorDid: testVendorDid,
    clientId: 'rangkai-client',
    category: {
      primary: 'textiles',
      subcategory: 'cotton-fabric',
      tags: ['cotton', 'plain', 'wholesale']
    },
    basic: {
      name: 'Premium Cotton Fabric - Plain White',
      description: 'High-quality 100% cotton fabric, perfect for garments and home textiles. 200 GSM, plain weave.',
      shortDescription: '100% cotton fabric, 200 GSM',
      images: {
        primary: 'https://example.com/cotton-main.jpg'
      },
      condition: 'new'
    },
    advanced: {
      attributes: {
        gsm: 200,
        weave_type: 'Plain',
        width: 60,
        color_options: ['White', 'Cream', 'Natural'],
        pattern: 'Plain'
      },
      keywords: ['cotton', 'fabric', 'textile', 'plain', 'white']
    },
    pricing: {
      basePrice: { amount: 4.50, currency: 'USD' },
      moq: 100,
      tiers: [
        { minQuantity: 100, maxQuantity: 499, pricePerUnit: 4.50, currency: 'USD' },
        { minQuantity: 500, pricePerUnit: 3.99, currency: 'USD' }
      ]
    },
    logistics: {
      weight: { value: 0.2, unit: 'kg' },
      dimensions: { length: 150, width: 60, height: 2, unit: 'cm' },
      originCountry: 'MY',
      leadTime: 7
    }
  };

  const textileResponse = await productService.createProduct(textileRequest);
  await productService.publishProduct(textileResponse.productId);
  console.log('✅ Textile product created and published:', textileResponse.productId);

  // Wait for index
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Test 13: Federated search across categories
  console.log('\n--- Test 13: Search Across All Categories ---');
  const allResults = await searchService.search({
    query: 'premium',
    sortBy: 'newest',
    limit: 20
  });
  console.log(`✅ Found ${allResults.total} products containing "premium"`);
  console.log('   Categories found:');
  allResults.items.forEach(item => {
    console.log(`   - ${item.product.basic.name} (${item.product.category.primary})`);
  });

  // Test 14: Aggregations
  if (allResults.aggregations) {
    console.log('\n--- Test 14: Aggregations (Faceted Search) ---');
    console.log('✅ Aggregations retrieved');
    console.log('   By category:', JSON.stringify(allResults.aggregations.categories, null, 2));
    console.log('   By country:', JSON.stringify(allResults.aggregations.countries, null, 2));
  }

  console.log('\n🎉 All Layer 1 tests passed!');
}

testLayer1()
  .catch(error => {
    console.error('❌ Test failed:', error);
    process.exit(1);
  });