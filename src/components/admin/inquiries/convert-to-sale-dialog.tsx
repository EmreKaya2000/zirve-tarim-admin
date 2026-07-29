'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { keepPreviousData, useMutation, useQuery } from '@tanstack/react-query';
import { Search, Trash2, UserPlus } from 'lucide-react';
import {
  Alert,
  Badge,
  FieldError,
  FieldHint,
  FormDialog,
  FormField,
  Input,
  Label,
  Select,
  cn,
} from '@zirve/ui';
import { PAYMENT_TYPES, PAYMENT_TYPE_LABELS, type PaymentType } from '@zirve/types';

import { ApiError } from '@/lib/api-error';
import { formatMoney, formatQuantity } from '@/lib/format';
import type { InquiryDetail } from '@/lib/inquiries-api';
import { customersApi, inquiryConversionApi, type CustomerListItem } from '@/lib/sales-api';

/**
 * Talebi satışa dönüştürme akışı.
 *
 * İKİ ADIM: müşteri eşleştirme + kalem düzenleme. Yönetici talepteki
 * miktarı ve fiyatı değiştirebilir — müşteri mağazada talep ettiğinden
 * farklı miktar alabilir.
 *
 * MÜŞTERİ SEÇİLMEZSE sunucu talebin telefonuyla kayıtlı müşteriyi arar,
 * yoksa talebin iletişim bilgilerinden yeni müşteri oluşturur. Bu yüzden
 * müşteri seçimi ZORUNLU DEĞİLDİR.
 */
