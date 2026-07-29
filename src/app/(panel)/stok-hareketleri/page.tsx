import type { Metadata } from 'next';
import { Suspense } from 'react';

import { StockMovementsPage } from '@/components/admin/stock/stock-movements-page';

export const metadata: Metadata = { title: 'Stok Hareketleri' };

/**
 * Sayfa `useSearchParams` kullanır (varyasyon/ürün ön filtresi), bu yüzden
 * Suspense sınırı ZORUNLUDUR: aksi hâlde Next.js tüm sayfayı istemci
 * tarafında render etmeye zorlar.
 */
export default function Page() {
  return (
    <Suspense fallback={null}>
      <StockMovementsPage />
    </Suspense>
  );
}
