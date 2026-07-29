'use client';

import * as React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

import { cn } from '../lib/utils';

/** Sayfa listesinde kırpma işareti. */
const ELLIPSIS = '…' as const;

export interface PaginationProps {
  page: number;
  totalPages: number;
  total: number;
  limit: number;
  onPageChange: (page: number) => void;
  /** Sayılan kaydın adı. Örn. "kullanıcı" -> "1-20 / 137 kullanıcı" */
  itemLabel?: string;
  className?: string;
}

/**
 * Sayfalama — tasarımdaki tablo altı düzeni:
 * solda "x-y / z kayıt", sağda sayfa numaraları.
 */
function Pagination({
  page,
  totalPages,
  total,
  limit,
  onPageChange,
  itemLabel = 'kayıt',
  className,
}: PaginationProps) {
  if (total === 0) {
    return null;
  }

  const from = (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);
  const pages = buildPageList(page, totalPages);

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-between gap-4 border-t border-outline-variant px-6 py-4 sm:flex-row',
        className,
      )}
    >
      <p className="text-sm text-on-surface-variant">
        <span className="font-financial">
          {from}-{to}
        </span>{' '}
        / <span className="font-financial">{total}</span> {itemLabel}
      </p>

      <nav className="flex items-center gap-1" aria-label="Sayfalama">
        <PageButton
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          aria-label="Önceki sayfa"
        >
          <ChevronLeft className="size-4" />
        </PageButton>

        {pages.map((item, index) =>
          item === ELLIPSIS ? (
            <span
              key={`ellipsis-${index}`}
              className="px-2 text-sm text-outline"
              aria-hidden="true"
            >
              {ELLIPSIS}
            </span>
          ) : (
            <PageButton
              key={item}
              active={item === page}
              onClick={() => onPageChange(item)}
              aria-label={`Sayfa ${item}`}
              aria-current={item === page ? 'page' : undefined}
            >
              {item}
            </PageButton>
          ),
        )}

        <PageButton
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          aria-label="Sonraki sayfa"
        >
          <ChevronRight className="size-4" />
        </PageButton>
      </nav>
    </div>
  );
}

function PageButton({
  active = false,
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean }) {
  return (
    <button
      type="button"
      className={cn(
        'inline-flex size-9 items-center justify-center rounded-[8px] text-sm transition-colors',
        'disabled:pointer-events-none disabled:opacity-40',
        active
          ? 'bg-primary-container font-semibold text-on-primary'
          : 'text-on-surface-variant hover:bg-surface-container',
        className,
      )}
      {...props}
    />
  );
}

/**
 * Görüntülenecek sayfa numaralarını üretir.
 * Uzun listelerde baş, son ve aktif sayfanın çevresi gösterilir:
 * 1 … 6 [7] 8 … 312
 */
function buildPageList(page: number, totalPages: number): (number | typeof ELLIPSIS)[] {
  const MAX_VISIBLE = 7;

  if (totalPages <= MAX_VISIBLE) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const result: (number | typeof ELLIPSIS)[] = [1];
  const start = Math.max(2, page - 1);
  const end = Math.min(totalPages - 1, page + 1);

  if (start > 2) {
    result.push(ELLIPSIS);
  }

  for (let current = start; current <= end; current += 1) {
    result.push(current);
  }

  if (end < totalPages - 1) {
    result.push(ELLIPSIS);
  }

  result.push(totalPages);

  return result;
}

export { Pagination };
