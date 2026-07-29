'use client';

import Link from 'next/link';
import { useState } from 'react';
import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, Eye, Pencil, Plus, Search } from 'lucide-react';
import {
  Badge,
  Button,
  DataTable,
  Input,
  PageHeader,
  Select,
  cn,
  type DataTableColumn,
} from '@zirve/ui';
import { CUSTOMER_TYPES, CUSTOMER_TYPE_LABELS, type CustomerType } from '@zirve/types';

import { formatMoney } from '@/lib/format';
import { customersApi, type CustomerDetail, type CustomerListItem } from '@/lib/sales-api';

import { CustomerFormDialog } from './customer-form-dialog';

const PAGE_SIZE = 20;

export function CustomersListPage() {
  const queryClient = useQueryClient();

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [debtOnly, setDebtOnly] = useState(false);
  const [type, setType] = useState('');
  const [activeFilter, setActiveFilter] = useState('');
  const [isFormOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<CustomerDetail | null>(null);

  const listQuery = useQuery({
    queryKey: ['customers', { page, search, debtOnly, type, activeFilter }],
    queryFn: () =>
      customersApi.list({
        page,
        limit: PAGE_SIZE,
        ...(search !== '' && { search }),
        ...(debtOnly && { hasDebt: '1' }),
        ...(type !== '' && { type: type as CustomerType }),
        ...(activeFilter !== '' && { isActive: activeFilter === 'true' }),
      }),
    placeholderData: keepPreviousData,
  });

  /** Düzenleme formu DETAY kaydını ister; liste satırı dar bir görünümdür. */
  async function openEdit(id: string): Promise<void> {
    setEditing(await customersApi.get(id));
    setFormOpen(true);
  }

  async function refresh(): Promise<void> {
    await queryClient.invalidateQueries({ queryKey: ['customers'] });
  }

  const columns: DataTableColumn<CustomerListItem>[] = [
    {
      key: 'code',
      header: 'Kod',
      cell: (row) => (
        <Link
          href={`/musteriler/${row.id}`}
          className="font-financial text-label-md text-primary-container hover:underline"
        >
          {row.code}
        </Link>
      ),
    },
    {
      key: 'fullName',
      header: 'Müşteri',
      cell: (row) => (
        <div className="min-w-0">
          <p className="truncate text-label-md text-on-surface">{row.fullName}</p>
          {row.companyName !== null ? (
            <p className="truncate text-sm text-on-surface-variant">{row.companyName}</p>
          ) : null}
        </div>
      ),
    },
    {
      key: 'phone',
      header: 'Telefon',
      cell: (row) => <span className="font-financial text-sm">{row.phone}</span>,
    },
    {
      key: 'city',
      header: 'Konum',
      cell: (row) => (
        <span className="text-sm text-on-surface-variant">
          {row.city ?? '—'}
          {row.district !== null ? ` / ${row.district}` : ''}
        </span>
      ),
    },
    {
      key: 'type',
      header: 'Tür',
      cell: (row) => (
        <span className="text-sm text-on-surface-variant">{CUSTOMER_TYPE_LABELS[row.type]}</span>
      ),
    },
    {
      key: 'totalSales',
      header: 'Toplam Satış',
      className: 'text-right',
      headerClassName: 'text-right',
      cell: (row) => (
        <span className="font-financial text-sm text-on-surface-variant">
          {formatMoney(row.totalSales)}
        </span>
      ),
    },
    {
      key: 'currentDebt',
      header: 'Kalan Borç',
      className: 'text-right',
      headerClassName: 'text-right',
      cell: (row) => (
        <div className="flex items-center justify-end gap-1.5">
          <span
            className={cn(
              'font-financial text-label-md',
              Number(row.currentDebt) > 0 ? 'text-error' : 'text-on-surface-variant',
            )}
          >
            {formatMoney(row.currentDebt)}
          </span>
          {row.isOverLimit ? (
            <AlertTriangle className="size-4 text-error" aria-label="Kredi limiti aşıldı" />
          ) : null}
        </div>
      ),
    },
    {
      key: 'overdueDebt',
      header: 'Vadesi Geçmiş',
      className: 'text-right',
      headerClassName: 'text-right',
      cell: (row) =>
        Number(row.overdueDebt) > 0 ? (
          <Badge variant="error">{formatMoney(row.overdueDebt)}</Badge>
        ) : (
          <span className="text-sm text-on-surface-variant">—</span>
        ),
    },
    {
      key: 'actions',
      header: '',
      className: 'text-right',
      cell: (row) => (
        <div className="flex items-center justify-end gap-1">
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Müşteriyi düzenle"
            onClick={() => void openEdit(row.id)}
          >
            <Pencil />
          </Button>
          <Button asChild variant="ghost" size="icon-sm">
            <Link href={`/musteriler/${row.id}`} aria-label="Müşteriyi görüntüle">
              <Eye />
            </Link>
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Müşteriler"
        description="Cari borç ve vadesi geçmiş alacak durumunu takip edin."
        actions={
          <Button
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
          >
            <Plus />
            Yeni Müşteri
          </Button>
        }
      />

      <div className="flex flex-wrap items-center gap-3">
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
            placeholder="Ad, kod, telefon, e-posta veya vergi no..."
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            className="max-w-md"
          />
          <Button type="submit" variant="outline">
            Ara
          </Button>
        </form>

        <label className="flex flex-col gap-1 text-label-sm uppercase text-on-surface-variant">
          Tip
          <Select
            value={type}
            onChange={(event) => {
              setType(event.target.value);
              setPage(1);
            }}
          >
            <option value="">Tümü</option>
            {CUSTOMER_TYPES.map((value) => (
              <option key={value} value={value}>
                {CUSTOMER_TYPE_LABELS[value]}
              </option>
            ))}
          </Select>
        </label>

        <label className="flex flex-col gap-1 text-label-sm uppercase text-on-surface-variant">
          Durum
          <Select
            value={activeFilter}
            onChange={(event) => {
              setActiveFilter(event.target.value);
              setPage(1);
            }}
          >
            <option value="">Tümü</option>
            <option value="true">Aktif</option>
            <option value="false">Pasif</option>
          </Select>
        </label>

        <label className="flex cursor-pointer items-center gap-2 text-sm text-on-surface">
          <input
            type="checkbox"
            checked={debtOnly}
            onChange={(event) => {
              setDebtOnly(event.target.checked);
              setPage(1);
            }}
            className="size-4 rounded border-outline-variant accent-primary"
          />
          Yalnız borcu olanlar
        </label>
      </div>

      <DataTable
        columns={columns}
        rows={listQuery.data?.items ?? []}
        rowKey={(row) => row.id}
        isLoading={listQuery.isPending}
        errorMessage={listQuery.isError ? 'Müşteriler yüklenemedi.' : undefined}
        emptyTitle="Müşteri bulunamadı"
        emptyDescription="Yeni satış oluştururken hızlı müşteri kaydı yapabilirsiniz."
        page={listQuery.data?.meta.page}
        totalPages={listQuery.data?.meta.totalPages}
        total={listQuery.data?.meta.total}
        limit={PAGE_SIZE}
        onPageChange={setPage}
        itemLabel="müşteri"
      />

      <CustomerFormDialog
        open={isFormOpen}
        customer={editing}
        onOpenChange={(next) => {
          setFormOpen(next);

          if (!next) {
            setEditing(null);
          }
        }}
        onSaved={refresh}
      />
    </div>
  );
}
