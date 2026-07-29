'use client';

import Link from 'next/link';
import { useState } from 'react';
import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query';
import { Boxes, History, PackageX, Search, SlidersHorizontal, TriangleAlert } from 'lucide-react';
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

import { brandsApi, categoriesApi } from '@/lib/catalog-api';
import { formatMoney, formatQuantity } from '@/lib/format';
import { isLowStock, isOutOfStock, stockApi, type StockListItem } from '@/lib/stock-api';

import { StockAdjustmentDialog } from './stock-adjustment-dialog';

const PAGE_SIZE = 20;

/**
 * Stok listesi — varyasyon bazlı.
 *
 * NEDEN VARYASYON BAZLI: stok varyasyonda tutulur. Ürün seviyesinde
 * toplanmış bir liste "AgroMax NPK: 120" derdi ama depocunun bilmesi
 * gereken "5 kg çuvaldan 0, 25 kg çuvaldan 120 var" bilgisidir.
 *
 * Stok bu ekranda da doğrudan YAZILAMAZ; "Düzelt" bir hareket dialogu açar.
 */
export function StockListPage() {
  const queryClient = useQueryClient();

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [brandId, setBrandId] = useState('');
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [adjusting, setAdjusting] = useState<StockListItem | null>(null);

  const listQuery = useQuery({
    queryKey: ['stock', { page, search, categoryId, brandId, lowStockOnly }],
    queryFn: () =>
      stockApi.list({
        page,
        limit: PAGE_SIZE,
        sortBy: 'stockQuantity',
        sortOrder: 'asc',
        ...(search !== '' && { search }),
        ...(categoryId !== '' && { categoryId }),
        ...(brandId !== '' && { brandId }),
        ...(lowStockOnly && { lowStockOnly: true }),
      }),
    placeholderData: keepPreviousData,
  });

  const categoriesQuery = useQuery({
    queryKey: ['categories', 'stock-filter'],
    queryFn: () => categoriesApi.list({ page: 1, limit: 100 }),
    staleTime: 5 * 60 * 1000,
  });

  const brandsQuery = useQuery({
    queryKey: ['brands', 'stock-filter'],
    queryFn: () => brandsApi.list({ page: 1, limit: 100 }),
    staleTime: 5 * 60 * 1000,
  });

  const refresh = async (): Promise<void> => {
    await queryClient.invalidateQueries({ queryKey: ['stock'] });
    await queryClient.invalidateQueries({ queryKey: ['stock-movements'] });
  };

  const resetPage = (): void => setPage(1);

  const columns: DataTableColumn<StockListItem>[] = [
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
          <p className="truncate text-label-sm text-on-surface-variant">
            {row.name ?? '—'} · {row.product.brand?.name ?? 'Markasız'}
          </p>
        </div>
      ),
    },
    {
      key: 'sku',
      header: 'SKU',
      sortable: true,
      cell: (row) => (
        <span className="font-financial text-xs text-on-surface-variant">{row.sku}</span>
      ),
    },
    {
      key: 'stockQuantity',
      header: 'Stok',
      sortable: true,
      className: 'text-right',
      headerClassName: 'text-right',
      cell: (row) => (
        <span
          className={
            isOutOfStock(row)
              ? 'font-financial text-label-md text-error'
              : isLowStock(row)
                ? 'font-financial text-label-md text-warning'
                : 'font-financial text-label-md text-on-surface'
          }
        >
          {formatQuantity(row.stockQuantity)} {row.unitType.code}
        </span>
      ),
    },
    {
      key: 'lowStockThreshold',
      header: 'Kritik Eşik',
      className: 'text-right',
      headerClassName: 'text-right',
      cell: (row) => (
        <span className="font-financial text-sm text-on-surface-variant">
          {formatQuantity(row.lowStockThreshold)}
        </span>
      ),
    },
    {
      key: 'value',
      header: 'Stok Değeri',
      className: 'text-right',
      headerClassName: 'text-right',
      cell: (row) => (
        <span className="font-financial text-sm text-on-surface-variant">
          {formatMoney(stockValue(row))}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Durum',
      cell: (row) => <StockBadge row={row} />,
    },
    {
      key: 'actions',
      header: 'İşlem',
      className: 'text-right',
      headerClassName: 'text-right',
      cell: (row) => (
        <div className="flex items-center justify-end gap-1">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAdjusting(row)}
            disabled={!row.trackStock}
            title={row.trackStock ? 'Stok düzelt' : 'Bu varyasyonda stok takibi kapalı'}
          >
            <SlidersHorizontal />
            Düzelt
          </Button>
          <Button variant="ghost" size="icon-sm" asChild title="Hareketleri gör">
            <Link href={`/stok-hareketleri?variantId=${row.id}`}>
              <History />
            </Link>
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Stok"
        description="Varyasyon bazlı stok durumu. Stok yalnız hareket kaydıyla değişir."
        actions={
          <Button variant="outline" asChild>
            <Link href="/stok-hareketleri">
              <History />
              Hareket Geçmişi
            </Link>
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          label="Varyasyon"
          value={String(listQuery.data?.meta.total ?? 0)}
          icon={<Boxes />}
        />
        <StatCard
          label="Kritik stok"
          value={String(listQuery.data?.meta.lowStockCount ?? 0)}
          tone={(listQuery.data?.meta.lowStockCount ?? 0) > 0 ? 'warning' : 'neutral'}
          icon={<TriangleAlert />}
          footnote="Stok, kritik eşiğin altında"
        />
        <StatCard
          label="Tükenen"
          value={String(listQuery.data?.meta.outOfStockCount ?? 0)}
          tone={(listQuery.data?.meta.outOfStockCount ?? 0) > 0 ? 'error' : 'neutral'}
          icon={<PackageX />}
          footnote="Rafta hiç kalmadı"
        />
      </div>

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
            placeholder="SKU, varyasyon veya ürün adı..."
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            className="max-w-md"
          />
          <Button type="submit" variant="outline">
            Ara
          </Button>
        </form>

        <label className="flex flex-col gap-1 text-label-sm uppercase text-on-surface-variant">
          Kategori
          <Select
            value={categoryId}
            onChange={(event) => {
              setCategoryId(event.target.value);
              resetPage();
            }}
          >
            <option value="">Tümü</option>
            {(categoriesQuery.data?.items ?? []).map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </Select>
        </label>

        <label className="flex flex-col gap-1 text-label-sm uppercase text-on-surface-variant">
          Marka
          <Select
            value={brandId}
            onChange={(event) => {
              setBrandId(event.target.value);
              resetPage();
            }}
          >
            <option value="">Tümü</option>
            {(brandsQuery.data?.items ?? []).map((brand) => (
              <option key={brand.id} value={brand.id}>
                {brand.name}
              </option>
            ))}
          </Select>
        </label>

        <Button
          variant={lowStockOnly ? 'primary' : 'outline'}
          onClick={() => {
            setLowStockOnly((previous) => !previous);
            resetPage();
          }}
        >
          Yalnız kritik
        </Button>
      </div>

      <DataTable
        columns={columns}
        rows={listQuery.data?.items ?? []}
        rowKey={(row) => row.id}
        isLoading={listQuery.isPending}
        errorMessage={listQuery.isError ? 'Stok listesi yüklenemedi.' : undefined}
        emptyTitle="Kayıt bulunamadı"
        emptyDescription={
          lowStockOnly
            ? 'Kritik stokta ürün yok — iyi haber.'
            : 'Filtrelere uyan varyasyon bulunamadı.'
        }
        page={listQuery.data?.meta.page}
        totalPages={listQuery.data?.meta.totalPages}
        total={listQuery.data?.meta.total}
        limit={PAGE_SIZE}
        onPageChange={setPage}
        itemLabel="varyasyon"
      />

      <StockAdjustmentDialog
        variant={adjusting}
        onClose={() => setAdjusting(null)}
        onSuccess={refresh}
      />
    </div>
  );
}

/** Stok durumu rozeti — kritik ve tükenmiş ayrı renklerde. */
function StockBadge({ row }: { row: StockListItem }) {
  if (!row.trackStock) {
    return <Badge variant="neutral">Takip yok</Badge>;
  }

  if (isOutOfStock(row)) {
    return <Badge variant="error">Tükendi</Badge>;
  }

  if (isLowStock(row)) {
    return <Badge variant="warning">Kritik</Badge>;
  }

  return <Badge variant="success">Yeterli</Badge>;
}

/**
 * Satır bazında stok değeri — SALT GÖSTERİM.
 *
 * Rapor rakamı değildir; toplam stok değeri gerektiğinde backend'de Decimal
 * ile hesaplanmalıdır (Kural 2).
 */
function stockValue(row: StockListItem): string {
  return String(Number(row.stockQuantity) * Number(row.purchasePrice));
}
