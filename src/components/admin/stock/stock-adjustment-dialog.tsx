'use client';

import { useEffect, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { ArrowDownRight, ArrowUpRight } from 'lucide-react';
import {
  Alert,
  FieldError,
  FieldHint,
  FormDialog,
  FormField,
  Input,
  Label,
  Select,
} from '@zirve/ui';
import {
  MANUAL_STOCK_MOVEMENT_TYPES,
  STOCK_DESCRIPTION_MAX_LENGTH,
  STOCK_MOVEMENT_DIRECTION_BY_TYPE,
  STOCK_MOVEMENT_TYPE_LABELS,
  SUPER_ADMIN_STOCK_MOVEMENT_TYPES,
  type ManualStockMovementType,
} from '@zirve/types';

import { ApiError } from '@/lib/api-error';
import { useAuthStore } from '@/lib/auth-store';
import { formatQuantity } from '@/lib/format';
import { stockApi, type StockListItem } from '@/lib/stock-api';

interface StockAdjustmentDialogProps {
  /** Düzeltme yapılacak varyasyon. `null` ise dialog kapalıdır. */
  variant: StockListItem | null;
  onClose: () => void;
  onSuccess: () => void | Promise<void>;
}

/** Miktar alanının etiketi tipe göre değişir — sayımda "sayılan stok" istenir. */
function quantityLabel(type: ManualStockMovementType): string {
  return type === 'INVENTORY_ADJUSTMENT' ? 'Sayılan Stok' : 'Miktar';
}

/**
 * Stok düzeltme dialogu.
 *
 * ⚠️ BU BİR "STOĞU DÜZENLE" FORMU DEĞİLDİR.
 *
 * Kullanıcı yeni bir stok DEĞERİ yazmaz; bir stok HAREKETİ girer. Fark
 * arayüzde de görünür olmalı: alan "Stok" değil "Miktar" diye etiketlenir,
 * gerekçe zorunludur ve hareketin sonucu (yeni stok) kaydetmeden önce
 * gösterilir. Aksi hâlde kullanıcı, aslında geçmişe iz bıraktığı bir işlemi
 * sıradan bir alan düzenlemesi sanardı.
 */
export function StockAdjustmentDialog({ variant, onClose, onSuccess }: StockAdjustmentDialogProps) {
  const role = useAuthStore((state) => state.user?.role);

  const [type, setType] = useState<ManualStockMovementType>('MANUAL_IN');
  const [quantity, setQuantity] = useState('');
  const [description, setDescription] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Dialog her açılışta sıfırlanır: önceki varyasyonun gerekçesi yeni
  // varyasyona taşınırsa yanlış kayıt üretir.
  useEffect(() => {
    if (variant !== null) {
      setType('MANUAL_IN');
      setQuantity('');
      setDescription('');
      setFormError(null);
      setFieldErrors({});
    }
  }, [variant]);

  const mutation = useMutation({
    mutationFn: () => {
      if (variant === null) {
        throw new Error('Varyasyon seçilmedi.');
      }

      return stockApi.adjust({
        variantId: variant.id,
        type,
        quantity: quantity.trim(),
        description: description.trim(),
      });
    },
    onSuccess: async () => {
      await onSuccess();
      onClose();
    },
    onError: (error: unknown) => {
      if (error instanceof ApiError) {
        setFormError(error.message);
        setFieldErrors(error.toFieldErrors());
        return;
      }

      setFormError('Stok hareketi kaydedilemedi.');
    },
  });

  if (variant === null) {
    return null;
  }

  const availableTypes = MANUAL_STOCK_MOVEMENT_TYPES.filter(
    (value) => !SUPER_ADMIN_STOCK_MOVEMENT_TYPES.includes(value) || role === 'SUPER_ADMIN',
  );

  const direction = STOCK_MOVEMENT_DIRECTION_BY_TYPE[type];
  const preview = previewStock(variant.stockQuantity, quantity, type);

  return (
    <FormDialog
      open
      onOpenChange={(next) => {
        if (!next) {
          onClose();
        }
      }}
      title="Stok Düzeltme"
      description={`${variant.product.name} — ${variant.name ?? variant.sku}`}
      onSubmit={(event) => {
        event.preventDefault();
        setFormError(null);
        setFieldErrors({});
        mutation.mutate();
      }}
      errorMessage={formError}
      isSubmitting={mutation.isPending}
      submitLabel="Hareketi Kaydet"
    >
      <div className="rounded-lg bg-surface-container px-4 py-3">
        <p className="text-label-sm uppercase text-on-surface-variant">Mevcut stok</p>
        <p className="font-financial text-title-md text-on-surface">
          {formatQuantity(variant.stockQuantity)} {variant.unitType.code}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField>
          <Label htmlFor="movement-type" required>
            Hareket Nedeni
          </Label>
          <Select
            id="movement-type"
            value={type}
            onChange={(event) => setType(event.target.value as ManualStockMovementType)}
          >
            {availableTypes.map((value) => (
              <option key={value} value={value}>
                {STOCK_MOVEMENT_TYPE_LABELS[value]}
              </option>
            ))}
          </Select>
          <FieldHint>
            {direction === null
              ? 'Yön, sayım sonucuna göre otomatik belirlenir.'
              : direction === 'IN'
                ? 'Stok ARTAR.'
                : 'Stok AZALIR.'}
          </FieldHint>
        </FormField>

        <FormField>
          <Label htmlFor="movement-quantity" required>
            {quantityLabel(type)}
          </Label>
          <Input
            id="movement-quantity"
            inputMode="decimal"
            placeholder={type === 'INVENTORY_ADJUSTMENT' ? 'Rafta sayılan miktar' : '0'}
            value={quantity}
            invalid={fieldErrors['quantity'] !== undefined}
            onChange={(event) => setQuantity(event.target.value)}
          />
          {fieldErrors['quantity'] === undefined ? (
            <FieldHint>
              {type === 'INVENTORY_ADJUSTMENT'
                ? 'Fark değil, SAYDIĞINIZ miktarı girin.'
                : `Birim: ${variant.unitType.name}.`}
            </FieldHint>
          ) : (
            <FieldError message={fieldErrors['quantity']} />
          )}
        </FormField>
      </div>

      <FormField>
        <Label htmlFor="movement-description" required>
          Gerekçe
        </Label>
        <Input
          id="movement-description"
          placeholder="Örn. Sayımda 3 çuval eksik çıktı"
          maxLength={STOCK_DESCRIPTION_MAX_LENGTH}
          value={description}
          invalid={fieldErrors['description'] !== undefined}
          onChange={(event) => setDescription(event.target.value)}
        />
        {fieldErrors['description'] === undefined ? (
          <FieldHint>
            Zorunludur. Altı ay sonra bu kaydı okuyan kişi neden değiştiğini bilmelidir.
          </FieldHint>
        ) : (
          <FieldError message={fieldErrors['description']} />
        )}
      </FormField>

      {preview !== null ? (
        <div className="flex items-center gap-2 rounded-lg border border-outline-variant px-4 py-3">
          {preview.isIncrease ? (
            <ArrowUpRight className="size-4 text-success" />
          ) : (
            <ArrowDownRight className="size-4 text-error" />
          )}
          <span className="text-sm text-on-surface-variant">Kayıttan sonraki stok:</span>
          <span className="font-financial text-label-md text-on-surface">
            {formatQuantity(preview.newStock)} {variant.unitType.code}
          </span>
        </div>
      ) : null}

      {preview !== null && Number(preview.newStock) < 0 ? (
        <Alert variant="error" title="Stok yetersiz">
          Bu hareket stoğu negatife düşürür. Negatif stok kabul edilmez; miktarı düşürün ya da önce
          giriş hareketi girin.
        </Alert>
      ) : null}

      {!variant.trackStock ? (
        <Alert variant="warning" title="Stok takibi kapalı">
          Bu varyasyonda stok takibi kapalı. Hareket girebilmek için önce ürün formundan stok
          takibini açın.
        </Alert>
      ) : null}
    </FormDialog>
  );
}

/**
 * Kaydetmeden önceki sonuç önizlemesi.
 *
 * SALT GÖSTERİM amaçlıdır — gerçek hesap backend'de Decimal ile yapılır
 * (Kural 2). Buradaki `Number()` çevrimi kuruş/gram hassasiyeti gerektiren
 * bir karara girmez.
 */
function previewStock(
  current: string,
  input: string,
  type: ManualStockMovementType,
): { newStock: string; isIncrease: boolean } | null {
  const trimmed = input.trim();

  if (trimmed === '' || Number.isNaN(Number(trimmed))) {
    return null;
  }

  const currentValue = Number(current);
  const inputValue = Number(trimmed);

  if (type === 'INVENTORY_ADJUSTMENT') {
    return { newStock: String(inputValue), isIncrease: inputValue >= currentValue };
  }

  const isIncrease = STOCK_MOVEMENT_DIRECTION_BY_TYPE[type] === 'IN';

  return {
    newStock: String(isIncrease ? currentValue + inputValue : currentValue - inputValue),
    isIncrease,
  };
}
