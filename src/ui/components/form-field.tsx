'use client';

import * as React from 'react';
import { AlertCircle } from 'lucide-react';

import { cn } from '../lib/utils';

/**
 * Form etiketi.
 * Tasarım kuralı: etiketler küçük boyutta yarı kalın (label-md) —
 * formlarda taranabilirliği artırır.
 */
const Label = React.forwardRef<
  HTMLLabelElement,
  React.LabelHTMLAttributes<HTMLLabelElement> & { required?: boolean }
>(({ className, children, required = false, ...props }, ref) => (
  <label ref={ref} className={cn('text-label-md text-on-surface', className)} {...props}>
    {children}
    {required ? (
      <span className="ml-1 text-error" aria-hidden="true">
        *
      </span>
    ) : null}
  </label>
));
Label.displayName = 'Label';

/** Alan altındaki yardımcı açıklama. */
const FieldHint = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p ref={ref} className={cn('text-xs text-on-surface-variant', className)} {...props} />
));
FieldHint.displayName = 'FieldHint';

/** Alan altındaki hata mesajı. Boşsa hiçbir şey render etmez. */
const FieldError = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement> & { message?: string }
>(({ className, message, children, ...props }, ref) => {
  const content = message ?? children;

  if (content === undefined || content === null || content === '') {
    return null;
  }

  return (
    <p
      ref={ref}
      role="alert"
      className={cn('flex items-center gap-1.5 text-xs text-error', className)}
      {...props}
    >
      <AlertCircle className="size-3.5 shrink-0" aria-hidden="true" />
      {content}
    </p>
  );
});
FieldError.displayName = 'FieldError';

/** Etiket + kontrol + hata/ipucu üçlüsünü tutarlı boşlukla sarar. */
const FormField = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('flex flex-col gap-2', className)} {...props} />
  ),
);
FormField.displayName = 'FormField';

export { FormField, Label, FieldHint, FieldError };