export function ConvertToSaleDialog({
  open,
  onOpenChange,
  inquiry,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  inquiry: InquiryDetail;
}) {
  const router = useRouter();

  const [customer, setCustomer] = useState<CustomerListItem | null>(null);
  const [search, setSearch] = useState('');
  const [paymentType, setPaymentType] = useState<PaymentType>('CASH');
  const [dueDate, setDueDate] = useState('');
  const [rows, setRows] = useState<ConvertRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Diyalog açıldığında kalemler talepten yüklenir. Ürünü silinmiş
  // kalemler atlanır: satışa aktarılamazlar.
  useEffect(() => {
    if (!open) {
      return;
    }

    setRows(
      inquiry.items
        .filter((item) => item.variantId !== null)
        .map((item) => ({
          variantId: item.variantId as string,
          productName: item.productNameSnapshot,
          variantName: item.variantNameSnapshot,
          unitLabel: item.unitTypeSnapshot,
          quantity: item.quantity,
          // Talepteki fiyat BİLGİLENDİRME fiyatıdır; boş bırakılırsa
          // sunucu varyasyonun güncel fiyatını kullanır.
          unitSalePrice: item.displayedPriceSnapshot ?? '',
          discountAmount: '',
        })),
    );
  }, [open, inquiry.items]);

  // Talebin telefonuyla kayıtlı müşteri varsa baştan gösterilir.
  const matchQuery = useQuery({
    queryKey: ['customer-match', inquiry.contactPhone],
    queryFn: () => customersApi.list({ search: inquiry.contactPhone, limit: 3 }),
    enabled: open,
  });

  const searchQuery = useQuery({
    queryKey: ['customer-search', search],
    queryFn: () => customersApi.list({ search, limit: 8, isActive: true }),
    enabled: open && search.trim().length >= 2,
    placeholderData: keepPreviousData,
  });

  const matched = matchQuery.data?.items ?? [];

  const mutation = useMutation({
    mutationFn: () =>
      inquiryConversionApi.convert(inquiry.id, {
        ...(customer !== null && { customerId: customer.id }),
        paymentType,
        ...(paymentType === 'CREDIT' && { dueDate: new Date(dueDate).toISOString() }),
        items: rows.map((row) => ({
          variantId: row.variantId,
          quantity: row.quantity,
          ...(row.unitSalePrice !== '' && { unitSalePrice: row.unitSalePrice }),
          ...(row.discountAmount !== '' && { discountAmount: row.discountAmount }),
        })),
      }),
    onSuccess: (sale) => {
      // Oluşan satış TASLAK'tır; yönetici onaylamak için detaya gider.
      router.push(`/satislar/${sale.id}`);
    },
    onError: (mutationError: unknown) => {
      setError(
        mutationError instanceof ApiError
          ? [mutationError.message, ...mutationError.details.map((d) => d.message)].join(' ')
          : 'Dönüşüm tamamlanamadı.',
      );
    },
  });

  const canSubmit =
    rows.length > 0 &&
    rows.every((row) => Number(row.quantity) > 0) &&
    (paymentType === 'CASH' || dueDate !== '');

  const patchRow = (index: number, patch: Partial<ConvertRow>): void => {
    setRows(rows.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  };

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Satışa Dönüştür"
      description={`${inquiry.inquiryNumber} talebinden TASLAK satış oluşturulur.`}
      errorMessage={error}
      isSubmitting={mutation.isPending}
      submitLabel="Taslak Satış Oluştur"
      onSubmit={(event) => {
        event.preventDefault();
        setError(null);

        if (canSubmit) {
          mutation.mutate();
        }
      }}
    >
      {/* --- Müşteri --- */}
      <FormField>
        <Label>Müşteri</Label>

        {customer !== null ? (
          <div className="flex items-center justify-between gap-3 rounded-[10px] border border-primary-container bg-secondary-container p-3">
            <span className="min-w-0">
              <span className="block text-label-md text-on-primary-fixed-variant">
                {customer.fullName}
              </span>
              <span className="block font-financial text-xs text-on-primary-fixed-variant opacity-80">
                {customer.code} · borç {formatMoney(customer.currentDebt)}
              </span>
            </span>

            <button
              type="button"
              onClick={() => setCustomer(null)}
              className="text-sm text-on-primary-fixed-variant underline"
            >
              Kaldır
            </button>
          </div>
        ) : (
          <>
            {matched.length > 0 ? (
              <div className="rounded-[8px] border border-outline-variant p-2">
                <p className="mb-1 text-label-sm uppercase text-on-surface-variant">
                  Bu telefonla kayıtlı müşteri
                </p>
                {matched.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setCustomer(item)}
                    className="flex w-full items-center justify-between gap-2 rounded-[6px] px-2 py-1.5 text-left text-sm hover:bg-surface-container-low"
                  >
                    <span>{item.fullName}</span>
                    <Badge variant={Number(item.currentDebt) > 0 ? 'warning' : 'neutral'}>
                      {formatMoney(item.currentDebt)}
                    </Badge>
                  </button>
                ))}
              </div>
            ) : (
              <Alert variant="info" title="Yeni müşteri oluşturulacak">
                <span className="flex items-center gap-2">
                  <UserPlus className="size-4 shrink-0" aria-hidden="true" />
                  {inquiry.contactName} ({inquiry.contactPhone}) adına yeni müşteri kaydı açılır.
                </span>
              </Alert>
            )}

            <Input
              startIcon={<Search />}
              placeholder="Farklı müşteri ara (en az 2 karakter)..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />

            {search.trim().length >= 2 ? (
              <div className="max-h-40 overflow-y-auto rounded-[8px] border border-outline-variant">
                {searchQuery.isPending ? (
                  <p className="p-2 text-sm text-on-surface-variant">Aranıyor...</p>
                ) : (searchQuery.data?.items ?? []).length === 0 ? (
                  <p className="p-2 text-sm text-on-surface-variant">Sonuç bulunamadı.</p>
                ) : (
                  (searchQuery.data?.items ?? []).map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setCustomer(item);
                        setSearch('');
                      }}
                      className="flex w-full items-center justify-between gap-2 border-b border-outline-variant px-2 py-1.5 text-left text-sm last:border-0 hover:bg-surface-container-low"
                    >
                      <span className="truncate">{item.fullName}</span>
                      <span className="font-financial text-xs text-on-surface-variant">
                        {item.code}
                      </span>
                    </button>
                  ))
                )}
              </div>
            ) : null}
          </>
        )}
      </FormField>

      {/* --- Ödeme tipi --- */}
      <FormField>
        <Label htmlFor="conv-payment-type" required>
          Ödeme Tipi
        </Label>
        <Select
          id="conv-payment-type"
          value={paymentType}
          onChange={(event) => setPaymentType(event.target.value as PaymentType)}
        >
          {PAYMENT_TYPES.map((value) => (
            <option key={value} value={value}>
              {PAYMENT_TYPE_LABELS[value]}
            </option>
          ))}
        </Select>
      </FormField>

      {paymentType === 'CREDIT' ? (
        <FormField>
          <Label htmlFor="conv-due" required>
            Vade Tarihi
          </Label>
          <Input
            id="conv-due"
            type="date"
            value={dueDate}
            onChange={(event) => setDueDate(event.target.value)}
          />
          <FieldError message={dueDate === '' ? 'Vadeli satışta zorunludur.' : undefined} />
        </FormField>
      ) : null}

      {/* --- Kalemler --- */}
      <FormField>
        <Label>Kalemler</Label>
        <FieldHint>
          Miktar ve fiyat düzenlenebilir. Fiyat boş bırakılırsa ürünün güncel satış fiyatı
          kullanılır.
        </FieldHint>

        {rows.length === 0 ? (
          <Alert variant="warning" title="Aktarılabilir kalem yok">
            Talep kalemlerinin ürünleri silinmiş olabilir. Satışı elle oluşturmanız gerekir.
          </Alert>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-sm">
              <thead>
                <tr className="border-b border-outline-variant text-left text-label-sm uppercase text-on-surface-variant">
                  <th className="pb-1">Ürün</th>
                  <th className="pb-1 text-right">Miktar</th>
                  <th className="pb-1 text-right">Fiyat</th>
                  <th className="pb-1 text-right">İndirim</th>
                  <th className="pb-1" />
                </tr>
              </thead>

              <tbody>
                {rows.map((row, index) => (
                  <tr key={row.variantId} className="border-b border-outline-variant last:border-0">
                    <td className="py-1.5 pr-2">
                      <p className="text-on-surface">{row.productName}</p>
                      <p className="text-xs text-on-surface-variant">
                        {row.variantName ?? row.unitLabel}
                      </p>
                    </td>

                    <td className="py-1.5 pr-2 text-right">
                      <input
                        type="number"
                        step="0.001"
                        min="0"
                        value={row.quantity}
                        onChange={(event) => patchRow(index, { quantity: event.target.value })}
                        className="w-20 rounded-[6px] border border-outline-variant bg-surface-container-lowest px-2 py-1 text-right font-financial"
                      />
                    </td>

                    <td className="py-1.5 pr-2 text-right">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="güncel"
                        value={row.unitSalePrice}
                        onChange={(event) => patchRow(index, { unitSalePrice: event.target.value })}
                        className="w-24 rounded-[6px] border border-outline-variant bg-surface-container-lowest px-2 py-1 text-right font-financial"
                      />
                    </td>

                    <td className="py-1.5 pr-2 text-right">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0"
                        value={row.discountAmount}
                        onChange={(event) =>
                          patchRow(index, { discountAmount: event.target.value })
                        }
                        className="w-20 rounded-[6px] border border-outline-variant bg-surface-container-lowest px-2 py-1 text-right font-financial"
                      />
                    </td>

                    <td className="py-1.5 text-right">
                      <button
                        type="button"
                        onClick={() => setRows(rows.filter((_, i) => i !== index))}
                        aria-label={`${row.productName} kalemini çıkar`}
                        className={cn('text-on-surface-variant hover:text-error')}
                      >
                        <Trash2 className="size-4" aria-hidden="true" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </FormField>

      <Alert variant="info" title="Satış TASLAK olarak oluşur">
        Onaylamadan borç doğmaz. Bir talep en fazla bir satışa dönüşür; ikinci deneme reddedilir.
      </Alert>
    </FormDialog>
  );
}

interface ConvertRow {
  variantId: string;
  productName: string;
  variantName: string | null;
  unitLabel: string;
  quantity: string;
  unitSalePrice: string;
  discountAmount: string;
}

/** Miktarı okunur biçimde gösteren yardımcı — tabloda başlık altında kullanılır. */
export function formatRowQuantity(quantity: string, unit: string): string {
  return `${formatQuantity(quantity)} ${unit}`;
}
