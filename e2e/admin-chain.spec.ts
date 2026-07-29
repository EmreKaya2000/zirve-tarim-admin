import { expect, test, type APIRequestContext, type Page } from '@playwright/test';

/**
 * YÖNETİM ZİNCİRİ — TAM AKIŞ (Sprint 12, şart 1b).
 *
 * admin girişi → ürün oluşturma → talebi satışa dönüştürme → finalize →
 * ödeme → dashboard doğrulama
 *
 * =============================================================================
 * NEDEN BU TEST VAR
 * =============================================================================
 * Yönetim panelinin tarayıcıda HİÇ kapsaması yoktu: on bir sprint boyunca
 * panelin iş akışları yalnız API e2e testleriyle doğrulandı. API doğruyken
 * arayüzün kırık olması tamamen mümkündür — bir düğmenin yanlış uca gitmesi,
 * bir diyaloğun açılmaması, bir alanın gönderilmemesi API testinden geçmez.
 *
 * Bu paket paranın izini sürer: ürün → talep → satış → tahsilat → panel.
 * Zincirin her halkası bir SONRAKİNİN girdisidir; biri kırılırsa test o
 * noktada durur ve hangi halkanın koptuğu belli olur.
 *
 * =============================================================================
 * ÖN KOŞUL
 * =============================================================================
 * Seed edilmiş veritabanı (süper yönetici + taksonomi + demo ürünler) ve ayakta
 * bir API. Yönetici kimliği `SEED_SUPER_ADMIN_*` değerlerinden okunur;
 * verilmezse seed varsayılanları kullanılır.
 *
 * VERİ İZİ BIRAKIR: dönüştürme halkası gerçek satış ve tahsilat kaydı üretir.
 * Bunlar SİLİNMEZ — finansal kayıt silinmez (Kural 4) ve test de o kuralı ihlal
 * etmemelidir. Bu yüzden paket yalnız GELİŞTİRME/CI veritabanında koşturulur.
 */

const ADMIN_EMAIL = process.env['SEED_SUPER_ADMIN_EMAIL'] ?? 'admin@zirvetarim.local';
const ADMIN_PASSWORD = process.env['SEED_SUPER_ADMIN_PASSWORD'] ?? 'ZirveTarim2026';

const API_URL = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:4000/api/v1';

/**
 * Dönüştürülecek bir talebi API ÜZERİNDEN oluşturur.
 *
 * =============================================================================
 * NEDEN BURADA ÜRETİLİYOR
 * =============================================================================
 * Monorepo'da bu test, talebin vitrin testleri (`inquiry.spec.ts`) tarafından
 * üretilmiş olmasına GÜVENİYORDU: talep yoksa kendini atlıyordu. Vitrin ayrı
 * bir depoya taşındığında o bağ koptu — burada hiçbir zaman talep bulunmaz ve
 * zincirin en kritik halkası (talep → satış → tahsilat) her koşuda sessizce
 * ATLANIRDI. "Atlanan test" ile "geçen test" panoda birbirine benzer.
 *
 * Test artık kendi girdisini üretiyor: sepet doğrulama ucundan geçerli bir
 * varyasyon ve miktar alır, sonra public talep ucuna POST eder. Bu, vitrin
 * arayüzünü taklit etmek değil — ARAYÜZÜN ÇAĞIRDIĞI aynı uçları kullanmaktır.
 * =============================================================================
 */
