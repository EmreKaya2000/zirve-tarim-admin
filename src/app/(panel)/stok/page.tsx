import type { Metadata } from 'next';

import { StockListPage } from '@/components/admin/stock/stock-list-page';

export const metadata: Metadata = { title: 'Stok' };

export default function Page() {
  return <StockListPage />;
}
