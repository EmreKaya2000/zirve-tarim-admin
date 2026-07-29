import type { Metadata } from 'next';

import { CategoriesPage } from '@/components/admin/pages/kategoriler-page';

export const metadata: Metadata = { title: 'Kategoriler' };

export default function Page() {
  return <CategoriesPage />;
}
