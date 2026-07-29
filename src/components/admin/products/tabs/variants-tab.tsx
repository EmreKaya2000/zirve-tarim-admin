'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, type UseFormReturn } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { History, Package, Pencil, Plus, Star, Trash2 } from 'lucide-react';
import {
  Alert,
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  ConfirmDialog,
  FieldError,
  FieldHint,
  FormDialog,
  FormField,
  Input,
  Label,
  Select,
  Table,
  TableBody,
  TableCell,
  TableEmpty,
  TableHead,
  TableHeader,
  TableRow,
} from '@zirve/ui';

import { ApiError } from '@/lib/api-error';
import type { UnitType } from '@/lib/catalog-api';
import { productsApi, type ProductVariant } from '@/lib/products-api';
import {
  EMPTY_VARIANT,
  findDecimalViolations,
  variantFormSchema,
  type VariantFormValues,
} from '../product-form-schema';

/**
 * 3. Sekme — Varyasyonlar.
 *
 * Varyasyon satılabilir asıl birimdir: fiyat, stok ve SKU buradadır.
 *
 * SEKME İKİ MODDA ÇALIŞIR:
 *
 *   `VariantsTab`      — kaydedilmiş ürün. Her işlem anında API'ye yazılır.
 *   `DraftVariantsTab` — YENİ ürün. Varyasyonlar formda tutulur ve ürünle
 *                        AYNI istekte gönderilir (tek transaction).
 *
 * Eskiden sekme yeni üründe tamamen kapalıydı; yönetici ürünü kaydetmeden
 * varyasyon giremiyordu. İki mod da aşağıdaki `VariantFormDialog` ve
 * `VariantsTable` bileşenlerini paylaşır — form alanları ve doğrulama tek
 * yerde durur, iki kopya arasında sapma oluşmaz.
 */

// =============================================================================
// SATIR GÖRÜNÜM MODELİ
// =============================================================================

/**
 * Tablonun çizdiği satır.
 *
 * Kaydedilmiş varyasyon ile taslak varyasyon farklı şekillerde gelir
 * (biri `unitType` nesnesi taşır, diğeri yalnız `unitTypeId`). Tablo ikisini
 * de bilmek zorunda kalmasın: ortak bir görünüm modeline indirilir.
 */
interface VariantRow {
  key: string;
  sku: string;
  name: string | null;
  unitLabel: string;
  purchasePrice: string | undefined;
  salePrice: string | undefined;
  stockQuantity: string;
  isActive: boolean;
  isDefault: boolean;
  isLowStock: boolean;
  /** Kaydedilmiş varyasyonun id'si; taslakta `null`. */
  persistedId: string | null;
}

function toRowFromVariant(variant: ProductVariant): VariantRow {
  return {
    key: variant.id,
    sku: variant.sku,
    name: variant.name ?? null,
    unitLabel: `${formatQuantity(variant.unitQuantity)} ${variant.unitType.code}`,
    purchasePrice: variant.purchasePrice ?? undefined,
    salePrice: variant.salePrice ?? undefined,
    stockQuantity: variant.stockQuantity,
    isActive: variant.isActive,
    isDefault: variant.isDefault,
    isLowStock:
      variant.trackStock &&
      Number(variant.lowStockThreshold) > 0 &&
      Number(variant.stockQuantity) <= Number(variant.lowStockThreshold),
    persistedId: variant.id,
  };
}

function toRowFromDraft(
  draft: VariantFormValues,
  index: number,
  unitTypes: UnitType[],
): VariantRow {
  const unit = unitTypes.find((item) => item.id === draft.unitTypeId);

  return {
    // Index anahtar olarak kullanılır: taslağın henüz bir kimliği yok ve SKU
    // düzenlenebildiği için kararlı değil.
    key: `draft-${index}`,
    sku: draft.sku,
    name: draft.name === '' || draft.name === undefined ? null : draft.name,
    unitLabel: `${formatQuantity(draft.unitQuantity)} ${unit?.code ?? '?'}`,
    purchasePrice: draft.purchasePrice,
    salePrice: draft.salePrice,
    stockQuantity: draft.stockQuantity,
    isActive: draft.isActive,
    isDefault: draft.isDefault,
    isLowStock:
      draft.trackStock &&
      Number(draft.lowStockThreshold) > 0 &&
      Number(draft.stockQuantity) <= Number(draft.lowStockThreshold),
    persistedId: null,
  };
}

