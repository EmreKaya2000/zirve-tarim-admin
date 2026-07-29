# Yazı Tipi Lisansları

Bu dizindeki `.woff2` dosyaları Google Fonts'tan alınmıştır ve
**SIL Open Font License 1.1** ile lisanslanmıştır. Ticari kullanım dahil
serbestçe kullanılabilir, gömülebilir ve dağıtılabilir.

| Dosya                                                | Yazı tipi                   | Telif                                            |
| ---------------------------------------------------- | --------------------------- | ------------------------------------------------ |
| `manrope-latin.woff2`, `manrope-latin-ext.woff2`     | Manrope (variable, 200-800) | Copyright 2018 The Manrope Project Authors       |
| `courier-prime-400.woff2`, `courier-prime-700.woff2` | Courier Prime               | Copyright 2015 The Courier Prime Project Authors |

Lisans metni: https://scripts.sil.org/OFL

## Neden depoda?

`next/font/google` derleme anında Google'a bağlanır. Docker build ortamımızda bu
erişim yoktur ve build "DeadlineExceeded" ile düşer. Dosyaları depoda tutmak
build'i hermetik yapar, hızlandırır ve ziyaretçi IP'sinin Google'a gitmesini
önler (KVKK). Ayrıntı: `apps/web/src/fonts/index.ts`
