'use client';

import { useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { Download } from 'lucide-react';
import {
  Alert,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  DataTable,
  Input,
  PageHeader,
  Skeleton,
  StatCard,
  TabPanel,
  Tabs,
  type DataTableColumn,
} from '@zirve/ui';
import {
  PAYMENT_METHOD_LABELS,
  PAYMENT_TYPE_LABELS,
  SALE_STATUS_LABELS,
  type PaymentMethod,
  type PaymentType,
  type SaleStatus,
} from '@zirve/types';

import { ApiError } from '@/lib/api-error';
import { csvFilename, downloadCsv } from '@/lib/csv';
import {
  financeApi,
  type BreakdownRow,
  type PaymentReport,
  type ProfitReport,
  type SalesReport,
} from '@/lib/finance-api';
import { formatMoney, formatQuantity } from '@/lib/format';

import { DailyTrendChart } from '../finance/charts';

/**
 * Raporlar (/raporlar).
 *
 * TARİH ARALIĞI TEK YERDEDİR ve üç sekmenin de üstünde durur: satış, kâr
 * ve tahsilat aynı aralığa bakmalı. Her sekmenin kendi tarih seçicisi
 * olsaydı kullanıcı "temmuz satışı" ile "haziran kârını" yan yana görür ve
 * farkı sanki gerçekmiş gibi yorumlardı.
 *
 * CSV, ekrandaki veriden üretilir — ayrı bir dışa aktarma ucu yoktur.
 * İkinci bir uç, aynı raporu iki kod yolundan üretme riski taşırdı.
 */
export function ReportsPage() {
  const [tab, setTab] = useState('satis');
  const [range, setRange] = useState(defaultRange);

  const params = { dateFrom: toIsoStart(range.from), dateTo: toIsoEnd(range.to) };

  const salesQuery = useQuery({
    queryKey: ['report-sales', params],
    queryFn: () => financeApi.salesReport(params),
    placeholderData: keepPreviousData,
  });

  const profitQuery = useQuery({
    queryKey: ['report-profit', params],
    queryFn: () => financeApi.profitReport(params),
    placeholderData: keepPreviousData,
  });

  const paymentQuery = useQuery({
    queryKey: ['report-payment', params],
    queryFn: () => financeApi.paymentReport(params),
    placeholderData: keepPreviousData,
  });

  const error = salesQuery.error ?? profitQuery.error ?? paymentQuery.error;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Raporlar" description="Tarih aralığına göre satış, kâr ve tahsilat." />

      {/* --- Tarih aralığı: filtreler tek satırda, grafiklerin üstünde --- */}
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-label-sm uppercase text-on-surface-variant">
          Başlangıç
          <Input
            type="date"
            value={range.from}
            max={range.to}
            onChange={(event) => setRange((prev) => ({ ...prev, from: event.target.value }))}
          />
        </label>

        <label className="flex flex-col gap-1 text-label-sm uppercase text-on-surface-variant">
          Bitiş
          <Input
            type="date"
            value={range.to}
            min={range.from}
            onChange={(event) => setRange((prev) => ({ ...prev, to: event.target.value }))}
          />
        </label>

        <div className="flex flex-wrap gap-2">
          {PRESETS.map((preset) => (
            <Button key={preset.label} variant="outline" onClick={() => setRange(preset.range())}>
              {preset.label}
            </Button>
          ))}
        </div>
      </div>

      {error !== null ? (
        <Alert variant="error" title="Rapor yüklenemedi">
          {error instanceof ApiError ? error.message : 'Beklenmeyen bir hata oluştu.'}
        </Alert>
      ) : null}

      <Tabs
        items={[
          { id: 'satis', label: 'Satış' },
          { id: 'kar', label: 'Kâr' },
          { id: 'tahsilat', label: 'Tahsilat' },
        ]}
        activeId={tab}
        onChange={setTab}
      />

      <TabPanel id="satis" activeId={tab}>
        {salesQuery.data === undefined ? (
          <Skeleton className="h-72" />
        ) : (
          <SalesTab report={salesQuery.data} range={params} />
        )}
      </TabPanel>

      <TabPanel id="kar" activeId={tab}>
        {profitQuery.data === undefined ? (
          <Skeleton className="h-72" />
        ) : (
          <ProfitTab report={profitQuery.data} range={params} />
        )}
      </TabPanel>

      <TabPanel id="tahsilat" activeId={tab}>
        {paymentQuery.data === undefined ? (
          <Skeleton className="h-72" />
        ) : (
          <PaymentTab report={paymentQuery.data} range={params} />
        )}
      </TabPanel>
    </div>
  );
}

// =============================================================================
// SEKMELER
// =============================================================================

