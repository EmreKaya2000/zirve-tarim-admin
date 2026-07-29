import { cp, mkdir, stat } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Standalone çıktısını çalıştırılabilir hâle getirir.
 *
 * NEDEN GEREKLİ: Next, `output: 'standalone'` ile yalnız sunucu kodunu ve
 * gerekli node_modules'ü kopyalar; `.next/static` ve `public` dizinlerini
 * KOPYALAMAZ. Bunlar olmadan sunucu ayağa kalkar, HTML üretir ama tüm JS
 * ve CSS 404 döner — sayfa hidrasyon yapamaz, stil yüklenmez. Hata
 * sessizdir: sunucu 200 döndürmeye devam eder.
 *
 * Üretimde bu kopyalamayı Dockerfile yapar. Bu betik aynı işi
 * yerel çalıştırma ve Playwright testleri için yapar, böylece test edilen
 * sunucu üretimde çalışanla aynı olur.
 */

const webRoot = join(dirname(fileURLToPath(import.meta.url)), '..');

/*
 * DÜZ DEPO YOLU — monorepo'da `.next/standalone/apps/web` idi.
 *
 * Next, standalone çıktısını workspace kökünden uygulamaya giden yolu
 * yansıtacak şekilde yerleştirir. Monorepo'da bu `apps/web` alt dizini
 * demekti; tek uygulamalı bu depoda çıktı doğrudan `.next/standalone`
 * altındadır. Yol yanlış olursa betik sessizce hiçbir şey kopyalamaz,
 * sunucu ayağa kalkar ve TÜM JS/CSS 404 döner.
 */
const standaloneRoot = join(webRoot, '.next', 'standalone');

async function exists(path) {
  try {
    await stat(path);

    return true;
  } catch {
    return false;
  }
}

async function main() {
  if (!(await exists(standaloneRoot))) {
    console.error(
      `Standalone çıktısı bulunamadı: ${standaloneRoot}\n` +
        'Önce `pnpm build` çalıştırın (next.config.ts -> output: "standalone").',
    );
    process.exit(1);
  }

  const staticSource = join(webRoot, '.next', 'static');
  const staticTarget = join(standaloneRoot, '.next', 'static');

  await mkdir(dirname(staticTarget), { recursive: true });
  await cp(staticSource, staticTarget, { recursive: true });
  console.log(`Kopyalandı: .next/static -> ${staticTarget}`);

  const publicSource = join(webRoot, 'public');

  if (await exists(publicSource)) {
    await cp(publicSource, join(standaloneRoot, 'public'), { recursive: true });
    console.log('Kopyalandı: public');
  }
}

await main();
