'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import {
  AlertTriangle,
  BarChart3,
  CalendarClock,
  Package,
  Receipt,
  ShoppingCart,
  TrendingUp,
  Users,
  Wallet,
  Warehouse,
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
  PageHeader,
  Skeleton,
  StatCard,
} from '@zirve/ui';
import { PAYMENT_METHOD_LABELS, SALE_STATUS_LABELS } from '@zirve/types';

import { ApiError } from '@/lib/api-error';
import { financeApi } from '@/lib/finance-api';
import { formatMoney, formatQuantity } from '@/lib/format';

import { saleStatusVariant } from '../sales/sales-list-page';
import { MonthlyTrendChart } from './charts';

/**
 * Yönetim paneli ana sayfası (Sprint 10 şartı 1).
 *
 * TEK SORGU: bütün kartlar `/admin/finance/dashboard` yanıtından beslenir.
 * Her kart kendi ucunu çağırsaydı sayfa açılışında bir düzine istek atılır
 * ve kartlar birbirinden farklı anların verisini gösterirdi — "bu ayki
 * satış" ile "kalan borç" arasında saniyeler farkı olurdu.
 */
export function DashboardPage() {
  const query = useQuery({
    queryKey: ['finance-dashboard'],
    queryFn: () => financeApi.dashboard(),
    // Dashboard bir anlık görüntüdür; sekmeye her dönüşte yenilenmesi
    // mağaza sahibinin gün içinde bakma alışkanlığına uyuyor.
    refetchOnWindowFocus: true,
  });

  if (query.isPending) {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton className="h-12 w-64" />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[0, 1, 2, 3].map((key) => (
            <Skeleton key={key} className="h-28" />
          ))}
        </div>
        <Skeleton className="h-72" />
      </div>
    );
  }

  if (query.isError || query.data === undefined) {
    return (
      <Alert variant="error" title="Panel yüklenemedi">
        {query.error instanceof ApiError ? query.error.message : 'Beklenmeyen bir hata oluştu.'}
      </Alert>
    );
  }

  const data = query.data;
  const monthLabel = new Intl.DateTimeFormat('tr-TR', { month: 'long', year: 'numeric' }).format(
    new Date(data.month.from),
  );

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Panel"
        description={`${monthLabel} özeti ve mağazanın güncel durumu.`}
        actions={
          <Button variant="outline" asChild>
            <Link href="/raporlar">
              <BarChart3 />
              Raporlar
            </Link>
          </Button>
        }
      />

      {/* --- Uyarılar en üstte: eylem gerektiren şeyler önce görünmeli --- */}
      {Number(data.debt.overdueDebt) > 0 ? (
        <Alert variant="error" title="Vadesi geçmiş alacak var">
          {formatMoney(data.debt.overdueDebt)} tutarında, {data.debt.overdueSaleCount} satışta
          vadesi geçmiş alacak bulunuyor.{' '}
          <Link
            href="/finans/vadesi-gecenler"
            className="underline transition-colors hover:text-primary-container"
          >
            Listeyi aç
          </Link>
        </Alert>
      ) : null}

      {data.criticalStockCount > 0 ? (
        <Alert variant="warning" title="Kritik stok">
          {data.criticalStockCount} varyasyon kritik eşiğin altında.{' '}
          <Link
            href="/stok?lowStockOnly=1"
            className="underline transition-colors hover:text-primary-container"
          >
            Stok listesine git
          </Link>
        </Alert>
      ) : null}

      {/* --- Ay özeti --- */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Bu ayki satış"
          value={formatMoney(data.month.salesTotal)}
          icon={<Wallet />}
          tone="primary"
          footnote={`${data.month.saleCount} satış`}
        />
        <StatCard
          label="Bu ayki tahsilat"
          value={formatMoney(data.month.paymentsTotal)}
          icon={<Receipt />}
          tone="success"
          footnote={`${data.month.paymentCount} tahsilat`}
        />
        <StatCard
          label="Bu ayki brüt kâr"
          value={formatMoney(data.month.grossProfit)}
          icon={<TrendingUp />}
          tone={Number(data.month.grossProfit) < 0 ? 'error' : 'success'}
          footnote={`Net ${formatMoney(data.month.netProfit)}`}
        />
        <StatCard
          label="Toplam açık borç"
          value={formatMoney(data.debt.totalDebt)}
          icon={<AlertTriangle />}
          tone={Number(data.debt.overdueDebt) > 0 ? 'error' : 'neutral'}
          footnote={`Vadesi geçmiş ${formatMoney(data.debt.overdueDebt)}`}
        />
      </section>

      {/* --- Katalog ve talep --- */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Aktif ürün"
          value={String(data.catalog.activeProducts)}
          icon={<Package />}
          footnote={`${data.catalog.categories} kategori · ${data.catalog.brands} marka`}
        />
        <StatCard
          label="Aktif müşteri"
          value={String(data.catalog.activeCustomers)}
          icon={<Users />}
        />
        <StatCard
          label="Bekleyen talep"
          value={String(data.inquiries.pending)}
          icon={<ShoppingCart />}
          tone={data.inquiries.pending > 0 ? 'warning' : 'neutral'}
          footnote={`${data.inquiries.new} yeni`}
        />
        <StatCard
          label="Kritik stok"
          value={String(data.criticalStockCount)}
          icon={<Warehouse />}
          tone={data.criticalStockCount > 0 ? 'warning' : 'neutral'}
        />
      </section>

      {/* --- Aylık eğilim --- */}
      <Card>
        <CardHeader>
          <CardTitle className="text-body-lg font-semibold">Son 12 Ay</CardTitle>
          <CardDescription>
            Satış, tahsilat ve brüt kâr. İptal edilen satışlar dahil değildir.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <MonthlyTrendChart data={data.monthlySeries} />
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* --- Yaklaşan vadeler --- */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-body-lg font-semibold">
              <CalendarClock className="size-4" />
              Yaklaşan Vadeler
            </CardTitle>
            <CardDescription>Önümüzdeki 7 gün içinde vadesi dolacak satışlar.</CardDescription>
          </CardHeader>
          <CardContent>
            {data.upcomingDueSales.length === 0 ? (
              <EmptyLine>7 gün içinde vadesi dolan satış yok.</EmptyLine>
            ) : (
              <ul className="flex flex-col divide-y divide-outline-variant">
                {data.upcomingDueSales.map((row) => (
                  <li key={row.id} className="flex items-center justify-between gap-3 py-2">
                    <div className="min-w-0">
                      <Link
                        href={`/satislar/${row.id}`}
                        className="block truncate text-sm text-on-surface hover:text-primary-container"
                      >
                        {row.customer.fullName}
                      </Link>
                      <span className="font-financial text-label-sm text-on-surface-variant">
                        {row.saleNumber} · {formatDate(row.dueDate)}
                      </span>
                    </div>
                    <span className="font-financial text-label-md text-error">
                      {formatMoney(row.remainingTotal)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* --- Kritik stok --- */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-body-lg font-semibold">
              <Warehouse className="size-4" />
              Kritik Stok
            </CardTitle>
            <CardDescription>Eşiğin altına düşen varyasyonlar.</CardDescription>
          </CardHeader>
          <CardContent>
            {data.recent.criticalStock.length === 0 ? (
              <EmptyLine>Kritik stokta ürün yok.</EmptyLine>
            ) : (
              <ul className="flex flex-col divide-y divide-outline-variant">
                {data.recent.criticalStock.map((row) => (
                  <li key={row.id} className="flex items-center justify-between gap-3 py-2">
                    <div className="min-w-0">
                      <span className="block truncate text-sm text-on-surface">
                        {row.product.name}
                      </span>
                      <span className="font-financial text-label-sm text-on-surface-variant">
                        {row.sku}
                      </span>
                    </div>
                    <span className="font-financial text-label-md text-error">
                      {formatQuantity(row.stockQuantity)} {row.unitType.code}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* --- Son satışlar --- */}
        <Card>
          <CardHeader>
            <CardTitle className="text-body-lg font-semibold">Son Satışlar</CardTitle>
          </CardHeader>
          <CardContent>
            {data.recent.sales.length === 0 ? (
              <EmptyLine>Henüz satış yok.</EmptyLine>
            ) : (
              <ul className="flex flex-col divide-y divide-outline-variant">
                {data.recent.sales.map((row) => (
                  <li key={row.id} className="flex items-center justify-between gap-3 py-2">
                    <div className="min-w-0">
                      <Link
                        href={`/satislar/${row.id}`}
                        className="block truncate text-sm text-on-surface hover:text-primary-container"
                      >
                        {row.customer.fullName}
                      </Link>
                      <span className="font-financial text-label-sm text-on-surface-variant">
                        {row.saleNumber} · {formatDate(row.saleDate)}
                      </span>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <Badge variant={saleStatusVariant(row.status)}>
                        {SALE_STATUS_LABELS[row.status]}
                      </Badge>
                      <span className="font-financial text-label-md text-on-surface">
                        {formatMoney(row.grandTotal)}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* --- Son tahsilatlar --- */}
        <Card>
          <CardHeader>
            <CardTitle className="text-body-lg font-semibold">Son Tahsilatlar</CardTitle>
          </CardHeader>
          <CardContent>
            {data.recent.payments.length === 0 ? (
              <EmptyLine>Henüz tahsilat yok.</EmptyLine>
            ) : (
              <ul className="flex flex-col divide-y divide-outline-variant">
                {data.recent.payments.map((row) => (
                  <li key={row.id} className="flex items-center justify-between gap-3 py-2">
                    <div className="min-w-0">
                      <span className="block truncate text-sm text-on-surface">
                        {row.customer.fullName}
                      </span>
                      <span className="font-financial text-label-sm text-on-surface-variant">
                        {PAYMENT_METHOD_LABELS[row.method]} · {formatDate(row.paymentDate)}
                      </span>
                    </div>
                    <span className="font-financial text-label-md text-success">
                      {formatMoney(row.amount)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {/* --- En çok satanlar / en borçlular --- */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-body-lg font-semibold">Bu Ayın En Çok Satanları</CardTitle>
          </CardHeader>
          <CardContent>
            {data.topProducts.length === 0 ? (
              <EmptyLine>Bu ay satış yok.</EmptyLine>
            ) : (
              <ul className="flex flex-col divide-y divide-outline-variant">
                {data.topProducts.map((row) => (
                  <li key={row.productId} className="flex items-center justify-between gap-3 py-2">
                    <span className="min-w-0 truncate text-sm text-on-surface">{row.name}</span>
                    <span className="shrink-0 font-financial text-label-md text-on-surface">
                      {formatMoney(row.revenue)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-body-lg font-semibold">En Çok Borcu Olanlar</CardTitle>
            <CardDescription>
              <Link
                href="/finans/alacaklar"
                className="underline transition-colors hover:text-primary-container"
              >
                Alacak yaşlandırmasını aç
              </Link>
            </CardDescription>
          </CardHeader>
          <CardContent>
            {data.topDebtors.length === 0 ? (
              <EmptyLine>Açık borç yok.</EmptyLine>
            ) : (
              <ul className="flex flex-col divide-y divide-outline-variant">
                {data.topDebtors.map((row) => (
                  <li key={row.customerId} className="flex items-center justify-between gap-3 py-2">
                    <Link
                      href={`/musteriler/${row.customerId}`}
                      className="min-w-0 truncate text-sm text-on-surface hover:text-primary-container"
                    >
                      {row.fullName}
                    </Link>
                    <span className="shrink-0 font-financial text-label-md text-error">
                      {formatMoney(row.debt)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function EmptyLine({ children }: { children: React.ReactNode }) {
  return <p className="py-6 text-center text-sm text-on-surface-variant">{children}</p>;
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('tr-TR', { dateStyle: 'short' }).format(new Date(value));
}
