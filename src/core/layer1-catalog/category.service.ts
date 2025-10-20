/**
 * Category Service
 * Handles product category management and metadata
 */

import type { PrimaryCategory, Category } from './types';

/**
 * Category metadata structure
 */
interface CategoryMetadata {
  primary: PrimaryCategory;
  displayName: string;
  description: string;
  subcategories: {
    code: string;
    displayName: string;
    description?: string;
    attributes?: CategoryAttribute[];
  }[];
  commonAttributes?: CategoryAttribute[];
}

/**
 * Category-specific attribute definition
 */
interface CategoryAttribute {
  key: string;
  displayName: string;
  type: 'text' | 'number' | 'select' | 'multiselect' | 'boolean';
  options?: string[]; // For select/multiselect
  required?: boolean;
  unit?: string; // e.g., "cm", "kg"
}

export class CategoryService {
  private dbClient: any;
  
  constructor(dbClient: any) {
    this.dbClient = dbClient;
  }

  /**
   * Get all primary categories
   */
  async getAllCategories(): Promise<CategoryMetadata[]> {
    return CATEGORY_DEFINITIONS;
  }

  /**
   * Get category metadata
   */
  async getCategoryMetadata(primary: PrimaryCategory): Promise<CategoryMetadata | null> {
    return CATEGORY_DEFINITIONS.find(c => c.primary === primary) || null;
  }

  /**
   * Get subcategories for a primary category
   */
  async getSubcategories(primary: PrimaryCategory): Promise<string[]> {
    const category = await this.getCategoryMetadata(primary);
    return category?.subcategories.map(s => s.code) || [];
  }

  /**
   * Get suggested attributes for a category
   */
  async getSuggestedAttributes(
    primary: PrimaryCategory,
    subcategory?: string
  ): Promise<CategoryAttribute[]> {
    const categoryMeta = await this.getCategoryMetadata(primary);
    if (!categoryMeta) return [];

    let attributes = categoryMeta.commonAttributes || [];

    // Add subcategory-specific attributes
    if (subcategory) {
      const subcat = categoryMeta.subcategories.find(s => s.code === subcategory);
      if (subcat?.attributes) {
        attributes = [...attributes, ...subcat.attributes];
      }
    }

    return attributes;
  }

  /**
   * Validate category data
   */
  validateCategory(category: Category): boolean {
    const validPrimaries: PrimaryCategory[] = [
      'footwear', 'bags', 'textiles', 'electronics', 'home', 'craft', 'other'
    ];

    if (!validPrimaries.includes(category.primary)) {
      return false;
    }

    if (!category.subcategory || category.subcategory.trim().length === 0) {
      return false;
    }

    return true;
  }
}

// ============================================================================
// CATEGORY DEFINITIONS
// ============================================================================

/**
 * Predefined category metadata
 * This can be moved to database later for dynamic management
 */
