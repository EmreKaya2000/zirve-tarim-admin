# ZirveTarım Admin

Ziraat mağazasının **yönetim paneli**: ürün ve katalog yönetimi, gelen talepler,
talebi satışa dönüştürme, müşteri cari hesabı, tahsilat, stok hareketleri ve
finans raporları. Next.js App Router, mobil responsive.

## Üç depolu yapı

| Depo                                                                   | Ne yapar                                  |
| ---------------------------------------------------------------------- | ----------------------------------------- |
| [zirve-tarim-api](https://github.com/EmreKaya2000/zirve-tarim-api)     | REST API + `@zirve/types` sözleşme paketi |
| [zirve-tarim-front](https://github.com/EmreKaya2000/zirve-tarim-front) | Halka açık vitrin                         |
| **zirve-tarim-admin** (bu depo)                                        | Yönetim paneli                            |

Bu depo **tek başına çalışmaz**: API'nin ayakta ve veritabanının seed edilmiş
olması gerekir.

## Hızlı başlangıç

### Geliştirme (önerilen — kod değişikliği anında yansır)

```bash
# 1) Altyapıyı kaldır. Api deposu bu deponun YANINDA klonlu olmalı.
git clone https://github.com/EmreKaya2000/zirve-tarim-api.git ../zirve-tarim-api
cd ../zirve-tarim-api && cp .env.example .env && docker compose up -d
docker compose exec api node prisma/seed.js
cd -

# 2) Paneli çalıştır
cp .env.example .env
pnpm install
pnpm sync:types      # sözleşmeyi Api deposundan kopyalar
pnpm dev             # http://localhost:3001
```

### Üç uygulamayı birlikte, konteyner olarak

Üç depo yan yana klonluysa Api deposundan tek komut:

```bash
cd ../zirve-tarim-api && pnpm stack:up
```

Vitrin `:3000`, panel `:3001`, API `:4000` üzerinde ayağa kalkar. Ayrıntı Api
deposunun README'sinde.

Giriş: `admin@zirvetarim.local` / `ZirveTarim2026`

> **API'nin CORS listesinde bu köken bulunmalı.** Api deposunun `.env`
> dosyasında `CORS_ORIGINS` değeri `http://localhost:3001` içermelidir; yoksa
> panel "Sunucuya ulaşılamadı" der. `.env.example` bunu varsayılan olarak içerir.

## Rotalar kök seviyededir

Monorepo'da panel `/admin/*` altındaydı çünkü vitrinle aynı uygulamayı
paylaşıyordu. Ayrı bir uygulama olduğu için önek kaldırıldı:

| Eskiden                | Şimdi            |
| ---------------------- | ---------------- |
| `/admin`               | `/`              |
| `/admin/urunler`       | `/urunler`       |
| `/admin/talepler/[id]` | `/talepler/[id]` |
| `/admin/login`         | `/login`         |

**API uçları değişmedi** — onlar hâlâ `/admin/products`, `/admin/sales`
biçiminde. Dönüşüm güvenle yapılabildi çünkü şartnamenin bir yan etkisi olarak
API uçları İngilizce (§14), UI rotaları Türkçe (§16); iki küme lekesel olarak
ayrık.

## Komutlar

| Komut              | Açıklama                                                 |
| ------------------ | -------------------------------------------------------- |
| `pnpm dev`         | Geliştirme sunucusu (`:3001`)                            |
| `pnpm build`       | Derler + standalone çıktısını tamamlar                   |
| `pnpm lint`        | ESLint — uyarı bile hata sayılır                         |
| `pnpm typecheck`   | `tsc --noEmit`                                           |
| `pnpm test:e2e`    | Playwright — 12 test (API ayakta olmalı)                 |
| `pnpm sync:types`  | `@zirve/types` sözleşmesini Api deposundan kopyalar      |
| `pnpm types:check` | Kopya taze mi? Ayrışmışsa hata verir (CI bu adımı koşar) |

> **`pnpm test:e2e` öncesi API'yi test kipinde kaldırın.** Api deposunda
> `pnpm e2e:api` çalıştırın. Normal kipte hız sınırı (giriş ucu 5 istek/dk)
> ve `MAIL_DRIVER=log` yüzünden testlerin bir kısmı ortam nedeniyle kırılır —
> kod yüzünden değil. Testler standalone sunucuyu `127.0.0.1:3101` üzerinde
> kaldırır; bu köken API'nin `CORS_ORIGINS` listesinde olmalıdır.
> Bitince `pnpm docker:up` ile normal kipe dönün.

Testler **sıralı** koşar (`workers: 1`). Panel yazar: ürün, talep, satış ve
tahsilat kaydı üretir; paralel koşan iki test aynı SKU'yu veya aynı talebi
hedefleyip birbirini bozar.

## `@zirve/types` — sözleşme kopyası

`src/types/` klasörü **kopyadır**, kaynağı `zirve-tarim-api`. Her dosyanın
başında "ELLE DÜZENLEMEYİN" uyarısı vardır.

Panel bu paketten yalnız tip almıyor, **iş kuralı** da alıyor:
`ALLOWED_INQUIRY_TRANSITIONS` ve `nextInquiryStatuses` talep durum
menüsünü kurar, `canCancelSale` / `canEditSale` / `canAcceptPayment` satış
düğmelerini açıp kapatır. Bu tablolar API'dekiyle ayrışırsa panel, API'nin
reddedeceği bir işlemi kullanıcıya sunar — bu yüzden ayrışma CI'da
`pnpm types:check` ile yakalanır: kopya yeniden üretilir ve
`git diff --exit-code` ile fark aranır.

**Registry kullanılmıyor ve bu denendi.** GitHub Packages, paket kapsamının depo
sahibiyle aynı olmasını zorunlu tutar; `@zirve/types` yayınlama denemesi
`403 permission_denied: The requested installation does not exist` verdi.
Gerekçe, alternatifler ve karar Api deposunun README'sinde.

Sözleşmeyi değiştirmek gerekiyorsa **Api deposunda** değiştirin, sonra burada
`pnpm sync:types` çalıştırın.

## `@zirve/ui`

`src/ui/` tasarım sisteminin kopyasıdır ve **bu deponun malıdır** — burada
düzenlenebilir. Import yolu `@zirve/ui` olarak korundu (tsconfig alias), böylece
40 dosyadaki import satırı değişmedi. Vitrinde de bir kopyası var; oradaki
ayrışma kozmetiktir ve gözle görülür.

Şartname: Api deposundaki [`docs/SPEC.md`](https://github.com/EmreKaya2000/zirve-tarim-api/blob/main/docs/SPEC.md)
