'use client';

import * as React from 'react';
import { ArrowDown, ArrowUp, ArrowUpDown, Inbox, Search } from 'lucide-react';

import { cn } from '../lib/utils';
import { Card } from './card';
import { Input } from './input';
import { Pagination } from './pagination';
import { Table, TableBody, TableCell, TableEmpty, TableHead, TableHeader, TableRow } from './table';
import { TableSkeleton } from './skeleton';

export type SortDirection = 'asc' | 'desc';

/** Bir tablo sütununun tanımı. */
export interface DataTableColumn<TRow> {
  /** React anahtarı ve sıralama alanı olarak kullanılır. */
  key: string;
  header: React.ReactNode;
  /** Hücre içeriğini üretir. */
  cell: (row: TRow) => React.ReactNode;
  /** true ise başlığa tıklanarak sıralanabilir. */
  sortable?: boolean;
  /** Sıralamada sunucuya gönderilecek alan adı. Verilmezse `key` kullanılır. */
  sortField?: string;
  className?: string;
  headerClassName?: string;
}

export interface DataTableProps<TRow> {
  columns: DataTableColumn<TRow>[];
  rows: TRow[];
  /** Satır anahtarı üretir. */
  rowKey: (row: TRow) => string;

  isLoading?: boolean;
  /** Hata mesajı; verilirse tablo yerine gösterilir. */
  errorMessage?: string;

  // --- Arama ---
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;

  // --- Sıralama ---
  sortBy?: string;
  sortOrder?: SortDirection;
  onSortChange?: (field: string, order: SortDirection) => void;

  // --- Sayfalama ---
  page?: number;
  totalPages?: number;
  total?: number;
  limit?: number;
  onPageChange?: (page: number) => void;
  itemLabel?: string;

  // --- Boş durum ---
  emptyTitle?: string;
  emptyDescription?: string;

  /** Arama çubuğunun sağındaki ek filtreler. */
  filters?: React.ReactNode;
  /** Başlık çubuğunun sağındaki eylemler. */
  toolbarActions?: React.ReactNode;
}

/**
 * Yeniden kullanılabilir veri tablosu.
 *
 * Sprint 3'ten itibaren TÜM admin listeleri bunu kullanır. Arama, sıralama
 * ve sayfalama durumunu KENDİSİ TUTMAZ — dışarıdan alır. Böylece durum
 * URL'de veya sorgu anahtarında yaşayabilir ve sayfa yenilendiğinde kaybolmaz.
 *
 * Tasarım kuralı: ayraçlı satırlar (zebra yok), başlıklar `label-sm` ve
 * soluk renkte (docs/DESIGN-SYSTEM.md §6).
 */
export function DataTable<TRow>({
  columns,
  rows,
  rowKey,
  isLoading = false,
  errorMessage,
  searchValue,
  onSearchChange,
  searchPlaceholder = 'Ara...',
  sortBy,
  sortOrder = 'asc',
  onSortChange,
  page,
  totalPages,
  total,
  limit,
  onPageChange,
  itemLabel = 'kayıt',
  emptyTitle = 'Kayıt bulunamadı',
  emptyDescription,
  filters,
  toolbarActions,
}: DataTableProps<TRow>) {
  const showToolbar =
    onSearchChange !== undefined || filters !== undefined || toolbarActions !== undefined;
  const showPagination =
    onPageChange !== undefined &&
    page !== undefined &&
    totalPages !== undefined &&
    total !== undefined &&
    limit !== undefined;

  const handleSort = (column: DataTableColumn<TRow>): void => {
    if (column.sortable !== true || onSortChange === undefined) {
      return;
    }

    const field = column.sortField ?? column.key;
    // Aynı sütuna tekrar tıklanınca yön değişir; yeni sütunda artan başlar.
    const nextOrder: SortDirection = sortBy === field && sortOrder === 'asc' ? 'desc' : 'asc';

    onSortChange(field, nextOrder);
  };

  return (
    <div className="flex flex-col gap-4">
      {showToolbar ? (
        <Card className="p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            {onSearchChange !== undefined ? (
              <Input
                placeholder={searchPlaceholder}
                startIcon={<Search />}
                value={searchValue ?? ''}
                onChange={(event) => onSearchChange(event.target.value)}
                aria-label={searchPlaceholder}
              />
            ) : null}

            {filters !== undefined ? (
              <div className="flex flex-wrap items-center gap-3">{filters}</div>
            ) : null}

            {toolbarActions !== undefined ? (
              <div className="flex items-center gap-2 lg:ml-auto">{toolbarActions}</div>
            ) : null}
          </div>
        </Card>
      ) : null}

      <Card className="overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((column) => {
                const field = column.sortField ?? column.key;
                const isSorted = sortBy === field;

                return (
                  <TableHead key={column.key} className={column.headerClassName}>
                    {column.sortable === true && onSortChange !== undefined ? (
                      <button
                        type="button"
                        onClick={() => handleSort(column)}
                        className={cn(
                          'inline-flex items-center gap-1.5 uppercase transition-colors hover:text-on-surface',
                          isSorted && 'text-on-surface',
                        )}
                        aria-label={`${String(column.header)} sütununa göre sırala`}
                      >
                        {column.header}
                        {isSorted ? (
                          sortOrder === 'asc' ? (
                            <ArrowUp className="size-3.5" aria-hidden="true" />
                          ) : (
                            <ArrowDown className="size-3.5" aria-hidden="true" />
                          )
                        ) : (
                          <ArrowUpDown className="size-3.5 opacity-40" aria-hidden="true" />
                        )}
                      </button>
                    ) : (
                      column.header
                    )}
                  </TableHead>
                );
              })}
            </TableRow>
          </TableHeader>

          <TableBody>
            {isLoading ? (
              <TableSkeleton rows={5} columns={columns.length} />
            ) : errorMessage !== undefined ? (
              <TableEmpty
                colSpan={columns.length}
                title="Liste yüklenemedi"
                description={errorMessage}
              />
            ) : rows.length === 0 ? (
              <TableEmpty
                colSpan={columns.length}
                icon={<Inbox />}
                title={emptyTitle}
                description={emptyDescription}
              />
            ) : (
              rows.map((row) => (
                <TableRow key={rowKey(row)}>
                  {columns.map((column) => (
                    <TableCell key={column.key} className={column.className}>
                      {column.cell(row)}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        {showPagination ? (
          <Pagination
            page={page}
            totalPages={totalPages}
            total={total}
            limit={limit}
            onPageChange={onPageChange}
            itemLabel={itemLabel}
          />
        ) : null}
      </Card>
    </div>
  );
}