const CATEGORY_DEFINITIONS: CategoryMetadata[] = [
  {
    primary: 'footwear',
    displayName: 'Footwear',
    description: 'Shoes, sandals, boots, and other footwear',
    subcategories: [
      {
        code: 'leather-shoes',
        displayName: 'Leather Shoes',
        attributes: [
          { key: 'material', displayName: 'Leather Type', type: 'select', options: ['Full Grain', 'Top Grain', 'Genuine', 'Suede'], required: true },
          { key: 'sizes', displayName: 'Available Sizes', type: 'multiselect', options: ['35', '36', '37', '38', '39', '40', '41', '42', '43', '44', '45'], required: true },
          { key: 'colors', displayName: 'Available Colors', type: 'multiselect', required: true },
          { key: 'sole_material', displayName: 'Sole Material', type: 'select', options: ['Rubber', 'Leather', 'PU', 'EVA'] }
        ]
      },
      {
        code: 'sandals',
        displayName: 'Sandals',
        attributes: [
          { key: 'strap_material', displayName: 'Strap Material', type: 'select', options: ['Leather', 'Fabric', 'Synthetic'] },
          { key: 'sizes', displayName: 'Available Sizes', type: 'multiselect', required: true }
        ]
      },
      {
        code: 'boots',
        displayName: 'Boots',
        attributes: [
          { key: 'height', displayName: 'Boot Height', type: 'select', options: ['Ankle', 'Mid-Calf', 'Knee-High'] },
          { key: 'waterproof', displayName: 'Waterproof', type: 'boolean' }
        ]
      }
    ],
    commonAttributes: [
      { key: 'gender', displayName: 'Gender', type: 'select', options: ['Men', 'Women', 'Unisex'], required: true },
      { key: 'style', displayName: 'Style', type: 'select', options: ['Casual', 'Formal', 'Sport', 'Traditional'] }
    ]
  },
  {
    primary: 'bags',
    displayName: 'Bags & Accessories',
    description: 'Handbags, backpacks, luggage, and accessories',
    subcategories: [
      {
        code: 'handbags',
        displayName: 'Handbags',
        attributes: [
          { key: 'material', displayName: 'Material', type: 'select', options: ['Leather', 'Canvas', 'Synthetic', 'Vegan Leather'], required: true },
          { key: 'closure_type', displayName: 'Closure', type: 'select', options: ['Zipper', 'Magnetic', 'Buckle', 'Open'] }
        ]
      },
      {
        code: 'backpacks',
        displayName: 'Backpacks',
        attributes: [
          { key: 'capacity', displayName: 'Capacity', type: 'number', unit: 'L' },
          { key: 'laptop_compatible', displayName: 'Laptop Compatible', type: 'boolean' }
        ]
      }
    ],
    commonAttributes: [
      { key: 'colors', displayName: 'Available Colors', type: 'multiselect', required: true },
      { key: 'dimensions', displayName: 'Dimensions (cm)', type: 'text' }
    ]
  },
  {
    primary: 'textiles',
    displayName: 'Textiles & Fabrics',
    description: 'Fabrics, yarns, and textile materials',
    subcategories: [
      {
        code: 'cotton-fabric',
        displayName: 'Cotton Fabric',
        attributes: [
          { key: 'gsm', displayName: 'GSM (Weight)', type: 'number', unit: 'g/m²', required: true },
          { key: 'weave_type', displayName: 'Weave Type', type: 'select', options: ['Plain', 'Twill', 'Satin', 'Jacquard'] },
          { key: 'width', displayName: 'Width', type: 'number', unit: 'inches', required: true }
        ]
      },
      {
        code: 'silk-fabric',
        displayName: 'Silk Fabric',
        attributes: [
          { key: 'silk_type', displayName: 'Silk Type', type: 'select', options: ['Mulberry', 'Tussar', 'Eri', 'Muga'] },
          { key: 'momme', displayName: 'Momme Weight', type: 'number', required: true }
        ]
      }
    ],
    commonAttributes: [
      { key: 'color_options', displayName: 'Colors Available', type: 'multiselect', required: true },
      { key: 'pattern', displayName: 'Pattern', type: 'select', options: ['Plain', 'Printed', 'Embroidered', 'Striped'] }
    ]
  },
  {
    primary: 'electronics',
    displayName: 'Electronics',
    description: 'Electronic components and devices',
    subcategories: [
      {
        code: 'components',
        displayName: 'Electronic Components'
      },
      {
        code: 'accessories',
        displayName: 'Accessories'
      }
    ],
    commonAttributes: [
      { key: 'warranty', displayName: 'Warranty Period', type: 'text' },
      { key: 'certifications', displayName: 'Certifications', type: 'multiselect', options: ['CE', 'FCC', 'RoHS'] }
    ]
  },
  {
    primary: 'home',
    displayName: 'Home & Living',
    description: 'Home decor, furniture, and living essentials',
    subcategories: [
      {
        code: 'decor',
        displayName: 'Home Decor'
      },
      {
        code: 'furniture',
        displayName: 'Furniture'
      }
    ]
  },
  {
    primary: 'craft',
    displayName: 'Handicrafts',
    description: 'Handmade and artisan products',
    subcategories: [
      {
        code: 'pottery',
        displayName: 'Pottery & Ceramics'
      },
      {
        code: 'woodwork',
        displayName: 'Woodwork'
      },
      {
        code: 'metalwork',
        displayName: 'Metalwork'
      }
    ],
    commonAttributes: [
      { key: 'handmade', displayName: 'Handmade', type: 'boolean', required: true },
      { key: 'artisan_name', displayName: 'Artisan/Group Name', type: 'text' }
    ]
  },
  {
    primary: 'other',
    displayName: 'Other',
    description: 'Miscellaneous products',
    subcategories: [
      {
        code: 'general',
        displayName: 'General Products'
      }
    ]
  }
];