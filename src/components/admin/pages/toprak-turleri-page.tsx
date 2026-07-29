'use client';

import { z } from 'zod';

import { LookupPage } from '../lookup-page';
import { DescriptionField, NameField, SortOrderField, TextField } from '../lookup-fields';
import { soilTypesApi, type SoilType } from '@/lib/catalog-api';

const schema = z.object({
  name: z.string().min(2, 'Ad en az 2 karakter olmalıdır.').max(150),
  description: z.string().max(2000).optional().or(z.literal('')),
  sortOrder: z.number().int().min(0).optional(),
  phRange: z.string().max(40).optional().or(z.literal('')),
});

type FormValues = z.infer<typeof schema>;

/**
 * Toprak Türleri yönetimi.
 *
 * Ortak `LookupPage` kabuğunu kullanır; burada yalnız bu kaynağa özgü
 * alanlar, sütunlar ve doğrulama tanımlanır.
 */
export function SoilTypesPage() {
  return (
    <LookupPage<SoilType, FormValues>
      title="Toprak Türleri"
      description="Gübre ve toprak düzenleyici ürünlerin uygunluğu bunlara bağlanır."
      singularName="Toprak Türü"
      itemLabel="toprak türü"
      queryKey="soil-types"
      api={soilTypesApi}
      formSchema={schema}
      formDefaults={{ name: '', description: '', sortOrder: 0, phRange: '' }}
      toFormValues={(record) => ({
        name: record.name,
        description: record.description ?? '',
        sortOrder: record.sortOrder,
        phRange: record.phRange ?? '',
      })}
      extraColumns={[
        {
          key: 'phRange',
          header: 'pH Aralığı',
          className: 'font-financial',
          cell: (row) => row.phRange ?? <span className="text-outline">—</span>,
        },
      ]}
      renderFields={(form) => (
        <>
          <NameField form={form} />
          <TextField
            form={form}
            name="phRange"
            label="pH Aralığı"
            placeholder="6.5 - 7.5"
            hint="Bu toprak türünün tipik pH aralığı."
          />
          <DescriptionField form={form} />
          <SortOrderField form={form} />
        </>
      )}
    />
  );
}
