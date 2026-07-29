/**
 * CSV dışa aktarma (Sprint 10).
 *
 * TÜRKÇE EXCEL İÇİN İKİ ÖNEMLİ AYRINTI:
 *
 * 1. AYIRICI NOKTALI VİRGÜLDÜR. Türkçe yerel ayarda ondalık ayırıcı virgül
 *    olduğu için Excel, virgülle ayrılmış dosyayı tek sütuna yapıştırır.
 * 2. BOM (U+FEFF) EKLENİR. Olmadan Excel dosyayı Windows-1254 sanır ve
 *    "Gübre" yerine "GÃ¼bre" gösterir.
 *
 * Sayılar OLDUĞU GİBİ yazılır (nokta ondalıklı, ham string). Biçimlendirmek
 * cazip ama yanlış olurdu: "1.234,50 ₺" metni Excel'de sayı değil metin
 * olarak açılır ve üzerinde toplama yapılamaz.
 */

const SEPARATOR = ';';
const BOM = '\uFEFF';

export interface CsvColumn<TRow> {
  header: string;
  value: (row: TRow) => string | number | null | undefined;
}

/** Satırları CSV metnine çevirir. */
export function toCsv<TRow>(rows: TRow[], columns: CsvColumn<TRow>[]): string {
  const head = columns.map((column) => escapeCell(column.header)).join(SEPARATOR);
  const body = rows.map((row) =>
    columns.map((column) => escapeCell(column.value(row))).join(SEPARATOR),
  );

  return [head, ...body].join('\r\n');
}

/**
 * CSV dosyasını indirir.
 *
 * Tarayıcıda `Blob` + geçici bağlantı ile yapılır; sunucuya ayrı bir
 * dışa aktarma ucu eklenmedi çünkü veri zaten ekranda: ikinci bir uç,
 * aynı raporu iki farklı kod yolundan üretme riski taşırdı.
 */
export function downloadCsv<TRow>(
  filename: string,
  rows: TRow[],
  columns: CsvColumn<TRow>[],
): void {
  const blob = new Blob([BOM + toCsv(rows, columns)], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = url;
  link.download = filename.endsWith('.csv') ? filename : `${filename}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/** Dosya adına tarih aralığı ekler: "satis-raporu-2026-07-01_2026-07-31". */
export function csvFilename(base: string, from: string, to: string): string {
  return `${base}-${from.slice(0, 10)}_${to.slice(0, 10)}`;
}

/**
 * Hücreyi kaçırır.
 *
 * Ayırıcı, tırnak veya satır sonu içeren değer tırnağa alınır; içerideki
 * tırnak ikilenir (RFC 4180).
 */
function escapeCell(value: string | number | null | undefined): string {
  if (value === null || value === undefined) {
    return '';
  }

  const text = String(value);

  if (text.includes(SEPARATOR) || text.includes('"') || /[\r\n]/.test(text)) {
    return `"${text.replaceAll('"', '""')}"`;
  }

  return text;
}
