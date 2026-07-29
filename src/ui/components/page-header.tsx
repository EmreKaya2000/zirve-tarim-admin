import * as React from 'react';

import { cn } from '../lib/utils';

export interface PageHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  description?: string;
  /** Sağ üstteki eylem butonları. */
  actions?: React.ReactNode;
}

/**
 * Sayfa başlığı — tasarımdaki admin sayfa üst bandı:
 * solda h1 + açıklama, sağda eylem butonları.
 * Dar ekranda eylemler alta iner ve tam genişliğe yayılır.
 */
const PageHeader = React.forwardRef<HTMLDivElement, PageHeaderProps>(
  ({ className, title, description, actions, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between', className)}
      {...props}
    >
      <div className="min-w-0">
        <h1 className="text-h1 text-on-surface">{title}</h1>
        {description !== undefined ? (
          <p className="mt-1 text-body-lg text-on-surface-variant">{description}</p>
        ) : null}
      </div>

      {actions !== undefined ? (
        <div className="flex shrink-0 flex-wrap items-center gap-3">{actions}</div>
      ) : null}
    </div>
  ),
);
PageHeader.displayName = 'PageHeader';

export { PageHeader };
