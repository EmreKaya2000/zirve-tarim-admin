'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, CheckCircle2, Plus, Trash2, XCircle } from 'lucide-react';
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
  Select,
  Skeleton,
  cn,
} from '@zirve/ui';
import {
  ADDITIONAL_COST_TYPES,
  ADDITIONAL_COST_TYPE_LABELS,
  PAYMENT_METHODS,
  PAYMENT_METHOD_LABELS,
  PAYMENT_TYPE_LABELS,
  SALE_STATUS_LABELS,
  canAcceptPayment,
  canCancelSale,
  requiresPaymentDueDate,
  type AdditionalCostType,
  type PaymentMethod,
} from '@zirve/types';

import type { ApiErrorDetail } from '@zirve/types';

import { ApiError } from '@/lib/api-error';
import { formatMoney, formatQuantity } from '@/lib/format';
import { paymentsApi, salesApi, type SaleDetail } from '@/lib/sales-api';

import { saleStatusVariant } from './sales-list-page';

/**
 * Satış detayı.
 *
 * Düğme görünürlüğü DURUM MAKİNESİNE bağlıdır: @zirve/types'taki
 * `canAcceptPayment` / `canCancelSale` yardımcıları backend ile aynı
 * kuralı okur, böylece yöneticiye reddedilecek bir işlem sunulmaz.
 */
