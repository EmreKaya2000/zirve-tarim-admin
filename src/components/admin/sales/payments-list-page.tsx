'use client';

import Link from 'next/link';
import { useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { Search } from 'lucide-react';
import {
  Badge,
  Button,
  DataTable,
  Input,
  PageHeader,
  Select,
  StatCard,
  type DataTableColumn,
} from '@zirve/ui';
import { PAYMENT_METHODS, PAYMENT_METHOD_LABELS, type PaymentMethod } from '@zirve/types';

import { formatMoney } from '@/lib/format';
import { paymentsApi, type PaymentListItem } from '@/lib/sales-api';

const PAGE_SIZE = 20;

/** Tüm tahsilatlar — yöntem, tarih ve müşteri filtreli. */
export function PaymentsListPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [method, setMethod] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const listQuery = useQuery({
    queryKey: ['payments', { page, search, method, dateFrom, dateTo }],
    queryFn: () =>
      paymentsApi.list({
        page,
        limit: PAGE_SIZE,
        ...(search !== '' && { search }),
        ...(method !== '' && { method: method as PaymentMethod }),
        ...(dateFrom !== '' && { dateFrom: new Date(dateFrom).toISOString() }),
        ...(dateTo !== '' && { dateTo: new Date(`${dateTo}T23:59:59.999Z`).toISOString() }),
      }),
    placeholderData: keepPreviousData,
  });

  const columns: DataTableColumn<PaymentListItem>[] = [
    {
      key: 'paymentNumber',
      header: 'Ödeme No',
      cell: (row) => (
        <span className="font-financial text-label-md text-on-surface">{row.paymentNumber}</span>
      ),
    },
    {
      key: 'sale',
      header: 'Satış',
      cell: (row) => (
        <Link
          href={`/satislar/${row.sale.id}`}
          className="font-financial text-sm text-primary-container hover:underline"
        >
          {row.sale.saleNumber}
        </Link>
      ),
    },
    {
      key: 'customer',
      header: 'Müşteri',
      cell: (row) => (
        <Link
          href={`/musteriler/${row.customer.id}`}
          className="text-sm text-on-surface hover:text-primary-container"
        >
          {row.customer.fullName}
        </Link>
      ),
    },
    {
      key: 'method',
      header: 'Yöntem',
      cell: (row) => <Badge variant="neutral">{PAYMENT_METHOD_LABELS[row.method]}</Badge>,
    },
    {
      key: 'reference',
      header: 'Referans',
      cell: (row) => (
        <span className="font-financial text-sm text-on-surface-variant">
          {row.reference ?? '—'}
          {row.dueDate !== null ? ` · vade ${formatDate(row.dueDate)}` : ''}
        </span>
      ),
    },
    {
      key: 'paymentDate',
      header: 'Tarih',
      cell: (row) => (
        <span className="font-financial text-sm text-on-surface-variant">
          {formatDate(row.paymentDate)}
        </span>
      ),
    },
    {
      key: 'amount',
      header: 'Tutar',
      className: 'text-right',
      headerClassName: 'text-right',
      cell: (row) => (
        <span className="font-financial text-label-md text-success">{formatMoney(row.amount)}</span>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Ödemeler"
        description="Tüm tahsilatlar; filtreye göre toplam gösterilir."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          label="Filtrelenmiş tahsilat"
          value={formatMoney(listQuery.data?.meta.totalAmount ?? '0')}
        />
        <StatCard label="Kayıt sayısı" value={String(listQuery.data?.meta.total ?? 0)} />
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <form
          className="flex flex-1 gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            setSearch(searchInput.trim());
            setPage(1);
          }}
        >
          <Input
            startIcon={<Search />}
            placeholder="Ödeme no, satış no, referans veya müşteri..."
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            className="max-w-md"
          />
          <Button type="submit" variant="outline">
            Ara
          </Button>
        </form>

        <label className="flex flex-col gap-1 text-label-sm uppercase text-on-surface-variant">
          Yöntem
          <Select
            value={method}
            onChange={(event) => {
              setMethod(event.target.value);
              setPage(1);
            }}
          >
            <option value="">Tümü</option>
            {PAYMENT_METHODS.map((value) => (
              <option key={value} value={value}>
                {PAYMENT_METHOD_LABELS[value]}
              </option>
            ))}
          </Select>
        </label>

        <label className="flex flex-col gap-1 text-label-sm uppercase text-on-surface-variant">
          Başlangıç
          <Input
            type="date"
            value={dateFrom}
            onChange={(event) => {
              setDateFrom(event.target.value);
              setPage(1);
            }}
          />
        </label>

        <label className="flex flex-col gap-1 text-label-sm uppercase text-on-surface-variant">
          Bitiş
          <Input
            type="date"
            value={dateTo}
            onChange={(event) => {
              setDateTo(event.target.value);
              setPage(1);
            }}
          />
        </label>
      </div>

      <DataTable
        columns={columns}
        rows={listQuery.data?.items ?? []}
        rowKey={(row) => row.id}
        isLoading={listQuery.isPending}
        errorMessage={listQuery.isError ? 'Ödemeler yüklenemedi.' : undefined}
        emptyTitle="Tahsilat bulunamadı"
        emptyDescription="Satış detayından ödeme ekleyebilirsiniz."
        page={listQuery.data?.meta.page}
        totalPages={listQuery.data?.meta.totalPages}
        total={listQuery.data?.meta.total}
        limit={PAGE_SIZE}
        onPageChange={setPage}
        itemLabel="tahsilat"
      />
    </div>
  );
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('tr-TR', { dateStyle: 'medium' }).format(new Date(value));
}
