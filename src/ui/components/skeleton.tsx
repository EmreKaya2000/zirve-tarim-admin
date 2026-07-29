import * as React from 'react';

import { cn } from '../lib/utils';

/** Yükleniyor yer tutucusu. */
function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('animate-pulse rounded-[8px] bg-surface-container-high', className)}
      aria-hidden="true"
      {...props}
    />
  );
}

/** Tablo yüklenirken gösterilen satır iskeleti. */
function TableSkeleton({ rows = 5, columns }: { rows?: number; columns: number }) {
  return (
    <>
      {Array.from({ length: rows }, (_, rowIndex) => (
        <tr key={rowIndex} className="border-b border-outline-variant last:border-0">
          {Array.from({ length: columns }, (_, colIndex) => (
            <td key={colIndex} className="px-4 py-4 first:pl-6 last:pr-6">
              <Skeleton className="h-4 w-full max-w-[160px]" />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

export { Skeleton, TableSkeleton };
