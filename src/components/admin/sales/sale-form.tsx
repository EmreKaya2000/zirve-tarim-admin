'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { keepPreviousData, useMutation, useQuery } from '@tanstack/react-query';
import { ArrowLeft, Plus, Search, Trash2, UserPlus } from 'lucide-react';
import {
  Alert,
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  FieldError,
  FieldHint,
  FormDialog,
  FormField,
  Input,
  Label,
  PageHeader,
  Select,
  cn,
} from '@zirve/ui';
import {
  PAYMENT_METHODS,
  PAYMENT_METHOD_LABELS,
  PAYMENT_TYPES,
  PAYMENT_TYPE_LABELS,
  requiresPaymentDueDate,
  type PaymentMethod,
  type PaymentType,
} from '@zirve/types';

import { ApiError } from '@/lib/api-error';
import { formatMoney, formatQuantity } from '@/lib/format';
import { productsApi, type Product } from '@/lib/products-api';
import { customersApi, salesApi, type CustomerListItem } from '@/lib/sales-api';

/**
 * Satış oluşturma formu.
 *
 * KÂR ÖNİZLEMESİ arayüzde hesaplanır ama BAĞLAYICI DEĞİLDİR: kaydedilen
 * değerler backend'in `SaleCalculationService` çıktısıdır. Buradaki
 * hesap yalnız yöneticinin kaydetmeden önce kârı görmesi içindir
 * (Kural 10).
 *
 * Bu yüzden önizleme ile kayıt arasında fark olması MÜMKÜNDÜR: fiyat
 * o anda başka bir oturumda değişmiş olabilir. Kaydettikten sonra
 * gösterilen değer daima sunucudan gelir.
 */
