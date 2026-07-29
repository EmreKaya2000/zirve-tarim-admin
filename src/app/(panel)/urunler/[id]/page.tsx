import type { Metadata } from 'next';

import { ProductForm } from '@/components/admin/products/product-form';

export const metadata: Metadata = { title: 'Ürün Düzenle' };

/**
 * Ürün düzenleme sayfası.
 *
 * Next.js 15'te `params` bir Promise'tir; sunucu bileşeninde beklenir.
 */
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return <ProductForm productId={id} />;
}
