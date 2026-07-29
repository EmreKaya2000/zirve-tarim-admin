'use client';

import Link from 'next/link';
import { useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { AlertTriangle, Eye, Plus, Search } from 'lucide-react';
import { Badge, Button, DataTable, Input, PageHeader, cn, type DataTableColumn } from '@zirve/ui';
import {
  PAYMENT_TYPE_LABELS,
  SALE_STATUSES,
  SALE_STATUS_LABELS,
  type SaleStatus,
} from '@zirve/types';

import { formatMoney } from '@/lib/format';
import { salesApi, type SaleListItem } from '@/lib/sales-api';

const PAGE_SIZE = 20;

/** Durum rozetinin rengi. */
export function saleStatusVariant(
  status: SaleStatus,
): 'neutral' | 'info' | 'success' | 'warning' | 'primary' {
  switch (status) {
    case 'DRAFT':
      return 'neutral';
    case 'CONFIRMED':
      return 'info';
    case 'PARTIALLY_PAID':
      return 'warning';
    case 'PAID':
      return 'success';
    case 'CANCELLED':
      return 'neutral';
  }
}

/** Vade geçmiş mi? */
function isOverdue(sale: SaleListItem): boolean {
  if (sale.dueDate === null) {
    return false;
  }

  if (sale.status !== 'CONFIRMED' && sale.status !== 'PARTIALLY_PAID') {
    return false;
  }

  return new Date(sale.dueDate).getTime() < Date.now();
}

export function SalesListPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [status, setStatus] = useState('');
  const [overdueOnly, setOverdueOnly] = useState(false);

  const listQuery = useQuery({
    queryKey: ['sales', { page, search, status, overdueOnly }],
    queryFn: () =>
      salesApi.list({
        page,
        limit: PAGE_SIZE,
        ...(search !== '' && { search }),
        ...(status !== '' && { status }),
        ...(overdueOnly && { overdue: '1' }),
      }),
    placeholderData: keepPreviousData,
  });

  const countsQuery = useQuery({ queryKey: ['sale-counts'], queryFn: () => salesApi.counts() });
  const counts = countsQuery.data ?? {};

  const columns: DataTableColumn<SaleListItem>[] = [
    {
      key: 'saleNumber',
      header: 'Satış No',
      cell: (row) => (
        <div className="min-w-0">
          <Link
            href={`/satislar/${row.id}`}
            className="font-financial text-label-md text-primary-container hover:underline"
          >
            {row.saleNumber}
          </Link>
          {row.inquiry !== null ? (
            <p className="text-xs text-on-surface-variant">Talep: {row.inquiry.inquiryNumber}</p>
          ) : null}
        </div>
      ),
    },
    {
      key: 'customer',
      header: 'Müşteri',
      cell: (row) => (
        <div className="min-w-0">
          <Link
            href={`/musteriler/${row.customer.id}`}
            className="truncate text-label-md text-on-surface hover:text-primary-container"
          >
            {row.customer.fullName}
          </Link>
          <p className="font-financial text-sm text-on-surface-variant">{row.customer.phone}</p>
        </div>
      ),
    },
    {
      key: 'saleDate',
      header: 'Tarih',
      cell: (row) => (
        <div className="font-financial text-sm text-on-surface-variant">
          <p>{formatDate(row.saleDate)}</p>
          {row.dueDate !== null ? (
            <p className={cn('text-xs', isOverdue(row) && 'font-semibold text-error')}>
              Vade: {formatDate(row.dueDate)}
            </p>
          ) : null}
        </div>
      ),
    },
    {
      key: 'paymentType',
      header: 'Tip',
      cell: (row) => (
        <span className="text-sm text-on-surface-variant">
          {PAYMENT_TYPE_LABELS[row.paymentType]}
        </span>
      ),
    },
    {
      key: 'grandTotal',
      header: 'Tutar',
      className: 'text-right',
      headerClassName: 'text-right',
      cell: (row) => (
        <span className="font-financial text-label-md text-on-surface">
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
        <span
          className={cn(
            'font-financial text-sm',
            Number(row.remainingTotal) > 0 ? 'text-error' : 'text-on-surface-variant',
          )}
        >
          {formatMoney(row.remainingTotal)}
        </span>
      ),
    },
    {
      // KÂR YALNIZ YÖNETİM EKRANINDA gösterilir (Kural 8).
      key: 'netProfit',
      header: 'Net Kâr',
      className: 'text-right',
      headerClassName: 'text-right',
      cell: (row) => (
        <span
          className={cn(
            'font-financial text-sm',
            Number(row.netProfit) < 0 ? 'text-error' : 'text-success',
          )}
        >
          {formatMoney(row.netProfit)}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Durum',
      cell: (row) => (
        <div className="flex items-center gap-1.5">
          <Badge variant={saleStatusVariant(row.status)}>{SALE_STATUS_LABELS[row.status]}</Badge>
          {isOverdue(row) ? (
            <AlertTriangle className="size-4 text-error" aria-label="Vadesi geçmiş" />
          ) : null}
        </div>
      ),
    },
    {
      key: 'actions',
      header: '',
      className: 'text-right',
      cell: (row) => (
        <Button asChild variant="ghost" size="icon-sm">
          <Link href={`/satislar/${row.id}`} aria-label="Satışı görüntüle">
            <Eye />
          </Link>
        </Button>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Satışlar"
        description="Satışları, tahsilatları ve kâr durumunu takip edin."
        actions={
          <Button asChild>
            <Link href="/satislar/yeni">
              <Plus />
              Yeni Satış
            </Link>
          </Button>
        }
      />

      <div className="flex flex-wrap gap-2">
        <StatusChip
          label="Tümü"
          count={Object.values(counts).reduce((sum, value) => sum + value, 0)}
          active={status === '' && !overdueOnly}
          onClick={() => {
            setStatus('');
            setOverdueOnly(false);
            setPage(1);
          }}
        />

        {SALE_STATUSES.map((value) => (
          <StatusChip
            key={value}
            label={SALE_STATUS_LABELS[value]}
            count={counts[value] ?? 0}
            active={status === value && !overdueOnly}
            onClick={() => {
              setStatus(value);
              setOverdueOnly(false);
              setPage(1);
            }}
          />
        ))}

        <StatusChip
          label="Vadesi geçmiş"
          active={overdueOnly}
          danger
          onClick={() => {
            setOverdueOnly(true);
            setStatus('');
            setPage(1);
          }}
        />
      </div>

      <form
        className="flex max-w-xl gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          setSearch(searchInput.trim());
          setPage(1);
        }}
      >
        <Input
          startIcon={<Search />}
          placeholder="Satış no, müşteri adı, kod veya telefon..."
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
        />
        <Button type="submit" variant="outline">
          Ara
        </Button>
      </form>

      <DataTable
        columns={columns}
        rows={listQuery.data?.items ?? []}
        rowKey={(row) => row.id}
        isLoading={listQuery.isPending}
        errorMessage={listQuery.isError ? 'Satışlar yüklenemedi.' : undefined}
        emptyTitle="Satış bulunamadı"
        emptyDescription="Yeni satış oluşturmak için sağ üstteki düğmeyi kullanın."
        page={listQuery.data?.meta.page}
        totalPages={listQuery.data?.meta.totalPages}
        total={listQuery.data?.meta.total}
        limit={PAGE_SIZE}
        onPageChange={setPage}
        itemLabel="satış"
      />
    </div>
  );
}

function StatusChip({
  label,
  count,
  active,
  danger = false,
  onClick,
}: {
  label: string;
  count?: number;
  active: boolean;
  danger?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex items-center gap-2 rounded-full border px-3 py-1.5 text-label-sm transition-colors',
        active
          ? danger
            ? 'border-error bg-error text-on-error'
            : 'border-primary bg-primary text-on-primary'
          : 'border-outline-variant text-on-surface-variant hover:border-outline hover:text-on-surface',
      )}
    >
      {label}
      {count !== undefined ? (
        <span
          className={cn(
            'rounded-full px-1.5 font-financial text-[11px]',
            active ? 'bg-on-primary/20' : 'bg-surface-container-high',
          )}
        >
          {count}
        </span>
      ) : null}
    </button>
  );
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('tr-TR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(value));
}
