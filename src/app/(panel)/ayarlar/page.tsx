import type { Metadata } from 'next';

import { SettingsPage } from '@/components/admin/pages/ayarlar-page';

export const metadata: Metadata = { title: 'Ayarlar' };

export default function Page() {
  return <SettingsPage />;
}
