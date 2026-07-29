import type { Metadata } from 'next';

import { SideEffectsPage } from '@/components/admin/pages/yan-etkiler-page';

export const metadata: Metadata = { title: 'Yan Etkiler' };

export default function Page() {
  return <SideEffectsPage />;
}
