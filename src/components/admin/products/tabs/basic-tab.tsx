'use client';

import type { UseFormReturn } from 'react-hook-form';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  FieldError,
  FieldHint,
  FormField,
  Input,
  Label,
  Select,
} from '@zirve/ui';

import type { Brand, CategoryTreeNode } from '@/lib/catalog-api';
import type { ProductFormValues } from '../product-form-schema';
import { CategoryPicker } from '../category-picker';

interface BasicTabProps {
  form: UseFormReturn<ProductFormValues>;
  brands: Brand[];
  categoryTree: CategoryTreeNode[];
}

/** 1. Sekme — Temel bilgiler. */
export function BasicTab({ form, brands, categoryTree }: BasicTabProps) {
  const { register, formState, watch, setValue } = form;
  const errors = formState.errors;

  const categoryIds = watch('categoryIds');
  const primaryCategoryId = watch('primaryCategoryId');

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="text-body-lg font-semibold">Ürün Bilgileri</CardTitle>
          <CardDescription>Adres (slug) addan otomatik üretilir.</CardDescription>
        </CardHeader>

        <CardContent className="flex flex-col gap-5">
          <FormField>
            <Label htmlFor="name" required>
              Ürün Adı
            </Label>
            <Input
              id="name"
              placeholder="AgroMax NPK 20-20-20 Kompoze Gübre"
              invalid={errors.name !== undefined}
              {...register('name')}
            />
            <FieldError message={errors.name?.message} />
          </FormField>

          <FormField>
            <Label htmlFor="shortDescription">Kısa Açıklama</Label>
            <Input
              id="shortDescription"
              placeholder="Ürün kartlarında ve arama sonuçlarında görünür."
              maxLength={500}
              {...register('shortDescription')}
            />
            <FieldHint>Ürün kartında ve listede gösterilir. En fazla 500 karakter.</FieldHint>
          </FormField>

          <FormField>
            <Label htmlFor="description">Detaylı Açıklama</Label>
            <textarea
              id="description"
              rows={8}
              className="w-full rounded-[8px] border border-outline-variant bg-surface-container-lowest px-4 py-3 text-[15px] leading-relaxed text-on-surface outline-none transition-all placeholder:text-outline focus:border-primary-container focus:ring-2 focus:ring-secondary-container"
              placeholder="Ürünün ayrıntılı tanıtımı, kullanım avantajları..."
              {...register('description')}
            />
          </FormField>

          <FormField>
            <Label htmlFor="brandId">Marka</Label>
            <Select id="brandId" {...register('brandId')}>
              <option value="">— Marka seçilmedi —</option>
              {brands.map((brand) => (
                <option key={brand.id} value={brand.id}>
                  {brand.name}
                </option>
              ))}
            </Select>
          </FormField>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-body-lg font-semibold">Kategoriler</CardTitle>
          <CardDescription>
            En az bir kategori zorunludur. Yalnız biri ana kategori olabilir.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <CategoryPicker
            tree={categoryTree}
            selectedIds={categoryIds}
            primaryId={primaryCategoryId}
            onChange={(ids, primary) => {
              setValue('categoryIds', ids, { shouldValidate: true, shouldDirty: true });
              setValue('primaryCategoryId', primary, {
                shouldValidate: true,
                shouldDirty: true,
              });
            }}
          />

          <div className="mt-3 flex flex-col gap-1">
            <FieldError message={errors.categoryIds?.message} />
            <FieldError message={errors.primaryCategoryId?.message} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
