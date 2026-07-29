'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { AuthUser, LoginResponse } from '@zirve/types';

/**
 * Oturum durumu.
 *
 * GÜVENLİK KARARI — token nerede saklanıyor:
 *
 * `accessToken` bellekte tutulur ve `persist` ile diske YAZILMAZ (bkz.
 * `partialize`). Kısa ömürlüdür (15 dk); sayfa yenilendiğinde refresh token
 * ile sessizce yeniden alınır.
 *
 * `refreshToken` localStorage'da tutulur. Bu bir ödünleşmedir: XSS durumunda
 * okunabilir. İdeali `httpOnly` çerezdir ve Sprint 9'da ona geçilecektir;
 * bugün API çerez üretmediği için bu yol seçildi. Mobil uygulama aynı
 * sözleşmeyi `expo-secure-store` ile karşılayacak (ARCHITECTURE §4.4).
 *
 * `user` da saklanır: sayfa yenilendiğinde arayüz "boş" görünmesin diye.
 * Yetki kararları ASLA buna dayanmaz — backend her istekte yeniden doğrular.
 */
interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  refreshToken: string | null;
  /** Açılışta oturum geri yükleme denemesi tamamlandı mı? */
  isHydrated: boolean;

  setSession: (session: LoginResponse) => void;
  setUser: (user: AuthUser) => void;
  setAccessToken: (token: string) => void;
  clearSession: () => void;
  markHydrated: () => void;
}

export const AUTH_STORAGE_KEY = 'zt_auth_v1';

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isHydrated: false,

      setSession: (session) =>
        set({
          user: session.user,
          accessToken: session.accessToken,
          refreshToken: session.refreshToken,
        }),

      setUser: (user) => set({ user }),

      setAccessToken: (accessToken) => set({ accessToken }),

      clearSession: () => set({ user: null, accessToken: null, refreshToken: null }),

      markHydrated: () => set({ isHydrated: true }),
    }),
    {
      name: AUTH_STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      // accessToken bilinçli olarak DIŞARIDA: diske yazılmaz.
      partialize: (state) => ({ user: state.user, refreshToken: state.refreshToken }),
      onRehydrateStorage: () => (state) => {
        state?.markHydrated();
      },
    },
  ),
);

/** React dışından (axios interceptor) okunabilen anlık durum. */
export const authStore = {
  getAccessToken: (): string | null => useAuthStore.getState().accessToken,
  getRefreshToken: (): string | null => useAuthStore.getState().refreshToken,
  setAccessToken: (token: string): void => useAuthStore.getState().setAccessToken(token),
  setSession: (session: LoginResponse): void => useAuthStore.getState().setSession(session),
  clear: (): void => useAuthStore.getState().clearSession(),
};
