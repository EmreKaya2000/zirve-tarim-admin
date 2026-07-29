import type { Metadata } from 'next';

import { PlantsPage } from '@/components/admin/pages/bitkiler-page';

export const metadata: Metadata = { title: 'Bitkiler' };

export default function Page() {
  return <PlantsPage />;
}
