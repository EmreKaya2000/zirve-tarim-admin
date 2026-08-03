import { expect, test, type APIRequestContext, type Page } from '@playwright/test';

/**
 * AYARLARI KAYDETME — panelden yapılan değişikliğin gerçekten yazıldığı.
 *
 * =============================================================================
 * NEDEN BU TEST VAR
 * =============================================================================
 * Ayarlar sayfasının kaydetme akışı hiç çalışmamıştı ve veritabanındaki
 * denetim kaydında (audit_logs) `Setting` için TEK BİR güncelleme yoktu.
 * Belirti şuydu: yönetici mağaza telefonunu panelde değiştiriyor, hiçbir hata
 * görmüyor, ama vitrinde eski numara duruyordu.
 *
 * İki ayrı neden bir aradaydı:
 *
 *   1. Sayfadaki TEK "Kaydet" düğmesi sayfa başlığının sağındaydı. Ayarlar
 *      listesi ekrandan çok uzun; mağaza alanlarını düzenleyen kullanıcı
 *      sayfanın ortasında olur ve ne düğmeyi ne de "kaydedilmemiş değişiklik
 *      var" uyarısını görür. Hata mesajı da aynı yerde, yani görüş alanı
 *      dışındaydı.
 *
 *   2. Sunucu verisini taslağa yükleyen etki, taslağın TAMAMINI sunucu
 *      değerleriyle değiştiriyordu. Sorgu yeniden koştuğunda (pencere odağı,
 *      jeton yenilemesi) kullanıcının yazdığı değer siliniyor ve "Kaydet"
 *      pasife düşüyordu.
 *
 * API ucu (`PUT /admin/settings`) sağlamdı — bu yüzden API testleri hatayı
 * göremezdi. Kırık olan tarayıcı tarafıydı.
 *
 * =============================================================================
 * NE DOĞRULANIYOR
 * =============================================================================
 * Değerin PUBLIC uçta görünmesi. Arayüzde alanın dolu görünmesi yetmez: hata
 * tam olarak "arayüz doğru, sunucuda değişiklik yok" biçimindeydi.
 *
 * ÖN KOŞUL: ayakta bir API ve seed edilmiş veritabanı.
 * VERİ İZİ BIRAKMAZ: telefon ayarı sonunda eski değerine döndürülür.
 */

const ADMIN_EMAIL = process.env['SEED_SUPER_ADMIN_EMAIL'] ?? 'admin@zirvetarim.local';
const ADMIN_PASSWORD = process.env['SEED_SUPER_ADMIN_PASSWORD'] ?? 'ZirveTarim2026';
const API_URL = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:4000/api/v1';

const PHONE_KEY = 'store.phone';
const HOURS_KEY = 'store.workingHours';

async function loginAsAdmin(page: Page): Promise<void> {
  await page.goto('/login');

  await page.locator('#email').fill(ADMIN_EMAIL);
  await page.locator('#password').fill(ADMIN_PASSWORD);
  await page.getByRole('button', { name: 'Giriş Yap' }).click();

  await expect(page.getByRole('heading', { name: 'Panel' })).toBeVisible({ timeout: 20_000 });
}

/** Public uçtaki ayar değeri — vitrinin gördüğü değerin ta kendisi. */
async function readPublicSetting(request: APIRequestContext, key: string): Promise<string> {
  const response = await request.get(`${API_URL}/public/settings`);
  expect(response.ok()).toBe(true);

  const body = (await response.json()) as { data: { key: string; value: string }[] };
  const setting = body.data.find((item) => item.key === key);

  expect(setting, `public ayarlar içinde ${key} bulunamadı`).toBeDefined();

  return setting?.value ?? '';
}

/**
 * Ayarı API üzerinden eski değerine döndürür — arayüzü kullanmadan.
 *
 * NEDEN GEREKLİ: test ortada düşerse temizlik adımına hiç gelinmez ve
 * geliştiricinin veritabanında test telefonu kalır. Sonraki koşu aynı değeri
 * yazmaya çalıştığında "değişiklik yok" durumu oluşur ve test SEBEBİ
 * anlaşılmaz biçimde başarısız olur (bir kez yaşandı).
 */
async function restoreSetting(
  request: APIRequestContext,
  key: string,
  value: string,
): Promise<void> {
  if ((await readPublicSetting(request, key)) === value) {
    return;
  }

  const login = await request.post(`${API_URL}/auth/login`, {
    data: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
  });
  const token = ((await login.json()) as { data: { accessToken: string } }).data.accessToken;

  const response = await request.put(`${API_URL}/admin/settings`, {
    headers: { Authorization: `Bearer ${token}` },
    data: [{ key, value }],
  });

  expect(response.ok(), 'ayar eski değerine döndürülemedi').toBe(true);
}

