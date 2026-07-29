import type { AuthUser, PaginationMeta, UserRole } from '@zirve/types';

import { apiGetPaginated, apiPatch, apiPost } from './api-client';

export interface ListUsersParams {
  page?: number;
  limit?: number;
  search?: string;
  role?: UserRole;
  isActive?: boolean;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface CreateUserPayload {
  email: string;
  fullName: string;
  password: string;
  role: UserRole;
  phone?: string;
}

/** Yönetici kullanıcı uç çağrıları. Tümü SUPER_ADMIN yetkisi ister. */
export const usersApi = {
  list: (params: ListUsersParams): Promise<{ items: AuthUser[]; meta: PaginationMeta }> =>
    apiGetPaginated<AuthUser>('/admin/users', { params }),

  create: (payload: CreateUserPayload): Promise<AuthUser> =>
    apiPost<AuthUser, CreateUserPayload>('/admin/users', payload),

  setStatus: (id: string, isActive: boolean): Promise<AuthUser> =>
    apiPatch<AuthUser, { isActive: boolean }>(`/admin/users/${id}/status`, { isActive }),
};
