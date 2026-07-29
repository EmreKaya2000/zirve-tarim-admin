/**
 * Görüntüleme biçimlendiricileri.
 *
 * PARA HER ZAMAN STRING GELİR (docs/ARCHITECTURE.md §13.6). Buradaki
 * `Number()` çevrimi YALNIZ EKRANA YAZMAK içindir — hesaplama asla
 * JS float ile yapılmaz (Kural 2). Toplam/çarpım gerekiyorsa backend
 * hesaplar; arayüz yalnız gösterir.
 */

const CURRENCY = 'TRY';
const LOCALE = 'tr-TR';

/** Parasal değeri kuruşuyla gösterir: "1.234,50 ₺". */
export function formatMoney(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === '') {
    return '—';
  }

  return new Intl.NumberFormat(LOCALE, {
    style: 'currency',
    currency: CURRENCY,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value));
}

/** Parasal değeri kuruşsuz gösterir — liste ve kart görünümleri için. */
export function formatMoneyShort(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === '') {
    return '—';
  }

  return new Intl.NumberFormat(LOCALE, {
    style: 'currency',
    currency: CURRENCY,
    maximumFractionDigits: 0,
  }).format(Number(value));
}

/**
 * Miktarı gereksiz sıfırlar olmadan gösterir: "5", "2,5".
 *
 * Backend Decimal'i "5.000" gibi gönderir; kullanıcıya bu biçim anlamsızdır.
 */
export function formatQuantity(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === '') {
    return '—';
  }

  return new Intl.NumberFormat(LOCALE, { maximumFractionDigits: 3 }).format(Number(value));
}

/** "5 kg", "10 adet" gibi miktar + birim metni. */
export function formatUnitQuantity(quantity: string, unitCode: string): string {
  return `${formatQuantity(quantity)} ${unitCode}`;
}

/** Tam sayı biçimi: "1.234". */
export function formatCount(value: number): string {
  return new Intl.NumberFormat(LOCALE).format(value);
}

/** Tarihi "27 Temmuz 2026" biçiminde gösterir. */
export function formatDate(value: string | Date): string {
  return new Intl.DateTimeFormat(LOCALE, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(typeof value === 'string' ? new Date(value) : value);
}
