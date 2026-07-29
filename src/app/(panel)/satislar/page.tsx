import type { Metadata } from 'next';

import { SalesListPage } from '@/components/admin/sales/sales-list-page';

export const metadata: Metadata = { title: 'Satışlar' };

export default function Page() {
  return <SalesListPage />;
}
