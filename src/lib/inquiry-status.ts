import type { InquiryStatus } from '@zirve/types';

/**
 * Talep durumunun rozet rengi.
 *
 * Sprint 11'de yönetim panelinden buraya taşındı: müşterinin "Taleplerim"
 * sayfası AYNI renk dilini kullanmalıdır. İki yerde ayrı ayrı yazılsaydı
 * müşteri "İnceleniyor"u sarı görürken yönetici mavi görebilirdi ve telefonda
 * konuşurken aynı şeyden bahsettiklerini anlamaları zorlaşırdı.
 *
 * Yeni talep dikkat çeker, kapanmış olan söner.
 */
export type InquiryStatusVariant = 'neutral' | 'info' | 'success' | 'warning' | 'error' | 'primary';

export function inquiryStatusVariant(status: InquiryStatus): InquiryStatusVariant {
  switch (status) {
    case 'NEW':
      return 'info';
    case 'REVIEWING':
    case 'CONTACTED':
    case 'QUOTED':
      return 'warning';
    case 'APPROVED':
    case 'CONVERTED_TO_SALE':
      return 'success';
    case 'COMPLETED':
      return 'primary';
    case 'REJECTED':
    case 'CANCELLED':
      return 'neutral';
  }
}

/**
 * Durumun MÜŞTERİYE gösterilecek açıklaması.
 *
 * `INQUIRY_STATUS_LABELS` kısa rozet metnidir ("Teklif verildi"); burada
 * müşterinin ne beklemesi gerektiği anlatılır. Yönetim paneli buna ihtiyaç
 * duymaz — yönetici süreci zaten bilir.
 */
export const CUSTOMER_INQUIRY_STATUS_HINTS: Readonly<Record<InquiryStatus, string>> = {
  NEW: 'Talebiniz bize ulaştı. En kısa sürede inceleyip size döneceğiz.',
  REVIEWING: 'Talebinizi inceliyoruz; ürün ve miktarları kontrol ediyoruz.',
  CONTACTED: 'Sizinle iletişime geçtik. Görüşmemizin ardından teklifinizi hazırlıyoruz.',
  QUOTED: 'Teklifimizi ilettik. Onayınızı bekliyoruz.',
  APPROVED: 'Talebiniz onaylandı; ürünlerinizi hazırlıyoruz.',
  CONVERTED_TO_SALE: 'Talebiniz satışa dönüştü. Ürünlerinizi mağazamızdan teslim alabilirsiniz.',
  COMPLETED: 'Talebiniz tamamlandı. İlginiz için teşekkür ederiz.',
  REJECTED: 'Bu talep karşılanamadı. Ayrıntı için bizimle iletişime geçebilirsiniz.',
  CANCELLED: 'Bu talep iptal edildi.',
};
