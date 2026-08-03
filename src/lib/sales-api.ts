import type {
  AdditionalCostType,
  ApiWarning,
  CustomerType,
  PaginationMeta,
  PaymentMethod,
  PaymentType,
  SaleStatus,
} from '@zirve/types';

import { apiDelete, apiGet, apiGetPaginated, apiPatch, apiPost } from './api-client';

/**
 * Satış, ödeme ve müşteri API istemcisi.
 *
 * PARA ALANLARI STRING'DİR (ARCHITECTURE §13.6). Arayüz bunları yalnız
 * biçimlendirir; toplama/çarpma yapmaz — hesap backend'in işidir.
 */

// =============================================================================
// MÜŞTERİ
// =============================================================================

export interface CustomerBalance {
  totalSales: string;
  totalPaid: string;
  currentDebt: string;
  overdueDebt: string;
  isOverLimit: boolean;
}

export interface CustomerFinanceSummary extends CustomerBalance {
  openingBalance: string;
  creditLimit: string;
  availableCredit: string;
  saleCount: number;
  salesByStatus: Record<string, number>;
}

export interface CustomerListItem extends CustomerBalance {
  id: string;
  code: string;
  type: CustomerType;
  fullName: string;
  companyName: string | null;
  phone: string;
  email: string | null;
  city: string | null;
  district: string | null;
  isActive: boolean;
  createdAt: string;
}

export interface CustomerDetail extends CustomerListItem {
  altPhone: string | null;
  taxNumber: string | null;
  taxOffice: string | null;
  address: string | null;
  creditLimit: string;
  openingBalance: string;
  note: string | null;
  updatedAt: string;
  financeSummary: CustomerFinanceSummary;
  /**
   * İŞ KURALI UYARILARI — hata değildir, kayıt başarılıdır.
   *
   * Şu an tek kaynağı mükerrer telefon. Alan yalnız uyarı VARSA döner;
   * yokluğu "uyarı yok" demektir.
   */
  warnings?: ApiWarning[];
}

/** Müşteri görüşme notu — tarihli kayıt zinciri. */
export interface CustomerNote {
  id: string;
  body: string;
  createdAt: string;
  createdBy: { id: string; fullName: string } | null;
}

export interface CustomerPayload {
  type?: CustomerType;
  fullName?: string;
  companyName?: string;
  phone?: string;
  altPhone?: string;
  email?: string;
  taxNumber?: string;
  taxOffice?: string;
  city?: string;
  district?: string;
  address?: string;
  creditLimit?: string;
  openingBalance?: string;
  note?: string;
  isActive?: boolean;
}

export interface CustomerListParams {
  page?: number;
  limit?: number;
  search?: string;
  type?: CustomerType;
  isActive?: boolean;
  hasDebt?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  [key: string]: string | number | boolean | undefined;
}

export const customersApi = {
  list: (
    params: CustomerListParams,
  ): Promise<{ items: CustomerListItem[]; meta: PaginationMeta }> =>
    apiGetPaginated<CustomerListItem>('/admin/customers', { params }),

  get: (id: string): Promise<CustomerDetail> => apiGet<CustomerDetail>(`/admin/customers/${id}`),

  financeSummary: (id: string): Promise<CustomerFinanceSummary> =>
    apiGet<CustomerFinanceSummary>(`/admin/customers/${id}/financial-summary`),

  create: (payload: CustomerPayload): Promise<CustomerDetail> =>
    apiPost<CustomerDetail, CustomerPayload>('/admin/customers', payload),

  update: (id: string, payload: CustomerPayload): Promise<CustomerDetail> =>
    apiPatch<CustomerDetail, CustomerPayload>(`/admin/customers/${id}`, payload),

  remove: (id: string): Promise<void> => apiDelete<void>(`/admin/customers/${id}`),

  /**
   * Kartsız (perakende) satışların bağlandığı sistem kartı.
   *
   * Seed çalıştırılmamış bir kurulumda 404 döner; çağıran taraf o durumda
   * düğmeyi gizlemeli, hata ekranı göstermemeli.
   */
  retail: (): Promise<CustomerListItem> => apiGet<CustomerListItem>('/admin/customers/retail'),

  /**
   * Mükerrer telefon ÖN KONTROLÜ.
   *
   * Kaydı engellemez; formun kullanıcıyı kaydetmeden uyarabilmesi içindir.
   */
  checkDuplicatePhone: (
    phone: string,
    excludeId?: string,
  ): Promise<{ isDuplicate: boolean; warning: ApiWarning | null }> =>
    apiGet('/admin/customers/check-duplicate', {
      params: { phone, ...(excludeId !== undefined && { excludeId }) },
    }),

  notes: (
    id: string,
    params: { page?: number; limit?: number } = {},
  ): Promise<{ items: CustomerNote[]; meta: PaginationMeta }> =>
    apiGetPaginated<CustomerNote>(`/admin/customers/${id}/notes`, { params }),

  addNote: (id: string, body: string): Promise<CustomerNote> =>
    apiPost<CustomerNote, { body: string }>(`/admin/customers/${id}/notes`, { body }),

  sales: (
    id: string,
    params: { page?: number; limit?: number } = {},
  ): Promise<{ items: SaleListItem[]; meta: PaginationMeta }> =>
    apiGetPaginated<SaleListItem>(`/admin/customers/${id}/sales`, { params }),

  payments: (
    id: string,
    params: { page?: number; limit?: number } = {},
  ): Promise<{ items: PaymentListItem[]; meta: PaginationMeta }> =>
    apiGetPaginated<PaymentListItem>(`/admin/customers/${id}/payments`, { params }),
};

