import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import { courierPrime, manrope } from '@/fonts';
import { ToastViewport } from '@/components/toast';
import { AuthProvider } from '@/providers/auth-provider';
import { QueryProvider } from '@/providers/query-provider';
import { SITE_NAME, SITE_URL } from '@/lib/env';

import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} Yönetim`,
    template: `%s | ${SITE_NAME} Yönetim`,
  },
  description: 'Ürün, talep, satış, stok ve finans yönetimi.',
  // PANEL İNDEKSLENMEZ. Vitrinde `index: true` doğruydu; yönetim arayüzünün
  // arama sonuçlarında görünmesi istenmez.
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#00452d',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="tr"
      className={`${manrope.variable} ${courierPrime.variable}`}
      suppressHydrationWarning
    >
      <body className="min-h-screen bg-background font-sans text-on-background antialiased">
        {/*
          YALNIZ YÖNETİCİ KİMLİĞİ.

          Monorepo'da burada `CustomerAuthProvider` (vitrin oturumu) da vardı;
          panel ve vitrin aynı uygulamada yaşadığı için ikisi birden
          yükleniyordu. Vitrin ayrı bir depoya taşındı, panel artık müşteri
          oturumunu hiç tanımıyor.
        */}
        <QueryProvider>
          <AuthProvider>{children}</AuthProvider>
        </QueryProvider>

        <ToastViewport />
      </body>
    </html>
  );
}
