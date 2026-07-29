import type { Metadata } from 'next';

import { BrandsPage } from '@/components/admin/pages/markalar-page';

export const metadata: Metadata = { title: 'Markalar' };

export default function Page() {
  return <BrandsPage />;
}
