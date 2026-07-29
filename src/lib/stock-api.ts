import type {
  ManualStockMovementType,
  PaginationMeta,
  StockMovementDirection,
  StockMovementType,
  StockReferenceType,
} from '@zirve/types';

import { apiGetPaginated, apiPost } from './api-client';

/**
 * Stok API istemcisi (Sprint 9).
 *
 * MİKTAR VE PARA ALANLARI STRING'DİR (ARCHITECTURE §13.6). Arayüz bunları
 * yalnız biçimlendirir; toplama/çıkarma yapmaz — stok hesabı backend'in
 * işidir ve orada Decimal ile yapılır.
 *
 * STOK YAZMA UCU YOKTUR: yalnız `adjust()` vardır ve o da bir stok
 * HAREKETİ üretir. "Stoğu şu değere getir" diyen bir istemci çağrısı
 * bilinçli olarak bulunmuyor.
 */

// =============================================================================
// STOK LİSTESİ
// =============================================================================

export interface StockListItem {
  id: string;
  sku: string;
  name: string | null;
  stockQuantity: string;
  lowStockThreshold: string;
  trackStock: boolean;
  /** HASSAS: yalnız yönetim yanıtında bulunur. */
  purchasePrice: string;
  salePrice: string;
  isActive: boolean;
  deletedAt: string | null;
  updatedAt: string;
  unitType: { id: string; name: string; code: string; allowsDecimal: boolean };
  product: {
    id: string;
    name: string;
    slug: string;
    isActive: boolean;
    isPublished: boolean;
    brand: { id: string; name: string } | null;
    categories: { category: { id: string; name: string } }[];
  };
}

/** Stok listesi meta'sı kritik ve tükenmiş sayaçlarını da taşır. */
export interface StockListMeta extends PaginationMeta {
  lowStockCount: number;
  outOfStockCount: number;
}

export interface StockListParams {
  page?: number;
  limit?: number;
  search?: string;
  productId?: string;
  categoryId?: string;
  brandId?: string;
  lowStockOnly?: boolean;
  trackStock?: boolean;
  includeInactive?: boolean;
  sortBy?: 'stockQuantity' | 'sku' | 'salePrice' | 'updatedAt';
  sortOrder?: 'asc' | 'desc';
  [key: string]: string | number | boolean | undefined;
}

// =============================================================================
// HAREKET GEÇMİŞİ
// =============================================================================

export interface StockMovementItem {
  id: string;
  type: StockMovementType;
  direction: StockMovementDirection;
  quantity: string;
  previousStock: string;
  newStock: string;
  referenceType: StockReferenceType | null;
  referenceId: string | null;
  description: string | null;
  /** HASSAS. */
  unitCost: string | null;
  createdAt: string;
  createdBy: { id: string; fullName: string } | null;
  variant: {
    id: string;
    sku: string;
    name: string | null;
    unitType: { code: string; name: string };
  };
  product: { id: string; name: string; slug: string };
}

export interface StockMovementListParams {
  page?: number;
  limit?: number;
  search?: string;
  variantId?: string;
  productId?: string;
  /** Virgülle çoklu verilebilir. */
  type?: string;
  direction?: StockMovementDirection;
  referenceType?: StockReferenceType;
  referenceId?: string;
  dateFrom?: string;
  dateTo?: string;
  sortBy?: 'createdAt' | 'quantity';
  sortOrder?: 'asc' | 'desc';
  [key: string]: string | number | boolean | undefined;
}

// =============================================================================
// STOK DÜZELTME
// =============================================================================

export interface StockAdjustmentPayload {
  variantId: string;
  type: ManualStockMovementType;
  /**
   * Pozitif miktar.
   *
   * INVENTORY_ADJUSTMENT tipinde bu alan SAYILAN fiziksel stoktur; farkı ve
   * yönü backend hesaplar.
   */
  quantity: string;
  description: string;
  unitCost?: string;
}

export const stockApi = {
  list: (params: StockListParams): Promise<{ items: StockListItem[]; meta: StockListMeta }> =>
    apiGetPaginated<StockListItem>('/admin/stock', { params }) as Promise<{
      items: StockListItem[];
      meta: StockListMeta;
    }>,

  lowStock: (params: StockListParams): Promise<{ items: StockListItem[]; meta: PaginationMeta }> =>
    apiGetPaginated<StockListItem>('/admin/stock/low-stock', { params }),

  movements: (
    params: StockMovementListParams,
  ): Promise<{ items: StockMovementItem[]; meta: PaginationMeta }> =>
    apiGetPaginated<StockMovementItem>('/admin/stock/movements', { params }),

  adjust: (payload: StockAdjustmentPayload): Promise<StockMovementItem> =>
    apiPost<StockMovementItem, StockAdjustmentPayload>('/admin/stock/adjustment', payload),
};

// =============================================================================
// YARDIMCILAR
// =============================================================================

/**
 * Bir varyasyon kritik stokta mı?
 *
 * `Number()` çevrimi YALNIZ karşılaştırma içindir; ekrana yazılan değer
 * daima backend'den gelen string'in biçimlenmiş hâlidir (Kural 2).
 */
export function isLowStock(row: {
  trackStock: boolean;
  stockQuantity: string;
  lowStockThreshold: string;
}): boolean {
  return row.trackStock && Number(row.stockQuantity) <= Number(row.lowStockThreshold);
}

/** Stoğu tükenmiş mi? */
export function isOutOfStock(row: { trackStock: boolean; stockQuantity: string }): boolean {
  return row.trackStock && Number(row.stockQuantity) <= 0;
}
