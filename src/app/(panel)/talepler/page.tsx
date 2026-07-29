import type { Metadata } from 'next';

import { InquiriesListPage } from '@/components/admin/inquiries/inquiries-list-page';

export const metadata: Metadata = { title: 'Talepler' };

export default function Page() {
  return <InquiriesListPage />;
}
