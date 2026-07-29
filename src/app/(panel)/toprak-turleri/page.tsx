import type { Metadata } from 'next';

import { SoilTypesPage } from '@/components/admin/pages/toprak-turleri-page';

export const metadata: Metadata = { title: 'Toprak Türleri' };

export default function Page() {
  return <SoilTypesPage />;
}
