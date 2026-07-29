import type { Metadata } from 'next';
import { Suspense } from 'react';
import { Sprout } from 'lucide-react';

import { LoginForm } from '@/components/admin/login-form';
import { SITE_NAME } from '@/lib/env';

export const metadata: Metadata = {
  title: 'Yönetici Girişi',
  robots: { index: false, follow: false },
};

/**
 * Yönetici giriş sayfası.
 *
 * TASARIM NOTU: Bu ekran Stitch tasarım paketinde YOKTU. Tasarım sisteminin
 * kurallarına uyularak üretildi:
 *  - iki sütunlu düzen (solda marka paneli, sağda form) — masaüstü odaklı
 *    admin deneyimi; mobilde tek sütuna iner
 *  - marka paneli `primary` (#00452d) zeminde, tipografi ölçeği h1/body-lg
 *  - form kartı Level 1 yüzey: beyaz + 1px outline-variant + 12px köşe
 */
export default function AdminLoginPage() {
  return (
    <div className="flex min-h-screen">
      {/* Marka paneli — yalnız geniş ekranda */}
      <aside className="relative hidden w-1/2 flex-col justify-between bg-primary p-12 text-on-primary lg:flex xl:w-[45%]">
        <div className="flex items-center gap-3">
          <span className="flex size-11 items-center justify-center rounded-[12px] bg-primary-fixed text-on-primary-fixed">
            <Sprout className="size-6" aria-hidden="true" />
          </span>
          <div>
            <p className="text-label-md">{SITE_NAME}</p>
            <p className="text-label-sm uppercase opacity-70">Agri-Finance Suite</p>
          </div>
        </div>

        <div className="max-w-md">
          <h2 className="text-h1">Mağazanızın finansal zekâsı</h2>
          <p className="mt-4 text-body-lg opacity-80">
            Talepten satışa, stoktan tahsilata kadar tüm süreci tek panelden yönetin.
          </p>

          <ul className="mt-8 flex flex-col gap-3 text-sm opacity-80">
            <li className="flex items-center gap-2">
              <span className="size-1.5 rounded-full bg-primary-fixed" aria-hidden="true" />
              Talep ve satış takibi
            </li>
            <li className="flex items-center gap-2">
              <span className="size-1.5 rounded-full bg-primary-fixed" aria-hidden="true" />
              Cari hesap ve borç yönetimi
            </li>
            <li className="flex items-center gap-2">
              <span className="size-1.5 rounded-full bg-primary-fixed" aria-hidden="true" />
              Stok ve kâr analizi
            </li>
          </ul>
        </div>

        <p className="text-label-sm uppercase opacity-60">
          &copy; {new Date().getFullYear()} {SITE_NAME}
        </p>
      </aside>

      {/* Form paneli */}
      <main className="flex flex-1 items-center justify-center bg-surface px-4 py-12">
        <div className="w-full max-w-[420px]">
          {/* Mobilde marka paneli gizli olduğu için logo burada gösterilir */}
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <span className="flex size-11 items-center justify-center rounded-[12px] bg-primary text-on-primary">
              <Sprout className="size-6" aria-hidden="true" />
            </span>
            <div>
              <p className="text-label-md text-on-surface">{SITE_NAME}</p>
              <p className="text-label-sm uppercase text-on-surface-variant">Agri-Finance Suite</p>
            </div>
          </div>

          <div className="mb-8">
            <h1 className="text-h2 text-on-surface">Yönetici Girişi</h1>
            <p className="mt-2 text-on-surface-variant">
              Devam etmek için hesap bilgilerinizi girin.
            </p>
          </div>

          <Suspense fallback={null}>
            <LoginForm />
          </Suspense>
        </div>
      </main>
    </div>
  );
}