// =============================================================================
// SATIŞ
// =============================================================================

export interface SaleItem {
  id: string;
  productId: string | null;
  variantId: string | null;
  productNameSnapshot: string;
  variantNameSnapshot: string | null;
  skuSnapshot: string;
  unitTypeSnapshot: string;
  quantity: string;
  /** HASSAS: yalnız yönetim yanıtında bulunur. */
  unitPurchasePrice: string;
  unitSalePrice: string;
  discountAmount: string;
  lineSubtotal: string;
  lineTotal: string;
  /** HASSAS. */
  lineCost: string;
  /** HASSAS. Negatif olabilir (zararına satış). */
  lineProfit: string;
  sortOrder: number;
  product: { slug: string; deletedAt: string | null } | null;
}

export interface SalePayment {
  id: string;
  paymentNumber: string;
  method: PaymentMethod;
  amount: string;
  paymentDate: string;
  dueDate: string | null;
  reference: string | null;
  note: string | null;
  createdBy: { id: string; fullName: string } | null;
}

export interface SaleAdditionalCost {
  id: string;
  costType: string;
  description: string | null;
  amount: string;
  createdAt: string;
  createdBy: { id: string; fullName: string } | null;
}

export interface SaleListItem {
  id: string;
  saleNumber: string;
  status: SaleStatus;
  paymentType: PaymentType;
  currency: string;
  subtotal: string;
  discountTotal: string;
  grandTotal: string;
  paidTotal: string;
  remainingTotal: string;
  /** HASSAS. */
  grossProfit: string;
  netProfit: string;
  saleDate: string;
  dueDate: string | null;
  confirmedAt: string | null;
  cancelledAt: string | null;
  createdAt: string;
  customer: { id: string; code: string; fullName: string; phone: string };
  createdBy: { id: string; fullName: string } | null;
  inquiry: { id: string; inquiryNumber: string } | null;
  _count: { items: number; payments: number };
}

export interface SaleDetail extends Omit<SaleListItem, 'customer'> {
  /**
   * Detay yanıtı listeden DAHA FAZLA müşteri alanı döndürür
   * (sales.select.ts -> ADMIN_SALE_DETAIL_SELECT). `Omit` ile geçersiz
   * kılınıyor; aksi hâlde `city`/`district` tipte görünmez.
   */
  customer: {
    id: string;
    code: string;
    fullName: string;
    companyName: string | null;
    phone: string;
    email: string | null;
    city: string | null;
    district: string | null;
    creditLimit: string;
  };
  taxTotal: string;
  costTotal: string;
  additionalCostTotal: string;
  note: string | null;
  cancelReason: string | null;
  updatedAt: string;
  cancelledBy: { id: string; fullName: string } | null;
  items: SaleItem[];
  payments: SalePayment[];
  additionalCosts: SaleAdditionalCost[];
}

export interface SaleItemPayload {
  variantId: string;
  quantity: string;
  unitSalePrice?: string;
  discountAmount?: string;
}

