import type { Metadata } from 'next';

import { ProductForm } from '@/components/admin/products/product-form';

export const metadata: Metadata = { title: 'Yeni Ürün' };

export default function Page() {
  return <ProductForm />;
}
