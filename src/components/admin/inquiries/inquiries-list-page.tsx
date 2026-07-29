'use client';

import Link from 'next/link';
import { useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { Eye, Search } from 'lucide-react';
import { Badge, Button, DataTable, Input, PageHeader, cn, type DataTableColumn } from '@zirve/ui';
import { INQUIRY_STATUSES, INQUIRY_STATUS_LABELS, PREFERRED_CONTACT_LABELS } from '@zirve/types';

import { formatMoney } from '@/lib/format';
import { inquiriesApi, type InquiryListItem } from '@/lib/inquiries-api';
import { inquiryStatusVariant } from '@/lib/inquiry-status';

const PAGE_SIZE = 20;

/**
 * Durum rozetinin rengi.
 *
 * Sprint 11'de `lib/inquiry-status.ts`e taşındı: müşterinin "Taleplerim"
 * sayfası AYNI renk dilini kullanır. Buradaki yeniden dışa aktarım, mevcut
 * içe aktarımların kırılmaması için korunuyor.
 */
export { inquiryStatusVariant as statusVariant };

export function InquiriesListPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [status, setStatus] = useState<string>('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const listQuery = useQuery({
    queryKey: ['inquiries', { page, search, status, dateFrom, dateTo }],
    queryFn: () =>
      inquiriesApi.list({
        page,
        limit: PAGE_SIZE,
        ...(search !== '' && { search }),
        ...(status !== '' && { status }),
        ...(dateFrom !== '' && { dateFrom: new Date(dateFrom).toISOString() }),
        ...(dateTo !== '' && { dateTo: new Date(dateTo).toISOString() }),
      }),
    placeholderData: keepPreviousData,
  });

  const countsQuery = useQuery({
    queryKey: ['inquiry-counts'],
    queryFn: () => inquiriesApi.counts(),
  });

  const counts = countsQuery.data ?? {};
  const newCount = counts.NEW ?? 0;

  const columns: DataTableColumn<InquiryListItem>[] = [
    {
      key: 'inquiryNumber',
      header: 'Talep No',
      cell: (row) => (
        <Link
          href={`/talepler/${row.id}`}
          className="font-financial text-label-md text-primary-container hover:underline"
        >
          {row.inquiryNumber}
        </Link>
      ),
    },
    {
      key: 'contactName',
      header: 'Müşteri',
      cell: (row) => (
        <div className="min-w-0">
          <p className="truncate text-label-md text-on-surface">{row.contactName}</p>
          <p className="font-financial text-sm text-on-surface-variant">{row.contactPhone}</p>
        </div>
      ),
    },
    {
      key: 'city',
      header: 'Konum',
      cell: (row) => (
        <span className="text-sm text-on-surface-variant">
          {row.city} / {row.district}
        </span>
      ),
    },
    {
      key: 'items',
      header: 'Kalem',
      className: 'text-right',
      headerClassName: 'text-right',
      cell: (row) => <span className="font-financial text-sm">{row._count.items}</span>,
    },
    {
      key: 'estimatedTotal',
      header: 'Tahmini Tutar',
      className: 'text-right',
      headerClassName: 'text-right',
      cell: (row) => (
        <span className="font-financial text-sm text-on-surface">
          {Number(row.estimatedTotal) === 0 ? '—' : formatMoney(row.estimatedTotal)}
        </span>
      ),
    },
    {
      key: 'preferredContact',
      header: 'İletişim',
      cell: (row) => (
        <span className="text-sm text-on-surface-variant">
          {PREFERRED_CONTACT_LABELS[row.preferredContact]}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Durum',
      cell: (row) => (
        <Badge variant={inquiryStatusVariant(row.status)}>
          {INQUIRY_STATUS_LABELS[row.status]}
        </Badge>
      ),
    },
    {
      key: 'createdAt',
      header: 'Tarih',
      cell: (row) => (
        <span className="font-financial text-sm text-on-surface-variant">
          {new Intl.DateTimeFormat('tr-TR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          }).format(new Date(row.createdAt))}
        </span>
      ),
    },
    {
      key: 'actions',
      header: '',
      className: 'text-right',
      headerClassName: 'text-right',
      cell: (row) => (
        <Button asChild variant="ghost" size="icon-sm">
          <Link href={`/talepler/${row.id}`} aria-label="Talebi görüntüle">
            <Eye />
          </Link>
        </Button>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Talepler"
        description="Web sitesinden gelen talepleri inceleyin ve durumlarını yönetin."
      />

      {/* Durum sekmeleri — NEW rozetli, sayaçlar sunucudan. */}
      <div className="flex flex-wrap gap-2">
        <StatusChip
          label="Tümü"
          count={Object.values(counts).reduce((sum, value) => sum + value, 0)}
          active={status === ''}
          onClick={() => {
            setStatus('');
            setPage(1);
          }}
        />

        {INQUIRY_STATUSES.map((value) => (
          <StatusChip
            key={value}
            label={INQUIRY_STATUS_LABELS[value]}
            count={counts[value] ?? 0}
            active={status === value}
            highlight={value === 'NEW' && newCount > 0}
            onClick={() => {
              setStatus(value);
              setPage(1);
            }}
          />
        ))}
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
            placeholder="Talep no, ad, telefon, e-posta veya il..."
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            className="max-w-md"
          />
          <Button type="submit" variant="outline">
            Ara
          </Button>
        </form>

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

        {(search !== '' || dateFrom !== '' || dateTo !== '' || status !== '') && (
          <Button
            variant="ghost"
            onClick={() => {
              setSearch('');
              setSearchInput('');
              setStatus('');
              setDateFrom('');
              setDateTo('');
              setPage(1);
            }}
          >
            Filtreleri temizle
          </Button>
        )}
      </div>

      <DataTable
        columns={columns}
        rows={listQuery.data?.items ?? []}
        rowKey={(row) => row.id}
        isLoading={listQuery.isPending}
        errorMessage={listQuery.isError ? 'Talepler yüklenemedi.' : undefined}
        emptyTitle="Talep bulunamadı"
        emptyDescription={
          status === '' && search === ''
            ? 'Web sitesinden talep geldiğinde burada listelenecek.'
            : 'Filtrelere uyan talep yok.'
        }
        page={listQuery.data?.meta.page}
        totalPages={listQuery.data?.meta.totalPages}
        total={listQuery.data?.meta.total}
        limit={PAGE_SIZE}
        onPageChange={setPage}
        itemLabel="talep"
      />
    </div>
  );
}

function StatusChip({
  label,
  count,
  active,
  highlight = false,
  onClick,
}: {
  label: string;
  count: number;
  active: boolean;
  highlight?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex items-center gap-2 rounded-full border px-3 py-1.5 text-label-sm transition-colors',
        active
          ? 'border-primary bg-primary text-on-primary'
          : 'border-outline-variant text-on-surface-variant hover:border-outline hover:text-on-surface',
      )}
    >
      {label}
      <span
        className={cn(
          'rounded-full px-1.5 font-financial text-[11px]',
          active
            ? 'bg-on-primary/20'
            : highlight
              ? 'bg-info text-on-primary'
              : 'bg-surface-container-high',
        )}
      >
        {count}
      </span>
    </button>
  );
}
