import type { Metadata } from 'next';

import { CustomerDetailPage } from '@/components/admin/customers/customer-detail-page';

export const metadata: Metadata = { title: 'Müşteri Detayı' };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return <CustomerDetailPage customerId={id} />;
}
