import type { Metadata } from 'next';

import { PaymentsListPage } from '@/components/admin/sales/payments-list-page';

export const metadata: Metadata = { title: 'Ödemeler' };

export default function Page() {
  return <PaymentsListPage />;
}
