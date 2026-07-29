/**
 * Grafik teması — renk ataması ve biçimlendiriciler.
 *
 * ============================================================
 * PALET NEDEN TASARIM SİSTEMİNİN RENKLERİ DEĞİL
 * ============================================================
 * Tasarım sisteminin `primary` (#00452d) ve `info` (#1b4d70) tonları arayüz
 * yüzeyleri için seçilmiş; koyu ve düşük kromalılar. Seri rengi olarak
 * kullanıldıklarında doğrulayıcı üç ayrı kontrolden kalıyor: açıklık bandı,
 * kroma tabanı ve — en önemlisi — birbirlerinden ayırt edilebilirlik
 * (normal görüşte ΔE 10.6; eşik 15). Yan yana iki çizgi olarak
 * bakıldığında ikisi de "koyu yeşilimsi" görünürdü.
 *
 * Bu yüzden seriler AYRI bir kategorik paletten atanır. Palet
 * doğrulayıcıdan geçirildi (light yüzey #ffffff): açıklık bandı, kroma,
 * renk körlüğü ayrımı ve normal görüş eşiği PASS.
 *
 * KONTRAST UYARISI: aqua ve sarı tonları yüzeye karşı 3:1'in altında.
 * Kural gereği bunun karşılığı verilmek zorunda — bu yüzden her grafikte
 * LEJANT ve grafiğin altında/yanında TABLO görünümü bulunur; kimlik hiçbir
 * zaman yalnız renge bırakılmaz.
 *
 * SIRA SABİTTİR, DÖNGÜSEL DEĞİL: bir filtre seri sayısını değiştirdiğinde
 * kalanların rengi kaymaz. Altıdan fazla kategori "Diğer"de toplanır.
 */

export const CHART_COLORS = [
  '#2a78d6', // 1 — mavi
  '#eb6834', // 2 — turuncu
  '#1baf7a', // 3 — aqua
  '#eda100', // 4 — sarı
  '#e87ba4', // 5 — macenta
  '#4a3aa7', // 6 — mor
] as const;

/** Kategori sayısı paleti aşarsa kalanlar bu ada toplanır. */
export const OTHER_CATEGORY_LABEL = 'Diğer';

export const MAX_CATEGORY_SLICES = CHART_COLORS.length - 1;

/**
 * Aylık grafiğin serileri.
 *
 * Renkler slot sırasına göre sabit atanır: satış her zaman mavi, tahsilat
 * her zaman turuncu, kâr her zaman aqua. Kullanıcı bir seriyi gizlese bile
 * kalanların rengi değişmez.
 */
export const MONTHLY_SERIES = [
  { key: 'sales', label: 'Satış', color: CHART_COLORS[0] },
  { key: 'payments', label: 'Tahsilat', color: CHART_COLORS[1] },
  { key: 'profit', label: 'Brüt kâr', color: CHART_COLORS[2] },
] as const;

/** Recharts eksen ve ızgara renkleri — geri planda kalmalı. */
export const CHART_INK = {
  grid: '#e1e3df',
  axis: '#bfc9c1',
  label: '#707972',
} as const;

/**
 * Eksen için kısa para biçimi: 12.500 -> "12,5B", 1.200.000 -> "1,2M".
 *
 * Eksende tam tutar yazmak etiketleri üst üste bindirir. Tam değer
 * tooltip'te ve tabloda görünür — bu yüzden kısaltma bilgi kaybı yaratmaz.
 */
export function formatAxisMoney(value: number): string {
  const absolute = Math.abs(value);

  if (absolute >= 1_000_000) {
    return `${trim(value / 1_000_000)}M`;
  }

  if (absolute >= 1_000) {
    return `${trim(value / 1_000)}B`;
  }

  return trim(value);
}

/** "2026-07" -> "Tem 26". Eksen etiketi kısa olmalı. */
export function formatMonthLabel(month: string): string {
  const [year, monthPart] = month.split('-');
  const index = Number(monthPart) - 1;

  return `${MONTH_SHORT[index] ?? month} ${(year ?? '').slice(2)}`;
}

/** "2026-07-14" -> "14 Tem". */
export function formatDayLabel(day: string): string {
  const [, monthPart, dayPart] = day.split('-');
  const index = Number(monthPart) - 1;

  return `${dayPart} ${MONTH_SHORT[index] ?? ''}`.trim();
}

const MONTH_SHORT = [
  'Oca',
  'Şub',
  'Mar',
  'Nis',
  'May',
  'Haz',
  'Tem',
  'Ağu',
  'Eyl',
  'Eki',
  'Kas',
  'Ara',
];

function trim(value: number): string {
  return new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 1 }).format(value);
}
