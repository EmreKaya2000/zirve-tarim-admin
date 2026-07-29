import type { Metadata } from 'next';

import { ReportsPage } from '@/components/admin/reports/reports-page';

export const metadata: Metadata = { title: 'Raporlar' };

export default function Page() {
  return <ReportsPage />;
}
