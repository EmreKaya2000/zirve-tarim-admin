'use client';

import Link from 'next/link';
import { useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { Download, Phone } from 'lucide-react';
import {
  Alert,
  Badge,
  Button,
  DataTable,
  PageHeader,
  Select,
  Skeleton,
  StatCard,
  type DataTableColumn,
} from '@zirve/ui';

import { ApiError } from '@/lib/api-error';
import { downloadCsv } from '@/lib/csv';
import { financeApi, type OverdueSale } from '@/lib/finance-api';
import { formatMoney } from '@/lib/format';

/**
 * Vadesi geçmiş satışlar (Sprint 10 şartı 3).
 *
 * "Bugün kimi aramalıyım?" sorusunun ekranı. Bu yüzden satış bazındadır
 * (alacak yaşlandırması müşteri bazındadır) ve gecikme gün sayısı ile
 * telefon numarası öne çıkar.
 *
 * GECİKME GÜN SAYISI SUNUCUDAN GELİR: istemcinin saati yanlışsa buradaki
 * "42 gün gecikmiş" rakamı da yanlış olurdu.
 */
export function OverduePage() {
  const [minDays, setMinDays] = useState('1');
  const [sortBy, setSortBy] = useState('dueDate');

  const query = useQuery({
    queryKey: ['finance-overdue', { minDays, sortBy }],
    queryFn: () => financeApi.overdue({ minDaysOverdue: Number(minDays), sortBy }),
    placeholderData: keepPreviousData,
  });

  if (query.isPending) {
    return <Skeleton className="h-96" />;
  }

  if (query.isError || query.data === undefined) {
    return (
      <Alert variant="error" title="Liste yüklenemedi">
        {query.error instanceof ApiError ? query.error.message : 'Beklenmeyen bir hata oluştu.'}
      </Alert>
    );
  }

  const data = query.data;

  const columns: DataTableColumn<OverdueSale>[] = [
    {
      key: 'daysOverdue',
      header: 'Gecikme',
      cell: (row) => (
        <Badge variant={row.daysOverdue >= 60 ? 'error' : 'warning'}>{row.daysOverdue} gün</Badge>
      ),
    },
    {
      key: 'customer',
      header: 'Müşteri',
      cell: (row) => (
        <div className="min-w-0">
          <Link
            href={`/musteriler/${row.customer.id}`}
            className="block truncate text-sm text-on-surface hover:text-primary-container"
          >
            {row.customer.fullName}
          </Link>
          <span className="font-financial text-label-sm text-on-surface-variant">
            {row.customer.code} · {row.customer.phone}
          </span>
        </div>
      ),
    },
    {
      key: 'saleNumber',
      header: 'Satış',
      cell: (row) => (
        <Link
          href={`/satislar/${row.id}`}
          className="font-financial text-sm text-primary-container hover:underline"
        >
          {row.saleNumber}
        </Link>
      ),
    },
    {
      key: 'dueDate',
      header: 'Vade',
      cell: (row) => (
        <span className="font-financial text-sm text-on-surface-variant">
          {formatDate(row.dueDate)}
        </span>
      ),
    },
    {
      key: 'grandTotal',
      header: 'Tutar',
      className: 'text-right',
      headerClassName: 'text-right',
      cell: (row) => (
        <span className="font-financial text-sm text-on-surface-variant">
          {formatMoney(row.grandTotal)}
        </span>
      ),
    },
    {
      key: 'remainingTotal',
      header: 'Kalan',
      className: 'text-right',
      headerClassName: 'text-right',
      cell: (row) => (
        <span className="font-financial text-label-md text-error">
          {formatMoney(row.remainingTotal)}
        </span>
      ),
    },
    {
      key: 'actions',
      header: '',
      className: 'text-right',
      cell: (row) => (
        <Button variant="ghost" size="icon-sm" asChild title="Müşteriyi ara">
          <a href={`tel:${row.customer.phone}`} aria-label={`${row.customer.fullName} ara`}>
            <Phone />
          </a>
        </Button>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Vadesi Geçenler"
        description="Vadesi dolmuş ve kalanı olan satışlar. Tamamı ödenmiş satış listeye girmez."
        actions={
          <Button variant="outline" onClick={() => exportCsv(data.items)}>
            <Download />
            CSV indir
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Vadesi geçmiş toplam"
          value={formatMoney(data.totalOverdue)}
          tone="error"
        />
        <StatCard label="Satış" value={String(data.saleCount)} />
        <StatCard label="Müşteri" value={String(data.customerCount)} />
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-label-sm uppercase text-on-surface-variant">
          En az gecikme
          <Select value={minDays} onChange={(event) => setMinDays(event.target.value)}>
            <option value="1">1 gün</option>
            <option value="15">15 gün</option>
            <option value="30">30 gün</option>
            <option value="60">60 gün</option>
            <option value="90">90 gün</option>
          </Select>
        </label>

        <label className="flex flex-col gap-1 text-label-sm uppercase text-on-surface-variant">
          Sırala
          <Select value={sortBy} onChange={(event) => setSortBy(event.target.value)}>
            <option value="dueDate">En eski vade</option>
            <option value="remainingTotal">En yüksek tutar</option>
          </Select>
        </label>
      </div>

      <DataTable
        columns={columns}
        rows={data.items}
        rowKey={(row) => row.id}
        emptyTitle="Vadesi geçmiş satış yok"
        emptyDescription="Seçilen eşikte gecikmiş alacak bulunmuyor."
        itemLabel="satış"
      />
    </div>
  );
}

function exportCsv(rows: OverdueSale[]): void {
  downloadCsv('vadesi-gecenler', rows, [
    { header: 'Gecikme (gün)', value: (row) => row.daysOverdue },
    { header: 'Müşteri Kodu', value: (row) => row.customer.code },
    { header: 'Müşteri', value: (row) => row.customer.fullName },
    { header: 'Telefon', value: (row) => row.customer.phone },
    { header: 'Satış No', value: (row) => row.saleNumber },
    { header: 'Vade', value: (row) => row.dueDate.slice(0, 10) },
    { header: 'Tutar', value: (row) => row.grandTotal },
    { header: 'Ödenen', value: (row) => row.paidTotal },
    { header: 'Kalan', value: (row) => row.remainingTotal },
  ]);
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('tr-TR', { dateStyle: 'medium' }).format(new Date(value));
}