test.describe('Yönetim paneli — ayarlar', () => {
  /** Testten ÖNCEKİ telefon değeri; test düşse bile buna geri dönülür. */
  let phoneBeforeTest = '';

  test.beforeEach(async ({ request }) => {
    phoneBeforeTest = await readPublicSetting(request, PHONE_KEY);
  });

  test.afterEach(async ({ request }) => {
    await restoreSetting(request, PHONE_KEY, phoneBeforeTest);
  });

  test('mağaza telefonu kaydedilir ve public uçta görünür', async ({ page, request }) => {
    const original = phoneBeforeTest;
    const updated = `+90 555 ${String(Date.now()).slice(-6, -3)} ${String(Date.now()).slice(-2)} 00`;

    await loginAsAdmin(page);
    await page.goto('/ayarlar');

    // Anahtar noktalı: CSS seçicide sınıf sanılmaması için köşeli parantez.
    const phoneInput = page.locator(`[id="${PHONE_KEY}"]`);
    await expect(phoneInput).toBeVisible({ timeout: 20_000 });
    await expect(phoneInput).toHaveValue(original);

    await phoneInput.fill(updated);

    /*
     * Kaydetme çubuğu, alan ekranın neresinde olursa olsun görünür olmalı.
     * Hatalı sürümde tek düğme sayfanın tepesindeydi ve buraya kadar
     * kaydırıldığında görüş alanında değildi.
     */
    const saveBar = page.getByText(/kaydedilmemiş değişiklik var/);
    await expect(saveBar).toBeInViewport();

    await page.getByRole('button', { name: /^Kaydet/ }).click();

    await expect(page.getByText('Ayarlar kaydedildi.')).toBeVisible({ timeout: 20_000 });

    // ASIL İDDİA: değer sunucuya yazıldı; vitrin bunu okuyacak.
    expect(await readPublicSetting(request, PHONE_KEY)).toBe(updated);

    // Sayfa yenilendiğinde de kalıcı olmalı.
    await page.reload();
    await expect(page.locator(`[id="${PHONE_KEY}"]`)).toHaveValue(updated, { timeout: 20_000 });

    // --- Eski değere dön ---
    await page.locator(`[id="${PHONE_KEY}"]`).fill(original);
    await page.getByRole('button', { name: /^Kaydet/ }).click();
    await expect(page.getByText('Ayarlar kaydedildi.')).toBeVisible({ timeout: 20_000 });
    expect(await readPublicSetting(request, PHONE_KEY)).toBe(original);
  });

  test('kayıt uçarken düzenlenen alan tazelemede silinmez', async ({ page, request }) => {
    const originalPhone = phoneBeforeTest;
    // Değer her koşuda FARKLI olmalı: aynısı yazılırsa "değişiklik yok" sayılır
    // ve kaydetme çubuğu hiç çıkmaz.
    const newPhone = `+90 555 111 ${String(Date.now()).slice(-2)} 00`;
    const hoursDraft = 'Pazartesi-Cuma 09:00-18:00 (kaydedilmedi)';

    await loginAsAdmin(page);
    await page.goto('/ayarlar');

    const phoneInput = page.locator(`[id="${PHONE_KEY}"]`);
    const hoursInput = page.locator(`[id="${HOURS_KEY}"]`);
    await expect(phoneInput).toBeVisible({ timeout: 20_000 });

    const originalHours = await hoursInput.inputValue();

    // Kaydetme isteği yavaşlatılır: "uçarken düzenleme" penceresi açılır.
    await page.route(/\/admin\/settings$/, async (route) => {
      if (route.request().method() !== 'PUT') {
        await route.fallback();

        return;
      }

      await new Promise((resolve) => setTimeout(resolve, 1_500));
      await route.continue();
    });

    await phoneInput.fill(newPhone);

    const savePut = page.waitForResponse(
      (response) =>
        response.request().method() === 'PUT' && response.url().endsWith('/admin/settings'),
    );
    // Kayıt sonrası invalidate'in tetiklediği tazeleme.
    const refetch = page.waitForResponse(
      (response) =>
        response.request().method() === 'GET' && response.url().includes('/admin/settings'),
      { timeout: 20_000 },
    );

    await page.getByRole('button', { name: /^Kaydet/ }).click();

    // İstek hâlâ uçuyor; kullanıcı BAŞKA bir alanı düzenliyor.
    await hoursInput.fill(hoursDraft);

    await savePut;
    await refetch;

    /*
     * ASIL İDDİA. Kayıt sonrası invalidate, ayarları sunucudan yeniden çeker.
     * Hatalı sürümde bu tazeleme taslağın TAMAMINI sunucu değerleriyle
     * değiştiriyordu: kaydedilen telefon yerine oturuyor ama çalışma saatleri
     * alanına yazılan metin sessizce siliniyordu.
     */
    await expect(hoursInput).toHaveValue(hoursDraft);
    await expect(phoneInput).toHaveValue(newPhone);

    // --- Temizlik: çalışma saatleri taslağı atılır, telefon geri alınır ---
    await page.unroute(/\/admin\/settings$/);
    await page.getByRole('button', { name: 'Geri Al' }).click();
    await expect(hoursInput).toHaveValue(originalHours);

    await phoneInput.fill(originalPhone);
    await page.getByRole('button', { name: /^Kaydet/ }).click();
    await expect(page.getByText('Ayarlar kaydedildi.')).toBeVisible({ timeout: 20_000 });
    expect(await readPublicSetting(request, PHONE_KEY)).toBe(originalPhone);
  });
  test('kayıt uçarken AYNI alan yeniden düzenlenirse yeni değer korunur', async ({
    page,
    request,
  }) => {
    /*
     * İKİNCİ TESTTEN FARKI: orada kullanıcı BAŞKA bir alanı düzenliyor.
     * Burada AYNI alanı yeniden düzenliyor.
     *
     * Bu ayrım önemliydi çünkü ilk düzeltme "gönderilen anahtarları
     * dokunulmadı say" diyordu ve bu durumu KAÇIRIYORDU: kullanıcı kaydete
     * bastıktan sonra yanıt gelmeden aynı alana yazarsa, tazeleme o yeni
     * değeri sunucudaki (bir önceki) değerle eziyordu — düzeltilmek istenen
     * sessiz veri kaybının aynısı. Düzeltme artık gönderilen değerin formda
     * HÂLÂ duruyor olmasını da şart koşuyor.
     */
    const originalPhone = phoneBeforeTest;
    const birinci = `+90 555 222 ${String(Date.now()).slice(-2)} 00`;
    const ikinci = `+90 555 333 ${String(Date.now()).slice(-2)} 00`;

    await loginAsAdmin(page);
    await page.goto('/ayarlar');

    const phoneInput = page.locator(`[id="${PHONE_KEY}"]`);

    await expect(phoneInput).toBeVisible({ timeout: 20_000 });

    // Kaydetme isteği yavaşlatılır: "uçarken düzenleme" penceresi açılır.
    await page.route(/\/admin\/settings$/, async (route) => {
      if (route.request().method() !== 'PUT') {
        await route.fallback();

        return;
      }

      await new Promise((resolve) => setTimeout(resolve, 1_500));
      await route.continue();
    });

    await phoneInput.fill(birinci);

    const savePut = page.waitForResponse(
      (response) =>
        response.request().method() === 'PUT' && response.url().endsWith('/admin/settings'),
    );
    const refetch = page.waitForResponse(
      (response) =>
        response.request().method() === 'GET' && response.url().includes('/admin/settings'),
      { timeout: 20_000 },
    );

    await page.getByRole('button', { name: /^Kaydet/ }).click();

    // İstek hâlâ uçuyor; kullanıcı AYNI alanı yeniden düzenliyor.
    await phoneInput.fill(ikinci);

    await savePut;
    await refetch;

    // ASIL İDDİA: tazeleme, kullanıcının ikinci yazdığını silmemeli.
    await expect(phoneInput).toHaveValue(ikinci);

    // Sunucuda ise henüz BİRİNCİ değer var; ikincisi kaydedilmedi.
    expect(await readPublicSetting(request, PHONE_KEY)).toBe(birinci);

    // --- Temizlik ---
    await page.unroute(/\/admin\/settings$/);
    await phoneInput.fill(originalPhone);
    await page.getByRole('button', { name: /^Kaydet/ }).click();
    await expect(page.getByText('Ayarlar kaydedildi.')).toBeVisible({ timeout: 20_000 });
    expect(await readPublicSetting(request, PHONE_KEY)).toBe(originalPhone);
  });
});
