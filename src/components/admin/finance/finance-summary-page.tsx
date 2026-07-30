'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, BarChart3, CalendarX2, Receipt } from 'lucide-react';
import {
  Alert,
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
import { AGING_BUCKETS, AGING_BUCKET_LABELS } from '@zirve/types';

import { ApiError } from '@/lib/api-error';
import { financeApi } from '@/lib/finance-api';
import { formatMoney } from '@/lib/format';

import { BreakdownBarChart, ChartLegend, MonthlyTrendChart } from './charts';
import { CHART_COLORS, MONTHLY_SERIES } from './chart-theme';

/**
 * Finans özeti (/finans).
 *
 * Dashboard'dan FARKI: dashboard günlük operasyonun ekranıdır (bugün ne
 * oldu, kimi aramalıyım). Bu ekran para akışının bütününü gösterir —
 * eğilim, alacak yapısı ve kategori dağılımı.
 */
export function FinanceSummaryPage() {
  const chartsQuery = useQuery({
    queryKey: ['finance-charts'],
    queryFn: () => financeApi.charts(),
  });

  const receivablesQuery = useQuery({
    queryKey: ['finance-receivables'],
    queryFn: () => financeApi.receivables(),
  });

  const overdueQuery = useQuery({
    queryKey: ['finance-overdue', { minDays: 1, sortBy: 'dueDate' }],
    queryFn: () => financeApi.overdue({ minDaysOverdue: 1, sortBy: 'dueDate' }),
  });

  if (chartsQuery.isPending || receivablesQuery.isPending || overdueQuery.isPending) {
    return <Skeleton className="h-96" />;
  }

  const error = chartsQuery.error ?? receivablesQuery.error ?? overdueQuery.error;

  if (error !== null || chartsQuery.data === undefined || receivablesQuery.data === undefined) {
    return (
      <Alert variant="error" title="Finans özeti yüklenemedi">
        {error instanceof ApiError ? error.message : 'Beklenmeyen bir hata oluştu.'}
      </Alert>
    );
  }

  const charts = chartsQuery.data;
  const receivables = receivablesQuery.data;
  const overdue = overdueQuery.data;
  const current = charts.monthly[charts.monthly.length - 1];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Finans"
        description="Para akışının bütünü: eğilim, alacak yapısı ve kategori dağılımı."
        actions={
          <Button variant="outline" asChild>
            <Link href="/raporlar">
              <BarChart3 />
              Raporlar
            </Link>
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Bu ay satış" value={formatMoney(current?.sales ?? '0')} tone="primary" />
        <StatCard
          label="Bu ay tahsilat"
          value={formatMoney(current?.payments ?? '0')}
          tone="success"
          icon={<Receipt />}
        />
        <StatCard
          label="Toplam alacak"
          value={formatMoney(receivables.totalDebt)}
          tone={Number(receivables.totalDebt) > 0 ? 'warning' : 'neutral'}
          icon={<AlertTriangle />}
        />
        <StatCard
          label="Vadesi geçmiş"
          value={formatMoney(overdue?.totalOverdue ?? '0')}
          tone={Number(overdue?.totalOverdue ?? 0) > 0 ? 'error' : 'neutral'}
          icon={<CalendarX2 />}
          footnote={`${overdue?.saleCount ?? 0} satış`}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-body-lg font-semibold">Son 12 Ay</CardTitle>
          <CardDescription>Satış, tahsilat ve brüt kâr eğilimi.</CardDescription>
        </CardHeader>
        <CardContent>
          <MonthlyTrendChart data={charts.monthly} />
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-body-lg font-semibold">Kategori Bazlı Satış</CardTitle>
            <CardDescription>Bu ayki ciro; ana kategoriye göre.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <BreakdownBarChart data={charts.byCategory} />

            {/* Kontrast kuralının karşılığı: renk yanında TABLO görünümü. */}
            {charts.byCategory.length > 0 ? (
              <ul className="flex flex-col divide-y divide-outline-variant text-sm">
                {charts.byCategory.map((row, index) => (
                  <li key={row.key} className="flex items-center justify-between gap-3 py-2">
                    <span className="flex min-w-0 items-center gap-2">
                      <span
                        className="size-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}
                        aria-hidden="true"
                      />
                      <span className="truncate text-on-surface">{row.label}</span>
                    </span>
                    <span className="shrink-0 font-financial text-on-surface">
                      {formatMoney(row.revenue)}
                    </span>
                  </li>
                ))}
              </ul>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-body-lg font-semibold">Alacak Yaşlandırması</CardTitle>
            <CardDescription>
              <Link
                href="/finans/alacaklar"
                className="underline transition-colors hover:text-primary-container"
              >
                Müşteri kırılımını aç
              </Link>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="flex flex-col divide-y divide-outline-variant text-sm">
              {AGING_BUCKETS.map((bucket) => (
                <li key={bucket} className="flex items-center justify-between gap-3 py-2.5">
                  <span className="text-on-surface-variant">{AGING_BUCKET_LABELS[bucket]}</span>
                  <span
                    className={
                      bucket === 'DAYS_90_PLUS' && Number(receivables.buckets[bucket]) > 0
                        ? 'font-financial text-error'
                        : 'font-financial text-on-surface'
                    }
                  >
                    {formatMoney(receivables.buckets[bucket])}
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-body-lg font-semibold">En Çok Satan Ürünler</CardTitle>
          <CardDescription>Bu ayki ciroya göre.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <ChartLegend items={[{ label: 'Ciro', color: MONTHLY_SERIES[0].color }]} />
          <BreakdownBarChart
            data={charts.topProducts.map((row) => ({
              key: row.productId,
              label: row.name,
              revenue: row.revenue,
              profit: row.profit,
            }))}
          />
        </CardContent>
      </Card>
    </div>
  );
}
