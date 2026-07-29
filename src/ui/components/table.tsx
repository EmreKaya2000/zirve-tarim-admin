import * as React from 'react';

import { cn } from '../lib/utils';

/**
 * Veri tablosu — tasarım kuralı:
 * "Alternating row colors are not used; instead, use 1px horizontal dividers
 * for a cleaner, modern look." Başlıklar label-sm ve soluk metin.
 *
 * Dar ekranlarda tablo kendi içinde yatay kayar; sayfa gövdesi kaymaz.
 */
const Table = React.forwardRef<HTMLTableElement, React.HTMLAttributes<HTMLTableElement>>(
  ({ className, ...props }, ref) => (
    <div className="w-full overflow-x-auto">
      <table
        ref={ref}
        className={cn('w-full caption-bottom border-collapse', className)}
        {...props}
      />
    </div>
  ),
);
Table.displayName = 'Table';

const TableHeader = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <thead ref={ref} className={cn('border-b border-outline-variant', className)} {...props} />
));
TableHeader.displayName = 'TableHeader';

const TableBody = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => <tbody ref={ref} className={cn('', className)} {...props} />);
TableBody.displayName = 'TableBody';

const TableRow = React.forwardRef<
  HTMLTableRowElement,
  React.HTMLAttributes<HTMLTableRowElement> & { interactive?: boolean }
>(({ className, interactive = false, ...props }, ref) => (
  <tr
    ref={ref}
    className={cn(
      'border-b border-outline-variant last:border-0',
      interactive && 'cursor-pointer transition-colors hover:bg-surface-container-low',
      className,
    )}
    {...props}
  />
));
TableRow.displayName = 'TableRow';

const TableHead = React.forwardRef<
  HTMLTableCellElement,
  React.ThHTMLAttributes<HTMLTableCellElement>
>(({ className, ...props }, ref) => (
  <th
    ref={ref}
    className={cn(
      'px-4 py-3 text-left text-label-sm uppercase text-on-surface-variant',
      'first:pl-6 last:pr-6',
      className,
    )}
    {...props}
  />
));
TableHead.displayName = 'TableHead';

const TableCell = React.forwardRef<
  HTMLTableCellElement,
  React.TdHTMLAttributes<HTMLTableCellElement>
>(({ className, ...props }, ref) => (
  <td
    ref={ref}
    className={cn('px-4 py-4 text-sm text-on-surface first:pl-6 last:pr-6', className)}
    {...props}
  />
));
TableCell.displayName = 'TableCell';

/** Tablo boşken gösterilen durum. */
function TableEmpty({
  colSpan,
  icon,
  title,
  description,
}: {
  colSpan: number;
  icon?: React.ReactNode;
  title: string;
  description?: string;
}) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-6 py-16">
        <div className="flex flex-col items-center gap-2 text-center">
          {icon !== undefined ? (
            <div className="mb-1 text-outline [&_svg]:size-8" aria-hidden="true">
              {icon}
            </div>
          ) : null}
          <p className="text-label-md text-on-surface">{title}</p>
          {description !== undefined ? (
            <p className="max-w-sm text-sm text-on-surface-variant">{description}</p>
          ) : null}
        </div>
      </td>
    </tr>
  );
}

export { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, TableEmpty };
