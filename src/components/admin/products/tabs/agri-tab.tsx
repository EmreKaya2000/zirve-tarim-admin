'use client';

import type { UseFormReturn } from 'react-hook-form';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CheckboxGroup,
  FieldHint,
  FormField,
  Input,
  Label,
} from '@zirve/ui';

import type { Plant, SoilType, UsagePeriod } from '@/lib/catalog-api';
import type { ProductFormValues } from '../product-form-schema';

interface AgriTabProps {
  form: UseFormReturn<ProductFormValues>;
  plants: Plant[];
  soilTypes: SoilType[];
  usagePeriods: UsagePeriod[];
}

/** 4. Sekme — Tarımsal bilgiler. */
export function AgriTab({ form, plants, soilTypes, usagePeriods }: AgriTabProps) {
  const { register, watch, setValue } = form;

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-body-lg font-semibold">Kullanım ve İçerik</CardTitle>
          <CardDescription>Bu bilgiler ürün detay sayfasında çiftçiye gösterilir.</CardDescription>
        </CardHeader>

        <CardContent className="flex flex-col gap-5">
          <FormField>
            <Label htmlFor="usageInstructions">Kullanım Şekli</Label>
            <textarea
              id="usageInstructions"
              rows={4}
              className="w-full rounded-[8px] border border-outline-variant bg-surface-container-lowest px-4 py-3 text-[15px] leading-relaxed text-on-surface outline-none transition-all placeholder:text-outline focus:border-primary-container focus:ring-2 focus:ring-secondary-container"
              placeholder="Toprak uygulaması: dekara 20-25 kg. Damlama: 100 litre suya 500 g."
              {...register('usageInstructions')}
            />
            <FieldHint>Doz ve uygulama yöntemini açıkça yazın.</FieldHint>
          </FormField>

          <FormField>
            <Label htmlFor="ingredients">İçerik / Etken Madde</Label>
            <textarea
              id="ingredients"
              rows={3}
              className="w-full rounded-[8px] border border-outline-variant bg-surface-container-lowest px-4 py-3 text-[15px] leading-relaxed text-on-surface outline-none transition-all placeholder:text-outline focus:border-primary-container focus:ring-2 focus:ring-secondary-container"
              placeholder="Toplam Azot (N) %20, Fosfor (P2O5) %20, Potasyum (K2O) %20"
              {...register('ingredients')}
            />
            <FieldHint>Aramada da kullanılır: etken madde ile ürün bulunabilir.</FieldHint>
          </FormField>

          <FormField>
            <Label htmlFor="storageConditions">Saklama Koşulları</Label>
            <textarea
              id="storageConditions"
              rows={2}
              className="w-full rounded-[8px] border border-outline-variant bg-surface-container-lowest px-4 py-3 text-[15px] leading-relaxed text-on-surface outline-none transition-all placeholder:text-outline focus:border-primary-container focus:ring-2 focus:ring-secondary-container"
              placeholder="Serin ve kuru yerde, nemden uzak saklayınız."
              {...register('storageConditions')}
            />
          </FormField>

          <FormField>
            <Label htmlFor="licenseNumber">Ruhsat Numarası</Label>
            <Input
              id="licenseNumber"
              placeholder="TR-BKÜ-2024-1157"
              {...register('licenseNumber')}
            />
            <FieldHint>
              Zirai ilaç ve gübrelerde bakanlık ruhsat numarası. Yasal olarak gösterilmesi gerekir.
            </FieldHint>
          </FormField>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-body-lg font-semibold">Bitkiler</CardTitle>
            <CardDescription>Bu ürün hangi bitkilerde kullanılır?</CardDescription>
          </CardHeader>
          <CardContent>
            <CheckboxGroup
              options={plants.map((plant) => ({
                id: plant.id,
                label: plant.name,
                hint: plant.latinName ?? undefined,
              }))}
              selectedIds={watch('plantIds')}
              onChange={(ids) => setValue('plantIds', ids, { shouldDirty: true })}
              searchPlaceholder="Bitki ara..."
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-body-lg font-semibold">Toprak Türleri</CardTitle>
            <CardDescription>Hangi toprak yapılarında uygundur?</CardDescription>
          </CardHeader>
          <CardContent>
            <CheckboxGroup
              options={soilTypes.map((soil) => ({
                id: soil.id,
                label: soil.name,
                hint: soil.phRange ?? undefined,
              }))}
              selectedIds={watch('soilTypeIds')}
              onChange={(ids) => setValue('soilTypeIds', ids, { shouldDirty: true })}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-body-lg font-semibold">Kullanım Dönemleri</CardTitle>
            <CardDescription>Bitkinin hangi gelişim döneminde uygulanır?</CardDescription>
          </CardHeader>
          <CardContent>
            <CheckboxGroup
              options={usagePeriods.map((period) => ({ id: period.id, label: period.name }))}
              selectedIds={watch('usagePeriodIds')}
              onChange={(ids) => setValue('usagePeriodIds', ids, { shouldDirty: true })}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
