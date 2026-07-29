'use client';

import { z } from 'zod';
import { Badge, FieldError, FormField, Label, Select } from '@zirve/ui';

import { LookupPage } from '../lookup-page';
import { DescriptionField, NameField, SortOrderField, TextField } from '../lookup-fields';
import { unitTypesApi, type MeasurementType, type UnitType } from '@/lib/catalog-api';

const MEASUREMENT_TYPES = ['WEIGHT', 'VOLUME', 'COUNT', 'PACKAGING', 'LENGTH', 'AREA'] as const;

const MEASUREMENT_LABELS: Record<MeasurementType, string> = {
  WEIGHT: 'Ağırlık',
  VOLUME: 'Hacim',
  COUNT: 'Sayı',
  PACKAGING: 'Ambalaj',
  LENGTH: 'Uzunluk',
  AREA: 'Alan',
};

const schema = z.object({
  name: z.string().min(2, 'Ad en az 2 karakter olmalıdır.').max(60),
  code: z
    .string()
    .min(1, 'Birim kodu zorunludur.')
    .max(16)
    .regex(/^[a-z0-9]+$/, 'Yalnız küçük harf ve rakam kullanın (ör. kg, lt, ad).'),
  measurementType: z.enum(MEASUREMENT_TYPES),
  allowsDecimal: z.boolean(),
  conversionFactor: z
    .string()
    .max(30)
    .optional()
    .or(z.literal(''))
    .refine(
      (value) => value === undefined || value === '' || !Number.isNaN(Number(value)),
      'Sayısal bir değer girin (ör. 0.001).',
    ),
  description: z.string().max(2000).optional().or(z.literal('')),
  sortOrder: z.number().int().min(0).optional(),
});

type FormValues = z.infer<typeof schema>;

/**
 * Ölçü birimi yönetimi.
 *
 * `allowsDecimal` KRİTİKTİR: satış ve stok modülleri miktar doğrulamasında
 * bunu kullanır. "2.5 kg" geçerli, "2.5 adet" değildir.
 */
export function UnitTypesPage() {
  return (
    <LookupPage<UnitType, FormValues>
      title="Birimler"
      description="Ürünlerin satış ve stok birimleri."
      singularName="Birim"
      itemLabel="birim"
      queryKey="unit-types"
      api={unitTypesApi}
      formSchema={schema}
      formDefaults={{
        name: '',
        code: '',
        measurementType: 'COUNT',
        allowsDecimal: false,
        conversionFactor: '',
        description: '',
        sortOrder: 0,
      }}
      toFormValues={(record) => ({
        name: record.name,
        code: record.code,
        measurementType: record.measurementType,
        allowsDecimal: record.allowsDecimal,
        conversionFactor: record.conversionFactor ?? '',
        description: record.description ?? '',
        sortOrder: record.sortOrder,
      })}
      extraColumns={[
        {
          key: 'code',
          header: 'Kod',
          sortable: true,
          className: 'font-financial',
          cell: (row) => row.code,
        },
        {
          key: 'measurementType',
          header: 'Tür',
          sortable: true,
          cell: (row) => MEASUREMENT_LABELS[row.measurementType],
        },
        {
          key: 'allowsDecimal',
          header: 'Ondalık',
          cell: (row) => (
            <Badge variant={row.allowsDecimal ? 'primary' : 'neutral'}>
              {row.allowsDecimal ? 'Evet' : 'Hayır'}
            </Badge>
          ),
        },
      ]}
      renderFields={(form) => (
        <>
          <NameField form={form} placeholder="Kilogram" />

          <TextField
            form={form}
            name="code"
            label="Kod"
            placeholder="kg"
            hint="Kısa gösterim. Yalnız küçük harf ve rakam."
          />

          <FormField>
            <Label htmlFor="measurementType" required>
              Ölçü Türü
            </Label>
            <Select
              id="measurementType"
              invalid={form.formState.errors.measurementType !== undefined}
              {...form.register('measurementType')}
            >
              {MEASUREMENT_TYPES.map((type) => (
                <option key={type} value={type}>
                  {MEASUREMENT_LABELS[type]}
                </option>
              ))}
            </Select>
            <FieldError message={form.formState.errors.measurementType?.message} />
          </FormField>

          <FormField>
            <div className="flex items-start gap-3 rounded-[8px] border border-outline-variant p-4">
              <input
                id="allowsDecimal"
                type="checkbox"
                className="mt-0.5 size-4 accent-[color:var(--primary-container)]"
                {...form.register('allowsDecimal')}
              />
              <div className="min-w-0">
                <Label htmlFor="allowsDecimal">Ondalıklı miktara izin ver</Label>
                <p className="mt-1 text-xs text-on-surface-variant">
                  Kilogram ve litre gibi birimlerde açık olmalıdır. Adet, paket gibi birimlerde{' '}
                  <strong>kapalı</strong> olmalıdır — &quot;2,5 adet&quot; geçersiz bir miktardır.
                </p>
              </div>
            </div>
          </FormField>

          <TextField
            form={form}
            name="conversionFactor"
            label="Çevrim Katsayısı"
            placeholder="0.001"
            hint="Temel birime çevrim. Örn. gram için 0.001 (1 g = 0.001 kg)."
          />

          <DescriptionField form={form} />
          <SortOrderField form={form} />
        </>
      )}
    />
  );
}
