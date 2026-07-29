import type { Metadata } from 'next';

import { UnitTypesPage } from '@/components/admin/pages/birimler-page';

export const metadata: Metadata = { title: 'Birimler' };

export default function Page() {
  return <UnitTypesPage />;
}
