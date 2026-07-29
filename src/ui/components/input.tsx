'use client';

import * as React from 'react';

import { cn } from '../lib/utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  /** Sol tarafta gösterilecek ikon (ör. arama). */
  startIcon?: React.ReactNode;
  /** Sağ tarafta gösterilecek öğe (ör. şifre göster/gizle butonu). */
  endAdornment?: React.ReactNode;
  /** Hata durumu: kenarlık ve odak halkası kırmızıya döner. */
  invalid?: boolean;
}

/**
 * Metin girişi — tasarımın "Form Inputs" kuralı:
 * 1px `outline-variant` kenarlık, odakta `primary-container` kenarlık
 * + 2px dış yeşil parlama.
 */
const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = 'text', startIcon, endAdornment, invalid = false, ...props }, ref) => {
    const hasStart = startIcon !== undefined && startIcon !== null;
    const hasEnd = endAdornment !== undefined && endAdornment !== null;

    return (
      <div className="relative w-full">
        {hasStart ? (
          <span
            className="pointer-events-none absolute left-4 top-1/2 flex -translate-y-1/2 items-center text-outline [&_svg]:size-[18px]"
            aria-hidden="true"
          >
            {startIcon}
          </span>
        ) : null}

        <input
          type={type}
          ref={ref}
          aria-invalid={invalid || undefined}
          className={cn(
            'h-11 w-full rounded-[8px] border bg-surface-container-lowest text-on-surface',
            'px-4 text-[15px] leading-none outline-none transition-all duration-150',
            'placeholder:text-outline',
            'disabled:cursor-not-allowed disabled:bg-surface-container disabled:opacity-60',
            hasStart && 'pl-11',
            hasEnd && 'pr-11',
            invalid
              ? 'border-error focus:border-error focus:ring-2 focus:ring-error-container'
              : 'border-outline-variant focus:border-primary-container focus:ring-2 focus:ring-secondary-container',
            className,
          )}
          {...props}
        />

        {hasEnd ? (
          <span className="absolute right-3 top-1/2 flex -translate-y-1/2 items-center text-outline">
            {endAdornment}
          </span>
        ) : null}
      </div>
    );
  },
);
Input.displayName = 'Input';

export { Input };