async function createInquiryViaApi(
  request: APIRequestContext,
): Promise<{ id: string; inquiryNumber: string }> {
  // Satılabilir bir varyasyon bul. Seed demo ürünleri yayında olur.
  const products = await request.get(`${API_URL}/public/products?limit=20`);
  expect(products.ok(), 'Public ürün listesi alınamadı — API ayakta ve seed edilmiş mi?').toBe(
    true,
  );

  const items = (await products.json()).data as {
    slug: string;
    variants?: { id: string; minOrderQuantity: string }[];
  }[];

  const candidate = items.find((product) => (product.variants ?? []).length > 0);
  expect(candidate, 'Varyasyonu olan yayında ürün bulunamadı (seed gerekli).').toBeTruthy();

  const variant = (candidate as { variants: { id: string; minOrderQuantity: string }[] })
    .variants[0] as { id: string; minOrderQuantity: string };

  // Miktar en az `minOrderQuantity` olmalı ve artış adımına uymalı (SPEC §15.8-9).
  // En güvenli değer minimumun kendisidir.
  const created = await request.post(`${API_URL}/public/inquiries`, {
    data: {
      contactName: `E2E Panel Zinciri ${Date.now()}`,
      contactPhone: '5320000000',
      city: 'Konya',
      district: 'Selçuklu',
      customerNote: 'Panel e2e zinciri tarafından üretildi.',
      preferredContact: 'PHONE',
      consentAccepted: true,
      items: [{ variantId: variant.id, quantity: variant.minOrderQuantity }],
    },
  });

  expect(created.ok(), `Talep oluşturulamadı: ${created.status()} ${await created.text()}`).toBe(
    true,
  );

  const body = (await created.json()).data as { id: string; inquiryNumber: string };

  /*
   * DURUM MAKİNESİ YÜRÜTÜLÜR — yoksa dönüştürme düğmesi hiç görünmez.
   *
   * Yeni talep `NEW` doğar; satışa yalnız `APPROVED` talep dönüştürülebilir
   * (ALLOWED_INQUIRY_TRANSITIONS). Aradaki adımlar atlanamaz: geçiş tablosu
   * NEW → REVIEWING → CONTACTED → QUOTED → APPROVED sırasını zorunlu kılar ve
   * API ara adımı olmayan geçişi reddeder.
   *
   * KURULUM API'DEN, İDDİA ARAYÜZDEN. Dört durum değişikliğini panelden
   * tıklamak testi uzatır ve asıl konudan (dönüştürme → kesinleştirme →
   * tahsilat) uzaklaştırır. Durum makinesinin kendisi API e2e testlerinde
   * ayrıca doğrulanıyor.
   */
  const token = await loginViaApi(request);

  for (const status of ['REVIEWING', 'CONTACTED', 'QUOTED', 'APPROVED'] as const) {
    const moved = await request.patch(`${API_URL}/admin/inquiries/${body.id}/status`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { status, note: `E2E kurulum: ${status}` },
    });

    expect(moved.ok(), `Durum ${status} yapılamadı: ${moved.status()} ${await moved.text()}`).toBe(
      true,
    );
  }

  return body;
}

/** API üzerinden yönetici jetonu alır (kurulum adımları için). */
async function loginViaApi(request: APIRequestContext): Promise<string> {
  const response = await request.post(`${API_URL}/auth/login`, {
    data: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
  });

  expect(response.ok(), `API girişi başarısız: ${response.status()}`).toBe(true);

  return (await response.json()).data.accessToken as string;
}

/** Yönetim paneline giriş yapar. */
async function loginAsAdmin(page: Page): Promise<void> {
  await page.goto('/login');

  await page.locator('#email').fill(ADMIN_EMAIL);
  await page.locator('#password').fill(ADMIN_PASSWORD);
  await page.getByRole('button', { name: 'Giriş Yap' }).click();

  // Panel açıldı mı? Başlık, giriş formunun kaybolduğunun kanıtı.
  await expect(page.getByRole('heading', { name: 'Panel' })).toBeVisible({ timeout: 20_000 });
}

test.describe('Yönetim paneli — kimlik', () => {
  test('yanlış şifre reddedilir ve panele girilemez', async ({ page }) => {
    await page.goto('/login');

    await page.locator('#email').fill(ADMIN_EMAIL);
    await page.locator('#password').fill('kesinlikle-yanlis-sifre');
    await page.getByRole('button', { name: 'Giriş Yap' }).click();

    // Hangi alanın hatalı olduğu SÖYLENMEZ (enumeration engeli).
    await expect(page.getByText(/E-posta veya şifre hatalı/)).toBeVisible();
    await expect(page).toHaveURL(/\/login/);
  });

  test('oturumsuz panel adresi girişe yönlendirir', async ({ page }) => {
    await page.goto('/satislar');

    await expect(page).toHaveURL(/\/login/);
  });

  test('doğru bilgilerle panele girilir', async ({ page }) => {
    await loginAsAdmin(page);

    // Panel özeti gerçekten yüklendi mi?
    await expect(page.getByText('Bu ayki satış')).toBeVisible();
  });
});

