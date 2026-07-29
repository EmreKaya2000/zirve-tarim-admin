import type { Metadata } from 'next';

import { ReceivablesPage } from '@/components/admin/finance/receivables-page';

export const metadata: Metadata = { title: 'Alacaklar' };

export default function Page() {
  return <ReceivablesPage />;
}