export function SaleForm() {
  const router = useRouter();

  const [customer, setCustomer] = useState<CustomerListItem | null>(null);
  const [paymentType, setPaymentType] = useState<PaymentType>('CASH');
  const [saleDate, setSaleDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [dueDate, setDueDate] = useState('');
  const [note, setNote] = useState('');
  const [rows, setRows] = useState<ItemRow[]>([]);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const [initialPaymentEnabled, setInitialPaymentEnabled] = useState(false);
  const [initialMethod, setInitialMethod] = useState<PaymentMethod>('CASH');
  const [initialAmount, setInitialAmount] = useState('');
  const [initialDueDate, setInitialDueDate] = useState('');

  const totals = useMemo(() => previewTotals(rows), [rows]);

  const mutation = useMutation({
    mutationFn: () =>
      salesApi.create({
        customerId: (customer as CustomerListItem).id,
        saleDate: new Date(saleDate).toISOString(),
        paymentType,
        ...(paymentType === 'CREDIT' && { dueDate: new Date(dueDate).toISOString() }),
        items: rows.map((row) => ({
          variantId: row.variantId,
          quantity: row.quantity,
          unitSalePrice: row.unitSalePrice,
          ...(row.discountAmount !== '' && { discountAmount: row.discountAmount }),
        })),
        ...(note.trim() !== '' && { note: note.trim() }),
        ...(initialPaymentEnabled && {
          initialPayment: {
            method: initialMethod,
            amount: initialAmount,
            ...(requiresPaymentDueDate(initialMethod) && {
              dueDate: new Date(initialDueDate).toISOString(),
            }),
          },
        }),
      }),
    onSuccess: (sale) => {
      router.push(`/satislar/${sale.id}`);
    },
    onError: (error: unknown) => {
      if (!(error instanceof ApiError)) {
        setFormError('Satış oluşturulamadı.');

        return;
      }

      const errors: Record<string, string> = {};

      for (const detail of error.details) {
        if (detail.field !== undefined) {
          errors[detail.field] = detail.message;
        }
      }

      setFieldErrors(errors);
      setFormError(
        error.details.length === 0
          ? error.message
          : `${error.message} ${error.details.map((d) => d.message).join(' ')}`,
      );
    },
  });

  const canSubmit =
    customer !== null &&
    rows.length > 0 &&
    rows.every((row) => Number(row.quantity) > 0) &&
    (paymentType === 'CASH' || dueDate !== '') &&
    (!initialPaymentEnabled || Number(initialAmount) > 0);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Button asChild variant="ghost" size="sm" className="-ml-2">
          <Link href="/satislar">
            <ArrowLeft />
            Satışlara dön
          </Link>
        </Button>
      </div>

      <PageHeader
        title="Yeni Satış"
        description="Satış TASLAK olarak oluşur; onaylayana kadar borç doğurmaz."
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_380px] lg:items-start">
        <div className="flex flex-col gap-6">
          <CustomerPicker selected={customer} onSelect={setCustomer} />

          <ItemsCard rows={rows} onChange={setRows} fieldErrors={fieldErrors} />
        </div>

        <div className="flex flex-col gap-6 lg:sticky lg:top-24">
          <Card>
            <CardHeader>
              <CardTitle className="text-body-lg font-semibold">Satış Bilgileri</CardTitle>
            </CardHeader>

            <CardContent className="flex flex-col gap-4">
              <FormField>
                <Label htmlFor="saleDate" required>
                  Satış Tarihi
                </Label>
                <Input
                  id="saleDate"
                  type="date"
                  value={saleDate}
                  onChange={(event) => setSaleDate(event.target.value)}
                />
              </FormField>

              <FormField>
                <Label htmlFor="paymentType" required>
                  Ödeme Tipi
                </Label>
                <Select
                  id="paymentType"
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
                  <Label htmlFor="dueDate" required>
                    Vade Tarihi
                  </Label>
                  <Input
                    id="dueDate"
                    type="date"
                    value={dueDate}
                    onChange={(event) => setDueDate(event.target.value)}
                  />
                  <FieldError message={fieldErrors.dueDate} />
                  <FieldHint>Vadeli satışta zorunludur.</FieldHint>
                </FormField>
              ) : null}

              <FormField>
                <Label htmlFor="note">Not</Label>
                <textarea
                  id="note"
                  rows={2}
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  className="w-full rounded-[8px] border border-outline-variant bg-surface-container-lowest px-4 py-3 text-[15px] outline-none focus:border-primary-container focus:ring-2 focus:ring-secondary-container"
                />
              </FormField>
            </CardContent>
          </Card>

          <TotalsCard totals={totals} />

          <Card>
            <CardHeader>
              <CardTitle className="text-body-lg font-semibold">İlk Ödeme</CardTitle>
              <CardDescription>
                Peşin satışta tahsilatı hemen kaydedebilirsiniz. Satış otomatik onaylanır.
              </CardDescription>
            </CardHeader>

            <CardContent className="flex flex-col gap-4">
              <label className="flex cursor-pointer items-center gap-2 text-sm text-on-surface">
                <input
                  type="checkbox"
                  checked={initialPaymentEnabled}
                  onChange={(event) => setInitialPaymentEnabled(event.target.checked)}
                  className="size-4 rounded border-outline-variant accent-primary"
                />
                Satışla birlikte ödeme al
              </label>

              {initialPaymentEnabled ? (
                <>
                  <FormField>
                    <Label htmlFor="initialMethod" required>
                      Yöntem
                    </Label>
                    <Select
                      id="initialMethod"
                      value={initialMethod}
                      onChange={(event) => setInitialMethod(event.target.value as PaymentMethod)}
                    >
                      {PAYMENT_METHODS.map((value) => (
                        <option key={value} value={value}>
                          {PAYMENT_METHOD_LABELS[value]}
                        </option>
                      ))}
                    </Select>
                  </FormField>

                  <FormField>
                    <Label htmlFor="initialAmount" required>
                      Tutar
                    </Label>
                    <Input
                      id="initialAmount"
                      type="number"
                      step="0.01"
                      min="0"
                      value={initialAmount}
                      onChange={(event) => setInitialAmount(event.target.value)}
                      className="font-financial"
                    />
                    <FieldHint>
                      En fazla {formatMoney(totals.grandTotal)} tahsil edilebilir.
                    </FieldHint>
                  </FormField>

                  {requiresPaymentDueDate(initialMethod) ? (
                    <FormField>
                      <Label htmlFor="initialDueDate" required>
                        Vade Tarihi
                      </Label>
                      <Input
                        id="initialDueDate"
                        type="date"
                        value={initialDueDate}
                        onChange={(event) => setInitialDueDate(event.target.value)}
                      />
                      <FieldHint>Çek ve senette zorunludur.</FieldHint>
                    </FormField>
                  ) : null}
                </>
              ) : null}
            </CardContent>
          </Card>

          {formError !== null ? (
            <Alert variant="error" title="Satış oluşturulamadı">
              {formError}
            </Alert>
          ) : null}

          <Button
            size="lg"
            disabled={!canSubmit || mutation.isPending}
            onClick={() => {
              setFormError(null);
              setFieldErrors({});
              mutation.mutate();
            }}
          >
            {mutation.isPending ? 'Kaydediliyor...' : 'Taslak Satışı Kaydet'}
          </Button>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// MÜŞTERİ SEÇİMİ
