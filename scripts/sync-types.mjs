import { access, cp, readdir, rm, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * `@zirve/types` sözleşme paketini Api deposundan KOPYALAR.
 *
 * =============================================================================
 * NEDEN KOPYA, NEDEN REGISTRY DEĞİL
 * =============================================================================
 * Paket API sözleşmesidir ve tek doğru kaynağı `zirve-tarim-api` deposudur:
 * 71 tip + 116 çalışma zamanı değeri. İkincisi kritik — bunlar yalnız sabit
 * değil, API ile arayüzün PAYLAŞTIĞI iş kuralları: talep durum makinesi
 * (`ALLOWED_INQUIRY_TRANSITIONS`, `canTransitionInquiry`), satış izinleri
 * (`canCancelSale`, `canEditSale`), `MAX_LIMIT`, `ERROR_CODES` ve 20+ etiket
 * haritası.
 *
 * Registry'den çekmek en temiz yol olurdu ama paket PRIVATE: o zaman her
 * geliştirici makinesi ve her CI işi `NODE_AUTH_TOKEN` ister. Kopya, token
 * kurulmadan çalışan bir sistem verir ve tek doğru kaynağı korur.
 *
 * AYRIŞMA CI'DA YAKALANIR: `pnpm types:check` bu betiği çalıştırıp
 * `git diff --exit-code` ile fark arar. Elle düzenlenen bir kopya derlemeyi
 * kırar — sessizce ayrışamaz.
 *
 * Bu projede ayrışmanın bedeli bir kez ödendi: ürün formu taksonomi
 * listelerini `limit=200` ile çekiyordu, API'nin sınırı 100'dü; yedi liste 400
 * dönüyor ve ölçü birimi gelmediği için varyasyon oluşturulamıyordu.
 *
 * REGISTRY'YE GEÇİŞ: Api deposundaki README'de 4 adım. Import yolları
 * (`@zirve/types`) değişmediği için uygulama kodu etkilenmez.
 * =============================================================================
 *
 * Kaynak deponun yeri `ZIRVE_API_REPO` ile verilebilir; verilmezse bu deponun
 * yanında `zirve-tarim-api` klasörü aranır.
 */

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const target = join(repoRoot, 'src', 'types');

const apiRepo = process.env.ZIRVE_API_REPO ?? resolve(repoRoot, '..', 'zirve-tarim-api');
const source = join(apiRepo, 'packages', 'types', 'src');

const HEADER = `/*
 * ============================================================================
 * ELLE DÜZENLEMEYİN — BU DOSYA KOPYADIR
 * ============================================================================
 * Kaynak: zirve-tarim-api / packages/types/src
 * Güncellemek için: pnpm sync:types
 *
 * Buradaki bir değişiklik ilk senkronda kaybolur ve CI'da \`pnpm types:check\`
 * adımını kırar. Sözleşmeyi değiştirmek gerekiyorsa Api deposunda değiştirin.
 * ============================================================================
 */

`;

async function exists(path) {
  try {
    await access(path);

    return true;
  } catch {
    return false;
  }
}

/** Kopyalanan her .ts dosyasının başına uyarı başlığını ekler. */
async function stampHeaders(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);

    if (entry.isDirectory()) {
      await stampHeaders(path);
      continue;
    }

    if (!entry.name.endsWith('.ts')) {
      continue;
    }

    const { readFile } = await import('node:fs/promises');
    const content = await readFile(path, 'utf8');

    await writeFile(path, HEADER + content);
  }
}

async function main() {
  if (!(await exists(source))) {
    console.error(
      `Kaynak bulunamadı: ${source}\n` +
        'Api deposunu bu deponun yanına klonlayın:\n' +
        '  git clone https://github.com/EmreKaya2000/zirve-tarim-api.git\n' +
        'ya da yolunu verin:\n' +
        '  ZIRVE_API_REPO=/yol/zirve-tarim-api pnpm sync:types',
    );
    process.exit(1);
  }

  await rm(target, { recursive: true, force: true });
  await cp(source, target, { recursive: true });
  await stampHeaders(target);

  console.log(`@zirve/types senkronlandı: ${source} -> ${target}`);
}

await main();
