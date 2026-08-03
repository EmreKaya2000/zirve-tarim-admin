import type { PaginationMeta } from '@zirve/types';

import { apiDelete, apiGet, apiGetPaginated, apiPatch, apiPost, apiPut } from './api-client';

/** Tüm taksonomi kayıtlarının ortak alanları. */
export interface LookupRecord {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Category extends LookupRecord {
  parentId: string | null;
  /** Yüklenen ikon görselinin adresi; yükleme ucu üzerinden ayarlanır. */
  iconUrl: string | null;
  imageUrl: string | null;
  metaTitle: string | null;
  metaDesc: string | null;
  parent?: { id: string; name: string; slug: string } | null;
  _count?: { children: number };
}

export interface CategoryTreeNode {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  iconUrl: string | null;
  imageUrl: string | null;
  sortOrder: number;
  isActive: boolean;
  depth: number;
  children: CategoryTreeNode[];
}

export interface Brand extends LookupRecord {
  logoUrl: string | null;
  websiteUrl: string | null;
  country: string | null;
}

export interface Plant extends LookupRecord {
  latinName: string | null;
  imageUrl: string | null;
}

export interface SoilType extends LookupRecord {
  phRange: string | null;
}

export interface Benefit extends LookupRecord {
  icon: string | null;
}

export type SideEffectSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface SideEffect extends LookupRecord {
  severity: SideEffectSeverity;
  precaution: string | null;
}

export type UsagePeriod = LookupRecord;

export type MeasurementType = 'WEIGHT' | 'VOLUME' | 'COUNT' | 'PACKAGING' | 'LENGTH' | 'AREA';

export interface UnitType extends LookupRecord {
  code: string;
  measurementType: MeasurementType;
  allowsDecimal: boolean;
  conversionFactor: string | null;
}

export interface Setting {
  key: string;
  value: string;
  valueType: 'string' | 'number' | 'boolean' | 'json';
  group: string;
  description: string | null;
  isPublic: boolean;
}

/** Liste sorgu parametreleri. */
export interface LookupListParams {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  isActive?: boolean;
  [key: string]: string | number | boolean | undefined;
}

export interface PaginatedResponse<T> {
  items: T[];
  meta: PaginationMeta;
}

/**
 * Bir taksonomi kaynağı için standart CRUD istemcisi üretir.
 *
 * Sekiz modülün tamamı aynı uç desenini paylaştığı için istemci de tek
 * yerden üretilir. Yeni bir taksonomi eklendiğinde tek satır yeter.
 */
export function createLookupApi<TRecord, TCreate, TUpdate>(resource: string) {
  const base = `/admin/${resource}`;

  return {
    list: (params: LookupListParams): Promise<PaginatedResponse<TRecord>> =>
      apiGetPaginated<TRecord>(base, { params }),

    get: (id: string): Promise<TRecord> => apiGet<TRecord>(`${base}/${id}`),

    create: (payload: TCreate): Promise<TRecord> => apiPost<TRecord, TCreate>(base, payload),

    update: (id: string, payload: TUpdate): Promise<TRecord> =>
      apiPatch<TRecord, TUpdate>(`${base}/${id}`, payload),

    setActive: (id: string, isActive: boolean): Promise<TRecord> =>
      apiPatch<TRecord, { isActive: boolean }>(`${base}/${id}/status`, { isActive }),

    remove: (id: string): Promise<void> => apiDelete<void>(`${base}/${id}`),
  };
}

// --- Kaynak istemcileri ---

export const brandsApi = createLookupApi<Brand, Partial<Brand>, Partial<Brand>>('brands');
export const plantsApi = createLookupApi<Plant, Partial<Plant>, Partial<Plant>>('plants');
export const soilTypesApi = createLookupApi<SoilType, Partial<SoilType>, Partial<SoilType>>(
  'soil-types',
);
export const benefitsApi = createLookupApi<Benefit, Partial<Benefit>, Partial<Benefit>>('benefits');
export const sideEffectsApi = createLookupApi<SideEffect, Partial<SideEffect>, Partial<SideEffect>>(
  'side-effects',
);
export const usagePeriodsApi = createLookupApi<
  UsagePeriod,
  Partial<UsagePeriod>,
  Partial<UsagePeriod>
>('usage-periods');
export const unitTypesApi = createLookupApi<UnitType, Partial<UnitType>, Partial<UnitType>>(
  'unit-types',
);

/** Kategoriler: ağaç ve breadcrumb uçları ek olarak bulunur. */
export const categoriesApi = {
  ...createLookupApi<Category, Partial<Category>, Partial<Category>>('categories'),

  tree: (): Promise<CategoryTreeNode[]> => apiGet<CategoryTreeNode[]>('/admin/categories/tree'),

  breadcrumb: (id: string): Promise<{ id: string; name: string; slug: string }[]> =>
    apiGet(`/admin/categories/${id}/breadcrumb`),

  /**
   * İkon görseli yükler. Backend 128×128 WebP'e dönüştürür.
   *
   * `Content-Type` BİLEREK undefined: axios'un FormData için boundary'li
   * başlığı kendisi üretmesi gerekir. Elle 'multipart/form-data' yazmak
   * boundary'yi düşürür ve sunucu gövdeyi ayrıştıramaz.
   */
  uploadIcon: async (id: string, file: File): Promise<{ iconUrl: string }> => {
    const form = new FormData();

    form.append('file', file);

    return apiPost<{ iconUrl: string }, FormData>(`/admin/categories/${id}/icon`, form, {
      headers: { 'Content-Type': undefined },
    });
  },

  removeIcon: (id: string): Promise<void> => apiDelete<void>(`/admin/categories/${id}/icon`),
};

/** Ayarlar: kendine özgü uçlar. */
export const settingsApi = {
  list: (params?: { group?: string; search?: string }): Promise<Setting[]> =>
    apiGet<Setting[]>('/admin/settings', { params }),

  update: (key: string, value: string): Promise<Setting> =>
    apiPatch<Setting, { value: string }>(`/admin/settings/${key}`, { value }),

  updateMany: (items: { key: string; value: string }[]): Promise<Setting[]> =>
    apiPut<Setting[], { key: string; value: string }[]>('/admin/settings', items),
};