export interface CreateSalePayload {
  customerId: string;
  saleDate: string;
  paymentType: PaymentType;
  dueDate?: string;
  items: SaleItemPayload[];
  initialPayment?: {
    method: PaymentMethod;
    amount: string;
    dueDate?: string;
    reference?: string;
    note?: string;
  };
  note?: string;
}

export interface SaleListParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  customerId?: string;
  paymentType?: PaymentType;
  overdue?: string;
  dateFrom?: string;
  dateTo?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  [key: string]: string | number | boolean | undefined;
}

export const salesApi = {
  list: (params: SaleListParams): Promise<{ items: SaleListItem[]; meta: PaginationMeta }> =>
    apiGetPaginated<SaleListItem>('/admin/sales', { params }),

  counts: (): Promise<Record<string, number>> =>
    apiGet<Record<string, number>>('/admin/sales/counts'),

  get: (id: string): Promise<SaleDetail> => apiGet<SaleDetail>(`/admin/sales/${id}`),

  create: (payload: CreateSalePayload): Promise<SaleDetail> =>
    apiPost<SaleDetail, CreateSalePayload>('/admin/sales', payload),

  update: (id: string, payload: Partial<CreateSalePayload>): Promise<SaleDetail> =>
    apiPatch<SaleDetail, Partial<CreateSalePayload>>(`/admin/sales/${id}`, payload),

  finalize: (id: string): Promise<SaleDetail> => apiPost<SaleDetail>(`/admin/sales/${id}/finalize`),

  cancel: (id: string, reason: string): Promise<SaleDetail> =>
    apiPost<SaleDetail, { reason: string }>(`/admin/sales/${id}/cancel`, { reason }),

  addPayment: (
    id: string,
    payload: {
      method: PaymentMethod;
      amount: string;
      paymentDate: string;
      dueDate?: string;
      reference?: string;
      note?: string;
    },
  ): Promise<SalePayment> =>
    apiPost<SalePayment, typeof payload>(`/admin/sales/${id}/payments`, payload),

  addAdditionalCost: (
    id: string,
    payload: { costType: AdditionalCostType; amount: string; description?: string },
  ): Promise<SaleDetail> =>
    apiPost<SaleDetail, typeof payload>(`/admin/sales/${id}/additional-costs`, payload),

  removeAdditionalCost: (id: string, costId: string): Promise<SaleDetail> =>
    apiDelete<SaleDetail>(`/admin/sales/${id}/additional-costs/${costId}`),
};

// =============================================================================
// ÖDEME
// =============================================================================

export interface PaymentListItem {
  id: string;
  paymentNumber: string;
  method: PaymentMethod;
  amount: string;
  currency: string;
  paymentDate: string;
  dueDate: string | null;
  reference: string | null;
  note: string | null;
  createdAt: string;
  sale: { id: string; saleNumber: string; status: SaleStatus };
  customer: { id: string; code: string; fullName: string; phone: string };
  createdBy: { id: string; fullName: string } | null;
}

export interface PaymentListParams {
  page?: number;
  limit?: number;
  search?: string;
  method?: PaymentMethod;
  customerId?: string;
  saleId?: string;
  dateFrom?: string;
  dateTo?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  [key: string]: string | number | boolean | undefined;
}

/** Ödeme listesi meta'sı filtrelenmiş tahsilat toplamını da taşır. */
export interface PaymentListMeta extends PaginationMeta {
  totalAmount: string;
}

export const paymentsApi = {
  list: (params: PaymentListParams): Promise<{ items: PaymentListItem[]; meta: PaymentListMeta }> =>
    apiGetPaginated<PaymentListItem>('/admin/payments', { params }) as Promise<{
      items: PaymentListItem[];
      meta: PaymentListMeta;
    }>,

  remove: (id: string, reason: string): Promise<void> =>
    apiDelete<void>(`/admin/payments/${id}`, { data: { reason } }),
};

// =============================================================================
// TALEP -> SATIŞ DÖNÜŞÜMÜ
// =============================================================================

export interface ConvertInquiryPayload {
  customerId?: string;
  newCustomerName?: string;
  paymentType: PaymentType;
  dueDate?: string;
  saleDate?: string;
  items?: SaleItemPayload[];
  note?: string;
}

export const inquiryConversionApi = {
  convert: (inquiryId: string, payload: ConvertInquiryPayload): Promise<SaleListItem> =>
    apiPost<SaleListItem, ConvertInquiryPayload>(
      `/admin/inquiries/${inquiryId}/convert-to-sale`,
      payload,
    ),
};
