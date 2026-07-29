import type { Metadata } from 'next';

import { SaleDetailPage } from '@/components/admin/sales/sale-detail-page';

export const metadata: Metadata = { title: 'Satış Detayı' };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return <SaleDetailPage saleId={id} />;
}