// =============================================================================

function CustomerPicker({
  selected,
  onSelect,
}: {
  selected: CustomerListItem | null;
  onSelect: (customer: CustomerListItem) => void;
}) {
  const [search, setSearch] = useState('');
  const [isCreateOpen, setCreateOpen] = useState(false);

  const searchQuery = useQuery({
    queryKey: ['customer-search', search],
    queryFn: () => customersApi.list({ search, limit: 8, isActive: true }),
    enabled: search.trim().length >= 2,
    placeholderData: keepPreviousData,
  });

  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between gap-4">
        <div>
          <CardTitle className="text-body-lg font-semibold">Müşteri</CardTitle>
          <CardDescription>Mevcut müşteriyi arayın veya yeni kayıt oluşturun.</CardDescription>
        </div>

        <Button variant="outline" size="sm" onClick={() => setCreateOpen(true)}>
          <UserPlus />
          Yeni Müşteri
        </Button>
      </CardHeader>

      <CardContent className="flex flex-col gap-3">
        {selected !== null ? (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-[10px] border border-primary-container bg-secondary-container p-4">
            <div>
              <p className="text-label-md text-on-primary-fixed-variant">{selected.fullName}</p>
              <p className="font-financial text-sm text-on-primary-fixed-variant opacity-80">
                {selected.code} · {selected.phone}
              </p>
            </div>

            <div className="text-right">
              <p className="text-label-sm uppercase text-on-primary-fixed-variant opacity-70">
                Mevcut borç
              </p>
              <p className="font-financial text-label-md text-on-primary-fixed-variant">
                {formatMoney(selected.currentDebt)}
              </p>
            </div>
          </div>
        ) : null}

        {selected !== null && selected.isOverLimit ? (
          <Alert variant="warning" title="Kredi limiti aşılmış">
            Bu müşterinin borcu tanımlı limiti aşıyor. Vadeli satış yapmak engellenmez; karar sizin.
          </Alert>
        ) : null}

        {Number(selected?.overdueDebt ?? 0) > 0 ? (
          <Alert variant="error" title="Vadesi geçmiş borç var">
            {formatMoney(selected?.overdueDebt)} tutarında vadesi geçmiş borç bulunuyor.
          </Alert>
        ) : null}

        <Input
          startIcon={<Search />}
          placeholder="Ad, telefon veya müşteri kodu (en az 2 karakter)..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />

        {search.trim().length >= 2 ? (
          <div className="max-h-64 overflow-y-auto rounded-[8px] border border-outline-variant">
            {searchQuery.isPending ? (
              <p className="p-3 text-sm text-on-surface-variant">Aranıyor...</p>
            ) : (searchQuery.data?.items ?? []).length === 0 ? (
              <p className="p-3 text-sm text-on-surface-variant">
                Sonuç bulunamadı. Yeni müşteri oluşturabilirsiniz.
              </p>
            ) : (
              (searchQuery.data?.items ?? []).map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    onSelect(item);
                    setSearch('');
                  }}
                  className="flex w-full items-center justify-between gap-3 border-b border-outline-variant px-3 py-2 text-left last:border-0 hover:bg-surface-container-low"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm text-on-surface">{item.fullName}</span>
                    <span className="block font-financial text-xs text-on-surface-variant">
                      {item.code} · {item.phone}
                    </span>
                  </span>

                  {Number(item.currentDebt) > 0 ? (
                    <Badge variant={item.isOverLimit ? 'error' : 'warning'}>
                      {formatMoney(item.currentDebt)}
                    </Badge>
                  ) : null}
                </button>
              ))
            )}
          </div>
        ) : null}
      </CardContent>

      <QuickCustomerDialog
        open={isCreateOpen}
        onOpenChange={setCreateOpen}
        onCreated={(created) => {
          onSelect(created);
          setCreateOpen(false);
        }}
      />
    </Card>
  );
}

