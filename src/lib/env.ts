/**
 * İstemci/sunucu ortam değişkenlerine tip güvenli erişim.
 *
 * `NEXT_PUBLIC_` öneki olmayan değişkenler tarayıcıya gönderilmez; bu dosya
 * hangisinin nerede kullanılabileceğini açıkça ayırır.
 */

function required(name: string, value: string | undefined): string {
  if (value === undefined || value.trim() === '') {
    throw new Error(`Ortam değişkeni eksik: ${name}. Kök dizindeki .env.example dosyasına bakın.`);
  }

  return value;
}

/** Tarayıcıdan erişilebilen API adresi. */
export const PUBLIC_API_URL = required(
  'NEXT_PUBLIC_API_URL',
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1',
);

/**
 * Sunucu tarafı render sırasında kullanılacak API adresi.
 * Docker içinde servis adı üzerinden konuşulur (http://api:4000/api/v1).
 * Tanımlı değilse public adrese düşer.
 */
export const INTERNAL_API_URL = process.env.INTERNAL_API_URL ?? PUBLIC_API_URL;

export const SITE_NAME = process.env.NEXT_PUBLIC_SITE_NAME ?? 'Zirve Tarım';

export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

/** Kod sunucuda mı çalışıyor? */
export const IS_SERVER = typeof window === 'undefined';

/** Bağlama göre doğru API tabanını döndürür. */
export function resolveApiBaseUrl(): string {
  return IS_SERVER ? INTERNAL_API_URL : PUBLIC_API_URL;
}