/** Kaydedilmiş varyasyonu forma doldurulacak değerlere çevirir. */
function toFormValues(variant: ProductVariant): VariantFormValues {
  return {
    sku: variant.sku,
    name: variant.name ?? '',
    unitTypeId: variant.unitTypeId,
    unitQuantity: variant.unitQuantity,
    purchasePrice: variant.purchasePrice ?? '0',
    salePrice: variant.salePrice ?? '0',
    taxRate: variant.taxRate,
    minOrderQuantity: variant.minOrderQuantity,
    quantityStep: variant.quantityStep,
    maxOrderQuantity: variant.maxOrderQuantity ?? '',
    stockQuantity: variant.stockQuantity,
    lowStockThreshold: variant.lowStockThreshold,
    trackStock: variant.trackStock,
    isDefault: variant.isDefault,
    isActive: variant.isActive,
  };
}

/** Form değerlerini API gövdesine çevirir. */
export function toVariantPayload(values: VariantFormValues) {
  return {
    sku: values.sku,
    name: values.name === '' ? undefined : values.name,
    unitTypeId: values.unitTypeId,
    unitQuantity: values.unitQuantity,
    purchasePrice: values.purchasePrice,
    salePrice: values.salePrice,
    taxRate: values.taxRate,
    minOrderQuantity: values.minOrderQuantity,
    quantityStep: values.quantityStep,
    maxOrderQuantity: values.maxOrderQuantity === '' ? undefined : values.maxOrderQuantity,
    stockQuantity: values.stockQuantity,
    lowStockThreshold: values.lowStockThreshold,
    trackStock: values.trackStock,
    isDefault: values.isDefault,
    isActive: values.isActive,
  };
}

// =============================================================================
// KAYDEDİLMİŞ ÜRÜN
// =============================================================================

interface VariantsTabProps {
  productId: string;
  variants: ProductVariant[];
  unitTypes: UnitType[];
}

export function VariantsTab({ productId, variants, unitTypes }: VariantsTabProps) {
  const queryClient = useQueryClient();

  const [isOpen, setOpen] = useState(false);
  const [editing, setEditing] = useState<ProductVariant | null>(null);
  const [deleting, setDeleting] = useState<ProductVariant | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const form = useForm<VariantFormValues>({
    resolver: zodResolver(variantFormSchema),
    defaultValues: EMPTY_VARIANT,
  });

  const invalidate = async (): Promise<void> => {
    await queryClient.invalidateQueries({ queryKey: ['product', productId] });
  };

  const saveMutation = useMutation({
    mutationFn: (values: VariantFormValues) => {
      const { stockQuantity, ...payload } = toVariantPayload(values);

      // STOK YALNIZ OLUŞTURMADA GÖNDERİLİR (Sprint 9).
      //
      // Oluşturmada değer bir INITIAL stok hareketi üretir. Güncellemede
      // gönderilirse backend isteği 400 ile reddeder — çünkü stok yalnız
      // hareket kaydıyla değişir. Alanı burada ayıklamak, "hiç
      // değiştirmedim" diye gönderilen mevcut değerin de reddedilmesini
      // önler.
      return editing === null
        ? productsApi.createVariant(productId, { ...payload, stockQuantity })
        : productsApi.updateVariant(productId, editing.id, payload);
    },
    onSuccess: async () => {
      await invalidate();
      close();
    },
    onError: (error: unknown) => {
      setFormError(error instanceof ApiError ? error.message : 'Varyasyon kaydedilemedi.');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (variantId: string) => productsApi.removeVariant(productId, variantId),
    onSuccess: async () => {
      setDeleteError(null);
      await invalidate();
      setDeleting(null);
    },
    onError: (error: unknown) => {
      setDeleteError(error instanceof ApiError ? error.message : 'Varyasyon silinemedi.');
    },
  });

  function openCreate(): void {
    setEditing(null);
    setFormError(null);
    form.reset({ ...EMPTY_VARIANT, unitTypeId: unitTypes[0]?.id ?? '' });
    setOpen(true);
  }

  function openEdit(variant: ProductVariant): void {
    setEditing(variant);
    setFormError(null);
    form.reset(toFormValues(variant));
    setOpen(true);
  }

  function close(): void {
    setOpen(false);
    setEditing(null);
    setFormError(null);
  }

  const rows = variants.map(toRowFromVariant);

  return (
    <div className="flex flex-col gap-6">
      {/* Uyarı ADETE değil AKTİFLİĞE bakar: pasif varyasyonu olan ürün de satılamaz. */}
      {!variants.some((variant) => variant.isActive) ? <NoVariantWarning isDraft={false} /> : null}

      <VariantsTable
        rows={rows}
        onAdd={openCreate}
        canAdd={unitTypes.length > 0}
        onEdit={(row) => {
          const variant = variants.find((item) => item.id === row.persistedId);

          if (variant !== undefined) {
            openEdit(variant);
          }
        }}
        onDelete={(row) => {
          const variant = variants.find((item) => item.id === row.persistedId);

          if (variant !== undefined) {
            setDeleting(variant);
          }
        }}
      />

      <VariantFormDialog
        open={isOpen}
        onOpenChange={(next) => (next ? setOpen(true) : close())}
        form={form}
        unitTypes={unitTypes}
        editingSku={editing?.sku ?? null}
        errorMessage={formError}
        isSubmitting={saveMutation.isPending}
        onValid={(values) => saveMutation.mutate(values)}
        clearError={() => setFormError(null)}
      />

      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(next) => {
          if (!next) {
            setDeleting(null);
            setDeleteError(null);
          }
        }}
        title="Varyasyon silinsin mi?"
        description={`"${deleting?.sku ?? ''}" varyasyonu pasife alınacak. Son aktif varyasyon ise ürün yayından kalkar.`}
        onConfirm={() => {
          if (deleting !== null) {
            setDeleteError(null);
            deleteMutation.mutate(deleting.id);
          }
        }}
        errorMessage={deleteError}
        isPending={deleteMutation.isPending}
        confirmLabel="Evet, sil"
      />
    </div>
  );
}

