'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Download, Phone } from 'lucide-react';
import {
  Alert,
  Button,
  DataTable,
  PageHeader,
  Skeleton,
  StatCard,
  type DataTableColumn,
} from '@zirve/ui';
import { AGING_BUCKETS, AGING_BUCKET_LABELS, type AgingBucket } from '@zirve/types';

import { ApiError } from '@/lib/api-error';
import { downloadCsv } from '@/lib/csv';
import { financeApi, type ReceivableCustomer } from '@/lib/finance-api';
import { formatMoney } from '@/lib/format';

/**
 * Alacaklar ve yaşlandırma (Sprint 10 şartı 2).
 *
 * Yaşlandırma satış bazında hesaplanıp müşteri altında toplanır; bu ekran
 * yalnız gösterir. Kovaların gün sınırları `@zirve/types` içindeki tek
 * tablodan gelir — ekrandaki "31-60 gün" etiketiyle sorgudaki aralık
 * ayrışamaz.
 */
export function ReceivablesPage() {
  const query = useQuery({
    queryKey: ['finance-receivables'],
    queryFn: () => financeApi.receivables(),
  });

  if (query.isPending) {
    return <Skeleton className="h-96" />;
  }

  if (query.isError || query.data === undefined) {
    return (
      <Alert variant="error" title="Alacaklar yüklenemedi">
        {query.error instanceof ApiError ? query.error.message : 'Beklenmeyen bir hata oluştu.'}
      </Alert>
    );
  }

  const data = query.data;

  const columns: DataTableColumn<ReceivableCustomer>[] = [
    {
      key: 'customer',
      header: 'Müşteri',
      cell: (row) => (
        <div className="min-w-0">
          <Link
            href={`/musteriler/${row.customerId}`}
            className="block truncate text-sm text-on-surface hover:text-primary-container"
          >
            {row.fullName}
          </Link>
          <span className="font-financial text-label-sm text-on-surface-variant">
            {row.code} · {row.phone}
          </span>
        </div>
      ),
    },
    ...AGING_BUCKETS.map((bucket): DataTableColumn<ReceivableCustomer> => ({
      key: bucket,
      header: AGING_BUCKET_LABELS[bucket],
      className: 'text-right',
      headerClassName: 'text-right',
      cell: (row) => <BucketCell bucket={bucket} value={row.buckets[bucket]} />,
    })),
    {
      key: 'totalDebt',
      header: 'Toplam',
      className: 'text-right',
      headerClassName: 'text-right',
      cell: (row) => (
        <span className="font-financial text-label-md text-on-surface">
          {formatMoney(row.totalDebt)}
        </span>
      ),
    },
    {
      key: 'actions',
      header: '',
      className: 'text-right',
      cell: (row) => (
        <Button variant="ghost" size="icon-sm" asChild title="Müşteriyi ara">
          <a href={`tel:${row.phone}`} aria-label={`${row.fullName} numarasını ara`}>
            <Phone />
          </a>
        </Button>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Alacaklar"
        description="Müşteri bazlı kalan borç ve yaşlandırma. Vadesi gelmemiş alacak ayrı kovadadır."
        actions={
          <Button variant="outline" onClick={() => exportCsv(data.customers)}>
            <Download />
            CSV indir
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard label="Toplam alacak" value={formatMoney(data.totalDebt)} tone="primary" />
        {AGING_BUCKETS.map((bucket) => (
          <StatCard
            key={bucket}
            label={AGING_BUCKET_LABELS[bucket]}
            value={formatMoney(data.buckets[bucket])}
            tone={bucketTone(bucket, data.buckets[bucket])}
          />
        ))}
      </div>

      <DataTable
        columns={columns}
        rows={data.customers}
        rowKey={(row) => row.customerId}
        emptyTitle="Açık alacak yok"
        emptyDescription="Tüm satışların tahsilatı tamamlanmış."
        itemLabel="müşteri"
      />
    </div>
  );
}

/** Sıfır tutar boş gösterilir: sıfırlarla dolu tablo, dolu kovaları gizler. */
function BucketCell({ bucket, value }: { bucket: AgingBucket; value: string }) {
  if (Number(value) === 0) {
    return <span className="text-sm text-on-surface-variant">—</span>;
  }

  return (
    <span
      className={
        bucket === 'DAYS_90_PLUS' || bucket === 'DAYS_61_90'
          ? 'font-financial text-sm text-error'
          : 'font-financial text-sm text-on-surface'
      }
    >
      {formatMoney(value)}
    </span>
  );
}

function bucketTone(
  bucket: AgingBucket,
  value: string,
): 'neutral' | 'warning' | 'error' | 'success' {
  if (Number(value) === 0) {
    return 'neutral';
  }

  if (bucket === 'NOT_DUE') {
    return 'success';
  }

  return bucket === 'DAYS_90_PLUS' || bucket === 'DAYS_61_90' ? 'error' : 'warning';
}

function exportCsv(rows: ReceivableCustomer[]): void {
  downloadCsv('alacak-yaslandirma', rows, [
    { header: 'Müşteri Kodu', value: (row) => row.code },
    { header: 'Müşteri', value: (row) => row.fullName },
    { header: 'Telefon', value: (row) => row.phone },
    ...AGING_BUCKETS.map((bucket) => ({
      header: AGING_BUCKET_LABELS[bucket],
      value: (row: ReceivableCustomer) => row.buckets[bucket],
    })),
    { header: 'Toplam Borç', value: (row) => row.totalDebt },
    { header: 'En Eski Vade', value: (row) => row.oldestDueDate?.slice(0, 10) ?? '' },
  ]);
}
