import type { PaginationMeta, ProductRelationType } from '@zirve/types';

import { apiDelete, apiGet, apiGetPaginated, apiPatch, apiPost, apiClient } from './api-client';

// =============================================================================
// TİPLER
// =============================================================================

export interface ProductVariant {
  id: string;
  sku: string;
  name: string | null;
  unitTypeId: string;
  unitQuantity: string;
  /** HASSAS: yalnız yönetim yanıtında bulunur. */
  purchasePrice?: string;
  salePrice?: string;
  taxRate: string;
  minOrderQuantity: string;
  quantityStep: string;
  maxOrderQuantity: string | null;
  stockQuantity: string;
  lowStockThreshold: string;
  /**
   * Stok takibi açık mı?
   *
   * BU ALAN BİR SÜRE LİSTE UCUNDA DÖNMÜYORDU ve tip bunu zorunlu ilan
   * ettiği için derleyici sessiz kaldı: `isOutOfStock(variant)` çalışma
   * zamanında `undefined && ...` ile falsy'ye düşüp stoğu SIFIR olan her
   * varyasyonu "yeterli" gösteriyordu. API tarafında düzeltildi
   * (`ADMIN_PRODUCT_LIST_SELECT`); yeni alan ekleyen herkes iki seçicinin
   * de güncellendiğini doğrulamalı.
   */
  trackStock: boolean;
  isDefault: boolean;
  isActive: boolean;
  sortOrder: number;
  unitType: { id: string; name: string; code: string; allowsDecimal: boolean };
}

export interface ProductImage {
  id: string;
  url: string;
  altText: string | null;
  isPrimary: boolean;
  sortOrder: number;
  originalName: string | null;
  sizeBytes: number;
}

export interface ProductCategoryLink {
  isPrimary: boolean;
  category: { id: string; name: string; slug: string };
}

/** Taksonomi bağlantısı — form tarafında kullanılan düz biçim. */
export interface TaxonomyLink {
  id: string;
  note?: string;
  sortOrder?: number;
  severityOverride?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  shortDescription: string | null;
  description: string | null;
  brandId: string | null;
  brand: { id: string; name: string; slug: string } | null;
  usageInstructions: string | null;
  ingredients: string | null;
  storageConditions: string | null;
  licenseNumber: string | null;
  isActive: boolean;
  isPublished: boolean;
  showPrice: boolean;
  isFeatured: boolean;
  isNew: boolean;
  isPopular: boolean;
  metaTitle: string | null;
  metaDesc: string | null;
  sortOrder: number;
  viewCount: number;
  createdAt: string;
  updatedAt: string;
  categories: ProductCategoryLink[];
  images: ProductImage[];
  variants: ProductVariant[];
  plants: { plantId: string; note: string | null; plant: { name: string } }[];
  soilTypes: { soilTypeId: string; note: string | null; soilType: { name: string } }[];
  benefits: {
    benefitId: string;
    note: string | null;
    sortOrder: number;
    benefit: { name: string };
  }[];
  sideEffects: {
    sideEffectId: string;
    note: string | null;
    severityOverride: string | null;
    sortOrder: number;
    sideEffect: { name: string; severity: string };
  }[];
  usagePeriods: { usagePeriodId: string; note: string | null; usagePeriod: { name: string } }[];
  _count?: { variants: number; images: number };
}

export interface ProductRelationView {
  id: string;
  type: ProductRelationType;
  note: string | null;
  sortOrder: number;
  isSource: boolean;
  product: { id: string; name: string; slug: string; imageUrl: string | null };
}

export interface ProductListParams {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  categoryId?: string;
  brandId?: string;
  isActive?: boolean;
  isPublished?: boolean;
  lowStock?: boolean;
  [key: string]: string | number | boolean | undefined;
}

/** Ürün kaydetme gövdesi. */
export interface ProductPayload {
  name?: string;
  shortDescription?: string;
  description?: string;
  brandId?: string;
  usageInstructions?: string;
  ingredients?: string;
  storageConditions?: string;
  licenseNumber?: string;
  isActive?: boolean;
  isPublished?: boolean;
  showPrice?: boolean;
  isFeatured?: boolean;
  isNew?: boolean;
  isPopular?: boolean;
  metaTitle?: string;
  metaDesc?: string;
  sortOrder?: number;
  categories?: { categoryId: string; isPrimary?: boolean }[];
  plants?: TaxonomyLink[];
  soilTypes?: TaxonomyLink[];
  benefits?: TaxonomyLink[];
  sideEffects?: TaxonomyLink[];
  usagePeriods?: TaxonomyLink[];
}