/** Hızlı müşteri oluşturma — satış akışını bölmemek için. */
function QuickCustomerDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (customer: CustomerListItem) => void;
}) {
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('');
  const [district, setDistrict] = useState('');
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () =>
      customersApi.create({
        fullName: fullName.trim(),
        phone: phone.trim(),
        ...(city.trim() !== '' && { city: city.trim() }),
        ...(district.trim() !== '' && { district: district.trim() }),
      }),
    onSuccess: (created) => {
      onCreated({
        ...created,
        totalSales: '0',
        totalPaid: '0',
        currentDebt: created.financeSummary?.currentDebt ?? '0',
        overdueDebt: '0',
        isOverLimit: false,
      });
      setFullName('');
      setPhone('');
      setCity('');
      setDistrict('');
      setError(null);
    },
    onError: (mutationError: unknown) => {
      setError(
        mutationError instanceof ApiError
          ? [mutationError.message, ...mutationError.details.map((d) => d.message)].join(' ')
          : 'Müşteri oluşturulamadı.',
      );
    },
  });

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Yeni Müşteri"
      description="Satış akışını bölmeden hızlı kayıt. Ayrıntıları sonra tamamlayabilirsiniz."
      errorMessage={error}
      isSubmitting={mutation.isPending}
      submitLabel="Oluştur"
      onSubmit={(event) => {
        event.preventDefault();
        setError(null);
        mutation.mutate();
      }}
    >
      <FormField>
        <Label htmlFor="qc-name" required>
          Ad Soyad
        </Label>
        <Input
          id="qc-name"
          value={fullName}
          onChange={(event) => setFullName(event.target.value)}
        />
      </FormField>

      <FormField>
        <Label htmlFor="qc-phone" required>
          Telefon
        </Label>
        <Input
          id="qc-phone"
          placeholder="0532 123 45 67"
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
        />
        <FieldHint>Aynı numarayla kayıtlı müşteri varsa uyarı alırsınız.</FieldHint>
      </FormField>

      <div className="grid grid-cols-2 gap-3">
        <FormField>
          <Label htmlFor="qc-city">İl</Label>
          <Input id="qc-city" value={city} onChange={(event) => setCity(event.target.value)} />
        </FormField>

        <FormField>
          <Label htmlFor="qc-district">İlçe</Label>
          <Input
            id="qc-district"
            value={district}
            onChange={(event) => setDistrict(event.target.value)}
          />
        </FormField>
      </div>
    </FormDialog>
  );
}

// =============================================================================
// KALEMLER
// =============================================================================

export interface ItemRow {
  variantId: string;
  productName: string;
  variantName: string;
  sku: string;
  unitCode: string;
  allowsDecimal: boolean;
  quantity: string;
  unitSalePrice: string;
  /** HASSAS: kâr önizlemesi için taşınır, kaydedilmez. */
  unitPurchasePrice: string;
  discountAmount: string;
}

