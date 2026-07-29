'use client';

import { z } from 'zod';

import { LookupPage } from '../lookup-page';
import { DescriptionField, NameField, SortOrderField, TextField } from '../lookup-fields';
import { benefitsApi, type Benefit } from '@/lib/catalog-api';

const schema = z.object({
  name: z.string().min(2, 'Ad en az 2 karakter olmalıdır.').max(150),
  description: z.string().max(2000).optional().or(z.literal('')),
  sortOrder: z.number().int().min(0).optional(),
  icon: z.string().max(60).optional().or(z.literal('')),
});

type FormValues = z.infer<typeof schema>;

/**
 * Yararlar yönetimi.
 *
 * Ortak `LookupPage` kabuğunu kullanır; burada yalnız bu kaynağa özgü
 * alanlar, sütunlar ve doğrulama tanımlanır.
 */
export function BenefitsPage() {
  return (
    <LookupPage<Benefit, FormValues>
      title="Yararlar"
      description="Ürünlerin sağladığı faydalar. Ürün detayında rozet olarak gösterilir."
      singularName="Yarar"
      itemLabel="yarar"
      queryKey="benefits"
      api={benefitsApi}
      formSchema={schema}
      formDefaults={{ name: '', description: '', sortOrder: 0, icon: '' }}
      toFormValues={(record) => ({
        name: record.name,
        description: record.description ?? '',
        sortOrder: record.sortOrder,
        icon: record.icon ?? '',
      })}
      extraColumns={[
        {
          key: 'icon',
          header: 'İkon',
          cell: (row) =>
            row.icon === null ? (
              <span className="text-outline">—</span>
            ) : (
              <span className="font-financial text-xs">{row.icon}</span>
            ),
        },
      ]}
      renderFields={(form) => (
        <>
          <NameField form={form} />
          <TextField
            form={form}
            name="icon"
            label="İkon"
            placeholder="sprout"
            hint="Lucide ikon adı. Örn. sprout, trending-up, shield-check"
          />
          <DescriptionField form={form} />
          <SortOrderField form={form} />
        </>
      )}
    />
  );
}
