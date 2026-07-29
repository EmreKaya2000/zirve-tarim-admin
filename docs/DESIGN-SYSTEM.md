# Tasarım Sistemi — Agro-Financial Intelligence System

Zirve Tarım'ın görsel dili. Kaynak: Stitch tasarım paketi (`DESIGN.md` token seti +
13 ekran mockup'ı).

Token'ların tek doğruluk kaynağı: **`packages/ui/src/styles.css`**
Tailwind eşlemesi: **`apps/web/src/app/globals.css`**

---

## 1. Marka ve his

Tarım ile finansın kesiştiği yer. Çiftçiliğin toprağa bağlı, organik doğasını finansal
yönetimin kesinliğiyle dengeler. Estetik **minimalist eğilimli kurumsal modern**: netlik,
dağınıklık olmadan veri yoğunluğu, yüksek erişilebilirlik.

Duygusal hedef **istikrar ve büyüme**. Bunu "clean-tech" yaklaşımıyla sağlarız: cömert
beyaz alan, yapısal ızgara ve tipik "neon" teknoloji renkleri yerine topraksı, profesyonel
tonlarda yeşil hâkim palet.

---

## 2. Renk

Material 3 rol adlandırması kullanılır. Değerler HEX'tir; HSL'e çevirmek yuvarlama farkı
üreteceği için dönüştürülmez.

### Birincil — derin tarım yeşili

| Token                      | Değer     | Kullanım                                    |
| -------------------------- | --------- | ------------------------------------------- |
| `primary`                  | `#00452d` | Marka paneli zemini, en koyu vurgu          |
| `primary-container`        | `#1f5d42` | **Birincil buton zemini**, aktif menü öğesi |
| `on-primary`               | `#ffffff` | Koyu yeşil üzerindeki metin                 |
| `primary-fixed`            | `#b1f0cd` | Avatar zemini, koyu zeminde vurgu noktası   |
| `on-primary-fixed-variant` | `#0f5137` | İkincil buton metni                         |

### Yüzeyler — tonal katmanlar

| Token                      | Değer     | Katman                          |
| -------------------------- | --------- | ------------------------------- |
| `surface` / `background`   | `#f8faf6` | **Level 0** — ana tuval         |
| `surface-container-lowest` | `#ffffff` | **Level 1** — kart zemini       |
| `surface-container-low`    | `#f2f4f0` | Kenar çubuğu zemini             |
| `surface-container`        | `#eceeea` | Hover zemini                    |
| `surface-container-high`   | `#e7e9e4` | İkon kutusu, iskelet            |
| `outline-variant`          | `#bfc9c1` | **Tüm kenarlıklar ve ayraçlar** |
| `outline`                  | `#707972` | Soluk ikon ve yer tutucu metin  |
| `on-surface`               | `#191c1a` | Ana metin                       |
| `on-surface-variant`       | `#404943` | İkincil metin                   |

### Durum renkleri

`error` (`#ba1a1a`) tasarım paketinden gelir. `success`, `warning` ve `info` paket**te
yoktu**; durum rozetleri (talep/satış/tahsilat durumları) için sistemle uyumlu türetildi
ve WCAG AA kontrastı doğrulandı.

| Rol     | Ana       | Konteyner | Konteyner üzeri |
| ------- | --------- | --------- | --------------- |
| success | `#1f5d42` | `#d7f0e2` | `#0f5137`       |
| warning | `#8a5a00` | `#ffeacc` | `#5c3c00`       |
| error   | `#ba1a1a` | `#ffdad6` | `#93000a`       |
| info    | `#1b4d70` | `#d6e9f8` | `#123a56`       |

---

## 3. Tipografi

**Manrope** — gövde. Geometrik netlik ile hümanist sıcaklığı dengeler; veri yoğun
finansal bağlamda okunaklıdır.

**Courier Prime** — finansal rakamlar ve teknik kodlar. `font-financial` yardımcı sınıfı
`tabular-nums` ile birlikte uygular; böylece tablolarda basamaklar dikey hizalanır.

| Sınıf            | Boyut / satır            | Ağırlık | Kullanım                          |
| ---------------- | ------------------------ | ------- | --------------------------------- |
| `text-h1`        | 40 / 48 px (mobil 32/40) | 700     | Sayfa başlığı                     |
| `text-h2`        | 32 / 40 px (mobil 26/34) | 600     | Bölüm başlığı, stat değeri        |
| `text-h3`        | 24 / 32 px               | 600     | Kart başlığı                      |
| `text-body-lg`   | 18 / 28 px               | 400     | Giriş paragrafı                   |
| `text-label-md`  | 14 / 20 px               | 600     | **Etiket, buton, menü**           |
| `text-label-sm`  | 12 / 16 px               | 600     | Tablo başlığı, rozet (BÜYÜK HARF) |
| `font-financial` | 13 px mono               | 400     | Tutar, SKU, belge numarası        |

---

## 4. Şekil ve yükseklik

**Köşe yuvarlaklığı**

| Öğe                  | Yarıçap             |
| -------------------- | ------------------- |
| Buton, input, select | **8px**             |
| Kart                 | **12px**            |
| Modal                | **16px**            |
| Rozet / chip         | tam yuvarlak (pill) |

**Yükseklik** — ağır gölge kullanılmaz; derinlik tonal katmanla verilir.

