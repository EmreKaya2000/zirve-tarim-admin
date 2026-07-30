'use client';

import type { UseFormReturn } from 'react-hook-form';
import { Check } from 'lucide-react';
import {
  Badge,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Select,
  cn,
} from '@zirve/ui';

import type { Benefit, SideEffect, SideEffectSeverity } from '@/lib/catalog-api';
import type { ProductFormValues } from '../product-form-schema';

interface BenefitsTabProps {
  form: UseFormReturn<ProductFormValues>;
  benefits: Benefit[];
  sideEffects: SideEffect[];
}

const SEVERITY_META: Record<
  SideEffectSeverity,
  { label: string; variant: 'neutral' | 'warning' | 'error' }
> = {
  LOW: { label: 'Düşük', variant: 'neutral' },
  MEDIUM: { label: 'Orta', variant: 'warning' },
  HIGH: { label: 'Yüksek', variant: 'error' },
  CRITICAL: { label: 'Kritik', variant: 'error' },
};

const SEVERITIES: SideEffectSeverity[] = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

/**
 * 5. Sekme — Yararlar ve uyarılar.
 *
 * Her ilişki için ürüne ÖZEL açıklama girilebilir: "kök gelişimini
 * destekler" genel bir yarardır ama bu üründe nasıl tezahür ettiği
 * ürüne göre değişir.
 */
export function BenefitsTab({ form, benefits, sideEffects }: BenefitsTabProps) {
  const { watch, setValue } = form;

  const selectedBenefits = watch('benefits');
  const selectedSideEffects = watch('sideEffects');

  const toggleBenefit = (id: string): void => {
    const exists = selectedBenefits.some((item) => item.id === id);

    setValue(
      'benefits',
      exists ? selectedBenefits.filter((item) => item.id !== id) : [...selectedBenefits, { id }],
      { shouldDirty: true },
    );
  };

  const setBenefitNote = (id: string, note: string): void => {
    setValue(
      'benefits',
      selectedBenefits.map((item) => (item.id === id ? { ...item, note } : item)),
      { shouldDirty: true },
    );
  };

  const toggleSideEffect = (id: string): void => {
    const exists = selectedSideEffects.some((item) => item.id === id);

    setValue(
      'sideEffects',
      exists
        ? selectedSideEffects.filter((item) => item.id !== id)
        : [...selectedSideEffects, { id }],
      { shouldDirty: true },
    );
  };

  const updateSideEffect = (
    id: string,
    patch: { note?: string; severityOverride?: SideEffectSeverity | undefined },
  ): void => {
    setValue(
      'sideEffects',
      selectedSideEffects.map((item) => (item.id === id ? { ...item, ...patch } : item)),
      { shouldDirty: true },
    );
  };

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="text-body-lg font-semibold">Yararlar</CardTitle>
          <CardDescription>
            Ürün detayında rozet olarak gösterilir. Ürüne özel açıklama ekleyebilirsiniz.
          </CardDescription>
        </CardHeader>

        <CardContent className="flex flex-col gap-2">
          {benefits.length === 0 ? (
            <p className="py-6 text-center text-sm text-on-surface-variant">
              Henüz yarar tanımlanmamış.
            </p>
          ) : (
            benefits.map((benefit) => {
              const selected = selectedBenefits.find((item) => item.id === benefit.id);

              return (
                <div
                  key={benefit.id}
                  className={cn(
                    'rounded-[8px] border p-3 transition-colors',
                    selected !== undefined
                      ? 'border-primary-container bg-secondary-container/40 hover:bg-secondary-container/60'
                      : 'border-outline-variant hover:border-outline hover:bg-surface-container-low',
                  )}
                >
                  <button
                    type="button"
                    onClick={() => toggleBenefit(benefit.id)}
                    aria-pressed={selected !== undefined}
                    className="flex w-full items-center gap-3 text-left"
                  >
                    <span
                      className={cn(
                        'flex size-4 shrink-0 items-center justify-center rounded-[4px] border',
                        selected !== undefined
                          ? 'border-primary-container bg-primary-container text-on-primary'
                          : 'border-outline',
                      )}
                      aria-hidden="true"
                    >
                      {selected !== undefined ? <Check className="size-3" strokeWidth={3} /> : null}
                    </span>
                    <span className="text-sm text-on-surface">{benefit.name}</span>
                  </button>

                  {selected !== undefined ? (
                    <Input
                      className="mt-3"
                      placeholder="Bu ürüne özel açıklama (isteğe bağlı)"
                      value={selected.note ?? ''}
                      onChange={(event) => setBenefitNote(benefit.id, event.target.value)}
                    />
                  ) : null}
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-body-lg font-semibold">Yan Etkiler ve Uyarılar</CardTitle>
          <CardDescription>
            Ciddiyet bu ürün için farklıysa ezebilirsiniz — derişik ürünlerde risk daha yüksektir.
          </CardDescription>
        </CardHeader>

        <CardContent className="flex flex-col gap-2">
          {sideEffects.length === 0 ? (
            <p className="py-6 text-center text-sm text-on-surface-variant">
              Henüz yan etki tanımlanmamış.
            </p>
          ) : (
            sideEffects.map((effect) => {
              const selected = selectedSideEffects.find((item) => item.id === effect.id);
              const baseSeverity = effect.severity;

              return (
                <div
                  key={effect.id}
                  className={cn(
                    'rounded-[8px] border p-3 transition-colors',
                    selected !== undefined
                      ? 'border-primary-container bg-secondary-container/40 hover:bg-secondary-container/60'
                      : 'border-outline-variant hover:border-outline hover:bg-surface-container-low',
                  )}
                >
                  <button
                    type="button"
                    onClick={() => toggleSideEffect(effect.id)}
                    aria-pressed={selected !== undefined}
                    className="flex w-full items-center gap-3 text-left"
                  >
                    <span
                      className={cn(
                        'flex size-4 shrink-0 items-center justify-center rounded-[4px] border',
                        selected !== undefined
                          ? 'border-primary-container bg-primary-container text-on-primary'
                          : 'border-outline',
                      )}
                      aria-hidden="true"
                    >
                      {selected !== undefined ? <Check className="size-3" strokeWidth={3} /> : null}
                    </span>

                    <span className="min-w-0 flex-1 truncate text-sm text-on-surface">
                      {effect.name}
                    </span>

                    <Badge variant={SEVERITY_META[baseSeverity].variant}>
                      {SEVERITY_META[baseSeverity].label}
                    </Badge>
                  </button>

                  {selected !== undefined ? (
                    <div className="mt-3 flex flex-col gap-2">
                      <Select
                        value={selected.severityOverride ?? ''}
                        onChange={(event) =>
                          updateSideEffect(effect.id, {
                            severityOverride:
                              event.target.value === ''
                                ? undefined
                                : (event.target.value as SideEffectSeverity),
                          })
                        }
                        aria-label="Ciddiyet ezme"
                      >
                        <option value="">Genel seviye ({SEVERITY_META[baseSeverity].label})</option>
                        {SEVERITIES.map((severity) => (
                          <option key={severity} value={severity}>
                            Bu üründe: {SEVERITY_META[severity].label}
                          </option>
                        ))}
                      </Select>

                      <Input
                        placeholder="Bu ürüne özel önlem/açıklama"
                        value={selected.note ?? ''}
                        onChange={(event) =>
                          updateSideEffect(effect.id, { note: event.target.value })
                        }
                      />
                    </div>
                  ) : null}
                </div>
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
  );
}
