'use client';

import { z } from 'zod';

import { LookupPage } from '../lookup-page';
import { DescriptionField, NameField, SortOrderField, TextField } from '../lookup-fields';
import { plantsApi, type Plant } from '@/lib/catalog-api';

const schema = z.object({
  name: z.string().min(2, 'Ad en az 2 karakter olmalıdır.').max(150),
  description: z.string().max(2000).optional().or(z.literal('')),
  sortOrder: z.number().int().min(0).optional(),
  latinName: z.string().max(150).optional().or(z.literal('')),
});

type FormValues = z.infer<typeof schema>;

/**
 * Bitkiler yönetimi.
 *
 * Ortak `LookupPage` kabuğunu kullanır; burada yalnız bu kaynağa özgü
 * alanlar, sütunlar ve doğrulama tanımlanır.
 */
export function PlantsPage() {
  return (
    <LookupPage<Plant, FormValues>
      title="Bitkiler"
      description="Ürünlerin hangi bitkilerde kullanılacağını tanımlar."
      singularName="Bitki"
      itemLabel="bitki"
      queryKey="plants"
      api={plantsApi}
      formSchema={schema}
      formDefaults={{ name: '', description: '', sortOrder: 0, latinName: '' }}
      toFormValues={(record) => ({
        name: record.name,
        description: record.description ?? '',
        sortOrder: record.sortOrder,
        latinName: record.latinName ?? '',
      })}
      extraColumns={[
        {
          key: 'latinName',
          header: 'Latince Ad',
          cell: (row) => row.latinName ?? <span className="text-outline">—</span>,
        },
      ]}
      renderFields={(form) => (
        <>
          <NameField form={form} />
          <TextField
            form={form}
            name="latinName"
            label="Latince Ad"
            placeholder="Triticum aestivum"
            hint="Ziraat mühendisleri için anlamlıdır."
          />
          <DescriptionField form={form} />
          <SortOrderField form={form} />
        </>
      )}
    />
  );
}