export function SaleDetailPage({ saleId }: { saleId: string }) {
  const queryClient = useQueryClient();
  const [isPaymentOpen, setPaymentOpen] = useState(false);
  const [isCostOpen, setCostOpen] = useState(false);
  const [isCancelOpen, setCancelOpen] = useState(false);
  const [deletePayment, setDeletePayment] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  /** Yetersiz stok hatası ayrı tutulur: liste hâlinde gösterilir, tek satırda değil. */
  const [stockShortage, setStockShortage] = useState<ApiErrorDetail[] | null>(null);

  const query = useQuery({ queryKey: ['sale', saleId], queryFn: () => salesApi.get(saleId) });

  const invalidate = async (): Promise<void> => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['sale', saleId] }),
      queryClient.invalidateQueries({ queryKey: ['sales'] }),
      queryClient.invalidateQueries({ queryKey: ['sale-counts'] }),
      queryClient.invalidateQueries({ queryKey: ['payments'] }),
      queryClient.invalidateQueries({ queryKey: ['customer'] }),
    ]);
  };

  const finalizeMutation = useMutation({
    mutationFn: () => salesApi.finalize(saleId),
    onSuccess: async () => {
      setStockShortage(null);
      await invalidate();
    },
    onError: (error: unknown) => {
      // Yetersiz stok, satış onayının EN SIK karşılaşılan reddidir ve
      // kullanıcının hangi kalemden ne kadar eksik olduğunu bilmesi gerekir.
      // Tek satırlık genel hata metni bu bilgiyi taşıyamaz.
      if (error instanceof ApiError && error.code === 'INSUFFICIENT_STOCK') {
        setStockShortage(error.details);
        setActionError(null);
        return;
      }

      setStockShortage(null);
      setActionError(toMessage(error, 'Satış onaylanamadı.'));
    },
  });

  const removePaymentMutation = useMutation({
    mutationFn: (payload: { id: string; reason: string }) =>
      paymentsApi.remove(payload.id, payload.reason),
    onSuccess: async () => {
      setDeletePayment(null);
      await invalidate();
    },
    onError: (error: unknown) => setActionError(toMessage(error, 'Ödeme silinemedi.')),
  });

  const removeCostMutation = useMutation({
    mutationFn: (costId: string) => salesApi.removeAdditionalCost(saleId, costId),
    onSuccess: invalidate,
    onError: (error: unknown) => setActionError(toMessage(error, 'Ek maliyet kaldırılamadı.')),
  });

  if (query.isPending) {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          <Skeleton className="h-96" />
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  if (query.isError || query.data === undefined) {
    return (
      <Alert variant="error" title="Satış yüklenemedi">
        {toMessage(query.error, 'Beklenmeyen bir hata oluştu.')}
      </Alert>
    );
  }

  const sale = query.data;
  const overdue =
    sale.dueDate !== null &&
    Number(sale.remainingTotal) > 0 &&
    new Date(sale.dueDate).getTime() < Date.now();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Button asChild variant="ghost" size="sm" className="-ml-2">
          <Link href="/satislar">
            <ArrowLeft />
            Satışlara dön
          </Link>
        </Button>

        <div className="mt-2 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="font-financial text-h1 text-on-surface">{sale.saleNumber}</h1>
            <p className="mt-1 text-on-surface-variant">
              {formatDateTime(sale.saleDate)} · {PAYMENT_TYPE_LABELS[sale.paymentType]}
              {sale.inquiry !== null ? (
                <>
                  {' · '}
                  <Link
                    href={`/talepler/${sale.inquiry.id}`}
                    className="text-primary-container hover:underline"
                  >
                    {sale.inquiry.inquiryNumber}
                  </Link>
                </>
              ) : null}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Badge variant={saleStatusVariant(sale.status)}>
              {SALE_STATUS_LABELS[sale.status]}
            </Badge>

            {sale.status === 'DRAFT' ? (
              <Button
                onClick={() => finalizeMutation.mutate()}
                disabled={finalizeMutation.isPending}
              >
                <CheckCircle2 />
                {finalizeMutation.isPending ? 'Onaylanıyor...' : 'Satışı Onayla'}
              </Button>
            ) : null}

            {canAcceptPayment(sale.status) ? (
              <Button variant="outline" onClick={() => setPaymentOpen(true)}>
                <Plus />
                Ödeme Ekle
              </Button>
            ) : null}

            {canCancelSale(sale.status) ? (
              <Button variant="outline" onClick={() => setCancelOpen(true)}>
                <XCircle />
                İptal Et
              </Button>
            ) : null}
          </div>
        </div>
      </div>

      {actionError !== null ? (
        <Alert variant="error" title="İşlem tamamlanamadı">
          {actionError}
        </Alert>
      ) : null}

      {stockShortage !== null ? <StockShortageAlert details={stockShortage} /> : null}

      {sale.status === 'DRAFT' ? (
        <Alert variant="info" title="Bu satış taslak durumunda">
          Taslak satış borç doğurmaz ve müşteri finans özetine girmez. Onayladıktan sonra kalemleri
          değiştirilemez.
        </Alert>
      ) : null}

      {sale.status === 'CANCELLED' ? (
        <Alert variant="warning" title="Satış iptal edildi">
          {sale.cancelReason}
          {sale.cancelledBy !== null ? ` — ${sale.cancelledBy.fullName}` : ''}
        </Alert>
      ) : null}

      {overdue ? (
        <Alert variant="error" title="Vadesi geçmiş borç">
          Vade {formatDate(sale.dueDate as string)} tarihinde geçti; kalan borç{' '}
          {formatMoney(sale.remainingTotal)}.
        </Alert>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[1fr_360px] lg:items-start">
        <div className="flex flex-col gap-6">
          <ItemsCard sale={sale} />

          <PaymentsCard
            sale={sale}
            onDelete={(id) => {
              setActionError(null);
              setDeletePayment(id);
            }}
          />

          <AdditionalCostsCard
            sale={sale}
            onAdd={() => setCostOpen(true)}
            onRemove={(costId) => {
              setActionError(null);
              removeCostMutation.mutate(costId);
            }}
            isRemoving={removeCostMutation.isPending}
          />

          {sale.note !== null ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-body-lg font-semibold">Not</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-line text-on-surface-variant">{sale.note}</p>
              </CardContent>
            </Card>
          ) : null}
        </div>

        <div className="flex flex-col gap-6">
          <TotalsCard sale={sale} />
          <CustomerCard sale={sale} />
        </div>
      </div>

      <PaymentDialog
        open={isPaymentOpen}
        onOpenChange={setPaymentOpen}
        saleId={saleId}
        remaining={sale.remainingTotal}
        onSuccess={async () => {
          setPaymentOpen(false);
          await invalidate();
        }}
      />

      <AdditionalCostDialog
        open={isCostOpen}
        onOpenChange={setCostOpen}
        saleId={saleId}
        onSuccess={async () => {
          setCostOpen(false);
          await invalidate();
        }}
      />

      <CancelDialog
        open={isCancelOpen}
        onOpenChange={setCancelOpen}
        saleId={saleId}
        onSuccess={async () => {
          setCancelOpen(false);
          await invalidate();
        }}
      />

      <DeletePaymentDialog
        paymentId={deletePayment}
        onClose={() => setDeletePayment(null)}
        onConfirm={(reason) => {
          if (deletePayment !== null) {
            removePaymentMutation.mutate({ id: deletePayment, reason });
          }
        }}
        isPending={removePaymentMutation.isPending}
      />
    </div>
  );
}

