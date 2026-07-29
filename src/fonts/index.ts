import localFont from 'next/font/local';

/**
 * Yazı tipleri DEPODA barındırılır, build sırasında indirilmez.
 *
 * NEDEN `next/font/google` DEĞİL:
 *  1. `next/font/google` derleme anında fonts.googleapis.com'a bağlanır.
 *     Docker build ortamımızda bu adrese erişim YOK; build sessizce asılıp
 *     "DeadlineExceeded" ile düşüyordu. Ağa bağlı build kırılgandır.
 *  2. Hermetik build: aynı kaynak her ortamda aynı çıktıyı üretir.
 *  3. KVKK/GDPR: ziyaretçinin IP'si Google'a gitmez.
 *
 * Dosyalar Google Fonts'tan alınmıştır (SIL Open Font License 1.1).
 * Güncellemek için woff2 dosyalarını değiştirmek yeterlidir.
 */

/**
 * Manrope — gövde yazı tipi. Değişken font (variable), 200-800 ağırlık aralığı.
 * İki alt küme: `latin` ve Türkçe karakterler için `latin-ext`.
 */
export const manrope = localFont({
  src: [
    { path: './manrope-latin.woff2', weight: '200 800', style: 'normal' },
    { path: './manrope-latin-ext.woff2', weight: '200 800', style: 'normal' },
  ],
  variable: '--font-manrope',
  display: 'swap',
  fallback: ['ui-sans-serif', 'system-ui', 'sans-serif'],
  preload: true,
});

/**
 * Courier Prime — finansal rakamlar ve teknik kodlar (SKU, belge no).
 * Sabit genişlikli olduğu için tablolarda basamaklar dikey hizalanır.
 */
export const courierPrime = localFont({
  src: [
    { path: './courier-prime-400.woff2', weight: '400', style: 'normal' },
    { path: './courier-prime-700.woff2', weight: '700', style: 'normal' },
  ],
  variable: '--font-courier-prime',
  display: 'swap',
  fallback: ['ui-monospace', 'monospace'],
  // Yalnız tablo/tutar alanlarında kullanılır; ilk boyamada gerekmez.
  preload: false,
});
