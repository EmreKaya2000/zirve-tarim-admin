import type { Metadata } from 'next';

import { ProductsListPage } from '@/components/admin/products/products-list-page';

export const metadata: Metadata = { title: 'Ürünler' };

export default function Page() {
  return <ProductsListPage />;
}
