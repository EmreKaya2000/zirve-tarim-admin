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

/**
 * @zirve/types — API sözleşmesinin paylaşılan tanımları.
 *
 * Bu paket backend (apps/api), web (apps/web) ve ileride mobil uygulama
 * arasındaki ortak dildir. Yalnız tip, sabit ve saf yardımcı fonksiyon içerir;
 * çalışma zamanı bağımlılığı yoktur (docs/ARCHITECTURE.md §4.3).
 */

export * from './common/index';
export * from './enums/index';
