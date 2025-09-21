'use client';

import { ProductListing } from '@/types/protocol';
import Image from 'next/image';
import Link from 'next/link';

interface ProductCardProps {
  product: ProductListing;
}

export default function ProductCard({ product }: ProductCardProps) {
  return (
    <div className="group relative border rounded-lg overflow-hidden">
      <div className="aspect-h-1 aspect-w-1 w-full overflow-hidden bg-gray-200 lg:aspect-none h-48">
        <Image
          src={product.specifications.basic.images[0] || '/placeholder.jpg'}
          alt={product.specifications.basic.name}
          className="h-full w-full object-cover object-center lg:h-full lg:w-full"
          width={300}
          height={300}
        />
      </div>
      <div className="p-4">
        <h3 className="text-sm font-medium text-gray-900">
          <Link href={`/products/${product.id}`}>
            <span aria-hidden="true" className="absolute inset-0" />
            {product.specifications.basic.name}
          </Link>
        </h3>
        <p className="mt-1 text-sm text-gray-500">{product.category.primary} - {product.category.sub}</p>
        <div className="mt-2 flex items-center justify-between">
          <p className="text-sm font-medium text-gray-900">
            {product.specifications.basic.price.currency} {product.specifications.basic.price.amount}
          </p>
          <button className="text-sm font-medium text-blue-600 hover:text-blue-500">
            View Details
          </button>
        </div>
      </div>
    </div>
  );
}
