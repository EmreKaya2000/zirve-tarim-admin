'use client';

import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Loader2, Menu } from 'lucide-react';
import { Avatar } from '@zirve/ui';
import { USER_ROLE_LABELS } from '@zirve/types';

import { authApi } from '@/lib/auth-api';
import { useAuthStore } from '@/lib/auth-store';
import { useAuth, LOGIN_PATH } from '@/providers/auth-provider';
import { AdminSidebar } from './admin-sidebar';

/**
 * Korumalı yönetim paneli kabuğu.
 *
 * KORUMA KATMANI NOTU: Bu istemci tarafı koruma yalnızca kullanıcı deneyimi
 * içindir (Kural 10) — yetkisiz birinin panel HTML'ini görmesi bir güvenlik
 * ihlali değildir, çünkü içindeki HİÇBİR veri jetonsuz API'den gelmez.
 * Gerçek koruma backend'deki global JwtAuthGuard + RolesGuard'dadır.
 */
export function AdminShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { isAuthenticated, isHydrated } = useAuth();
  const storedUser = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);
  const [drawerOpen, setDrawerOpen] = useState(false);

  /**
   * Profili sunucudan tazeler.
   *
   * localStorage'daki `user` eskimiş olabilir (rol değişmiş, hesap pasife
   * alınmış olabilir). Bu sorgu hem doğrulama hem tazeleme yapar; 401 gelirse
   * api-client zaten login'e yönlendirir.
   */
  const { data: profile, isLoading } = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: authApi.me,
    enabled: isHydrated && isAuthenticated,
    staleTime: 5 * 60_000,
    retry: false,
  });

  useEffect(() => {
    if (profile !== undefined) {
      setUser(profile);
    }
  }, [profile, setUser]);

  // Oturum yoksa login'e yönlendir.
  useEffect(() => {
    if (isHydrated && !isAuthenticated) {
      router.replace(LOGIN_PATH);
    }
  }, [isHydrated, isAuthenticated, router]);

  const handleLogout = useCallback(async () => {
    await authApi.logout();
    router.replace(LOGIN_PATH);
  }, [router]);

  // Yönlendirme kararı verilene kadar içerik gösterilmez.
  if (!isHydrated || !isAuthenticated) {
    return <FullPageLoader label="Oturum kontrol ediliyor..." />;
  }

  const user = profile ?? storedUser;

  if (user === null && isLoading) {
    return <FullPageLoader label="Panel yükleniyor..." />;
  }

  return (
    <div className="min-h-screen bg-surface">
      <AdminSidebar
        user={user}
        onLogout={handleLogout}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
      />

      <div className="lg:pl-64">
        {/* Üst bar — mobilde menü düğmesi, sağda kullanıcı özeti */}
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b border-outline-variant bg-surface/80 px-4 backdrop-blur-sm lg:px-8">
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            className="inline-flex size-10 items-center justify-center rounded-[8px] text-on-surface-variant transition-colors hover:bg-surface-container lg:hidden"
            aria-label="Menüyü aç"
          >
            <Menu className="size-5" />
          </button>

          <span className="hidden text-sm text-on-surface-variant lg:block">Yönetim Paneli</span>

          {user !== null ? (
            <div className="flex items-center gap-3">
              <div className="hidden text-right sm:block">
                <p className="text-label-md text-on-surface">{user.fullName}</p>
                <p className="text-label-sm uppercase text-outline">
                  {USER_ROLE_LABELS[user.role]}
                </p>
              </div>
              <Avatar name={user.fullName} size="sm" tone="dark" />
            </div>
          ) : null}
        </header>

        <main className="px-4 py-8 lg:px-8">
          <div className="mx-auto max-w-[1440px]">{children}</div>
        </main>
      </div>
    </div>
  );
}

function FullPageLoader({ label }: { label: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-surface">
      <div className="flex flex-col items-center gap-3 text-on-surface-variant">
        <Loader2 className="size-6 animate-spin" aria-hidden="true" />
        <p className="text-sm">{label}</p>
      </div>
    </div>
  );
}
