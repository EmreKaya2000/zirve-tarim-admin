import type { ReactNode } from 'react';

import { AdminShell } from '@/components/admin/admin-shell';

/**
 * Korumalı panel yerleşimi.
 *
 * Route grubu `(panel)` URL'e yansımaz: `/`, `/kullanicilar` gibi
 * yollar bu kabuğun altındadır ama `/login` DIŞINDA kalır — giriş
 * ekranının kenar çubuğu olmamalıdır.
 */
export default function PanelLayout({ children }: { children: ReactNode }) {
  return <AdminShell>{children}</AdminShell>;
}
