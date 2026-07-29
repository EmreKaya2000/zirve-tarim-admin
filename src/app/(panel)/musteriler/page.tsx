import type { Metadata } from 'next';

import { CustomersListPage } from '@/components/admin/customers/customers-list-page';

export const metadata: Metadata = { title: 'Müşteriler' };

export default function Page() {
  return <CustomersListPage />;
}
