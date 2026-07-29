import type { Metadata } from 'next';

import { UsagePeriodsPage } from '@/components/admin/pages/kullanim-donemleri-page';

export const metadata: Metadata = { title: 'Kullanım Dönemleri' };

export default function Page() {
  return <UsagePeriodsPage />;
}
