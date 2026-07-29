import { z } from 'zod';

/**
 * Ürün formu doğrulama şeması.
 *
 * Bu doğrulama YALNIZCA kullanıcı deneyimi içindir (Kural 10). Backend aynı
 * kuralları bağımsız olarak uygular; `curl` ile atılan istek de reddedilir.
 * Buradaki amaç kullanıcıyı sunucuya gitmeden uyarmaktır.
 */

/** Sayısal metin alanı — para ve miktarlar string taşınır (§13.6). */
const numericString = (label: string) =>
  z
    .string()
    .min(1, `${label} zorunludur.`)
    .refine((value) => !Number.isNaN(Number(value)), `${label} sayısal olmalıdır.`)
    .refine((value) => Number(value) >= 0, `${label} negatif olamaz.`);

const optionalNumericString = z
  .string()
  .optional()
  .or(z.literal(''))
  .refine(
    (value) => value === undefined || value === '' || !Number.isNaN(Number(value)),
    'Sayısal bir değer girin.',
  );

export const productFormSchema = z.object({
  // --- 1. Temel bilgiler ---
  name: z.string().min(2, 'Ürün adı en az 2 karakter olmalıdır.').max(220),
  shortDescription: z.string().max(500).optional().or(z.literal('')),
  description: z.string().max(20_000).optional().or(z.literal('')),
  brandId: z.string().optional().or(z.literal('')),
  categoryIds: z.array(z.string()).min(1, 'En az bir kategori seçmelisiniz.'),
  primaryCategoryId: z.string().min(1, 'Bir ana kategori seçmelisiniz.'),

  // --- 4. Tarımsal bilgiler ---
  usageInstructions: z.string().max(10_000).optional().or(z.literal('')),
  ingredients: z.string().max(10_000).optional().or(z.literal('')),
  storageConditions: z.string().max(5000).optional().or(z.literal('')),
  licenseNumber: z.string().max(100).optional().or(z.literal('')),
  plantIds: z.array(z.string()),
  soilTypeIds: z.array(z.string()),
  usagePeriodIds: z.array(z.string()),

  // --- 5. Yararlar ve uyarılar ---
  benefits: z.array(z.object({ id: z.string(), note: z.string().max(500).optional() })),
  sideEffects: z.array(
    z.object({
      id: z.string(),
      note: z.string().max(500).optional(),
      severityOverride: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
    }),
  ),

  // --- 7. Yayın ayarları ---
  isActive: z.boolean(),
  isPublished: z.boolean(),
  showPrice: z.boolean(),
  isFeatured: z.boolean(),
  isNew: z.boolean(),
  isPopular: z.boolean(),
  metaTitle: z.string().max(200).optional().or(z.literal('')),
  metaDesc: z.string().max(400).optional().or(z.literal('')),
  sortOrder: z.number().int().min(0),
});

export type ProductFormValues = z.infer<typeof productFormSchema>;

/** Varyasyon formu — ayrı kaydedilir, ürün formundan bağımsızdır. */
export const variantFormSchema = z
  .object({
    sku: z
      .string()
      .min(2, 'SKU en az 2 karakter olmalıdır.')
      .max(64)
      .regex(
        /^[A-Z0-9][A-Z0-9_-]*$/,
        'SKU yalnız büyük harf, rakam, tire ve alt çizgi içerebilir.',
      ),
    name: z.string().max(150).optional().or(z.literal('')),
    unitTypeId: z.string().min(1, 'Birim seçmelisiniz.'),
    unitQuantity: numericString('Ambalaj miktarı'),
    purchasePrice: numericString('Alış fiyatı'),
    salePrice: numericString('Satış fiyatı'),
    taxRate: numericString('KDV oranı'),
    minOrderQuantity: numericString('En az miktar'),
    quantityStep: numericString('Miktar adımı'),
    maxOrderQuantity: optionalNumericString,
    stockQuantity: numericString('Stok'),
    lowStockThreshold: numericString('Kritik stok eşiği'),
    trackStock: z.boolean(),
    isDefault: z.boolean(),
    isActive: z.boolean(),
  })
  .refine((values) => Number(values.unitQuantity) > 0, {
    message: 'Ambalaj miktarı 0’dan büyük olmalıdır.',
    path: ['unitQuantity'],
  })
  .refine((values) => Number(values.minOrderQuantity) > 0, {
    message: 'En az miktar 0’dan büyük olmalıdır.',
    path: ['minOrderQuantity'],
  })
  .refine((values) => Number(values.quantityStep) > 0, {
    message: 'Miktar adımı 0’dan büyük olmalıdır.',
    path: ['quantityStep'],
  })
  .refine(
    (values) =>
      values.maxOrderQuantity === undefined ||
      values.maxOrderQuantity === '' ||
      Number(values.maxOrderQuantity) >= Number(values.minOrderQuantity),
    { message: 'En fazla miktar, en az miktardan küçük olamaz.', path: ['maxOrderQuantity'] },
  );

export type VariantFormValues = z.infer<typeof variantFormSchema>;

/** Yeni varyasyon için varsayılan değerler. */
export const EMPTY_VARIANT: VariantFormValues = {
  sku: '',
  name: '',
  unitTypeId: '',
  unitQuantity: '1',
  purchasePrice: '0',
  salePrice: '0',
  taxRate: '20',
  minOrderQuantity: '1',
  quantityStep: '1',
  maxOrderQuantity: '',
  stockQuantity: '0',
  lowStockThreshold: '0',
  trackStock: true,
  isDefault: false,
  isActive: true,
};

/**
 * Ondalık kontrolü.
 *
 * Birimin `allowsDecimal` değeri false ise miktar alanları tam sayı
 * olmalıdır. Backend bunu zaten reddeder; burada kullanıcıyı kaydetmeden
 * önce uyarmak için tekrarlanır.
 */
export function findDecimalViolations(
  values: VariantFormValues,
  allowsDecimal: boolean,
): { field: keyof VariantFormValues; label: string }[] {
  if (allowsDecimal) {
    return [];
  }

  const fields: { field: keyof VariantFormValues; label: string }[] = [
    { field: 'unitQuantity', label: 'Ambalaj miktarı' },
    { field: 'minOrderQuantity', label: 'En az miktar' },
    { field: 'quantityStep', label: 'Miktar adımı' },
    { field: 'maxOrderQuantity', label: 'En fazla miktar' },
    { field: 'stockQuantity', label: 'Stok' },
  ];

  return fields.filter((entry) => {
    const raw = values[entry.field];

    if (typeof raw !== 'string' || raw === '') {
      return false;
    }

    return !Number.isInteger(Number(raw));
  });
}
