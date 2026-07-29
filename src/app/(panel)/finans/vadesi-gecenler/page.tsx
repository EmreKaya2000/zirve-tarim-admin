import type { Metadata } from 'next';

import { OverduePage } from '@/components/admin/finance/overdue-page';

export const metadata: Metadata = { title: 'Vadesi Geçenler' };

export default function Page() {
  return <OverduePage />;
}
