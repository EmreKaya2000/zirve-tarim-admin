import type { NextConfig } from 'next';

/**
 * API'nin köken adresi (yol öneki olmadan).
 *
 * Yüklenen görseller `/uploads/...` altında, yani `api/v1` ÖNEKİNİN DIŞINDA
 * sunulur; bu yüzden önek atılır. Sunucu tarafında konteyner ağı adresi
 * kullanılır (http://api:4000), tarayıcıya hiç sızmaz.
 */
/**
 * `/uploads` yönlendirmesinin hedef kökeni.
 *
 * DİKKAT — BU DEĞER DERLEME ANINDA GÖMÜLÜR. `rewrites()` Next tarafından
 * `routes-manifest.json` içine yazılır; çalışma zamanında yeniden
 * değerlendirilmez. Yani `INTERNAL_API_URL`i yalnız konteyner ortamına
 * vermek YETMEZ, imaj derlenirken de verilmelidir (Dockerfile bunu
 * build-arg olarak alır).
 *
 * Sprint 12'de bulunan hata: değer derleme anında `NEXT_PUBLIC_API_URL`e
 * düşüyordu (`http://localhost:4000`). Web konteynerinin içinde `localhost`
 * kendisidir; ürün görselleri 500 dönüyordu. Vitrin sayfaları etkilenmedi,
 * çünkü sunucu tarafı veri çekimi `INTERNAL_API_URL`i ÇALIŞMA ZAMANINDA okur.
 */
function apiOrigin(): string {
  const raw =
    process.env.INTERNAL_API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

  return new URL(raw).origin;
}

const nextConfig: NextConfig = {
  reactStrictMode: true,

  // Docker imajında yalnız gerekli dosyaları taşımak için (standalone çıktı).
  output: 'standalone',

  eslint: {
    // Lint ayrı bir turbo görevi olarak çalışır; build sırasında tekrarlanmaz.
    ignoreDuringBuilds: true,
  },

  typescript: {
    // typecheck ayrı bir turbo görevi; build sırasında tekrarlanmaz.
    ignoreBuildErrors: false,
  },

  images: {
    // Uzak kaynak TANIMLANMAZ ve gerekmez: ürün görselleri aşağıdaki rewrite
    // ile aynı kökenden (/uploads/...) sunulur. Böylece next/image yerel
    // optimizasyon yolunu kullanır, HTML'e mutlak adres gömülmez ve site
    // farklı bir alan adına taşındığında görseller kırılmaz.
    remotePatterns: [],
    formats: ['image/webp'],
  },

  /**
   * Yüklenen görseller API'den gelir ama tarayıcıya AYNI KÖKENDEN sunulur.
   *
   * Alternatif olan `remotePatterns` + mutlak URL yaklaşımı, API adresini
   * üretilen HTML'e gömerdi; ortam değişince tüm görseller kırılırdı.
   */
  async rewrites() {
    return [{ source: '/uploads/:path*', destination: `${apiOrigin()}/uploads/:path*` }];
  },

  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        ],
      },
    ];
  },
};

export default nextConfig;
