'use client';

import type { UseFormReturn } from 'react-hook-form';
import {
  Alert,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  FieldHint,
  FormField,
  Input,
  Label,
} from '@zirve/ui';

import type { ProductFormValues } from '../product-form-schema';

interface PublishTabProps {
  form: UseFormReturn<ProductFormValues>;
  /** Ürünün aktif varyasyonu var mı? Yoksa yayınlanamaz. */
  hasActiveVariant: boolean;
}

/** Tek bir açma/kapama satırı. */
function ToggleRow({
  id,
  label,
  description,
  form,
  disabled,
  disabledHint,
}: {
  id: keyof ProductFormValues;
  label: string;
  description: string;
  form: UseFormReturn<ProductFormValues>;
  disabled?: boolean;
  disabledHint?: string;
}) {
  return (
    <div className="flex items-start gap-3 rounded-[8px] border border-outline-variant p-4">
      <input
        id={String(id)}
        type="checkbox"
        disabled={disabled}
        className="mt-0.5 size-4 shrink-0 accent-[color:var(--primary-container)] disabled:opacity-40"
        {...form.register(id as 'isActive')}
      />
      <div className="min-w-0">
        <Label htmlFor={String(id)}>{label}</Label>
        <p className="mt-1 text-xs text-on-surface-variant">
          {disabled === true && disabledHint !== undefined ? disabledHint : description}
        </p>
      </div>
    </div>
  );
}

/** 7. Sekme — Yayın ayarları. */
export function PublishTab({ form, hasActiveVariant }: PublishTabProps) {
  const { register, watch } = form;
  const isPublished = watch('isPublished');

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="text-body-lg font-semibold">Görünürlük</CardTitle>
          <CardDescription>Ürünün nerede ve nasıl görüneceğini belirler.</CardDescription>
        </CardHeader>

        <CardContent className="flex flex-col gap-3">
          {!hasActiveVariant && isPublished ? (
            <Alert variant="warning" title="Yayınlanamaz">
              Ürünü yayınlamak için en az bir aktif varyasyon gerekir. Varyasyonlar sekmesinden
              ekleyin.
            </Alert>
          ) : null}

          <ToggleRow
            id="isActive"
            label="Aktif"
            description="Pasif ürün hiçbir yerde görünmez ve satılamaz."
            form={form}
          />

          <ToggleRow
            id="isPublished"
            label="Public sitede yayınla"
            description="Kapalıysa ürün yalnız yönetim panelinde görünür (hazırlık aşaması)."
            form={form}
            disabled={!hasActiveVariant}
            disabledHint="En az bir aktif varyasyon eklemeden yayınlanamaz."
          />

          <ToggleRow
            id="showPrice"
            label="Fiyatı göster"
            description="Kapalıysa public tarafta fiyat yerine 'Fiyat sorunuz' gösterilir."
            form={form}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-body-lg font-semibold">Vitrin Etiketleri</CardTitle>
          <CardDescription>Ürünün katalogda öne çıkarılma biçimi.</CardDescription>
        </CardHeader>

        <CardContent className="flex flex-col gap-3">
          <ToggleRow
            id="isFeatured"
            label="Öne çıkan"
            description="Ana sayfada ve 'Öne Çıkanlar' filtresinde gösterilir."
            form={form}
          />
          <ToggleRow
            id="isNew"
            label="Yeni ürün"
            description="Ürün kartında 'Yeni' rozeti gösterilir."
            form={form}
          />
          <ToggleRow
            id="isPopular"
            label="Popüler"
            description="Ürün kartında 'Popüler' rozeti gösterilir."
            form={form}
          />

          <FormField className="mt-2">
            <Label htmlFor="sortOrder">Sıra</Label>
            <Input
              id="sortOrder"
              type="number"
              min={0}
              {...register('sortOrder', { valueAsNumber: true })}
            />
            <FieldHint>Küçük değer listede önce gelir.</FieldHint>
          </FormField>
        </CardContent>
      </Card>

      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="text-body-lg font-semibold">Arama Motoru (SEO)</CardTitle>
          <CardDescription>Boş bırakılırsa ürün adı ve kısa açıklama kullanılır.</CardDescription>
        </CardHeader>

        <CardContent className="flex flex-col gap-5">
          <FormField>
            <Label htmlFor="metaTitle">Meta Başlık</Label>
            <Input id="metaTitle" maxLength={200} {...register('metaTitle')} />
            <FieldHint>Arama sonuçlarında görünen başlık. 50-60 karakter idealdir.</FieldHint>
          </FormField>

          <FormField>
            <Label htmlFor="metaDesc">Meta Açıklama</Label>
            <textarea
              id="metaDesc"
              rows={3}
              maxLength={400}
              className="w-full rounded-[8px] border border-outline-variant bg-surface-container-lowest px-4 py-3 text-[15px] text-on-surface outline-none transition-all placeholder:text-outline focus:border-primary-container focus:ring-2 focus:ring-secondary-container"
              {...register('metaDesc')}
            />
            <FieldHint>150-160 karakter idealdir.</FieldHint>
          </FormField>
        </CardContent>
      </Card>
    </div>
  );
}
