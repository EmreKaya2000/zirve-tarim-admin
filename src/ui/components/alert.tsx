import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { AlertTriangle, CheckCircle2, Info, XCircle } from 'lucide-react';

import { cn } from '../lib/utils';

const alertVariants = cva('flex gap-3 rounded-[12px] border p-4 text-sm', {
  variants: {
    variant: {
      info: 'border-info/20 bg-info-container text-on-info-container',
      success: 'border-success/20 bg-success-container text-on-success-container',
      warning: 'border-warning/20 bg-warning-container text-on-warning-container',
      error: 'border-error/20 bg-error-container text-on-error-container',
    },
  },
  defaultVariants: { variant: 'info' },
});

const DEFAULT_ICONS = {
  info: Info,
  success: CheckCircle2,
  warning: AlertTriangle,
  error: XCircle,
} as const;

export interface AlertProps
  extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof alertVariants> {
  title?: string;
  /** İkonu gizlemek için false verin. */
  showIcon?: boolean;
}

/**
 * Uyarı kutusu. Hata mesajları için `role="alert"` taşır; ekran okuyucular
 * içeriği anında duyurur (giriş hatası gibi durumlarda önemlidir).
 */
const Alert = React.forwardRef<HTMLDivElement, AlertProps>(
  ({ className, variant = 'info', title, showIcon = true, children, ...props }, ref) => {
    const resolved = variant ?? 'info';
    const Icon = DEFAULT_ICONS[resolved];

    return (
      <div
        ref={ref}
        role={resolved === 'error' ? 'alert' : 'status'}
        className={cn(alertVariants({ variant: resolved }), className)}
        {...props}
      >
        {showIcon ? <Icon className="mt-0.5 size-[18px] shrink-0" aria-hidden="true" /> : null}
        <div className="min-w-0 flex-1">
          {title !== undefined ? <p className="text-label-md">{title}</p> : null}
          {children !== undefined && children !== null ? (
            <div className={cn(title !== undefined && 'mt-1')}>{children}</div>
          ) : null}
        </div>
      </div>
    );
  },
);
Alert.displayName = 'Alert';

export { Alert, alertVariants };
