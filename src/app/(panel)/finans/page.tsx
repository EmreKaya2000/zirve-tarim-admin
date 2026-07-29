import type { Metadata } from 'next';

import { FinanceSummaryPage } from '@/components/admin/finance/finance-summary-page';

export const metadata: Metadata = { title: 'Finans' };

export default function Page() {
  return <FinanceSummaryPage />;
}
