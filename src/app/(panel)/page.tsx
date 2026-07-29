import type { Metadata } from 'next';

import { DashboardPage } from '@/components/admin/finance/dashboard-page';

export const metadata: Metadata = { title: 'Panel' };

export default function Page() {
  return <DashboardPage />;
}