/**
 * Ürün oluşturma gövdesi.
 *
 * `variants` ZORUNLUDUR ve en az biri aktif olmalıdır (SPEC §15.3): fiyat,
 * stok ve SKU varyasyon düzeyinde tutulduğu için varyasyonsuz ürün satılabilir
 * bir kayıt değildir. Backend ürünü ve varyasyonlarını AYNI transaction'da
 * yazar; biri geçersizse hiçbiri kaydedilmez.
 */
export interface CreateProductPayload extends ProductPayload {
  variants: VariantPayload[];
}

export interface VariantPayload {
  sku?: string;
  name?: string;
  unitTypeId?: string;
  unitQuantity?: string;
  purchasePrice?: string;
  salePrice?: string;
  taxRate?: string;
  minOrderQuantity?: string;
  quantityStep?: string;
  maxOrderQuantity?: string;
  stockQuantity?: string;
  lowStockThreshold?: string;
  trackStock?: boolean;
  isDefault?: boolean;
  isActive?: boolean;
  sortOrder?: number;
}

// =============================================================================
// İSTEMCİ
// =============================================================================

export const productsApi = {
  list: (params: ProductListParams): Promise<{ items: Product[]; meta: PaginationMeta }> =>
    apiGetPaginated<Product>('/admin/products', { params }),

  get: (id: string): Promise<Product> => apiGet<Product>(`/admin/products/${id}`),

  create: (payload: CreateProductPayload): Promise<Product> =>
    apiPost<Product, CreateProductPayload>('/admin/products', payload),

  update: (id: string, payload: ProductPayload): Promise<Product> =>
    apiPatch<Product, ProductPayload>(`/admin/products/${id}`, payload),

  remove: (id: string): Promise<void> => apiDelete<void>(`/admin/products/${id}`),

  // --- Varyasyonlar ---

  listVariants: (productId: string): Promise<ProductVariant[]> =>
    apiGet<ProductVariant[]>(`/admin/products/${productId}/variants`),

  createVariant: (productId: string, payload: VariantPayload): Promise<ProductVariant> =>
    apiPost<ProductVariant, VariantPayload>(`/admin/products/${productId}/variants`, payload),

  updateVariant: (
    productId: string,
    variantId: string,
    payload: VariantPayload,
  ): Promise<ProductVariant> =>
    apiPatch<ProductVariant, VariantPayload>(
      `/admin/products/${productId}/variants/${variantId}`,
      payload,
    ),

  removeVariant: (productId: string, variantId: string): Promise<void> =>
    apiDelete<void>(`/admin/products/${productId}/variants/${variantId}`),

  // --- Görseller ---

  /**
   * Çoklu görsel yükler.
   *
   * `Content-Type` başlığı BİLİNÇLİ OLARAK ayarlanmaz: tarayıcının
   * `multipart/form-data` sınırını (boundary) kendisi üretmesi gerekir.
   * Elle ayarlanırsa sunucu gövdeyi ayrıştıramaz.
   */
  uploadImages: async (productId: string, files: File[]): Promise<ProductImage[]> => {
    const formData = new FormData();

    for (const file of files) {
      formData.append('files', file);
    }

    const response = await apiClient.post<{ success: true; data: ProductImage[] }>(
      `/admin/products/${productId}/images`,
      formData,
      { headers: { 'Content-Type': undefined } },
    );

    return response.data.data;
  },

  removeImage: (productId: string, imageId: string): Promise<void> =>
    apiDelete<void>(`/admin/products/${productId}/images/${imageId}`),

  reorderImages: (productId: string, imageIds: string[]): Promise<ProductImage[]> =>
    apiPatch<ProductImage[], { imageIds: string[] }>(
      `/admin/products/${productId}/images/reorder`,
      {
        imageIds,
      },
    ),

  setPrimaryImage: (productId: string, imageId: string): Promise<ProductImage> =>
    apiPatch<ProductImage>(`/admin/products/${productId}/images/${imageId}/primary`),

  // --- İlişkiler ---

  listRelations: (productId: string): Promise<ProductRelationView[]> =>
    apiGet<ProductRelationView[]>(`/admin/products/${productId}/relations`),

  createRelation: (
    productId: string,
    payload: { targetProductId: string; type: ProductRelationType; note?: string },
  ): Promise<unknown> => apiPost(`/admin/products/${productId}/relations`, payload),

  removeRelation: (productId: string, relationId: string): Promise<void> =>
    apiDelete<void>(`/admin/products/${productId}/relations/${relationId}`),
};
