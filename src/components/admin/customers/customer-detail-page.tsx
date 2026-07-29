'use client';

import Link from 'next/link';
import { useState } from 'react';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  ArrowLeft,
  Mail,
  MapPin,
  MessageSquarePlus,
  Pencil,
  Phone,
} from 'lucide-react';
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
  Skeleton,
  StatCard,
  TabPanel,
  Tabs,
  cn,
} from '@zirve/ui';
import { CUSTOMER_TYPE_LABELS, PAYMENT_METHOD_LABELS, SALE_STATUS_LABELS } from '@zirve/types';

import { ApiError } from '@/lib/api-error';
import { formatMoney } from '@/lib/format';
import { customersApi, type CustomerNote } from '@/lib/sales-api';

import { saleStatusVariant } from '../sales/sales-list-page';
import { CustomerFormDialog } from './customer-form-dialog';

/**
 * Müşteri detayı — Satışlar / Ödemeler / Finans özeti sekmeleri (SPEC §9.5).
 *
 * Finans rakamlarının tamamı SUNUCUDAN gelir; arayüz hiçbir toplama
 * yapmaz. Aksi hâlde iki ayrı yerde iki farklı borç rakamı belirir.
 */
export function CustomerDetailPage({ customerId }: { customerId: string }) {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState('finans');
  const [isFormOpen, setFormOpen] = useState(false);

  const customerQuery = useQuery({
    queryKey: ['customer', customerId],
    queryFn: () => customersApi.get(customerId),
  });

  /*
   * Satış ve ödeme listeleri MÜŞTERİ ALTINDAKİ uçlardan çekilir
   * (Sprint 7 şartı 3), genel listeyi `customerId` ile filtreleyerek değil:
   * müşteri kartının sözleşmesi tek yerde tanımlı kalsın.
   */
  const salesQuery = useQuery({
    queryKey: ['customer-sales', customerId],
    queryFn: () => customersApi.sales(customerId, { limit: 50 }),
    placeholderData: keepPreviousData,
  });

  const paymentsQuery = useQuery({
    queryKey: ['customer-payments', customerId],
    queryFn: () => customersApi.payments(customerId, { limit: 50 }),
    placeholderData: keepPreviousData,
  });

  const notesQuery = useQuery({
    queryKey: ['customer-notes', customerId],
    queryFn: () => customersApi.notes(customerId, { limit: 100 }),
    placeholderData: keepPreviousData,
  });

  if (customerQuery.isPending) {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-32" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (customerQuery.isError || customerQuery.data === undefined) {
    return (
      <Alert variant="error" title="Müşteri yüklenemedi">
        {customerQuery.error instanceof ApiError
          ? customerQuery.error.message
          : 'Beklenmeyen bir hata oluştu.'}
      </Alert>
    );
  }

  const customer = customerQuery.data;
  const summary = customer.financeSummary;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Button asChild variant="ghost" size="sm" className="-ml-2">
          <Link href="/musteriler">
            <ArrowLeft />
            Müşterilere dön
          </Link>
        </Button>

        <div className="mt-2 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-h1 text-on-surface">{customer.fullName}</h1>
            <p className="mt-1 font-financial text-on-surface-variant">
              {customer.code} · {CUSTOMER_TYPE_LABELS[customer.type]}
              {customer.companyName !== null ? ` · ${customer.companyName}` : ''}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {!customer.isActive ? <Badge variant="neutral">Pasif</Badge> : null}
            {summary.isOverLimit ? <Badge variant="error">Limit aşıldı</Badge> : null}

            <Button variant="outline" onClick={() => setFormOpen(true)}>
              <Pencil />
              Düzenle
            </Button>

            <Button asChild>
              <Link href="/satislar/yeni">Yeni Satış</Link>
            </Button>
          </div>
        </div>
      </div>

      {Number(summary.overdueDebt) > 0 ? (
        <Alert variant="error" title="Vadesi geçmiş borç var">
          {formatMoney(summary.overdueDebt)} tutarında vadesi geçmiş alacak bulunuyor.
        </Alert>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Toplam satış" value={formatMoney(summary.totalSales)} />
        <StatCard label="Toplam tahsilat" value={formatMoney(summary.totalPaid)} />
        <StatCard
          label="Kalan borç"
          value={formatMoney(summary.currentDebt)}
          tone={Number(summary.currentDebt) > 0 ? 'error' : undefined}
        />
        <StatCard
          label="Vadesi geçmiş"
          value={formatMoney(summary.overdueDebt)}
          tone={Number(summary.overdueDebt) > 0 ? 'error' : undefined}
        />
      </div>

      <Tabs
        activeId={tab}
        onChange={setTab}
        items={[
          { id: 'finans', label: 'Finans Özeti' },
          { id: 'notlar', label: 'Notlar', badge: notesQuery.data?.meta.total },
          { id: 'satislar', label: 'Satışlar', badge: salesQuery.data?.meta.total },
          { id: 'odemeler', label: 'Ödemeler', badge: paymentsQuery.data?.meta.total },
          { id: 'bilgiler', label: 'Bilgiler' },
        ]}
      />

      <TabPanel id="finans" activeId={tab}>
        <Card>
          <CardHeader>
            <CardTitle className="text-body-lg font-semibold">Finans Özeti</CardTitle>
            <CardDescription>
              Taslak ve iptal edilmiş satışlar borç hesabına DAHİL DEĞİLDİR.
            </CardDescription>
          </CardHeader>

          <CardContent className="flex flex-col gap-2 text-sm">
            <Row label="Devir bakiyesi" value={formatMoney(summary.openingBalance)} />
            <Row label="Toplam satış" value={formatMoney(summary.totalSales)} />
            <Row label="Toplam tahsilat" value={formatMoney(summary.totalPaid)} tone="success" />

            <div className="flex items-baseline justify-between border-t border-outline-variant pt-2">
              <span className="text-label-md text-on-surface">Kalan borç</span>
              <span
                className={cn(
                  'font-financial text-h3',
                  Number(summary.currentDebt) > 0 ? 'text-error' : 'text-on-surface',
                )}
              >
                {formatMoney(summary.currentDebt)}
              </span>
            </div>

            <Row
              label="Vadesi geçmiş borç"
              value={formatMoney(summary.overdueDebt)}
              tone={Number(summary.overdueDebt) > 0 ? 'error' : undefined}
            />
            <Row label="Kredi limiti" value={formatMoney(summary.creditLimit)} />
            <Row
              label="Kullanılabilir limit"
              value={formatMoney(summary.availableCredit)}
              tone={Number(summary.availableCredit) < 0 ? 'error' : undefined}
            />

            {summary.isOverLimit ? (
              <Alert variant="warning" title="Kredi limiti aşılmış" className="mt-2">
                Vadeli satış engellenmez; karar mağaza sahibine bırakılır.
              </Alert>
            ) : null}
          </CardContent>
        </Card>
      </TabPanel>

      <TabPanel id="satislar" activeId={tab}>
        <Card>
          <CardContent className="pt-6">
            {(salesQuery.data?.items ?? []).length === 0 ? (
              <p className="py-8 text-center text-sm text-on-surface-variant">
                Bu müşteriye ait satış yok.
              </p>
            ) : (
              <ul className="flex flex-col gap-2">
                {(salesQuery.data?.items ?? []).map((sale) => (
                  <li
                    key={sale.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-[10px] border border-outline-variant p-3"
                  >
                    <div className="min-w-0">
                      <Link
                        href={`/satislar/${sale.id}`}
                        className="font-financial text-label-md text-primary-container hover:underline"
                      >
                        {sale.saleNumber}
                      </Link>
                      <p className="text-sm text-on-surface-variant">
                        {formatDate(sale.saleDate)} · {sale._count.items} kalem
                        {sale.dueDate !== null ? ` · vade ${formatDate(sale.dueDate)}` : ''}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                      <Badge variant={saleStatusVariant(sale.status)}>
                        {SALE_STATUS_LABELS[sale.status]}
                      </Badge>
                      <span className="font-financial text-label-md text-on-surface">
                        {formatMoney(sale.grandTotal)}
                      </span>
                      {Number(sale.remainingTotal) > 0 ? (
                        <span className="font-financial text-sm text-error">
                          kalan {formatMoney(sale.remainingTotal)}
                        </span>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </TabPanel>

      <TabPanel id="odemeler" activeId={tab}>
        <Card>
          <CardContent className="pt-6">
            {(paymentsQuery.data?.items ?? []).length === 0 ? (
              <p className="py-8 text-center text-sm text-on-surface-variant">
                Bu müşteriden tahsilat yok.
              </p>
            ) : (
              <ul className="flex flex-col gap-2">
                {(paymentsQuery.data?.items ?? []).map((payment) => (
                  <li
                    key={payment.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-[10px] border border-outline-variant p-3"
                  >
                    <div className="min-w-0">
                      <p className="font-financial text-label-md text-on-surface">
                        {payment.paymentNumber}
                      </p>
                      <p className="text-sm text-on-surface-variant">
                        {PAYMENT_METHOD_LABELS[payment.method]} · {formatDate(payment.paymentDate)}{' '}
                        ·{' '}
                        <Link
                          href={`/satislar/${payment.sale.id}`}
                          className="text-primary-container hover:underline"
                        >
                          {payment.sale.saleNumber}
                        </Link>
                      </p>
                    </div>

                    <span className="font-financial text-label-md text-success">
                      {formatMoney(payment.amount)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </TabPanel>

      <TabPanel id="notlar" activeId={tab}>
        <NotesTab customerId={customerId} notes={notesQuery.data?.items ?? []} />
      </TabPanel>

      <TabPanel id="bilgiler" activeId={tab}>
        <Card>
          <CardContent className="flex flex-col gap-3 pt-6 text-sm">
            <InfoRow icon={<Phone className="size-4" />} label="Telefon" value={customer.phone} />
            {customer.altPhone !== null ? (
              <InfoRow
                icon={<Phone className="size-4" />}
                label="İkinci telefon"
                value={customer.altPhone}
              />
            ) : null}
            {customer.email !== null ? (
              <InfoRow icon={<Mail className="size-4" />} label="E-posta" value={customer.email} />
            ) : null}
            {customer.city !== null ? (
              <InfoRow
                icon={<MapPin className="size-4" />}
                label="Konum"
                value={`${customer.city}${customer.district !== null ? ` / ${customer.district}` : ''}`}
              />
            ) : null}
            {customer.address !== null ? (
              <InfoRow
                icon={<MapPin className="size-4" />}
                label="Adres"
                value={customer.address}
              />
            ) : null}
            {customer.taxNumber !== null ? (
              <InfoRow
                icon={<AlertTriangle className="size-4" />}
                label="Vergi/TC No"
                value={`${customer.taxNumber}${customer.taxOffice !== null ? ` · ${customer.taxOffice}` : ''}`}
              />
            ) : null}
            {customer.note !== null ? (
              <p className="mt-2 whitespace-pre-line text-on-surface-variant">{customer.note}</p>
            ) : null}
          </CardContent>
        </Card>
      </TabPanel>

      <CustomerFormDialog
        open={isFormOpen}
        customer={customer}
        onOpenChange={setFormOpen}
        onSaved={async () => {
          await queryClient.invalidateQueries({ queryKey: ['customer', customerId] });
          await queryClient.invalidateQueries({ queryKey: ['customers'] });
        }}
      />
    </div>
  );
}

/**
 * Görüşme notları sekmesi.
 *
 * Notlar DÜZENLENEMEZ ve SİLİNEMEZ: görüşme geçmişi bir kayıttır, sonradan
 * değiştirilebilirse "müşteri şunu söylemişti" bilgisi güvenilmez olur.
 * Yanlış yazılan not, düzeltmesi yeni bir notla yapılır.
 */
function NotesTab({ customerId, notes }: { customerId: string; notes: CustomerNote[] }) {
  const queryClient = useQueryClient();
  const [body, setBody] = useState('');
  const [error, setError] = useState<string | null>(null);

  const addMutation = useMutation({
    mutationFn: () => customersApi.addNote(customerId, body.trim()),
    onSuccess: async () => {
      setBody('');
      setError(null);
      await queryClient.invalidateQueries({ queryKey: ['customer-notes', customerId] });
    },
    onError: (mutationError: unknown) => {
      setError(mutationError instanceof ApiError ? mutationError.message : 'Not kaydedilemedi.');
    },
  });

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-body-lg font-semibold">Yeni Görüşme Notu</CardTitle>
          <CardDescription>
            Tarihli kayıt olarak eklenir; önceki notların üzerine yazmaz.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form
            className="flex flex-col gap-3"
            onSubmit={(event) => {
              event.preventDefault();

              if (body.trim() === '') {
                setError('Not içeriği zorunludur.');
                return;
              }

              addMutation.mutate();
            }}
          >
            <textarea
              className="min-h-24 w-full rounded-[8px] border border-outline-variant bg-surface px-3 py-2 text-sm text-on-surface outline-none focus:border-primary-container"
              placeholder="Örn. Gübre fiyatı sordu, hafta içi tekrar arayacak."
              value={body}
              onChange={(event) => setBody(event.target.value)}
            />

            {error !== null ? <FieldError message={error} /> : null}

            <div className="flex justify-end">
              <Button type="submit" disabled={addMutation.isPending}>
                <MessageSquarePlus />
                {addMutation.isPending ? 'Kaydediliyor...' : 'Not Ekle'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {notes.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-on-surface-variant">
            Henüz görüşme notu yok.
          </CardContent>
        </Card>
      ) : (
        <ol className="flex flex-col gap-3">
          {notes.map((note) => (
            <li key={note.id} className="rounded-[12px] border border-outline-variant p-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="text-label-md text-on-surface">
                  {note.createdBy?.fullName ?? 'Sistem'}
                </span>
                <span className="font-financial text-label-sm text-on-surface-variant">
                  {formatDateTime(note.createdAt)}
                </span>
              </div>
              <p className="mt-2 whitespace-pre-line text-sm text-on-surface-variant">
                {note.body}
              </p>
            </li>
          ))}
        </ol>
      )}
    </div>
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

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="flex size-8 shrink-0 items-center justify-center rounded-[8px] bg-surface-container-high text-on-surface-variant">
        {icon}
      </span>
      <span>
        <span className="block text-label-sm uppercase text-on-surface-variant">{label}</span>
        <span className="block text-on-surface">{value}</span>
      </span>
    </div>
  );
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('tr-TR', { dateStyle: 'medium' }).format(new Date(value));
}

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat('tr-TR', { dateStyle: 'medium', timeStyle: 'short' }).format(
    new Date(value),
  );
}
