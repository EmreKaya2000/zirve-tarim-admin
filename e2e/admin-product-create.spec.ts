import { expect, test, type Page } from '@playwright/test';

/**
 * YENİ ÜRÜN — görsel ve varyasyonla birlikte oluşturma.
 *
 * =============================================================================
 * NEDEN BU TEST VAR
 * =============================================================================
 * Ürün formu yedi sekmelidir ama yeni üründe GÖRSELLER ve VARYASYONLAR sekmesi
 * kapalıydı: yönetici ürünü kaydetmek, sonra düzenleme ekranına dönüp
 * varyasyon eklemek zorundaydı. Varyasyon olmadan ürün satılamaz (SPEC §15.3),
 * yani kaydetme ile satılabilirlik arasında her zaman eksik bir ara durum
 * vardı.
 *
 * Artık üçü tek kayıtta oluşuyor:
 *   - varyasyonlar ürünle AYNI transaction'da yazılır,
 *   - görseller ürün oluştuktan hemen sonra tek multipart istekle yüklenir.
 *
 * Bu akışın tarayıcıdan doğrulanması şart: API testleri kendi isteklerini
 * doğrudan atıyor ve formun sekmeler arası taslak durumunu hiç çalıştırmıyor.
 * Taslak listesinin gerçekten gönderildiğini yalnız gerçek istemci gösterir.
 *
 * ÖN KOŞUL: ayakta bir API ve seed edilmiş veritabanı (kategori + kg birimi).
 * VERİ İZİ BIRAKIR: oluşturulan ürünler silinmez — ürün silme soft delete'tir
 * ve stok hareketi üretmiş bir varyasyonu temizlemek geçmişi bozardı. Paket
 * yalnız GELİŞTİRME/CI veritabanında koşturulur.
 */

const ADMIN_EMAIL = process.env['SEED_SUPER_ADMIN_EMAIL'] ?? 'admin@zirvetarim.local';
const ADMIN_PASSWORD = process.env['SEED_SUPER_ADMIN_PASSWORD'] ?? 'ZirveTarim2026';

/**
 * 1x1 saydam PNG.
 *
 * GERÇEK bir PNG olmalı: backend dosyanın ilk baytlarını (magic bytes)
 * kontrol eder, uzantıya ya da bildirilen MIME tipine güvenmez. Sahte içerik
 * 422 ile reddedilirdi.
 */
const PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8AARAwMDAwAOwAJ/RXFXwAAAABJRU5ErkJggg==';

async function loginAsAdmin(page: Page): Promise<void> {
  await page.goto('/login');

  await page.locator('#email').fill(ADMIN_EMAIL);
  await page.locator('#password').fill(ADMIN_PASSWORD);
  await page.getByRole('button', { name: 'Giriş Yap' }).click();

  await expect(page.getByRole('heading', { name: 'Panel' })).toBeVisible({ timeout: 20_000 });
}

/** Yeni ürün formunu açar ve zorunlu alanları doldurur. */
async function openNewProductForm(page: Page, name: string): Promise<void> {
  await page.goto('/urunler/yeni');

  await expect(page.locator('#name')).toBeVisible({ timeout: 20_000 });
  await page.locator('#name').fill(name);

  // Kategori zorunludur (SPEC §15.1). Seçilen ilk kategori ana kategori olur.
  await page.getByRole('button', { name: 'Gübre', exact: true }).first().click();
}

/** Varyasyon diyaloğunu doldurup listeye ekler. */
async function addDraftVariant(page: Page, sku: string, unitQuantity: string): Promise<void> {
  await page.getByRole('button', { name: /Varyasyon Ekle/ }).click();

  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();

  await dialog.locator('#sku').fill(sku);
  // Birim listesi seed'den gelir; kg ondalıklı miktara izin verir.
  await dialog.locator('#unitTypeId').selectOption({ label: 'Kilogram (kg)' });
  await dialog.locator('#unitQuantity').fill(unitQuantity);
  await dialog.locator('#purchasePrice').fill('100');
  await dialog.locator('#salePrice').fill('150');
  await dialog.locator('#minOrderQuantity').fill('5');
  await dialog.locator('#quantityStep').fill('5');
  await dialog.locator('#stockQuantity').fill('40');

  await dialog.getByRole('button', { name: /^Kaydet$/ }).click();
  await expect(dialog).toBeHidden({ timeout: 15_000 });
}