| Seviye          | Değer                                               |
| --------------- | --------------------------------------------------- |
| Level 1 (kart)  | beyaz + 1px `outline-variant` kenarlık              |
| Level 2 (hover) | `0 4px 12px rgba(29,41,35,.08)` → `shadow-elevated` |
| Level 3 (modal) | `0 12px 32px rgba(29,41,35,.12)` → `shadow-overlay` |

---

## 5. Boşluk ve ızgara

4px tabanlı ölçek: `xs 4` · `sm 8` · `md 16` · `lg 24` · `xl 32` · `2xl 48` · `3xl 64`

Konteyner azami genişlik **1440px**.

| Kırılım           | Izgara   | Kenar boşluğu |
| ----------------- | -------- | ------------- |
| Masaüstü ≥1024px  | 12 sütun | 32-48px       |
| Tablet 768-1023px | 8 sütun  | 24px          |
| Mobil ≤767px      | 4 sütun  | 16px          |

Kart içinde ikon-etiket arası `sm` (8px). Bölümler arası dikey boşluk `xl` (32px) veya
`2xl` (48px) — finansal veriye nefes alanı bırakmak için.

---

## 6. Bileşen kiti

`packages/ui` içinde. Tümü tasarım token'larıyla yazılmıştır; ham renk kodu içermez.

| Bileşen                                            | Notlar                                                                                  |
| -------------------------------------------------- | --------------------------------------------------------------------------------------- |
| `Button`                                           | 6 varyant (primary/secondary/outline/ghost/destructive/link), 5 boyut, `loading` durumu |
| `Input`                                            | `startIcon`, `endAdornment`, `invalid`; odakta 2px yeşil parlama                        |
| `Select`                                           | Yerel `<select>` — mobilde işletim sisteminin seçicisi açılır                           |
| `FormField` / `Label` / `FieldHint` / `FieldError` | Etiket-kontrol-hata üçlüsü; hata `role="alert"`                                         |
| `Card`                                             | Level 1 yüzey; `interactive` ile hover gölgesi                                          |
| `StatCard`                                         | Finans özet kartı: etiket + değer + ikon rozeti + dipnot; değer `font-financial`        |
| `Badge`                                            | Durum rozeti; 6 ton, BÜYÜK HARF `label-sm`                                              |
| `Table`                                            | Ayraçlı satırlar (zebra YOK), yatay kaydırma kabı, `TableEmpty` boş durumu              |
| `Pagination`                                       | "x-y / z kayıt" + kırpılmış sayfa listesi (1 … 6 [7] 8 … 312)                           |
| `Avatar`                                           | Baş harf; Türkçe `toLocaleUpperCase('tr-TR')` ile ("i" → "İ")                           |
| `Dialog`                                           | Radix tabanlı modal, Level 3 gölge                                                      |
| `Alert`                                            | 4 varyant; hata varyantı `role="alert"`                                                 |
| `PageHeader`                                       | Başlık + açıklama + sağ üst eylemler                                                    |
| `Skeleton` / `TableSkeleton`                       | Yükleniyor yer tutucuları                                                               |

---

## 7. Tasarım paketinde olmayan, üretilen ekranlar

Stitch paketi 13 ekran içeriyordu ancak aşağıdakiler yoktu. Sistemin kurallarına uyularak
üretildiler:

| Ekran                                          | Nasıl türetildi                                                                                                                     |
| ---------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| **Yönetici girişi** (`/admin/login`)           | İki sütunlu düzen: solda `primary` zeminli marka paneli, sağda Level 1 form. Mobilde tek sütun.                                     |
| **Kullanıcı yönetimi** (`/admin/kullanicilar`) | Paketteki "Müşteri Yönetimi" ekranının yapısı birebir izlendi: stat kartı satırı → arama/filtre çubuğu → ayraçlı tablo → sayfalama. |
| **Mobil kenar çubuğu**                         | Pakette sidebar `hidden lg:flex` idi, mobil karşılığı yoktu. Aynı içerik kayan çekmece (drawer) olarak sunuldu.                     |
| **Durum renkleri**                             | Pakette yalnız `error` vardı; success/warning/info sistemle uyumlu türetildi.                                                       |

---

## 8. İkonlar

**lucide-react.** Tasarım paketinin HTML'i Material Symbols kullanıyordu ancak
`DESIGN.md` metni açıkça Lucide'a atıf yapıyor ("Includes a Lucide `Search` icon").
Lucide seçildi: paket zaten bağımlılıkta, ağaç sarsılabilir (tree-shakeable) ve ikon
yazı tipi indirmesi gerektirmez.

Standart boyutlar: menü/buton içi **18-20px**, tablo/rozet içi **14-16px**,
boş durum ikonu **32px**.

---

## 9. Erişilebilirlik kuralları

- Tüm metin/zemin kombinasyonları **WCAG AA**.
- Odak halkası: 2px `primary-container`, 2px offset — `:focus-visible` ile.
- Hata mesajları `role="alert"` taşır; ekran okuyucu anında duyurur.
- İkon-yalnız butonlarda `aria-label` zorunlu.
- Pasif menü öğelerinde `title` ile gerekçe belirtilir.
- Tablolar dar ekranda kendi içinde kayar; **sayfa gövdesi asla yatay kaymaz**.