// =============================================================================
// YENİ ÜRÜN (TASLAK)
// =============================================================================

interface DraftVariantsTabProps {
  drafts: VariantFormValues[];
  onChange: (next: VariantFormValues[]) => void;
  unitTypes: UnitType[];
}

/**
 * Yeni ürün için varyasyon sekmesi.
 *
 * Hiçbir API çağrısı yapmaz: liste form durumunda tutulur ve "Ürünü Kaydet"
 * anında ürünle birlikte tek istekte gönderilir. Böylece varyasyonu geçersiz
 * olan bir ürün hiç oluşmaz.
 */
export function DraftVariantsTab({ drafts, onChange, unitTypes }: DraftVariantsTabProps) {
  const [isOpen, setOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [deletingIndex, setDeletingIndex] = useState<number | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const form = useForm<VariantFormValues>({
    resolver: zodResolver(variantFormSchema),
    defaultValues: EMPTY_VARIANT,
  });

  function openCreate(): void {
    setEditingIndex(null);
    setFormError(null);
    form.reset({ ...EMPTY_VARIANT, unitTypeId: unitTypes[0]?.id ?? '' });
    setOpen(true);
  }

  function openEdit(index: number): void {
    const draft = drafts[index];

    if (draft === undefined) {
      return;
    }

    setEditingIndex(index);
    setFormError(null);
    form.reset(draft);
    setOpen(true);
  }

  function close(): void {
    setOpen(false);
    setEditingIndex(null);
    setFormError(null);
  }

  function submit(values: VariantFormValues): void {
    /*
     * SKU tekrarı BURADA yakalanır.
     *
     * Backend de reddeder ama o noktada kullanıcı yedi sekmeli formu
     * doldurmuş ve kaydete basmış olur; hatayı listeyi kurarken görmek
     * çok daha erken bir geri bildirimdir.
     */
    const duplicate = drafts.some(
      (draft, index) =>
        index !== editingIndex && draft.sku.toUpperCase() === values.sku.toUpperCase(),
    );

    if (duplicate) {
      setFormError(`Bu SKU listede zaten var: ${values.sku}`);

      return;
    }

    // Varsayılan TEK olabilir: yeni varsayılan işaretlendiyse diğerleri düşer.
    const cleared = values.isDefault
      ? drafts.map((draft) => ({ ...draft, isDefault: false }))
      : [...drafts];

    if (editingIndex === null) {
      // İlk varyasyon otomatik varsayılan olur — backend'deki kuralın aynısı.
      cleared.push({ ...values, isDefault: values.isDefault || cleared.length === 0 });
    } else {
      cleared[editingIndex] = values;
    }

    onChange(cleared);
    close();
  }

  function remove(index: number): void {
    const next = drafts.filter((_, current) => current !== index);

    // Varsayılan silindiyse ilk sıradaki devralır: ürün kartında gösterilecek
    // bir varyasyon her zaman bulunmalıdır.
    if (next.length > 0 && !next.some((draft) => draft.isDefault)) {
      next[0] = { ...(next[0] as VariantFormValues), isDefault: true };
    }

    onChange(next);
    setDeletingIndex(null);
  }

  const rows = drafts.map((draft, index) => toRowFromDraft(draft, index, unitTypes));
  const deletingSku = deletingIndex === null ? '' : (drafts[deletingIndex]?.sku ?? '');

  return (
    <div className="flex flex-col gap-6">
      {!drafts.some((draft) => draft.isActive) ? (
        <NoVariantWarning isDraft />
      ) : (
        <Alert variant="info" title="Varyasyonlar ürünle birlikte kaydedilecek">
          Liste henüz kaydedilmedi. “Ürünü Kaydet” dediğinizde ürün ve {drafts.length} varyasyon tek
          işlemde oluşturulur; biri geçersizse hiçbiri kaydedilmez.
        </Alert>
      )}

      <VariantsTable
        rows={rows}
        onAdd={openCreate}
        canAdd={unitTypes.length > 0}
        onEdit={(row) => openEdit(rows.indexOf(row))}
        onDelete={(row) => setDeletingIndex(rows.indexOf(row))}
      />

      <VariantFormDialog
        open={isOpen}
        onOpenChange={(next) => (next ? setOpen(true) : close())}
        form={form}
        unitTypes={unitTypes}
        // Taslakta stok alanı DAİMA yazılabilir: kayıt henüz oluşmadığı için
        // girilen değer bir düzeltme değil, açılış stoğudur.
        editingSku={null}
        errorMessage={formError}
        isSubmitting={false}
        onValid={submit}
        clearError={() => setFormError(null)}
      />

      <ConfirmDialog
        open={deletingIndex !== null}
        onOpenChange={(next) => {
          if (!next) {
            setDeletingIndex(null);
          }
        }}
        title="Varyasyon listeden çıkarılsın mı?"
        description={`"${deletingSku}" henüz kaydedilmedi; listeden kaldırılacak.`}
        onConfirm={() => {
          if (deletingIndex !== null) {
            remove(deletingIndex);
          }
        }}
        confirmLabel="Evet, çıkar"
      />
    </div>
  );
}

// =============================================================================
// PAYLAŞILAN PARÇALAR
// =============================================================================

/**
 * Aktif varyasyonu olmayan ürün uyarısı.
 *
 * Metin iki moda göre değişir çünkü kuralın ağırlığı farklı: yeni üründe
 * varyasyon KAYDIN ÖN KOŞULU (SPEC §15.3), kaydedilmiş üründe ise giderilmesi
 * gereken bir eksik — o kayıt kural sıkılaşmadan önce oluşmuş olabilir.
 */
function NoVariantWarning({ isDraft }: { isDraft: boolean }) {
  return (
    <Alert variant="warning" title="En az bir aktif varyasyon gerekli">
      {isDraft
        ? 'Ürünü kaydedebilmek için en az bir aktif varyasyon eklemelisiniz. Fiyat, stok ve SKU varyasyon düzeyinde tutulur.'
        : 'Bu ürünün aktif varyasyonu yok, bu yüzden satılamaz ve yayınlanamaz. Fiyat, stok ve SKU varyasyon düzeyinde tutulur.'}
    </Alert>
  );
}

interface VariantsTableProps {
  rows: VariantRow[];
  onAdd: () => void;
  canAdd: boolean;
  onEdit: (row: VariantRow) => void;
  onDelete: (row: VariantRow) => void;
}

function VariantsTable({ rows, onAdd, canAdd, onEdit, onDelete }: VariantsTableProps) {
  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between gap-4">
        <div>
          <CardTitle className="text-body-lg font-semibold">Varyasyonlar</CardTitle>
          <CardDescription>
            Aynı ürünün farklı ambalajları. Fiyat, stok ve SKU burada tanımlanır.
          </CardDescription>
        </div>

        <Button onClick={onAdd} disabled={!canAdd} type="button">
          <Plus />
          Varyasyon Ekle
        </Button>
      </CardHeader>

      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>SKU / Ad</TableHead>
              <TableHead>Birim</TableHead>
              <TableHead className="text-right">Alış</TableHead>
              <TableHead className="text-right">Satış</TableHead>
              <TableHead className="text-right">Stok</TableHead>
              <TableHead>Durum</TableHead>
              <TableHead className="text-right">İşlem</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {rows.length === 0 ? (
              <TableEmpty
                colSpan={7}
                icon={<Package />}
                title="Henüz varyasyon yok"
                description="Ürünün satılabilmesi için en az bir varyasyon gerekir."
              />
            ) : (
              rows.map((row) => (
                <TableRow key={row.key}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {row.isDefault ? (
                        <Star
                          className="size-3.5 shrink-0 text-primary-container"
                          aria-label="Varsayılan"
                        />
                      ) : null}
                      <div className="min-w-0">
                        <p className="truncate font-financial text-xs text-on-surface">{row.sku}</p>
                        <p className="truncate text-sm text-on-surface-variant">
                          {row.name ?? '—'}
                        </p>
                      </div>
                    </div>
                  </TableCell>

                  <TableCell className="whitespace-nowrap font-financial text-sm">
                    {row.unitLabel}
                  </TableCell>

                  <TableCell className="text-right font-financial">
                    {formatMoney(row.purchasePrice)}
                  </TableCell>

                  <TableCell className="text-right font-financial">
                    {formatMoney(row.salePrice)}
                  </TableCell>

                  <TableCell className="text-right">
                    <span
                      className={row.isLowStock ? 'font-financial text-error' : 'font-financial'}
                    >
                      {formatQuantity(row.stockQuantity)}
                    </span>
                  </TableCell>

                  <TableCell>
                    <Badge variant={row.isActive ? 'success' : 'neutral'}>
                      {row.isActive ? 'Aktif' : 'Pasif'}
                    </Badge>
                  </TableCell>

                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      {/* Stok geçmişi yalnız KAYDEDİLMİŞ varyasyonda vardır. */}
                      {row.persistedId !== null ? (
                        <Button variant="ghost" size="icon-sm" asChild title="Stok hareketleri">
                          <Link href={`/stok-hareketleri?variantId=${row.persistedId}`}>
                            <History />
                          </Link>
                        </Button>
                      ) : null}
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => onEdit(row)}
                        title="Düzenle"
                        type="button"
                      >
                        <Pencil />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => onDelete(row)}
                        title="Sil"
                        type="button"
                      >
                        <Trash2 />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

interface VariantFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  form: UseFormReturn<VariantFormValues>;
  unitTypes: UnitType[];
  /**
   * Düzenlenen KAYDEDİLMİŞ varyasyonun SKU'su; oluşturmada ve taslakta `null`.
   * Stok alanının salt okunur olup olmayacağını belirler.
   */
  editingSku: string | null;
  errorMessage: string | null;
  isSubmitting: boolean;
  onValid: (values: VariantFormValues) => void;
  clearError: () => void;
}

function VariantFormDialog({
  open,
  onOpenChange,
  form,
  unitTypes,
  editingSku,
  errorMessage,
  isSubmitting,
  onValid,
  clearError,
}: VariantFormDialogProps) {
  const selectedUnitId = form.watch('unitTypeId');
  const selectedUnit = unitTypes.find((unit) => unit.id === selectedUnitId);
  const allowsDecimal = selectedUnit?.allowsDecimal ?? true;
  const isEditingPersisted = editingSku !== null;

  const onSubmit = form.handleSubmit((values) => {
    clearError();

    // Ondalık kuralı: backend zaten reddeder ama kullanıcıyı burada uyarmak
    // gereksiz bir sunucu turunu ve belirsiz bir hata mesajını önler.
    const violations = findDecimalViolations(values, allowsDecimal);

    if (violations.length > 0) {
      for (const violation of violations) {
        form.setError(violation.field as 'unitQuantity', {
          message: `${violation.label} ondalıklı olamaz: "${selectedUnit?.name ?? 'bu birim'}" tam sayı gerektirir.`,
        });
      }

      return;
    }

    onValid(values);
  });

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={isEditingPersisted ? 'Varyasyon Düzenle' : 'Yeni Varyasyon'}
      description="Fiyat ve miktarlar kuruş hassasiyeti korunarak saklanır."
      onSubmit={onSubmit}
      errorMessage={errorMessage}
      isSubmitting={isSubmitting}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField>
          <Label htmlFor="sku" required>
            SKU
          </Label>
          <Input
            id="sku"
            placeholder="AGM-NPK-5KG"
            invalid={form.formState.errors.sku !== undefined}
            {...form.register('sku')}
          />
          <FieldError message={form.formState.errors.sku?.message} />
        </FormField>

        <FormField>
          <Label htmlFor="variant-name">Varyasyon Adı</Label>
          <Input id="variant-name" placeholder="5 kg Çuval" {...form.register('name')} />
          <FieldHint>Boş bırakılırsa birimden üretilir.</FieldHint>
        </FormField>

        <FormField>
          <Label htmlFor="unitTypeId" required>
            Birim
          </Label>
          <Select
            id="unitTypeId"
            invalid={form.formState.errors.unitTypeId !== undefined}
            {...form.register('unitTypeId')}
          >
            <option value="">— Seçiniz —</option>
            {unitTypes.map((unit) => (
              <option key={unit.id} value={unit.id}>
                {unit.name} ({unit.code}){unit.allowsDecimal ? '' : ' — tam sayı'}
              </option>
            ))}
          </Select>
          <FieldError message={form.formState.errors.unitTypeId?.message} />
        </FormField>

        <FormField>
          <Label htmlFor="unitQuantity" required>
            Ambalaj Miktarı
          </Label>
          <Input
            id="unitQuantity"
            inputMode="decimal"
            invalid={form.formState.errors.unitQuantity !== undefined}
            {...form.register('unitQuantity')}
          />
          {form.formState.errors.unitQuantity === undefined ? (
            <FieldHint>
              {allowsDecimal ? 'Ondalık girilebilir (ör. 2.5).' : 'Bu birim TAM SAYI gerektirir.'}
            </FieldHint>
          ) : (
            <FieldError message={form.formState.errors.unitQuantity.message} />
          )}
        </FormField>

        <FormField>
          <Label htmlFor="purchasePrice" required>
            Alış Fiyatı
          </Label>
          <Input
            id="purchasePrice"
            inputMode="decimal"
            invalid={form.formState.errors.purchasePrice !== undefined}
            {...form.register('purchasePrice')}
          />
          <FieldHint>Public tarafta ASLA gösterilmez.</FieldHint>
          <FieldError message={form.formState.errors.purchasePrice?.message} />
        </FormField>

        <FormField>
          <Label htmlFor="salePrice" required>
            Satış Fiyatı
          </Label>
          <Input
            id="salePrice"
            inputMode="decimal"
            invalid={form.formState.errors.salePrice !== undefined}
            {...form.register('salePrice')}
          />
          <FieldError message={form.formState.errors.salePrice?.message} />
        </FormField>

        <FormField>
          <Label htmlFor="taxRate">KDV Oranı (%)</Label>
          <Input id="taxRate" inputMode="decimal" {...form.register('taxRate')} />
        </FormField>

        <FormField>
          <Label htmlFor="minOrderQuantity" required>
            En Az Miktar
          </Label>
          <Input
            id="minOrderQuantity"
            inputMode="decimal"
            invalid={form.formState.errors.minOrderQuantity !== undefined}
            {...form.register('minOrderQuantity')}
          />
          <FieldError message={form.formState.errors.minOrderQuantity?.message} />
        </FormField>

        <FormField>
          <Label htmlFor="quantityStep" required>
            Miktar Adımı
          </Label>
          <Input
            id="quantityStep"
            inputMode="decimal"
            invalid={form.formState.errors.quantityStep !== undefined}
            {...form.register('quantityStep')}
          />
          {form.formState.errors.quantityStep === undefined ? (
            <FieldHint>Talep miktarı bu adımın katları olmalıdır.</FieldHint>
          ) : (
            <FieldError message={form.formState.errors.quantityStep.message} />
          )}
        </FormField>

        <FormField>
          <Label htmlFor="maxOrderQuantity">En Fazla Miktar</Label>
          <Input
            id="maxOrderQuantity"
            inputMode="decimal"
            placeholder="Sınırsız"
            invalid={form.formState.errors.maxOrderQuantity !== undefined}
            {...form.register('maxOrderQuantity')}
          />
          <FieldError message={form.formState.errors.maxOrderQuantity?.message} />
        </FormField>

        {/*
          STOK ALANI YALNIZ KAYITLI VARYASYON DÜZENLENİRKEN SALT OKUNURDUR
          (Sprint 9).

          Oluşturmada ve taslakta yazılabilir: girilen değer bir "açılış
          stoğu" hareketi üretir. Kayıtlı varyasyonda yazılabilir bıraksaydık,
          gerekçesiz ve geçmişe iz bırakmayan bir stok değişimi mümkün olurdu;
          oysa stoktaki her hareketin bir nedeni ve kaydı olmalıdır.
        */}
        <FormField>
          <Label htmlFor="stockQuantity" required={!isEditingPersisted}>
            {isEditingPersisted ? 'Stok' : 'Başlangıç Stoğu'}
          </Label>
          <Input
            id="stockQuantity"
            inputMode="decimal"
            // `readOnly` seçildi, `disabled` DEĞİL: disabled alanın değeri
            // form durumundan düşer ve şema doğrulaması "stok zorunludur"
            // diye patlar. readOnly hem yazmayı engeller hem değeri korur.
            readOnly={isEditingPersisted}
            className={
              isEditingPersisted ? 'bg-surface-container text-on-surface-variant' : undefined
            }
            invalid={form.formState.errors.stockQuantity !== undefined}
            {...form.register('stockQuantity')}
          />
          {isEditingPersisted ? (
            <FieldHint>
              Stok buradan değiştirilemez. Değiştirmek için{' '}
              <Link
                href={`/stok?search=${encodeURIComponent(editingSku)}`}
                className="text-primary-container underline"
              >
                stok düzeltme
              </Link>{' '}
              akışını kullanın.
            </FieldHint>
          ) : (
            <FieldHint>Girilen miktar bir “Açılış stoğu” hareketi olarak kaydedilir.</FieldHint>
          )}
          <FieldError message={form.formState.errors.stockQuantity?.message} />
        </FormField>

        <FormField>
          <Label htmlFor="lowStockThreshold">Kritik Stok Eşiği</Label>
          <Input
            id="lowStockThreshold"
            inputMode="decimal"
            {...form.register('lowStockThreshold')}
          />
          <FieldHint>Altına düşünce uyarı listesine girer. 0 = uyarı yok.</FieldHint>
        </FormField>
      </div>

      <div className="flex flex-col gap-2 border-t border-outline-variant pt-4">
        <label className="flex items-center gap-3">
          <input
            type="checkbox"
            className="size-4 accent-[color:var(--primary-container)]"
            {...form.register('isDefault')}
          />
          <span className="text-sm text-on-surface">
            Varsayılan varyasyon (ürün kartında bu gösterilir)
          </span>
        </label>

        <label className="flex items-center gap-3">
          <input
            type="checkbox"
            className="size-4 accent-[color:var(--primary-container)]"
            {...form.register('trackStock')}
          />
          <span className="text-sm text-on-surface">Stok takibi yapılsın</span>
        </label>

        <label className="flex items-center gap-3">
          <input
            type="checkbox"
            className="size-4 accent-[color:var(--primary-container)]"
            {...form.register('isActive')}
          />
          <span className="text-sm text-on-surface">Aktif</span>
        </label>
      </div>
    </FormDialog>
  );
}

/** Parasal değeri Türkçe biçimde gösterir. Değer STRING gelir (§13.6). */
function formatMoney(value: string | undefined): string {
  if (value === undefined) {
    return '—';
  }

  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    minimumFractionDigits: 2,
  }).format(Number(value));
}

/** Miktarı gereksiz sıfırlar olmadan gösterir. */
function formatQuantity(value: string): string {
  return String(Number(value));
}
