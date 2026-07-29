'use client';

import { z } from 'zod';

import { LookupPage } from '../lookup-page';
import { DescriptionField, NameField, SortOrderField } from '../lookup-fields';
import { usagePeriodsApi, type UsagePeriod } from '@/lib/catalog-api';

const schema = z.object({
  name: z.string().min(2, 'Ad en az 2 karakter olmalıdır.').max(150),
  description: z.string().max(2000).optional().or(z.literal('')),
  sortOrder: z.number().int().min(0).optional(),
});

type FormValues = z.infer<typeof schema>;

/**
 * Kullanım Dönemleri yönetimi.
 *
 * Ortak `LookupPage` kabuğunu kullanır; burada yalnız bu kaynağa özgü
 * alanlar, sütunlar ve doğrulama tanımlanır.
 */
export function UsagePeriodsPage() {
  return (
    <LookupPage<UsagePeriod, FormValues>
      title="Kullanım Dönemleri"
      description="Bitkinin gelişim dönemleri. Sıra takvimsel olmalıdır."
      singularName="Kullanım Dönemi"
      itemLabel="dönem"
      queryKey="usage-periods"
      api={usagePeriodsApi}
      formSchema={schema}
      formDefaults={{ name: '', description: '', sortOrder: 0 }}
      toFormValues={(record) => ({
        name: record.name,
        description: record.description ?? '',
        sortOrder: record.sortOrder,
      })}
      renderFields={(form) => (
        <>
          <NameField form={form} />

          <DescriptionField form={form} />
          <SortOrderField form={form} />
        </>
      )}
    />
  );
}
