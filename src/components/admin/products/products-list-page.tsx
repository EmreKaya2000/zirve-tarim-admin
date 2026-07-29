'use client';

import { useState } from 'react';
import Link from 'next/link';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, Package, Pencil, Plus, Trash2 } from 'lucide-react';
import {
  Badge,
  Button,
  ConfirmDialog,
  DataTable,
  PageHeader,
  Select,
  StatCard,
  type DataTableColumn,
  type SortDirection,
} from '@zirve/ui';
import { MAX_LIMIT } from '@zirve/types';

import { ApiError } from '@/lib/api-error';
import { brandsApi, categoriesApi, type CategoryTreeNode } from '@/lib/catalog-api';
import { productsApi, type Product } from '@/lib/products-api';

const PAGE_SIZE = 20;

type PublishFilter = 'all' | 'published' | 'draft';

/** Ürün listesi — filtreli. */
export function ProductsListPage() {
  const queryClient = useQueryClient();

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState<SortDirection>('desc');
  const [categoryId, setCategoryId] = useState('');
  const [brandId, setBrandId] = useState('');
  const [publishFilter, setPublishFilter] = useState<PublishFilter>('all');
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [deleting, setDeleting] = useState<Product | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const listQuery = useQuery({
    queryKey: [
      'products',
      { page, search, sortBy, sortOrder, categoryId, brandId, publishFilter, lowStockOnly },
    ],
    queryFn: () =>
      productsApi.list({
        page,
        limit: PAGE_SIZE,
        sortBy,
        sortOrder,
        ...(search.trim() !== '' && { search: search.trim() }),
        ...(categoryId !== '' && { categoryId }),
        ...(brandId !== '' && { brandId }),
        ...(publishFilter !== 'all' && { isPublished: publishFilter === 'published' }),
        ...(lowStockOnly && { lowStock: true }),
      }),
    placeholderData: keepPreviousData,
  });

  const filtersQuery = useQuery({
    queryKey: ['product-filters'],
    queryFn: async () => {
      const [tree, brands] = await Promise.all([
        categoriesApi.tree(),
        // `MAX_LIMIT` kullanılır, elle yazılmış bir sayı DEĞİL.
        //
        // Burada `limit: 200` yazılıydı ve API'nin üst sınırı 100 olduğu için
        // istek HER ZAMAN 400 dönüyordu: marka filtresi hiç dolmuyordu ve
        // (Sprint 12'de düzeltilen ikinci hatayla birlikte) sayfa yenilemesi
        // kullanıcıyı çıkışa zorluyordu. Sabiti paylaşılan kaynaktan almak,
        // sınır değiştiğinde bu çağrının sessizce bozulmasını engeller.
        brandsApi.list({ limit: MAX_LIMIT, isActive: true }),
      ]);

      return { tree, brands: brands.items };
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => productsApi.remove(id),
    onSuccess: async () => {
      setDeleteError(null);
      await queryClient.invalidateQueries({ queryKey: ['products'] });
      setDeleting(null);
    },
    onError: (error: unknown) => {
      setDeleteError(error instanceof ApiError ? error.message : 'Ürün silinemedi.');
    },
  });

  const items = listQuery.data?.items ?? [];
  const meta = listQuery.data?.meta;

  const publishedCount = items.filter((product) => product.isPublished).length;
  const lowStockCount = items.filter((product) =>
    product.variants.some(
      (variant) =>
        Number(variant.lowStockThreshold) > 0 &&
        Number(variant.stockQuantity) <= Number(variant.lowStockThreshold),
    ),
  ).length;

  const columns: DataTableColumn<Product>[] = [
    {
      key: 'name',
      header: 'Ürün',
      sortable: true,
      cell: (product) => (
        <div className="flex items-center gap-3">
          <div className="size-10 shrink-0 overflow-hidden rounded-[8px] bg-surface-container">
            {product.images[0] !== undefined ? (
              <img src={product.images[0].url} alt="" className="size-full object-cover" />
            ) : (
              <span className="flex size-full items-center justify-center text-outline">
                <Package className="size-4" />
              </span>
            )}
          </div>

          <div className="min-w-0">
            <Link
              href={`/urunler/${product.id}`}
              className="block truncate text-label-md text-on-surface hover:text-primary-container"
            >
              {product.name}
            </Link>
            <p className="truncate text-xs text-outline">
              {product.brand?.name ?? 'Markasız'} ·{' '}
              {product.categories.find((link) => link.isPrimary)?.category.name ?? '—'}
            </p>
          </div>
        </div>
      ),
    },
    {
      key: 'variants',
      header: 'Varyasyon',
      className: 'font-financial',
      cell: (product) => product.variants.length,
    },
    {
      key: 'price',
      header: 'Fiyat',
      className: 'text-right',
      headerClassName: 'text-right',
      cell: (product) => {
        const prices = product.variants
          .map((variant) => Number(variant.salePrice ?? 0))
          .filter((price) => price > 0);

        if (prices.length === 0) {
          return <span className="text-outline">—</span>;
        }

        const min = Math.min(...prices);
        const max = Math.max(...prices);

        return (
          <span className="whitespace-nowrap font-financial">
            {formatMoney(min)}
            {max !== min ? ` – ${formatMoney(max)}` : ''}
          </span>
        );
      },
    },
    {
      key: 'stock',
      header: 'Stok',
      className: 'text-right',
      headerClassName: 'text-right',
      cell: (product) => {
        const total = product.variants.reduce(
          (sum, variant) => sum + Number(variant.stockQuantity),
          0,
        );
        const isLow = product.variants.some(
          (variant) =>
            Number(variant.lowStockThreshold) > 0 &&
            Number(variant.stockQuantity) <= Number(variant.lowStockThreshold),
        );

        return (
          <span
            className={isLow ? 'font-financial text-error' : 'font-financial'}
            title={isLow ? 'Kritik stok seviyesinin altında' : undefined}
          >
            {total.toLocaleString('tr-TR')}
          </span>
        );
      },
    },
    {
      key: 'status',
      header: 'Durum',
      cell: (product) => (
        <div className="flex flex-wrap gap-1">
          <Badge variant={product.isActive ? 'success' : 'neutral'}>
            {product.isActive ? 'Aktif' : 'Pasif'}
          </Badge>
          {product.isPublished ? <Badge variant="primary">Yayında</Badge> : null}
        </div>
      ),
    },
    {
      key: 'actions',
      header: 'İşlem',
      headerClassName: 'text-right',
      className: 'text-right',
      cell: (product) => (
        <div className="flex items-center justify-end gap-1">
          <Button asChild variant="ghost" size="icon-sm" title="Düzenle">
            <Link href={`/urunler/${product.id}`}>
              <Pencil />
              <span className="sr-only">Düzenle</span>
            </Link>
          </Button>
          <Button variant="ghost" size="icon-sm" onClick={() => setDeleting(product)} title="Sil">
            <Trash2 />
            <span className="sr-only">Sil</span>
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Ürünler"
        description="Katalogdaki tüm ürünler. Fiyat ve stok varyasyon düzeyinde tutulur."
        actions={
          <Button asChild>
            <Link href="/urunler/yeni">
              <Plus />
              Yeni Ürün
            </Link>
          </Button>
        }
      />

      <section className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Toplam Ürün"
          value={meta?.total ?? '—'}
          icon={<Package />}
          tone="primary"
        />
        <StatCard label="Bu Sayfada Yayında" value={publishedCount} tone="success" />
        <StatCard
          label="Bu Sayfada Kritik Stok"
          value={lowStockCount}
          icon={<AlertTriangle />}
          tone={lowStockCount > 0 ? 'error' : 'neutral'}
        />
      </section>

      <DataTable
        columns={columns}
        rows={items}
        rowKey={(product) => product.id}
        isLoading={listQuery.isPending}
        errorMessage={
          listQuery.isError
            ? listQuery.error instanceof ApiError
              ? listQuery.error.message
              : 'Ürünler yüklenemedi.'
            : undefined
        }
        searchValue={search}
        onSearchChange={(value) => {
          setSearch(value);
          setPage(1);
        }}
        searchPlaceholder="Ürün adı, açıklama veya içerikte ara..."
        sortBy={sortBy}
        sortOrder={sortOrder}
        onSortChange={(field, order) => {
          setSortBy(field);
          setSortOrder(order);
        }}
        page={meta?.page ?? 1}
        totalPages={meta?.totalPages ?? 0}
        total={meta?.total ?? 0}
        limit={meta?.limit ?? PAGE_SIZE}
        onPageChange={setPage}
        itemLabel="ürün"
        emptyTitle="Ürün bulunamadı"
        emptyDescription="Yeni ürün ekleyerek başlayın veya filtreleri değiştirin."
        filters={
          <>
            <div className="w-full sm:w-52">
              <Select
                value={categoryId}
                onChange={(event) => {
                  setCategoryId(event.target.value);
                  setPage(1);
                }}
                aria-label="Kategoriye göre filtrele"
              >
                <option value="">Tüm kategoriler</option>
                {flattenTree(filtersQuery.data?.tree ?? []).map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </div>

            <div className="w-full sm:w-44">
              <Select
                value={brandId}
                onChange={(event) => {
                  setBrandId(event.target.value);
                  setPage(1);
                }}
                aria-label="Markaya göre filtrele"
              >
                <option value="">Tüm markalar</option>
                {(filtersQuery.data?.brands ?? []).map((brand) => (
                  <option key={brand.id} value={brand.id}>
                    {brand.name}
                  </option>
                ))}
              </Select>
            </div>

            <div className="w-full sm:w-40">
              <Select
                value={publishFilter}
                onChange={(event) => {
                  setPublishFilter(event.target.value as PublishFilter);
                  setPage(1);
                }}
                aria-label="Yayın durumu"
              >
                <option value="all">Tüm durumlar</option>
                <option value="published">Yayında</option>
                <option value="draft">Yayında değil</option>
              </Select>
            </div>

            <label className="flex shrink-0 items-center gap-2 text-sm text-on-surface-variant">
              <input
                type="checkbox"
                checked={lowStockOnly}
                onChange={(event) => {
                  setLowStockOnly(event.target.checked);
                  setPage(1);
                }}
                className="size-4 accent-[color:var(--primary-container)]"
              />
              Kritik stok
            </label>
          </>
        }
      />

      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(next) => {
          if (!next) {
            setDeleting(null);
            setDeleteError(null);
          }
        }}
        title="Ürün silinsin mi?"
        description={`"${deleting?.name ?? ''}" ürünü ve varyasyonları pasife alınacak. Kayıt veritabanında saklanır; geçmiş satışlar bozulmaz.`}
        onConfirm={() => {
          if (deleting !== null) {
            setDeleteError(null);
            deleteMutation.mutate(deleting.id);
          }
        }}
        errorMessage={deleteError}
        isPending={deleteMutation.isPending}
        confirmLabel="Evet, sil"
      />
    </div>
  );
}

/** Kategori ağacını girintili düz listeye çevirir. */
function flattenTree(nodes: CategoryTreeNode[], prefix = ''): { id: string; label: string }[] {
  return nodes.flatMap((node) => [
    { id: node.id, label: `${prefix}${node.name}` },
    ...flattenTree(node.children, `${prefix}— `),
  ]);
}

function formatMoney(value: number): string {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    maximumFractionDigits: 0,
  }).format(value);
}