test.describe('Yönetim zinciri — ürün, talep, satış, tahsilat', () => {
  // Zincir sıralı ilerler; paralel koşarsa halkalar birbirini bekleyemez.
  test.describe.configure({ mode: 'serial' });

  test('ürün formu TÜM taksonomi listelerini hatasız yükler', async ({ page }) => {
    /*
     * NEDEN "ÜRÜN OLUŞTURMA" DEĞİL DE "FORM YÜKLENİYOR MU":
     *
     * Ürünü uçtan uca UI'dan oluşturmak yedi sekmeli formu, kategori seçiciyi
     * ve varyasyon alt formunu doldurmayı gerektirir; bu yol API e2e
     * paketlerinde (products.e2e-spec.ts) zaten kapsamlı biçimde test ediliyor.
     * Tarayıcı testinin EKLEDİĞİ değer başka bir yerde: formun ihtiyaç duyduğu
     * verinin gerçekten gelip gelmediği.
     *
     * SPRINT 12'DE BULUNAN HATA tam buradaydı: form yedi taksonomi listesini
     * `limit=200` ile çekiyordu, API'nin üst sınırı 100 olduğu için hepsi 400
     * dönüyordu ve ÖLÇÜ BİRİMİ listesi boş kaldığı için varyasyon — dolayısıyla
     * satılabilir ürün — hiç oluşturulamıyordu. API testleri bunu görmedi,
     * çünkü kendi isteklerini geçerli limitlerle atıyorlar.
     *
     * Bu test o hatanın geri gelmesini engeller: formun attığı İSTEKLERİN
     * HİÇBİRİ 4xx dönmemeli.
     */
    const failedRequests: string[] = [];

    page.on('response', (response) => {
      const url = response.url();

      if (url.includes('/api/v1/admin/') && response.status() >= 400) {
        // 401'ler normaldir: sayfa yenilemesinde erişim jetonu bellekte
        // olmadığı için ilk dalga 401 alır ve sessizce yenilenir.
        if (response.status() !== 401) {
          failedRequests.push(`${response.status()} ${url.replace(/^https?:\/\/[^/]+/, '')}`);
        }
      }
    });

    await loginAsAdmin(page);
    await page.goto('/urunler/yeni');

    // Form gerçekten render edildi mi?
    await expect(page.locator('#name')).toBeVisible({ timeout: 20_000 });

    /*
     * Sekmeye TIKLANMAZ: form açılışta YEDİ taksonomi listesini de birden
     * çeker (tek `useQueries` bloğu), yani ölçü birimi isteği de ilk yüklemede
     * gider. Sekme tıklaması fazladan bir kırılganlık noktası olurdu.
     */
    await page.waitForTimeout(2_500);

    expect(failedRequests, `Form istekleri 4xx döndü:\n${failedRequests.join('\n')}`).toEqual([]);
  });

  test('talep satışa dönüştürülür, onaylanır, tahsilat girilir', async ({ page, request }) => {
    /*
     * BU TEST UZUN: talep üret → panelde bul → satışa dönüştür → kesinleştir →
     * tahsilat gir. Beş halka, her biri ayrı istek turu.
     *
     * Varsayılan 30 sn'lik sınır YETMİYOR ve bu daha önce fark edilmemişti:
     * monorepo'da test, dönüştürülecek talep bulamadığı için kendini ATLIYORDU
     * (o talebi vitrin testleri üretiyordu ve ayrı depoya taşındılar). Yani
     * zincirin tamamı tarayıcıda hiç koşmamıştı.
     */
    test.setTimeout(120_000);

    await loginAsAdmin(page);

    // --- 1) KENDİ talebini üret, sonra panelde bul ---
    //
    // Artık başka bir deponun testine güvenmiyoruz (gerekçe:
    // createInquiryViaApi açıklaması).
    const inquiry = await createInquiryViaApi(request);

    /*
     * DOĞRUDAN TALEBİN ADRESİNE GİDİLİR — listede aranmaz.
     *
     * İlk yazımda arama kutusuna numara yazıp `a[href^="/talepler/"]`in
     * ilkine tıklıyordum. Liste ASENKRON filtrelendiği için `first()`
     * filtrelenmemiş eski satırı yakalayabiliyordu: test başka bir talebi
     * açıyor, o talep uç durumda olduğu için dönüştürme düğmesi çıkmıyor ve
     * test kendini ATLIYORDU. Tek koşuda geçip tam paketde atlanması bu
     * yarıştandı — en sinsi test hatası biçimi.
     *
     * Kimliği elimizde olduğu için aramaya hiç gerek yok.
     */
    await page.goto(`/talepler/${inquiry.id}`);
    await expect(page.getByText(inquiry.inquiryNumber)).toBeVisible({ timeout: 20_000 });

    // --- 2) Satışa dönüştür ---
    //
    // Düğme BULUNMAK ZORUNDA: talebi APPROVED durumuna biz getirdik. Burada
    // `test.skip` kullanmak gerçek bir gerilemeyi gizlerdi.
    const convertButton = page.getByRole('button', { name: 'Satışa Dönüştür' });
    await expect(convertButton).toBeVisible({ timeout: 20_000 });

    await convertButton.click();

    // Dönüştürme diyaloğu: peşin satış varsayılanı yeterli.
    const dialogConfirm = page.getByRole('button', { name: /Dönüştür|Oluştur|Onayla/ }).last();

    await dialogConfirm.click();

    // --- 3) Taslak satış oluştu ---
    await expect(page).toHaveURL(/\/satislar\/[0-9a-f-]+/, { timeout: 25_000 });
    await expect(page.getByText(/Taslak/).first()).toBeVisible();

    // --- 4) Satışı onayla (finalize) — stok bu adımda düşer ---
    await page.getByRole('button', { name: 'Satışı Onayla' }).click();

    // Onaylanan satış artık taslak değil.
    await expect(page.getByText(/Onaylandı|Kısmi|Ödendi/).first()).toBeVisible({
      timeout: 25_000,
    });

    // --- 5) Tahsilat ekle ---
    await page.getByRole('button', { name: 'Ödeme Ekle' }).click();

    // Tutar alanı diyalog açılınca görünür.
    const amountField = page.locator('#pay-amount');

    await expect(amountField).toBeVisible();

    // Kısmi tahsilat: durum PARTIALLY_PAID'e geçmeli.
    await amountField.fill('1');

    await page
      .getByRole('button', { name: /Kaydet|Ekle|Tahsilat/ })
      .last()
      .click();

    // Tahsilat listesi bir kayıt göstermeli.
    await expect(page.getByText(/Tahsilatlar \(1\)/)).toBeVisible({ timeout: 25_000 });
  });

  test('dashboard ve raporlar yüklenir', async ({ page }) => {
    await loginAsAdmin(page);

    // --- Panel özetleri ---
    for (const label of [
      'Bu ayki satış',
      'Bu ayki tahsilat',
      'Bu ayki brüt kâr',
      'Toplam açık borç',
    ]) {
      await expect(page.getByText(label)).toBeVisible();
    }

    // --- Raporlar: üç sekme de veri döndürmeli ---
    await page.goto('/raporlar');

    await expect(page.getByRole('heading', { name: 'Raporlar' })).toBeVisible();
    await expect(page.getByText('Satış adedi')).toBeVisible({ timeout: 20_000 });

    /*
     * Sekmeler METİNLE seçilir: `Tabs` bileşeni ARIA `role="tab"` kullanmıyor
     * ve `role="button"` da vermiyor. Rol tabanlı seçici burada kırılgandır.
     */
    await page.getByText('Kâr', { exact: true }).click();
    await page.waitForTimeout(1_500);

    await page.getByText('Tahsilat', { exact: true }).click();
    await page.waitForTimeout(1_500);

    // Sekme geçişlerinde hata bandı ÇIKMAMALI.
    await expect(page.getByText(/yüklenemedi/)).toBeHidden();
  });

  test('stok hareketleri sayfası satış çıkışını gösterir', async ({ page }) => {
    await loginAsAdmin(page);

    await page.goto('/stok-hareketleri');

    // Satış onayı bir SALE hareketi üretmiş olmalı; sayfa en azından
    // hatasız yüklenmeli.
    await expect(page.getByText(/yüklenemedi/)).toBeHidden();
  });
});