test.describe('Yeni ürün — görsel ve varyasyonla tek kayıt', () => {
  test('varyasyon ve görsel sekmeleri yeni üründe AÇIK', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/urunler/yeni');

    await expect(page.locator('#name')).toBeVisible({ timeout: 20_000 });

    /*
     * Eski davranış: iki sekme de `disabled` ve "Önce ürünü kaydedin"
     * ipucuyla kapalıydı. Bu test o kilidin geri gelmesini engeller.
     */
    await expect(page.getByRole('tab', { name: /Görseller/ })).toBeEnabled();
    await expect(page.getByRole('tab', { name: /Varyasyonlar/ })).toBeEnabled();

    // İlişkiler sekmesi BİLİNÇLİ olarak hâlâ kayıt bekler.
    await expect(page.getByRole('tab', { name: /İlişkili Ürünler/ })).toBeDisabled();
  });

  test('TAM AKIŞ: varyasyon + görsel gir, tek kayıtla oluştur', async ({ page }) => {
    const stamp = `${Date.now()}${Math.floor(Math.random() * 1_000)}`;
    const name = `E2E Birlikte ${stamp}`;
    const sku = `E2EBIRLIKTE-${stamp}`;

    await loginAsAdmin(page);
    await openNewProductForm(page, name);

    // --- Varyasyon: kaydetmeden önce girilir ---
    await page.getByRole('tab', { name: /Varyasyonlar/ }).click();
    await addDraftVariant(page, sku, '5');

    // Taslak listede görünmeli ve "henüz kaydedilmedi" uyarısı çıkmalı.
    await expect(page.getByText(sku)).toBeVisible();
    await expect(page.getByText(/Varyasyonlar ürünle birlikte kaydedilecek/)).toBeVisible();

    // --- Görsel: kaydetmeden önce seçilir ---
    await page.getByRole('tab', { name: /Görseller/ }).click();
    await page.locator('input[type="file"]').setInputFiles({
      name: 'urun.png',
      mimeType: 'image/png',
      buffer: Buffer.from(PNG_BASE64, 'base64'),
    });

    await expect(page.getByText(/Görseller ürünle birlikte yüklenecek/)).toBeVisible();
    // Önizleme yüklenmiş dosyadan DEĞİL, yerel blob'dan gelir.
    await expect(page.getByText('1. urun.png')).toBeVisible();

    // --- Tek kayıt ---
    await page.getByRole('button', { name: /Ürünü Kaydet/ }).click();

    /*
     * ASIL İDDİA: kayıt sonrası düzenleme adresine geçilir ve hem varyasyon
     * hem görsel SUNUCUDAN gelen veride bulunur. Taslaklar gönderilmemiş
     * olsaydı ürün oluşur ama iki sekme de boş kalırdı.
     */
    await expect(page).toHaveURL(/\/urunler\/[0-9a-f-]{36}$/, { timeout: 30_000 });

    await page.getByRole('tab', { name: /Varyasyonlar/ }).click();
    await expect(page.getByText(sku)).toBeVisible({ timeout: 20_000 });
    // Başlangıç stoğu da yazılmış olmalı.
    await expect(page.getByText('40', { exact: true }).first()).toBeVisible();

    await page.getByRole('tab', { name: /Görseller/ }).click();

    // Kaydedilmiş görselde etiket sunucudaki özgün ad olur.
    const imagesPanel = page.locator('#panel-images');
    await expect(imagesPanel.getByText('1. urun.png')).toBeVisible({ timeout: 20_000 });
    // Tek görsel yüklendiğinde otomatik olarak ana görsel olur.
    await expect(imagesPanel.getByText('Ana', { exact: true })).toBeVisible();

    // Sayfa yenilendiğinde de durmalı: gerçekten kaydedilmiş olmalı.
    await page.reload();
    await page.getByRole('tab', { name: /Varyasyonlar/ }).click();
    await expect(page.getByText(sku)).toBeVisible({ timeout: 20_000 });
  });

  /**
   * SPEC §15.3 — en az bir aktif varyasyon, KAYDIN ön koşulu.
   *
   * Kural eskiden yalnız yayına alırken kontrol ediliyordu; varyasyonsuz ürün
   * oluşturulabiliyor ve katalogda sessizce satılamaz hâlde duruyordu. Artık
   * hem sunucu hem form engelliyor.
   */
  test('varyasyonsuz ürün KAYDEDİLEMEZ ve doğru sekmeye yönlendirir', async ({ page }) => {
    const stamp = `${Date.now()}${Math.floor(Math.random() * 1_000)}`;
    const name = `E2E Varyasyonsuz ${stamp}`;

    await loginAsAdmin(page);
    await openNewProductForm(page, name);

    // Varyasyon EKLENMEDEN kaydetmeye çalışılır.
    await page.getByRole('button', { name: /Ürünü Kaydet/ }).click();

    // Hata görünmeli ve kullanıcı Varyasyonlar sekmesine atılmalı.
    await expect(page.getByText(/en az bir aktif varyasyonu olmalıdır/i)).toBeVisible();
    await expect(page.getByRole('tab', { name: /Varyasyonlar/ })).toHaveAttribute(
      'aria-selected',
      'true',
    );

    // Adreste kalmalı: ürün OLUŞMAMIŞ olmalı.
    await expect(page).toHaveURL(/\/urunler\/yeni$/);

    // Varyasyon eklenince aynı form kaydedilebilir olmalı.
    await addDraftVariant(page, `E2EVARSIZ-${stamp}`, '5');
    await page.getByRole('button', { name: /Ürünü Kaydet/ }).click();

    await expect(page).toHaveURL(/\/urunler\/[0-9a-f-]{36}$/, { timeout: 30_000 });
  });

  test('taslak listede tekrar eden SKU kaydetmeden önce uyarır', async ({ page }) => {
    const stamp = `${Date.now()}${Math.floor(Math.random() * 1_000)}`;
    const sku = `E2ETEKRAR-${stamp}`;

    await loginAsAdmin(page);
    await openNewProductForm(page, `E2E Tekrar SKU ${stamp}`);

    await page.getByRole('tab', { name: /Varyasyonlar/ }).click();
    await addDraftVariant(page, sku, '5');

    // İkinci varyasyon aynı SKU ile eklenmeye çalışılır.
    await page.getByRole('button', { name: /Varyasyon Ekle/ }).click();

    const dialog = page.getByRole('dialog');
    await dialog.locator('#sku').fill(sku);
    await dialog.locator('#unitTypeId').selectOption({ label: 'Kilogram (kg)' });
    await dialog.locator('#unitQuantity').fill('25');
    await dialog.locator('#purchasePrice').fill('400');
    await dialog.locator('#salePrice').fill('600');
    await dialog.locator('#minOrderQuantity').fill('25');
    await dialog.locator('#quantityStep').fill('25');
    await dialog.locator('#stockQuantity').fill('10');
    await dialog.getByRole('button', { name: /^Kaydet$/ }).click();

    /*
     * Uyarı SUNUCUYA GİTMEDEN çıkar. Backend de reddediyor ama o noktada
     * kullanıcı formun tamamını doldurup kaydete basmış olurdu; hatayı
     * listeyi kurarken görmek çok daha erken bir geri bildirim.
     */
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText(/Bu SKU listede zaten var/)).toBeVisible();
  });
});
