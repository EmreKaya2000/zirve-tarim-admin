'use client';

import * as React from 'react';
import { ChevronDown } from 'lucide-react';

import { cn } from '../lib/utils';

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  invalid?: boolean;
}

/**
 * Açılır liste.
 *
 * Yerel `<select>` kullanılır: mobilde işletim sisteminin kendi seçicisini
 * açar (çiftçi kullanıcılar için tanıdık ve erişilebilir), ayrıca form
 * kütüphaneleriyle ekstra köprü gerektirmez.
 */
const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, invalid = false, children, ...props }, ref) => (
    <div className="relative w-full">
      <select
        ref={ref}
        aria-invalid={invalid || undefined}
        className={cn(
          'h-11 w-full appearance-none rounded-[8px] border bg-surface-container-lowest',
          'px-4 pr-10 text-[15px] text-on-surface outline-none transition-all duration-150',
          'disabled:cursor-not-allowed disabled:bg-surface-container disabled:opacity-60',
          invalid
            ? 'border-error focus:border-error focus:ring-2 focus:ring-error-container'
            : 'border-outline-variant focus:border-primary-container focus:ring-2 focus:ring-secondary-container',
          className,
        )}
        {...props}
      >
        {children}
      </select>

      <ChevronDown
        className="pointer-events-none absolute right-3 top-1/2 size-[18px] -translate-y-1/2 text-outline"
        aria-hidden="true"
      />
    </div>
  ),
);
Select.displayName = 'Select';

export { Select };
