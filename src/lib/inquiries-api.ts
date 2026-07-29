/**
 * Talep API istemcisi — YÖNETİM tarafı.
 *
 * Monorepo'da bu dosya hem vitrin hem yönetim yarısını taşıyordu ve iki
 * uygulama da onu import ediyordu. Depolar ayrıldığında "paylaşılan dosya"
 * olmadığı görüldü: BÖLÜNECEK dosyaydı. Vitrin yarısı (`/public/cart/validate`,
 * `POST /public/inquiries`, `publicInquiriesApi`) zirve-tarim-front deposunda.
 */

import type { InquirySource, InquiryStatus, PaginationMeta, PreferredContact } from '@zirve/types';

import { apiGet, apiGetPaginated, apiPatch } from './api-client';

// =============================================================================
// YÖNETİM
// =============================================================================

export interface InquiryListItem {
  id: string;
  inquiryNumber: string;
  status: InquiryStatus;
  source: InquirySource;
  contactName: string;
  contactPhone: string;
  contactEmail: string | null;
  city: string;
  district: string;
  preferredContact: PreferredContact;
  estimatedTotal: string;
  currency: string;
  contactedAt: string | null;
  closedAt: string | null;
  createdAt: string;
  updatedAt: string;
  assignedTo: { id: string; fullName: string } | null;
  /**
   * Eşleştirilmiş müşteri (Sprint 7).
   *
   * Talep public taraftan müşteri kaydı olmadan da gelebildiği için
   * nullable. Dolu olduğunda talep, müşterinin geçmişine bağlanmıştır.
   */
  customer: { id: string; code: string; fullName: string; phone: string } | null;
  _count: { items: number };
}

export interface InquiryDetailItem {
  id: string;
  productId: string | null;
  variantId: string | null;
  productNameSnapshot: string;
  variantNameSnapshot: string | null;
  skuSnapshot: string;
  unitTypeSnapshot: string;
  unitQuantitySnapshot: string;
  displayedPriceSnapshot: string | null;
  quantity: string;
  lineTotal: string | null;
  note: string | null;
  product: {
    slug: string;
    isActive: boolean;
    isPublished: boolean;
    deletedAt: string | null;
  } | null;
  variant: { isActive: boolean; stockQuantity: string; deletedAt: string | null } | null;
}

export interface InquiryStatusHistoryEntry {
  id: string;
  fromStatus: InquiryStatus | null;
  toStatus: InquiryStatus;
  note: string | null;
  createdAt: string;
  changedBy: { id: string; fullName: string } | null;
}

export interface InquiryDetail extends InquiryListItem {
  address: string | null;
  customerNote: string | null;
  internalNote: string | null;
  consentAccepted: boolean;
  consentAt: string;
  ipAddress: string | null;
  userAgent: string | null;
  items: InquiryDetailItem[];
  statusHistories: InquiryStatusHistoryEntry[];
}

export interface InquiryListParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  [key: string]: string | number | boolean | undefined;
}

export interface UpdateStatusPayload {
  status: InquiryStatus;
  note?: string;
  internalNote?: string;
}

export const inquiriesApi = {
  list: (params: InquiryListParams): Promise<{ items: InquiryListItem[]; meta: PaginationMeta }> =>
    apiGetPaginated<InquiryListItem>('/admin/inquiries', { params }),

  counts: (): Promise<Record<string, number>> =>
    apiGet<Record<string, number>>('/admin/inquiries/counts'),

  get: (id: string): Promise<InquiryDetail> => apiGet<InquiryDetail>(`/admin/inquiries/${id}`),

  updateStatus: (id: string, payload: UpdateStatusPayload): Promise<InquiryDetail> =>
    apiPatch<InquiryDetail, UpdateStatusPayload>(`/admin/inquiries/${id}/status`, payload),

  /** Talebi bir müşteriye bağlar; `null` bağı kaldırır. */
  linkCustomer: (id: string, customerId: string | null): Promise<InquiryDetail> =>
    apiPatch<InquiryDetail, { customerId: string | null }>(`/admin/inquiries/${id}`, {
      customerId,
    }),
};
