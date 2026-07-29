import type { Metadata } from 'next';

import { SaleForm } from '@/components/admin/sales/sale-form';

export const metadata: Metadata = { title: 'Yeni Satış' };

export default function Page() {
  return <SaleForm />;
}