function SalesTab({ report, range }: { report: SalesReport; range: IsoRange }) {
  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Ciro" value={formatMoney(report.grandTotal)} tone="primary" />
        <StatCard label="Satış adedi" value={String(report.saleCount)} />
        <StatCard label="Ortalama satış" value={formatMoney(report.averageSale)} />
        <StatCard
          label="Kalan borç"
          value={formatMoney(report.remainingTotal)}
          tone={Number(report.remainingTotal) > 0 ? 'warning' : 'neutral'}
        />
      </div>

      <Card>
        <CardHeader className="flex-row items-start justify-between gap-4">
          <div>
            <CardTitle className="text-body-lg font-semibold">Günlük Satış</CardTitle>
            <CardDescription>İptal ve taslak satışlar dahil değildir.</CardDescription>
          </div>
          <Button
            variant="outline"
            onClick={() =>
              downloadCsv(csvFilename('satis-raporu', range.dateFrom, range.dateTo), report.daily, [
                { header: 'Tarih', value: (row) => row.date },
                { header: 'Satış Adedi', value: (row) => row.count },
                { header: 'Ciro', value: (row) => row.total },
                { header: 'Brüt Kâr', value: (row) => row.profit ?? '' },
              ])
            }
          >
            <Download />
            CSV
          </Button>
        </CardHeader>
        <CardContent>
          <DailyTrendChart data={report.daily} label="Ciro" colorIndex={0} />
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <BreakdownCard
          title="Duruma Göre"
          rows={report.byStatus.map((row) => ({
            label: SALE_STATUS_LABELS[row.status as SaleStatus] ?? row.status,
            count: row.count,
            total: row.total,
          }))}
        />
        <BreakdownCard
          title="Ödeme Tipine Göre"
          rows={report.byPaymentType.map((row) => ({
            label: PAYMENT_TYPE_LABELS[row.paymentType as PaymentType] ?? row.paymentType,
            count: row.count,
            total: row.total,
          }))}
        />
      </div>
    </div>
  );
}

