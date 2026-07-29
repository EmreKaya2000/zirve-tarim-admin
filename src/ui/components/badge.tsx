import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '../lib/utils';

/**
 * Durum rozeti (Status Chip) — tasarım kuralı:
 * küçük BÜYÜK HARF label-sm metin, durum renginin açık tonunda zemin,
 * koyu tonunda metin. Butondan ayrışsın diye tam yuvarlak (pill).
 */
const badgeVariants = cva(
  'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-label-sm uppercase [&_svg]:size-3.5',
  {
    variants: {
      variant: {
        neutral: 'bg-surface-container-high text-on-surface-variant',
        success: 'bg-success-container text-on-success-container',
        warning: 'bg-warning-container text-on-warning-container',
        error: 'bg-error-container text-on-error-container',
        info: 'bg-info-container text-on-info-container',
        primary: 'bg-secondary-container text-on-primary-fixed-variant',
      },
    },
    defaultVariants: {
      variant: 'neutral',
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
