/*
 * ============================================================================
 * ELLE DÜZENLEMEYİN — BU DOSYA KOPYADIR
 * ============================================================================
 * Kaynak: zirve-tarim-api / packages/types/src
 * Güncellemek için: pnpm sync:types
 *
 * Buradaki bir değişiklik ilk senkronda kaybolur ve CI'da `pnpm types:check`
 * adımını kırar. Sözleşmeyi değiştirmek gerekiyorsa Api deposunda değiştirin.
 * ============================================================================
 */

/** Sağlık kontrolü sözleşmesi — GET /health */

/** Tek bir bileşenin durumu. */
export const HEALTH_STATUSES = ['up', 'down'] as const;

export type HealthStatus = (typeof HEALTH_STATUSES)[number];

/** Uygulamanın genel durumu. */
export const OVERALL_HEALTH_STATUSES = ['ok', 'error'] as const;

export type OverallHealthStatus = (typeof OVERALL_HEALTH_STATUSES)[number];

/** Bağımlı bir servisin (ör. veritabanı) sağlık bilgisi. */
export interface DependencyHealth {
  status: HealthStatus;
  /** Yanıt süresi (ms). Erişilemiyorsa null. */
  latencyMs: number | null;
  /** Yalnız hata durumunda ve yalnız üretim dışında doldurulur. */
  message?: string;
}

/** GET /health yanıtının `data` gövdesi. */
export interface HealthCheckResult {
  status: OverallHealthStatus;
  /** ISO 8601, UTC. */
  timestamp: string;
  /** Sürecin ayakta kalma süresi (saniye). */
  uptimeSeconds: number;
  /** package.json sürümü. */
  version: string;
  environment: string;
  dependencies: {
    database: DependencyHealth;
  };
}
