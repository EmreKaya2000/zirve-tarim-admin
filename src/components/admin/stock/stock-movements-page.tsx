'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { ArrowDownRight, ArrowUpRight, Search, Warehouse } from 'lucide-react';
import {
  Badge,
  Button,
  DataTable,
  Input,
  PageHeader,
  Select,
  type DataTableColumn,
} from '@zirve/ui';
import {
  STOCK_MOVEMENT_DIRECTIONS,
  STOCK_MOVEMENT_DIRECTION_LABELS,
  STOCK_MOVEMENT_TYPES,
  STOCK_MOVEMENT_TYPE_LABELS,
  type StockMovementDirection,
  type StockMovementType,
} from '@zirve/types';

import { formatQuantity } from '@/lib/format';
import { stockApi, type StockMovementItem } from '@/lib/stock-api';

const PAGE_SIZE = 25;

/**
 * Stok hareket geçmişi.
 *
 * ÖNCEKİ ve SONRAKİ STOK kolonları listenin ASIL değeridir: "40 düştü"
 * bilgisi tek başına denetlenebilir değildir, "120 idi 80 oldu" bilgisi
 * ise zincirin bir halkasıdır. Bir tutarsızlık varsa listeyi okuyan kişi
 * onu gözle yakalayabilir.
 *
 * Sayfa salt okunurdur — hareket kaydı değiştirilemez ve silinemez (K-63).
 */