function ItemsCard({
  rows,
  onChange,
  fieldErrors,
}: {
  rows: ItemRow[];
  onChange: (rows: ItemRow[]) => void;
  fieldErrors: Record<string, string>;
}) {
  const [search, setSearch] = useState('');

  const searchQuery = useQuery({
    queryKey: ['sale-product-search', search],
    queryFn: () => productsApi.list({ search, limit: 8, isActive: true }),
    enabled: search.trim().length >= 2,
    placeholderData: keepPreviousData,
  });

  const addVariant = (product: Product, variantIndex: number): void => {
    const variant = product.variants[variantIndex];

    if (variant === undefined || rows.some((row) => row.variantId === variant.id)) {
      return;
    }

    onChange([
      ...rows,
      {
        variantId: variant.id,
        productName: product.name,
        variantName:
          variant.name ?? `${formatQuantity(variant.unitQuantity)} ${variant.unitType.code}`,
        sku: variant.sku,
        unitCode: variant.unitType.code,
        allowsDecimal: variant.unitType.allowsDecimal,
        quantity: variant.minOrderQuantity,
        unitSalePrice: variant.salePrice ?? '0',
        unitPurchasePrice: variant.purchasePrice ?? '0',
        discountAmount: '',
      },
    ]);
    setSearch('');
  };

  const patchRow = (index: number, patch: Partial<ItemRow>): void => {
    onChange(rows.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-body-lg font-semibold">Kalemler</CardTitle>
        <CardDescription>
          Fiyatlar satış anında kopyalanır; ürün fiyatı sonradan değişse bu satış değişmez.
        </CardDescription>
      </CardHeader>

      <CardContent className="flex flex-col gap-4">
        <div>
          <Input
            startIcon={<Search />}
            placeholder="Ürün ara (en az 2 karakter)..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />

          {search.trim().length >= 2 ? (
            <div className="mt-2 max-h-64 overflow-y-auto rounded-[8px] border border-outline-variant">
              {searchQuery.isPending ? (
                <p className="p-3 text-sm text-on-surface-variant">Aranıyor...</p>
              ) : (searchQuery.data?.items ?? []).length === 0 ? (
                <p className="p-3 text-sm text-on-surface-variant">Sonuç bulunamadı.</p>
              ) : (
                (searchQuery.data?.items ?? []).map((product) => (
                  <div
                    key={product.id}
                    className="border-b border-outline-variant p-2 last:border-0"
                  >
                    <p className="text-sm text-on-surface">{product.name}</p>

                    <div className="mt-1 flex flex-wrap gap-1.5">
                      {product.variants
                        .filter((variant) => variant.isActive)
                        .map((variant, index) => (
                          <button
                            key={variant.id}
                            type="button"
                            onClick={() => addVariant(product, product.variants.indexOf(variant))}
                            disabled={rows.some((row) => row.variantId === variant.id)}
                            className={cn(
                              'rounded-full border border-outline-variant px-2.5 py-1 text-xs transition-colors',
                              'hover:border-primary-container hover:text-primary-container',
                              'disabled:opacity-40',
                            )}
                          >
                            <Plus className="mr-1 inline size-3" aria-hidden="true" />
                            {variant.name ??
                              `${formatQuantity(variant.unitQuantity)} ${variant.unitType.code}`}
                            {variant.salePrice !== undefined
                              ? ` · ${formatMoney(variant.salePrice)}`
                              : ''}
                            {index < 0 ? '' : ''}
                          </button>
                        ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          ) : null}
        </div>

        {rows.length === 0 ? (
          <p className="rounded-[8px] border border-dashed border-outline-variant p-6 text-center text-sm text-on-surface-variant">
            Henüz kalem eklenmedi. Yukarıdan ürün arayarak ekleyin.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b border-outline-variant text-left text-label-sm uppercase text-on-surface-variant">
                  <th className="pb-2">Ürün</th>
                  <th className="pb-2 text-right">Miktar</th>
                  <th className="pb-2 text-right">Birim Fiyat</th>
                  <th className="pb-2 text-right">İndirim</th>
                  <th className="pb-2 text-right">Tutar</th>
                  <th className="pb-2 text-right">Kâr</th>
                  <th className="pb-2" />
                </tr>
              </thead>

              <tbody>
                {rows.map((row, index) => {
                  const line = previewLine(row);
                  const error =
                    fieldErrors[`items[${index}].quantity`] ??
                    fieldErrors[`items[${index}].discountAmount`];

                  return (
                    <tr
                      key={row.variantId}
                      className="border-b border-outline-variant last:border-0"
                    >
                      <td className="py-2 pr-2">
                        <p className="text-on-surface">{row.productName}</p>
                        <p className="font-financial text-xs text-on-surface-variant">
                          {row.variantName} · {row.sku}
                        </p>
                        {error !== undefined ? <p className="text-xs text-error">{error}</p> : null}
                      </td>

                      <td className="py-2 pr-2 text-right">
                        <input
                          type="number"
                          step={row.allowsDecimal ? '0.001' : '1'}
                          min="0"
                          value={row.quantity}
                          onChange={(event) => patchRow(index, { quantity: event.target.value })}
                          className="w-20 rounded-[6px] border border-outline-variant bg-surface-container-lowest px-2 py-1 text-right font-financial"
                        />
                        <span className="ml-1 text-xs text-on-surface-variant">{row.unitCode}</span>
                      </td>

                      <td className="py-2 pr-2 text-right">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={row.unitSalePrice}
                          onChange={(event) =>
                            patchRow(index, { unitSalePrice: event.target.value })
                          }
                          className="w-24 rounded-[6px] border border-outline-variant bg-surface-container-lowest px-2 py-1 text-right font-financial"
                        />
                      </td>

                      <td className="py-2 pr-2 text-right">
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

                      <td className="py-2 pr-2 text-right font-financial text-on-surface">
                        {formatMoney(line.lineTotal)}
                      </td>

                      <td
                        className={cn(
                          'py-2 pr-2 text-right font-financial',
                          line.lineProfit < 0 ? 'text-error' : 'text-success',
                        )}
                      >
                        {formatMoney(line.lineProfit)}
                      </td>

                      <td className="py-2 text-right">
                        <button
                          type="button"
                          onClick={() => onChange(rows.filter((_, i) => i !== index))}
                          aria-label={`${row.productName} kalemini kaldır`}
                          className="text-on-surface-variant hover:text-error"
                        >
                          <Trash2 className="size-4" aria-hidden="true" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// =============================================================================
// TOPLAMLAR
// =============================================================================

function TotalsCard({ totals }: { totals: PreviewTotals }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-body-lg font-semibold">Toplamlar</CardTitle>
        <CardDescription>Önizleme; kesin değerler kayıttan sonra sunucudan gelir.</CardDescription>
      </CardHeader>

      <CardContent className="flex flex-col gap-2 text-sm">
        <Row label="Ara toplam" value={formatMoney(totals.subtotal)} />
        <Row label="İndirim" value={`- ${formatMoney(totals.discountTotal)}`} />

        <div className="flex items-baseline justify-between border-t border-outline-variant pt-2">
          <span className="text-label-md text-on-surface">Genel toplam</span>
          <span className="font-financial text-h3 text-on-surface">
            {formatMoney(totals.grandTotal)}
          </span>
        </div>

        {/* KÂR YALNIZ YÖNETİM EKRANINDA görünür (Kural 8). */}
        <div className="mt-2 flex flex-col gap-2 rounded-[8px] bg-surface-container-low p-3">
          <Row label="Maliyet" value={formatMoney(totals.costTotal)} />
          <Row
            label="Brüt kâr"
            value={formatMoney(totals.grossProfit)}
            emphasize={totals.grossProfit < 0 ? 'error' : 'success'}
          />
          {totals.grandTotal > 0 ? (
            <Row
              label="Kâr marjı"
              value={`${((totals.grossProfit / totals.grandTotal) * 100).toFixed(1)}%`}
            />
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

function Row({
  label,
  value,
  emphasize,
}: {
  label: string;
  value: string;
  emphasize?: 'success' | 'error';
}) {
  return (
    <div className="flex items-baseline justify-between">
      <span className="text-on-surface-variant">{label}</span>
      <span
        className={cn(
          'font-financial text-on-surface',
          emphasize === 'success' && 'text-success',
          emphasize === 'error' && 'text-error',
        )}
      >
        {value}
      </span>
    </div>
  );
}

// =============================================================================
// ÖNİZLEME HESABI
// =============================================================================

/**
 * Kâr önizlemesi.
 *
 * BURADA `number` KULLANILIYOR ve bu BİLİNÇLİDİR: değer yalnız ekranda
 * gösterilir, hiçbir zaman kaydedilmez. Kaydedilen tüm tutarlar backend'in
 * Decimal hesabından gelir (Kural 2). Önizlemede birkaç kuruşluk
 * yuvarlama farkı zarar vermez; kayıtta zarar verirdi.
 */
interface PreviewTotals {
  subtotal: number;
  discountTotal: number;
  grandTotal: number;
  costTotal: number;
  grossProfit: number;
}

function previewLine(row: ItemRow): { lineTotal: number; lineProfit: number } {
  const quantity = Number(row.quantity) || 0;
  const salePrice = Number(row.unitSalePrice) || 0;
  const purchasePrice = Number(row.unitPurchasePrice) || 0;
  const discount = Number(row.discountAmount) || 0;

  const lineTotal = salePrice * quantity - discount;

  return { lineTotal, lineProfit: lineTotal - purchasePrice * quantity };
}

function previewTotals(rows: ItemRow[]): PreviewTotals {
  return rows.reduce<PreviewTotals>(
    (totals, row) => {
      const quantity = Number(row.quantity) || 0;
      const line = previewLine(row);

      return {
        subtotal: totals.subtotal + (Number(row.unitSalePrice) || 0) * quantity,
        discountTotal: totals.discountTotal + (Number(row.discountAmount) || 0),
        grandTotal: totals.grandTotal + line.lineTotal,
        costTotal: totals.costTotal + (Number(row.unitPurchasePrice) || 0) * quantity,
        grossProfit: totals.grossProfit + line.lineProfit,
      };
    },
    { subtotal: 0, discountTotal: 0, grandTotal: 0, costTotal: 0, grossProfit: 0 },
  );
}
