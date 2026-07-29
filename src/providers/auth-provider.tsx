'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';

import { setAuthBridge, setUnauthorizedHandler } from '@/lib/api-client';
import { authStore, useAuthStore } from '@/lib/auth-store';

/** Oturum geçersizleştiğinde yönlendirilecek sayfa. */
export const LOGIN_PATH = '/login';

/**
 * Auth altyapısını bağlar.
 *
 * İki iş yapar:
 *  1. api-client'a oturum köprüsünü verir (jeton okuma/yazma/temizleme).
 *  2. 401 sonrası yenileme de başarısız olursa kullanıcıyı login'e yollar.
 *
 * Bağlama `useRef` ile bir kez yapılır: her render'da yeniden kaydetmek
 * gereksiz ve interceptor'ların iç durumunu bozabilir.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const bridgeReady = useRef(false);

  if (!bridgeReady.current) {
    setAuthBridge(authStore);
    bridgeReady.current = true;
  }

  useEffect(() => {
    setUnauthorizedHandler(() => {
      // Zaten login sayfasındaysak yönlendirme yapma: döngü olur.
      if (window.location.pathname !== LOGIN_PATH) {
        const target = `${window.location.pathname}${window.location.search}`;
        router.replace(`${LOGIN_PATH}?next=${encodeURIComponent(target)}`);
      }
    });
  }, [router]);

  return <>{children}</>;
}

/** Oturum durumunu okuyan yardımcı kanca. */
export function useAuth() {
  const user = useAuthStore((state) => state.user);
  const accessToken = useAuthStore((state) => state.accessToken);
  const refreshToken = useAuthStore((state) => state.refreshToken);
  const isHydrated = useAuthStore((state) => state.isHydrated);

  return {
    user,
    isHydrated,
    /**
     * Oturum var sayılır: refreshToken varsa access token yoksa bile
     * sessizce yenilenebilir (sayfa yenilendiğinde bellek boşalır).
     */
    isAuthenticated: refreshToken !== null,
    hasAccessToken: accessToken !== null,
    isSuperAdmin: user?.role === 'SUPER_ADMIN',
  };
}
