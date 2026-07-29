'use client';

import { z } from 'zod';
import { Badge, FieldError, FieldHint, FormField, Label, Select } from '@zirve/ui';

import { LookupPage } from '../lookup-page';
import { DescriptionField, NameField, SortOrderField } from '../lookup-fields';
import { sideEffectsApi, type SideEffect, type SideEffectSeverity } from '@/lib/catalog-api';

const SEVERITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const;

/** Ciddiyet seviyesinin Türkçe karşılığı ve rozet rengi. */
const SEVERITY_META: Record<
  SideEffectSeverity,
  { label: string; variant: 'neutral' | 'warning' | 'error' }
> = {
  LOW: { label: 'Düşük', variant: 'neutral' },
  MEDIUM: { label: 'Orta', variant: 'warning' },
  HIGH: { label: 'Yüksek', variant: 'error' },
  CRITICAL: { label: 'Kritik', variant: 'error' },
};

const schema = z.object({
  name: z.string().min(2, 'Ad en az 2 karakter olmalıdır.').max(150),
  description: z.string().max(2000).optional().or(z.literal('')),
  severity: z.enum(SEVERITIES),
  precaution: z.string().max(2000).optional().or(z.literal('')),
  sortOrder: z.number().int().min(0).optional(),
});

type FormValues = z.infer<typeof schema>;

/**
 * Yan etki yönetimi.
 *
 * Ciddiyet seviyesi ürün detayındaki uyarı rengini belirler; zirai ilaçlarda
 * bu bilgi güvenlik açısından kritiktir.
 */
export function SideEffectsPage() {
  return (
    <LookupPage<SideEffect, FormValues>
      title="Yan Etkiler"
      description="Ürünlerin olası yan etkileri ve alınması gereken önlemler."
      singularName="Yan Etki"
      itemLabel="yan etki"
      queryKey="side-effects"
      api={sideEffectsApi}
      formSchema={schema}
      formDefaults={{
        name: '',
        description: '',
        severity: 'LOW',
        precaution: '',
        sortOrder: 0,
      }}
      toFormValues={(record) => ({
        name: record.name,
        description: record.description ?? '',
        severity: record.severity,
        precaution: record.precaution ?? '',
        sortOrder: record.sortOrder,
      })}
      extraColumns={[
        {
          key: 'severity',
          header: 'Ciddiyet',
          sortable: true,
          cell: (row) => (
            <Badge variant={SEVERITY_META[row.severity].variant}>
              {SEVERITY_META[row.severity].label}
            </Badge>
          ),
        },
      ]}
      renderFields={(form) => (
        <>
          <NameField form={form} placeholder="Cilt Tahrişi" />

          <FormField>
            <Label htmlFor="severity" required>
              Ciddiyet
            </Label>
            <Select
              id="severity"
              invalid={form.formState.errors.severity !== undefined}
              {...form.register('severity')}
            >
              {SEVERITIES.map((severity) => (
                <option key={severity} value={severity}>
                  {SEVERITY_META[severity].label}
                </option>
              ))}
            </Select>
            <FieldHint>Ürün detayındaki uyarı rengini belirler.</FieldHint>
            <FieldError message={form.formState.errors.severity?.message} />
          </FormField>

          <FormField>
            <Label htmlFor="precaution">Alınacak Önlem</Label>
            <textarea
              id="precaution"
              rows={3}
              className="w-full rounded-[8px] border border-outline-variant bg-surface-container-lowest px-4 py-3 text-[15px] text-on-surface outline-none transition-all placeholder:text-outline focus:border-primary-container focus:ring-2 focus:ring-secondary-container"
              placeholder="Uygulama sırasında eldiven ve maske kullanın."
              {...form.register('precaution')}
            />
            <FieldHint>Ürün detayında uyarı kutusunda gösterilir.</FieldHint>
          </FormField>

          <DescriptionField form={form} />
          <SortOrderField form={form} />
        </>
      )}
    />
  );
}
