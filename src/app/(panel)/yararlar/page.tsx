import type { Metadata } from 'next';

import { BenefitsPage } from '@/components/admin/pages/yararlar-page';

export const metadata: Metadata = { title: 'Yararlar' };

export default function Page() {
  return <BenefitsPage />;
}
