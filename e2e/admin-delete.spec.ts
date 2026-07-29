import { expect, test, type Page } from '@playwright/test';

/**
 * SİLME AKIŞLARI — 204 No Content regresyonu.
 *
 * =============================================================================
 * NEDEN BU TEST VAR
 * =============================================================================
 * Panelin TÜM silme düğmeleri kırıktı ve on iki sprint boyunca hiçbir test
 * bunu görmedi.
 *
 * Hata: silme uçları `@HttpCode(204)` döndürüyor. Express, 204 No Content
 * yanıtında gövdeyi tamamen atar (RFC 9110), yani `ResponseInterceptor`ın
 * ürettiği `{ success: true, data: null }` sarmalayıcısı istemciye HİÇ
 * ulaşmıyor. İstemcideki `unwrap` ise yalnız gövdeye bakıp `success !== true`
 * gördüğü için hata fırlatıyordu.
 *
 * Sonuç, en sinsi hata biçimi: SUNUCU KAYDI SİLİYOR, İSTEMCİ HATA ALIYOR.
 * React Query'nin `onSuccess`i çalışmadığı için liste tazelenmiyor, silinmiş
 * kayıt ekranda kalıyor. Kullanıcı tekrar bastığında kayıt gerçekten yok
 * olduğu için NOT_FOUND dönüyor.
 *
 * Hatanın API testlerinden geçmesinin nedeni: onlar HTTP durum kodunu doğrudan
 * doğruluyor (`expect(204)`) ve web istemcisinin sarmalayıcı açma mantığını
 * hiç çalıştırmıyor. Hata yalnızca gerçek tarayıcı istemcisinde görünür.
 *
 * =============================================================================
 * NE DOĞRULANIYOR
 * =============================================================================
 * Silme işleminden sonra ARAYÜZ tazelenmeli: onay diyaloğu kapanmalı ve kayıt
 * listeden kaybolmalı. Yalnız HTTP 204'ü doğrulamak YETMEZ — hata tam olarak
 * 204 doğru dönerken oluşuyordu.
 *
 * ÖN KOŞUL: ayakta bir API ve seed edilmiş veritabanı.
 * VERİ İZİ BIRAKMAZ: test kendi kaydını oluşturur ve siler.
 */

const ADMIN_EMAIL = process.env['SEED_SUPER_ADMIN_EMAIL'] ?? 'admin@zirvetarim.local';
const ADMIN_PASSWORD = process.env['SEED_SUPER_ADMIN_PASSWORD'] ?? 'ZirveTarim2026';

async function loginAsAdmin(page: Page): Promise<void> {
  await page.goto('/login');

  await page.locator('#email').fill(ADMIN_EMAIL);
  await page.locator('#password').fill(ADMIN_PASSWORD);
  await page.getByRole('button', { name: 'Giriş Yap' }).click();

  await expect(page.getByRole('heading', { name: 'Panel' })).toBeVisible({ timeout: 20_000 });
}

test.describe('Yönetim paneli — silme', () => {
  test('oluşturulan yarar kaydı silinir ve listeden kalkar', async ({ page }) => {
    /*
     * Ad benzersiz olmalı: paket paralel koşabilir ve aynı adla ikinci kayıt
     * slug çakışması yüzünden 409 döner. Zaman damgası + rastgele son ek,
     * aynı milisaniyede başlayan iki worker'ı da ayırır.
     */
    const name = `ZZ Silme Testi ${Date.now()}-${Math.floor(Math.random() * 1_000)}`;

    await loginAsAdmin(page);
    await page.goto('/yararlar');

    // --- Kayıt oluştur ---
    await page.getByRole('button', { name: /Yeni Yarar/ }).click();
    await page.locator('#name').fill(name);
    await page.getByRole('button', { name: /^Kaydet$/ }).click();

    const row = page.getByRole('row', { name: new RegExp(escapeRegExp(name)) });
    await expect(row).toBeVisible({ timeout: 20_000 });

    // --- Sil ---
    await row.getByRole('button', { name: 'Sil' }).click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await dialog.getByRole('button', { name: 'Evet, sil' }).click();

    /*
     * ASIL İDDİA. Hatalı sürümde diyalog AÇIK KALIYOR (`setDeleting(null)`
     * yalnız `onSuccess` içinde çağrılıyor) ve satır listede duruyor —
     * kayıt veritabanından silinmiş olmasına rağmen.
     */
    await expect(dialog).toBeHidden({ timeout: 20_000 });
    await expect(row).toHaveCount(0, { timeout: 20_000 });

    // Sayfa yenilendiğinde de gitmiş olmalı: liste yalnız görsel olarak
    // tazelenmiş değil, kayıt gerçekten silinmiş olmalı.
    await page.reload();
    await expect(page.getByText(name)).toHaveCount(0, { timeout: 20_000 });
  });
});

/** Kullanıcı verisini güvenle RegExp içine gömer. */
function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
