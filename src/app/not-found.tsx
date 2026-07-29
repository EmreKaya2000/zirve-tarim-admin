import Link from 'next/link';
import type { Metadata } from 'next';
import { PackageSearch } from 'lucide-react';
import { Button } from '@zirve/ui';

export const metadata: Metadata = {
  title: 'Sayfa bulunamadı',
  robots: { index: false, follow: false },
};

/**
 * 404 sayfası.
 *
 * Pasif veya yayından kaldırılmış bir ürünün adresi de buraya düşer:
 * `getProduct` 404 aldığında `notFound()` çağırır.
 */
export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-surface px-4 text-center">
      <span className="flex size-14 items-center justify-center rounded-full bg-surface-container-high text-on-surface-variant">
        <PackageSearch className="size-7" aria-hidden="true" />
      </span>

      <h1 className="text-h1 text-on-surface">Sayfa bulunamadı</h1>

      <p className="max-w-md text-on-surface-variant">
        Aradığınız sayfa kaldırılmış veya adresi değişmiş olabilir. Ürün kataloğumuzdan arayarak
        devam edebilirsiniz.
      </p>

      <div className="mt-2 flex flex-wrap justify-center gap-3">
        <Button asChild>
          <Link href="/urunler">Ürünlere göz at</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/">Ana sayfa</Link>
        </Button>
      </div>
    </div>
  );
}
