'use client';

import { z } from 'zod';

import { LookupPage } from '../lookup-page';
import { DescriptionField, NameField, SortOrderField, TextField } from '../lookup-fields';
import { brandsApi, type Brand } from '@/lib/catalog-api';

/** Boş string'i geçerli sayan opsiyonel URL doğrulaması. */
const optionalUrl = z
  .string()
  .max(500)
  .optional()
  .or(z.literal(''))
  .refine(
    (value) => value === undefined || value === '' || /^https?:\/\/.+/.test(value),
    'Geçerli bir adres girin (http:// veya https:// ile başlamalı).',
  );

const schema = z.object({
  name: z.string().min(2, 'Ad en az 2 karakter olmalıdır.').max(150),
  description: z.string().max(2000).optional().or(z.literal('')),
  country: z.string().max(80).optional().or(z.literal('')),
  logoUrl: optionalUrl,
  websiteUrl: optionalUrl,
  sortOrder: z.number().int().min(0).optional(),
});

type FormValues = z.infer<typeof schema>;

export function BrandsPage() {
  return (
    <LookupPage<Brand, FormValues>
      title="Markalar"
      description="Ürünlerin bağlanacağı marka ve üretici firmalar."
      singularName="Marka"
      itemLabel="marka"
      queryKey="brands"
      api={brandsApi}
      formSchema={schema}
      formDefaults={{
        name: '',
        description: '',
        country: '',
        logoUrl: '',
        websiteUrl: '',
        sortOrder: 0,
      }}
      toFormValues={(record) => ({
        name: record.name,
        description: record.description ?? '',
        country: record.country ?? '',
        logoUrl: record.logoUrl ?? '',
        websiteUrl: record.websiteUrl ?? '',
        sortOrder: record.sortOrder,
      })}
      extraColumns={[
        {
          key: 'country',
          header: 'Ülke',
          cell: (row) => row.country ?? <span className="text-outline">—</span>,
        },
      ]}
      renderFields={(form) => (
        <>
          <NameField form={form} placeholder="AgroMax" />
          <TextField form={form} name="country" label="Ülke" placeholder="Türkiye" />
          <TextField
            form={form}
            name="websiteUrl"
            label="Web Sitesi"
            placeholder="https://agromax.com"
          />
          <TextField
            form={form}
            name="logoUrl"
            label="Logo Adresi"
            placeholder="https://cdn.../logo.webp"
          />
          <DescriptionField form={form} />
          <SortOrderField form={form} />
        </>
      )}
    />
  );
}