export function StockMovementsPage() {
  const searchParams = useSearchParams();
  const variantId = searchParams.get('variantId') ?? '';
  const productId = searchParams.get('productId') ?? '';

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [type, setType] = useState('');
  const [direction, setDirection] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const listQuery = useQuery({
    queryKey: [
      'stock-movements',
      { page, search, type, direction, dateFrom, dateTo, variantId, productId },
    ],
    queryFn: () =>
      stockApi.movements({
        page,
        limit: PAGE_SIZE,
        sortBy: 'createdAt',
        sortOrder: 'desc',
        ...(search !== '' && { search }),
        ...(type !== '' && { type }),
        ...(direction !== '' && { direction: direction as StockMovementDirection }),
        ...(variantId !== '' && { variantId }),
        ...(productId !== '' && { productId }),
        ...(dateFrom !== '' && { dateFrom: new Date(dateFrom).toISOString() }),
        ...(dateTo !== '' && { dateTo: new Date(`${dateTo}T23:59:59.999Z`).toISOString() }),
      }),
    placeholderData: keepPreviousData,
  });

  const resetPage = (): void => setPage(1);

  const columns: DataTableColumn<StockMovementItem>[] = [
    {
      key: 'createdAt',
      header: 'Tarih',
      sortable: true,
      cell: (row) => (
        <span className="whitespace-nowrap font-financial text-sm text-on-surface-variant">
          {formatDateTime(row.createdAt)}
        </span>
      ),
    },
    {
      key: 'product',
      header: 'Ürün / Varyasyon',
      cell: (row) => (
        <div className="min-w-0">
          <Link
            href={`/urunler/${row.product.id}`}
            className="block truncate text-sm text-on-surface hover:text-primary-container"
          >
            {row.product.name}
          </Link>
          <p className="truncate font-financial text-label-sm text-on-surface-variant">
            {row.variant.sku}
            {row.variant.name === null ? '' : ` · ${row.variant.name}`}
          </p>
        </div>
      ),
    },
    {
      key: 'type',
      header: 'Hareket',
      cell: (row) => (
        <Badge variant={row.direction === 'IN' ? 'success' : 'warning'}>
          {row.direction === 'IN' ? <ArrowUpRight /> : <ArrowDownRight />}
          {STOCK_MOVEMENT_TYPE_LABELS[row.type]}
        </Badge>
      ),
    },
    {
      key: 'quantity',
      header: 'Miktar',
      sortable: true,
      className: 'text-right',
      headerClassName: 'text-right',
      cell: (row) => (
        <span
          className={
            row.direction === 'IN'
              ? 'font-financial text-label-md text-success'
              : 'font-financial text-label-md text-error'
          }
        >
          {row.direction === 'IN' ? '+' : '−'}
          {formatQuantity(row.quantity)} {row.variant.unitType.code}
        </span>
      ),
    },
    {
      key: 'previousStock',
      header: 'Önceki',
      className: 'text-right',
      headerClassName: 'text-right',
      cell: (row) => (
        <span className="font-financial text-sm text-on-surface-variant">
          {formatQuantity(row.previousStock)}
        </span>
      ),
    },
    {
      key: 'newStock',
      header: 'Sonraki',
      className: 'text-right',
      headerClassName: 'text-right',
      cell: (row) => (
        <span className="font-financial text-label-md text-on-surface">
          {formatQuantity(row.newStock)}
        </span>
      ),
    },
    {
      key: 'reference',
      header: 'Belge / Açıklama',
      cell: (row) => (
        <div className="min-w-0 max-w-xs">
          {row.referenceType === 'SALE' && row.referenceId !== null ? (
            <Link
              href={`/satislar/${row.referenceId}`}
              className="font-financial text-sm text-primary-container hover:underline"
            >
              Satışa git
            </Link>
          ) : null}
          <p className="truncate text-sm text-on-surface-variant" title={row.description ?? ''}>
            {row.description ?? '—'}
          </p>
        </div>
      ),
    },
    {
      key: 'createdBy',
      header: 'Kullanıcı',
      cell: (row) => (
        <span className="text-sm text-on-surface-variant">
          {row.createdBy?.fullName ?? 'Sistem'}
        </span>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Stok Hareketleri"
        description="Stoktaki her değişimin kaydı. Kayıtlar değiştirilemez ve silinemez."
        actions={
          <Button variant="outline" asChild>
            <Link href="/stok">
              <Warehouse />
              Stok Listesi
            </Link>
          </Button>
        }
      />

      {variantId !== '' || productId !== '' ? (
        <div className="flex items-center gap-3 rounded-lg border border-outline-variant px-4 py-3">
          <span className="text-sm text-on-surface-variant">
            Tek bir {variantId !== '' ? 'varyasyonun' : 'ürünün'} hareketleri gösteriliyor.
          </span>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/stok-hareketleri">Filtreyi kaldır</Link>
          </Button>
        </div>
      ) : null}

      <div className="flex flex-wrap items-end gap-3">
        <form
          className="flex flex-1 gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            setSearch(searchInput.trim());
            resetPage();
          }}
        >
          <Input
            startIcon={<Search />}
            placeholder="SKU, ürün adı veya açıklama..."
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            className="max-w-md"
          />
          <Button type="submit" variant="outline">
            Ara
          </Button>
        </form>

        <label className="flex flex-col gap-1 text-label-sm uppercase text-on-surface-variant">
          Hareket tipi
          <Select
            value={type}
            onChange={(event) => {
              setType(event.target.value);
              resetPage();
            }}
          >
            <option value="">Tümü</option>
            {STOCK_MOVEMENT_TYPES.map((value: StockMovementType) => (
              <option key={value} value={value}>
                {STOCK_MOVEMENT_TYPE_LABELS[value]}
              </option>
            ))}
          </Select>
        </label>

        <label className="flex flex-col gap-1 text-label-sm uppercase text-on-surface-variant">
          Yön
          <Select
            value={direction}
            onChange={(event) => {
              setDirection(event.target.value);
              resetPage();
            }}
          >
            <option value="">Tümü</option>
            {STOCK_MOVEMENT_DIRECTIONS.map((value) => (
              <option key={value} value={value}>
                {STOCK_MOVEMENT_DIRECTION_LABELS[value]}
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
              resetPage();
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
              resetPage();
            }}
          />
        </label>
      </div>

      <DataTable
        columns={columns}
        rows={listQuery.data?.items ?? []}
        rowKey={(row) => row.id}
        isLoading={listQuery.isPending}
        errorMessage={listQuery.isError ? 'Hareket geçmişi yüklenemedi.' : undefined}
        emptyTitle="Hareket bulunamadı"
        emptyDescription="Seçilen filtrelerde stok hareketi yok."
        page={listQuery.data?.meta.page}
        totalPages={listQuery.data?.meta.totalPages}
        total={listQuery.data?.meta.total}
        limit={PAGE_SIZE}
        onPageChange={setPage}
        itemLabel="hareket"
      />
    </div>
  );
}

/** Hareket zamanı saatiyle birlikte gösterilir: aynı gün içindeki sıra önemlidir. */
function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat('tr-TR', { dateStyle: 'short', timeStyle: 'short' }).format(
    new Date(value),
  );
}