function ProfitTab({ report, range }: { report: ProfitReport; range: IsoRange }) {
  const columns: DataTableColumn<BreakdownRow>[] = [
    { key: 'label', header: 'Ad', cell: (row) => <span className="text-sm">{row.label}</span> },
    {
      key: 'quantity',
      header: 'Miktar',
      className: 'text-right',
      headerClassName: 'text-right',
      cell: (row) => <span className="font-financial text-sm">{formatQuantity(row.quantity)}</span>,
    },
    {
      key: 'revenue',
      header: 'Ciro',
      className: 'text-right',
      headerClassName: 'text-right',
      cell: (row) => <span className="font-financial text-sm">{formatMoney(row.revenue)}</span>,
    },
    {
      key: 'cost',
      header: 'Maliyet',
      className: 'text-right',
      headerClassName: 'text-right',
      cell: (row) => (
        <span className="font-financial text-sm text-on-surface-variant">
          {formatMoney(row.cost)}
        </span>
      ),
    },
    {
      key: 'profit',
      header: 'Brüt Kâr',
      className: 'text-right',
      headerClassName: 'text-right',
      cell: (row) => (
        <span
          className={
            Number(row.profit) < 0
              ? 'font-financial text-label-md text-error'
              : 'font-financial text-label-md text-success'
          }
        >
          {formatMoney(row.profit)}
        </span>
      ),
    },
    {
      key: 'marginPercent',
      header: 'Marj',
      className: 'text-right',
      headerClassName: 'text-right',
      cell: (row) => (
        <span className="font-financial text-sm text-on-surface-variant">%{row.marginPercent}</span>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard label="Ciro" value={formatMoney(report.revenue)} />
        <StatCard label="Maliyet" value={formatMoney(report.cost)} />
        <StatCard
          label="Brüt kâr"
          value={formatMoney(report.grossProfit)}
          tone={Number(report.grossProfit) < 0 ? 'error' : 'success'}
        />
        <StatCard
          label="Net kâr"
          value={formatMoney(report.netProfit)}
          tone={Number(report.netProfit) < 0 ? 'error' : 'success'}
          footnote={`Ek maliyet ${formatMoney(report.additionalCost)}`}
        />
        <StatCard label="Marj" value={`%${report.marginPercent}`} tone="primary" />
      </div>

      <Alert variant="info" title="Ek maliyetler kırılıma dağıtılmaz">
        Nakliye, komisyon gibi ek maliyetler yalnız NET KÂR toplamına girer; ürün ve kategori
        satırlarındaki kâr brüt kârdır. Dağıtım anahtarı bir muhasebe kararıdır ve tanımlanmadı.
      </Alert>

      <BreakdownTable
        title="Ürün Kırılımı"
        rows={report.byProduct}
        columns={columns}
        filename={csvFilename('kar-raporu-urun', range.dateFrom, range.dateTo)}
      />

      <BreakdownTable
        title="Kategori Kırılımı"
        description="Ürünün ANA kategorisine göre; toplam ciroyu aşmaz."
        rows={report.byCategory}
        columns={columns}
        filename={csvFilename('kar-raporu-kategori', range.dateFrom, range.dateTo)}
      />
    </div>
  );
}

function PaymentTab({ report, range }: { report: PaymentReport; range: IsoRange }) {
  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <StatCard label="Toplam tahsilat" value={formatMoney(report.totalAmount)} tone="success" />
        <StatCard label="Tahsilat adedi" value={String(report.paymentCount)} />
      </div>

      <Card>
        <CardHeader className="flex-row items-start justify-between gap-4">
          <div>
            <CardTitle className="text-body-lg font-semibold">Günlük Tahsilat</CardTitle>
            <CardDescription>Silinmiş ödemeler dahil değildir.</CardDescription>
          </div>
          <Button
            variant="outline"
            onClick={() =>
              downloadCsv(
                csvFilename('tahsilat-raporu', range.dateFrom, range.dateTo),
                report.daily,
                [
                  { header: 'Tarih', value: (row) => row.date },
                  { header: 'Adet', value: (row) => row.count },
                  { header: 'Tutar', value: (row) => row.total },
                ],
              )
            }
          >
            <Download />
            CSV
          </Button>
        </CardHeader>
        <CardContent>
          <DailyTrendChart data={report.daily} label="Tahsilat" colorIndex={1} />
        </CardContent>
      </Card>

      <BreakdownCard
        title="Ödeme Yöntemine Göre"
        rows={report.byMethod.map((row) => ({
          label: PAYMENT_METHOD_LABELS[row.method as PaymentMethod] ?? row.method,
          count: row.count,
          total: row.total,
        }))}
      />
    </div>
  );
}

// =============================================================================
// ORTAK PARÇALAR
// =============================================================================

function BreakdownCard({
  title,
  rows,
}: {
  title: string;
  rows: { label: string; count: number; total: string }[];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-body-lg font-semibold">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="py-6 text-center text-sm text-on-surface-variant">Veri yok.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-outline-variant text-sm">
            {rows.map((row) => (
              <li key={row.label} className="flex items-center justify-between gap-3 py-2.5">
                <span className="text-on-surface-variant">
                  {row.label} <span className="opacity-70">({row.count})</span>
                </span>
                <span className="font-financial text-on-surface">{formatMoney(row.total)}</span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function BreakdownTable({
  title,
  description,
  rows,
  columns,
  filename,
}: {
  title: string;
  description?: string;
  rows: BreakdownRow[];
  columns: DataTableColumn<BreakdownRow>[];
  filename: string;
}) {
  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between gap-4">
        <div>
          <CardTitle className="text-body-lg font-semibold">{title}</CardTitle>
          {description === undefined ? null : <CardDescription>{description}</CardDescription>}
        </div>
        <Button
          variant="outline"
          onClick={() =>
            downloadCsv(filename, rows, [
              { header: 'Ad', value: (row) => row.label },
              { header: 'Miktar', value: (row) => row.quantity },
              { header: 'Satış Adedi', value: (row) => row.saleCount },
              { header: 'Ciro', value: (row) => row.revenue },
              { header: 'Maliyet', value: (row) => row.cost },
              { header: 'Brüt Kâr', value: (row) => row.profit },
              { header: 'Marj (%)', value: (row) => row.marginPercent },
            ])
          }
        >
          <Download />
          CSV
        </Button>
      </CardHeader>
      <CardContent className="p-0">
        <DataTable
          columns={columns}
          rows={rows}
          rowKey={(row) => row.key}
          emptyTitle="Veri yok"
          emptyDescription="Seçilen aralıkta satış bulunmuyor."
          itemLabel="satır"
        />
      </CardContent>
    </Card>
  );
}

// =============================================================================
// TARİH ARALIĞI
// =============================================================================

interface IsoRange {
  dateFrom: string;
  dateTo: string;
}

interface LocalRange {
  from: string;
  to: string;
}

/** Varsayılan: içinde bulunulan ay. "Tüm zamanlar" olsaydı ilk açılış ağır olurdu. */
function defaultRange(): LocalRange {
  const now = new Date();

  return {
    from: toInputDate(new Date(now.getFullYear(), now.getMonth(), 1)),
    to: toInputDate(now),
  };
}

const PRESETS: { label: string; range: () => LocalRange }[] = [
  {
    label: 'Bu ay',
    range: defaultRange,
  },
  {
    label: 'Geçen ay',
    range: () => {
      const now = new Date();

      return {
        from: toInputDate(new Date(now.getFullYear(), now.getMonth() - 1, 1)),
        to: toInputDate(new Date(now.getFullYear(), now.getMonth(), 0)),
      };
    },
  },
  {
    label: 'Son 3 ay',
    range: () => {
      const now = new Date();

      return {
        from: toInputDate(new Date(now.getFullYear(), now.getMonth() - 2, 1)),
        to: toInputDate(now),
      };
    },
  },
  {
    label: 'Bu yıl',
    range: () => {
      const now = new Date();

      return { from: toInputDate(new Date(now.getFullYear(), 0, 1)), to: toInputDate(now) };
    },
  },
];

function toInputDate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate(),
  ).padStart(2, '0')}`;
}

function toIsoStart(day: string): string {
  return new Date(`${day}T00:00:00.000Z`).toISOString();
}

function toIsoEnd(day: string): string {
  return new Date(`${day}T23:59:59.999Z`).toISOString();
}