function ItemsCard({ sale }: { sale: SaleDetail }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-body-lg font-semibold">Kalemler ({sale.items.length})</CardTitle>
        <CardDescription>
          Bilgiler satış anındaki hâliyle saklanır (Kural 5); ürün fiyatı sonradan değişse bu kayıt
          değişmez.
        </CardDescription>
      </CardHeader>

      <CardContent className="overflow-x-auto">
        <table className="w-full min-w-[680px] text-sm">
          <thead>
            <tr className="border-b border-outline-variant text-left text-label-sm uppercase text-on-surface-variant">
              <th className="pb-2">Ürün</th>
              <th className="pb-2 text-right">Miktar</th>
              <th className="pb-2 text-right">Birim Fiyat</th>
              <th className="pb-2 text-right">İndirim</th>
              <th className="pb-2 text-right">Tutar</th>
              <th className="pb-2 text-right">Maliyet</th>
              <th className="pb-2 text-right">Kâr</th>
            </tr>
          </thead>

          <tbody>
            {sale.items.map((item) => (
              <tr key={item.id} className="border-b border-outline-variant last:border-0">
                <td className="py-2 pr-2">
                  {item.product !== null && item.product.deletedAt === null ? (
                    <Link
                      href={`/urunler/${item.product.slug}`}
                      target="_blank"
                      className="text-on-surface hover:text-primary-container hover:underline"
                    >
                      {item.productNameSnapshot}
                    </Link>
                  ) : (
                    <span className="text-on-surface">{item.productNameSnapshot}</span>
                  )}
                  <p className="font-financial text-xs text-on-surface-variant">
                    {item.variantNameSnapshot ?? '—'} · {item.skuSnapshot}
                  </p>
                </td>
                <td className="py-2 pr-2 text-right font-financial">
                  {formatQuantity(item.quantity)} {item.unitTypeSnapshot}
                </td>
                <td className="py-2 pr-2 text-right font-financial">
                  {formatMoney(item.unitSalePrice)}
                </td>
                <td className="py-2 pr-2 text-right font-financial">
                  {Number(item.discountAmount) > 0 ? formatMoney(item.discountAmount) : '—'}
                </td>
                <td className="py-2 pr-2 text-right font-financial text-on-surface">
                  {formatMoney(item.lineTotal)}
                </td>
                <td className="py-2 pr-2 text-right font-financial text-on-surface-variant">
                  {formatMoney(item.lineCost)}
                </td>
                <td
                  className={cn(
                    'py-2 text-right font-financial',
                    Number(item.lineProfit) < 0 ? 'text-error' : 'text-success',
                  )}
                >
                  {formatMoney(item.lineProfit)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}

function PaymentsCard({ sale, onDelete }: { sale: SaleDetail; onDelete: (id: string) => void }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-body-lg font-semibold">
          Tahsilatlar ({sale.payments.length})
        </CardTitle>
        <CardDescription>
          Ödeme silindiğinde borç yeniden doğar ve satış durumu düzeltilir.
        </CardDescription>
      </CardHeader>

      <CardContent>
        {sale.payments.length === 0 ? (
          <p className="py-6 text-center text-sm text-on-surface-variant">
            Henüz tahsilat yapılmadı.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {sale.payments.map((payment) => (
              <li
                key={payment.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-[10px] border border-outline-variant p-3"
              >
                <div className="min-w-0">
                  <p className="font-financial text-label-md text-on-surface">
                    {payment.paymentNumber}
                  </p>
                  <p className="text-sm text-on-surface-variant">
                    {PAYMENT_METHOD_LABELS[payment.method]} · {formatDate(payment.paymentDate)}
                    {payment.reference !== null ? ` · ${payment.reference}` : ''}
                    {payment.dueDate !== null ? ` · vade ${formatDate(payment.dueDate)}` : ''}
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <span className="font-financial text-label-md text-success">
                    {formatMoney(payment.amount)}
                  </span>

                  {sale.status !== 'CANCELLED' ? (
                    <button
                      type="button"
                      onClick={() => onDelete(payment.id)}
                      aria-label={`${payment.paymentNumber} ödemesini sil`}
                      className="text-on-surface-variant hover:text-error"
                    >
                      <Trash2 className="size-4" aria-hidden="true" />
                    </button>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function AdditionalCostsCard({
  sale,
  onAdd,
  onRemove,
  isRemoving,
}: {
  sale: SaleDetail;
  onAdd: () => void;
  onRemove: (costId: string) => void;
  isRemoving: boolean;
}) {
  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between gap-4">
        <div>
          <CardTitle className="text-body-lg font-semibold">Ek Maliyetler</CardTitle>
          <CardDescription>
            Nakliye, kargo, komisyon gibi giderler net kârdan düşer; müşteri borcunu etkilemez.
          </CardDescription>
        </div>

        {sale.status !== 'CANCELLED' ? (
          <Button variant="outline" size="sm" onClick={onAdd}>
            <Plus />
            Ekle
          </Button>
        ) : null}
      </CardHeader>

      <CardContent>
        {sale.additionalCosts.length === 0 ? (
          <p className="py-4 text-center text-sm text-on-surface-variant">Ek maliyet yok.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {sale.additionalCosts.map((cost) => (
              <li
                key={cost.id}
                className="flex items-center justify-between gap-3 rounded-[10px] border border-outline-variant p-3"
              >
                <div className="min-w-0">
                  <p className="text-label-md text-on-surface">
                    {ADDITIONAL_COST_TYPE_LABELS[cost.costType as AdditionalCostType] ??
                      cost.costType}
                  </p>
                  {cost.description !== null ? (
                    <p className="text-sm text-on-surface-variant">{cost.description}</p>
                  ) : null}
                </div>

                <div className="flex items-center gap-3">
                  <span className="font-financial text-sm text-error">
                    - {formatMoney(cost.amount)}
                  </span>

                  {sale.status !== 'CANCELLED' ? (
                    <button
                      type="button"
                      onClick={() => onRemove(cost.id)}
                      disabled={isRemoving}
                      aria-label="Ek maliyeti kaldır"
                      className="text-on-surface-variant hover:text-error disabled:opacity-40"
                    >
                      <Trash2 className="size-4" aria-hidden="true" />
                    </button>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function TotalsCard({ sale }: { sale: SaleDetail }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-body-lg font-semibold">Tutarlar</CardTitle>
      </CardHeader>

      <CardContent className="flex flex-col gap-2 text-sm">
        <Row label="Ara toplam" value={formatMoney(sale.subtotal)} />
        <Row label="İndirim" value={`- ${formatMoney(sale.discountTotal)}`} />

        <div className="flex items-baseline justify-between border-t border-outline-variant pt-2">
          <span className="text-label-md text-on-surface">Genel toplam</span>
          <span className="font-financial text-h3 text-on-surface">
            {formatMoney(sale.grandTotal)}
          </span>
        </div>

        <Row label="Tahsil edilen" value={formatMoney(sale.paidTotal)} tone="success" />
        <Row
          label="Kalan borç"
          value={formatMoney(sale.remainingTotal)}
          tone={Number(sale.remainingTotal) > 0 ? 'error' : undefined}
        />

        {/* KÂR YALNIZ YÖNETİM EKRANINDA (Kural 8). */}
        <div className="mt-2 flex flex-col gap-2 rounded-[8px] bg-surface-container-low p-3">
          <Row label="Maliyet" value={formatMoney(sale.costTotal)} />
          <Row label="Ek maliyet" value={formatMoney(sale.additionalCostTotal)} />
          <Row
            label="Brüt kâr"
            value={formatMoney(sale.grossProfit)}
            tone={Number(sale.grossProfit) < 0 ? 'error' : 'success'}
          />
          <div className="flex items-baseline justify-between border-t border-outline-variant pt-2">
            <span className="text-label-md text-on-surface">Net kâr</span>
            <span
              className={cn(
                'font-financial text-body-lg',
                Number(sale.netProfit) < 0 ? 'text-error' : 'text-success',
              )}
            >
              {formatMoney(sale.netProfit)}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function CustomerCard({ sale }: { sale: SaleDetail }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-body-lg font-semibold">Müşteri</CardTitle>
      </CardHeader>

      <CardContent className="flex flex-col gap-2 text-sm">
        <Link
          href={`/musteriler/${sale.customer.id}`}
          className="text-label-md text-primary-container hover:underline"
        >
          {sale.customer.fullName}
        </Link>
        <p className="font-financial text-on-surface-variant">
          {sale.customer.code} · {sale.customer.phone}
        </p>
        {sale.customer.city !== null ? (
          <p className="text-on-surface-variant">
            {sale.customer.city}
            {sale.customer.district !== null ? ` / ${sale.customer.district}` : ''}
          </p>
        ) : null}
        {sale.createdBy !== null ? (
          <p className="mt-2 text-xs text-on-surface-variant">
            Satışı oluşturan: {sale.createdBy.fullName}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}

function Row({ label, value, tone }: { label: string; value: string; tone?: 'success' | 'error' }) {
  return (
    <div className="flex items-baseline justify-between">
      <span className="text-on-surface-variant">{label}</span>
      <span
        className={cn(
          'font-financial text-on-surface',
          tone === 'success' && 'text-success',
          tone === 'error' && 'text-error',
        )}
      >
        {value}
      </span>
    </div>
  );
}

function PaymentDialog({
  open,
  onOpenChange,
  saleId,
  remaining,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  saleId: string;
  remaining: string;
  onSuccess: () => Promise<void>;
}) {
  const [method, setMethod] = useState<PaymentMethod>('CASH');
  const [amount, setAmount] = useState(remaining);
  const [paymentDate, setPaymentDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [dueDate, setDueDate] = useState('');
  const [reference, setReference] = useState('');
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () =>
      salesApi.addPayment(saleId, {
        method,
        amount,
        paymentDate: new Date(paymentDate).toISOString(),
        ...(requiresPaymentDueDate(method) && { dueDate: new Date(dueDate).toISOString() }),
        ...(reference.trim() !== '' && { reference: reference.trim() }),
      }),
    onSuccess: async () => {
      setError(null);
      setReference('');
      await onSuccess();
    },
    onError: (mutationError: unknown) => setError(toMessage(mutationError, 'Ödeme eklenemedi.')),
  });

  const exceedsRemaining = Number(amount) > Number(remaining);

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Ödeme Ekle"
      description={`Kalan borç: ${formatMoney(remaining)}`}
      errorMessage={error}
      isSubmitting={mutation.isPending}
      submitLabel="Tahsilatı Kaydet"
      onSubmit={(event) => {
        event.preventDefault();
        setError(null);
        mutation.mutate();
      }}
    >
      <FormField>
        <Label htmlFor="pay-method" required>
          Yöntem
        </Label>
        <Select
          id="pay-method"
          value={method}
          onChange={(event) => setMethod(event.target.value as PaymentMethod)}
        >
          {PAYMENT_METHODS.map((value) => (
            <option key={value} value={value}>
              {PAYMENT_METHOD_LABELS[value]}
            </option>
          ))}
        </Select>
      </FormField>

      <FormField>
        <Label htmlFor="pay-amount" required>
          Tutar
        </Label>
        <Input
          id="pay-amount"
          type="number"
          step="0.01"
          min="0"
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
          className="font-financial"
        />
        <FieldError message={exceedsRemaining ? 'Tutar kalan borcu aşamaz.' : undefined} />
        <FieldHint>Fazla tahsilat kaydedilemez.</FieldHint>
      </FormField>

      <FormField>
        <Label htmlFor="pay-date" required>
          Tahsilat Tarihi
        </Label>
        <Input
          id="pay-date"
          type="date"
          value={paymentDate}
          onChange={(event) => setPaymentDate(event.target.value)}
        />
      </FormField>

      {requiresPaymentDueDate(method) ? (
        <FormField>
          <Label htmlFor="pay-due" required>
            Vade Tarihi
          </Label>
          <Input
            id="pay-due"
            type="date"
            value={dueDate}
            onChange={(event) => setDueDate(event.target.value)}
          />
          <FieldHint>Çek ve senette zorunludur.</FieldHint>
        </FormField>
      ) : null}

      <FormField>
        <Label htmlFor="pay-ref">Referans</Label>
        <Input
          id="pay-ref"
          placeholder="Çek no, havale referansı..."
          value={reference}
          onChange={(event) => setReference(event.target.value)}
        />
      </FormField>
    </FormDialog>
  );
}

function AdditionalCostDialog({
  open,
  onOpenChange,
  saleId,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  saleId: string;
  onSuccess: () => Promise<void>;
}) {
  const [costType, setCostType] = useState<AdditionalCostType>('SHIPPING');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () =>
      salesApi.addAdditionalCost(saleId, {
        costType,
        amount,
        ...(description.trim() !== '' && { description: description.trim() }),
      }),
    onSuccess: async () => {
      setAmount('');
      setDescription('');
      setError(null);
      await onSuccess();
    },
    onError: (mutationError: unknown) =>
      setError(toMessage(mutationError, 'Ek maliyet eklenemedi.')),
  });

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Ek Maliyet Ekle"
      description="Net kârdan düşer; müşteri borcunu ve genel toplamı etkilemez."
      errorMessage={error}
      isSubmitting={mutation.isPending}
      submitLabel="Ekle"
      onSubmit={(event) => {
        event.preventDefault();
        setError(null);
        mutation.mutate();
      }}
    >
      <FormField>
        <Label htmlFor="cost-type" required>
          Tür
        </Label>
        <Select
          id="cost-type"
          value={costType}
          onChange={(event) => setCostType(event.target.value as AdditionalCostType)}
        >
          {ADDITIONAL_COST_TYPES.map((value) => (
            <option key={value} value={value}>
              {ADDITIONAL_COST_TYPE_LABELS[value]}
            </option>
          ))}
        </Select>
      </FormField>

      <FormField>
        <Label htmlFor="cost-amount" required>
          Tutar
        </Label>
        <Input
          id="cost-amount"
          type="number"
          step="0.01"
          min="0"
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
          className="font-financial"
        />
      </FormField>

      <FormField>
        <Label htmlFor="cost-desc">Açıklama</Label>
        <Input
          id="cost-desc"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
        />
      </FormField>
    </FormDialog>
  );
}

function CancelDialog({
  open,
  onOpenChange,
  saleId,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  saleId: string;
  onSuccess: () => Promise<void>;
}) {
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () => salesApi.cancel(saleId, reason.trim()),
    onSuccess: async () => {
      setReason('');
      setError(null);
      await onSuccess();
    },
    onError: (mutationError: unknown) =>
      setError(toMessage(mutationError, 'Satış iptal edilemedi.')),
  });

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Satışı İptal Et"
      description="Kayıt SİLİNMEZ, iptal durumuna alınır. Gerekçe zorunludur."
      errorMessage={error}
      isSubmitting={mutation.isPending}
      submitLabel="İptal Et"
      onSubmit={(event) => {
        event.preventDefault();
        setError(null);

        if (reason.trim() !== '') {
          mutation.mutate();
        }
      }}
    >
      <FormField>
        <Label htmlFor="cancel-reason" required>
          İptal Nedeni
        </Label>
        <textarea
          id="cancel-reason"
          rows={3}
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          placeholder="Satış neden iptal ediliyor?"
          className="w-full rounded-[8px] border border-outline-variant bg-surface-container-lowest px-4 py-3 text-[15px] outline-none focus:border-primary-container focus:ring-2 focus:ring-secondary-container"
        />
        <FieldError message={reason.trim() === '' ? 'Gerekçe zorunludur.' : undefined} />
      </FormField>
    </FormDialog>
  );
}

function DeletePaymentDialog({
  paymentId,
  onClose,
  onConfirm,
  isPending,
}: {
  paymentId: string | null;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  isPending: boolean;
}) {
  const [reason, setReason] = useState('');

  return (
    <FormDialog
      open={paymentId !== null}
      onOpenChange={(next) => {
        if (!next) {
          setReason('');
          onClose();
        }
      }}
      title="Ödemeyi Sil"
      description="Kayıt soft delete edilir. Borç yeniden doğar ve satış durumu düzeltilir."
      isSubmitting={isPending}
      submitLabel="Sil"
      onSubmit={(event) => {
        event.preventDefault();

        if (reason.trim() !== '') {
          onConfirm(reason.trim());
          setReason('');
        }
      }}
    >
      <FormField>
        <Label htmlFor="del-reason" required>
          Silme Gerekçesi
        </Label>
        <Input
          id="del-reason"
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          placeholder="Örn. yanlış tutar girildi"
        />
        <FieldError message={reason.trim() === '' ? 'Gerekçe zorunludur.' : undefined} />
      </FormField>
    </FormDialog>
  );
}

/**
 * Yetersiz stok uyarısı.
 *
 * Backend her eksik kalem için `context` içinde makine-okunur veri gönderir
 * (istenen / mevcut / eksik). Arayüz mesaj METNİNİ ayrıştırmaz; alanları
 * doğrudan okur, böylece mesaj değişse de tablo bozulmaz.
 */
function StockShortageAlert({ details }: { details: ApiErrorDetail[] }) {
  return (
    <Alert variant="error" title="Stok yetersiz — satış onaylanamadı">
      <div className="flex flex-col gap-2">
        <p>Aşağıdaki kalemler için rafta yeterli mal yok. Satış taslak olarak kaldı.</p>

        <ul className="flex flex-col gap-1">
          {details.map((detail, index) => {
            const context = detail.context;

            if (context === undefined) {
              return (
                <li key={`${detail.field ?? 'detail'}-${index}`} className="text-sm">
                  {detail.message}
                </li>
              );
            }

            return (
              <li
                key={context['variantId'] ?? index}
                className="flex flex-wrap items-baseline gap-x-2 text-sm"
              >
                <span className="font-medium">{context['productName']}</span>
                <span className="font-financial text-xs opacity-80">{context['sku']}</span>
                <span>
                  istenen{' '}
                  <span className="font-financial">{formatQuantity(context['requested'])}</span>,
                  mevcut{' '}
                  <span className="font-financial">{formatQuantity(context['available'])}</span> —{' '}
                  <span className="font-financial">{formatQuantity(context['missing'])}</span> eksik
                </span>
              </li>
            );
          })}
        </ul>

        <p className="text-sm opacity-80">
          Stok girişi yaptıktan sonra tekrar onaylayabilir ya da kalem miktarlarını
          düşürebilirsiniz.
        </p>
      </div>
    </Alert>
  );
}

function toMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiError) {
    return [error.message, ...error.details.map((detail) => detail.message)].join(' ');
  }

  return fallback;
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('tr-TR', { dateStyle: 'medium' }).format(new Date(value));
}

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat('tr-TR', { dateStyle: 'long', timeStyle: 'short' }).format(
    new Date(value),
  );
}
