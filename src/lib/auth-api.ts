import type { AuthUser, LoginRequest, LoginResponse } from '@zirve/types';

import { apiGet, apiPost } from './api-client';
import { authStore } from './auth-store';

/** Kimlik doğrulama uç çağrıları. */
export const authApi = {
  login: (payload: LoginRequest): Promise<LoginResponse> =>
    apiPost<LoginResponse, LoginRequest>('/auth/login', payload),

  me: (): Promise<AuthUser> => apiGet<AuthUser>('/auth/me'),

  /**
   * Çıkış.
   *
   * Sunucu hata verse bile (jeton zaten geçersizse gibi) istemci tarafı
   * oturum temizlenir: kullanıcı "çıkış yapamadım" durumunda kalmamalı.
   */
  logout: async (): Promise<void> => {
    const refreshToken = authStore.getRefreshToken();

    try {
      if (refreshToken !== null) {
        await apiPost<{ success: boolean }>('/auth/logout', { refreshToken });
      }
    } finally {
      authStore.clear();
    }
  },
};
