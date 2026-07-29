import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '../lib/utils';

const iconBoxVariants = cva(
  'flex size-10 shrink-0 items-center justify-center rounded-[8px] [&_svg]:size-5',
  {
    variants: {
      tone: {
        neutral: 'bg-surface-container-high text-on-surface-variant',
        primary: 'bg-secondary-container text-on-primary-fixed-variant',
        success: 'bg-success-container text-on-success-container',
        warning: 'bg-warning-container text-on-warning-container',
        error: 'bg-error-container text-on-error-container',
      },
    },
    defaultVariants: { tone: 'neutral' },
  },
);

const valueVariants = cva('text-h2 font-financial', {
  variants: {
    tone: {
      neutral: 'text-on-surface',
      primary: 'text-primary-container',
      success: 'text-success',
      warning: 'text-on-warning-container',
      error: 'text-error',
    },
  },
  defaultVariants: { tone: 'neutral' },
});

export interface StatCardProps
  extends
    Omit<React.HTMLAttributes<HTMLDivElement>, 'title'>,
    VariantProps<typeof iconBoxVariants> {
  /** Üstteki küçük büyük harf etiket. Örn. "TOPLAM MÜŞTERİ" */
  label: string;
  /** Ana değer. Parasal ise zaten string gelir (ARCHITECTURE §13.6). */
  value: React.ReactNode;
  /** Sağ üstteki ikon. */
  icon?: React.ReactNode;
  /** Alt satırdaki bağlam bilgisi. Örn. "84 hesapta" */
  footnote?: React.ReactNode;
}

/**
 * Finans özet kartı — tasarımın "Finance Summary Card" bileşeni.
 * İki sütunlu iç düzen: solda etiket + değer, sağda ikon rozeti.
 *
 * Değer `font-financial` ile gösterilir: rakamlar tabular-nums olduğu için
 * kartlar yan yana dizildiğinde basamaklar hizalanır.
 */
const StatCard = React.forwardRef<HTMLDivElement, StatCardProps>(
  ({ className, label, value, icon, footnote, tone, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'rounded-[12px] border border-outline-variant bg-surface-container-lowest p-6',
        className,
      )}
      {...props}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p className="text-label-sm uppercase text-on-surface-variant">{label}</p>
          <p className={cn('mt-2 truncate', valueVariants({ tone }))}>{value}</p>
        </div>

        {icon !== undefined ? (
          <div className={iconBoxVariants({ tone })} aria-hidden="true">
            {icon}
          </div>
        ) : null}
      </div>

      {footnote !== undefined ? (
        <div className="mt-3 flex items-center gap-1.5 text-sm text-on-surface-variant [&_svg]:size-4">
          {footnote}
        </div>
      ) : null}
    </div>
  ),
);
StatCard.displayName = 'StatCard';

export { StatCard };
