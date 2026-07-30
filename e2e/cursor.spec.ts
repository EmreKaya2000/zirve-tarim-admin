import { expect, test, type Page } from '@playwright/test';

/**
 * TIKLANABİLİR OLAN HER ŞEY EL İMLECİ GÖSTERİR.
 *
 * NEDEN BU TEST VAR
 * Tailwind v4, Preflight'tan `button { cursor: pointer }` kuralını kaldırıp
 * tarayıcının yerel varsayılanına (`default`) döndü. Yükseltmeden sonra
 * paneldeki HİÇBİR buton el imleci göstermedi ve bu fark edilmedi: hiçbir test
 * imleci ölçmüyordu, ekran görüntüsü de imleci göstermez. Kural
 * `src/app/globals.css` içindeki `@layer base` bloğunda tek yerden geri
 * verildi.
 *
 * Test SINIF ADI ARAMAZ — tarayıcının hesapladığı `cursor` değerine bakar.
 * `cursor-pointer` sınıfını aramak aynı hatayı yakalayamazdı; hata zaten
 * "sınıf yok ama olması gerektiğini kimse bilmiyor" hatasıydı.
 *
 * ÖN KOŞUL: ayakta bir API ve seed edilmiş veritabanı.
 * VERİ İZİ BIRAKMAZ: yalnız okur.
 */

const ADMIN_EMAIL = process.env['SEED_SUPER_ADMIN_EMAIL'] ?? 'admin@zirvetarim.local';
const ADMIN_PASSWORD = process.env['SEED_SUPER_ADMIN_PASSWORD'] ?? 'ZirveTarim2026';

/** Görünür olup el imleci göstermeyen öğeler. */
async function elementsWithoutPointer(page: Page) {
  return page.evaluate(() => {
    const SELECTOR = 'button:not(:disabled), a[href], [role="button"], summary, label[for]';
    const offenders: { tag: string; text: string; cursor: string }[] = [];
    let visible = 0;

    for (const node of document.querySelectorAll(SELECTOR)) {
      const rect = node.getBoundingClientRect();
      const style = getComputedStyle(node);

      // Görünmeyen öğenin imleci kullanıcıya hiç ulaşmaz; ölçmek gürültü olur.
      if (rect.width === 0 || rect.height === 0 || style.visibility === 'hidden') {
        continue;
      }

      visible += 1;

      if (style.cursor !== 'pointer') {
        offenders.push({
          tag: node.tagName.toLowerCase(),
          text: (node.textContent ?? '').trim().slice(0, 40),
          cursor: style.cursor,
        });
      }
    }

    return { visible, offenders };
  });
}

/*
 * TEK GİRİŞ, ÇOK SAYFA.
 *
 * Sayfa başına ayrı test yazmak sayfa başına bir giriş demekti; giriş ucu
 * dakikada 5 istekle sınırlı (NODE_ENV=test dışında) ve altıncı sayfa
 * ThrottlerException ile kırılırdı.
 */
const PAGES = ['/login', '/', '/urunler', '/talepler', '/stok', '/finans', '/musteriler'];

test('panelde tıklanabilir öğelerin tamamı el imleci gösterir', async ({ page }) => {
  const failures: string[] = [];

  // Giriş sayfası oturum açmadan ölçülür.
  await page.goto('/login');

  const loginResult = await elementsWithoutPointer(page);

  if (loginResult.offenders.length > 0) {
    failures.push(`/login -> ${JSON.stringify(loginResult.offenders)}`);
  }

  await page.locator('#email').fill(ADMIN_EMAIL);
  await page.locator('#password').fill(ADMIN_PASSWORD);
  await page.getByRole('button', { name: 'Giriş Yap' }).click();

  await expect(page.getByRole('heading', { name: 'Panel' })).toBeVisible({ timeout: 20_000 });

  for (const path of PAGES.slice(1)) {
    await page.goto(path);
    await page.waitForLoadState('networkidle');

    const { visible, offenders } = await elementsWithoutPointer(page);

    if (visible <= 3) {
      failures.push(`${path} -> tıklanabilir öğe bulunamadı (${visible}), sayfa yüklendi mi?`);
    }

    if (offenders.length > 0) {
      failures.push(`${path} -> ${JSON.stringify(offenders)}`);
    }
  }

  expect(failures, 'El imleci göstermeyen öğeler').toEqual([]);
});

test('devre dışı buton "basılmaz" imleci gösterir', async ({ page }) => {
  await page.goto('/login');

  /*
   * Devre dışı bir buton üretmek yerine kuralın kendisi ölçülüyor: sayfaya
   * devre dışı bir buton enjekte edilip hesaplanan imleç okunuyor. Ölçülen şey
   * CSS kuralı, o yüzden bu geçerli bir doğrulama.
   */
  const cursor = await page.evaluate(() => {
    const button = document.createElement('button');

    button.disabled = true;
    button.textContent = 'test';
    document.body.append(button);

    const value = getComputedStyle(button).cursor;

    button.remove();

    return value;
  });

  expect(cursor).toBe('not-allowed');
});
