import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '../lib/utils';

const avatarVariants = cva(
  'inline-flex shrink-0 items-center justify-center rounded-full font-semibold uppercase',
  {
    variants: {
      size: {
        sm: 'size-8 text-[11px]',
        md: 'size-10 text-xs',
        lg: 'size-12 text-sm',
      },
      tone: {
        primary: 'bg-primary-fixed text-on-primary-fixed',
        muted: 'bg-surface-container-high text-on-surface-variant',
        dark: 'bg-primary-container text-on-primary',
      },
    },
    defaultVariants: { size: 'md', tone: 'primary' },
  },
);

export interface AvatarProps
  extends React.HTMLAttributes<HTMLSpanElement>, VariantProps<typeof avatarVariants> {
  /** Baş harflerin türetileceği tam ad. */
  name: string;
}

/**
 * Baş harf avatarı.
 * Tasarımda müşteri/kullanıcı satırlarında fotoğraf yerine baş harf kullanılır.
 */
const Avatar = React.forwardRef<HTMLSpanElement, AvatarProps>(
  ({ className, name, size, tone, ...props }, ref) => (
    <span
      ref={ref}
      className={cn(avatarVariants({ size, tone }), className)}
      title={name}
      {...props}
    >
      {getInitials(name)}
    </span>
  ),
);
Avatar.displayName = 'Avatar';

/**
 * Ad soyaddan en fazla iki harf üretir.
 * Türkçe karakterlerde `toLocaleUpperCase('tr-TR')` şart: "i" -> "İ".
 */
export function getInitials(name: string): string {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter((part) => part.length > 0);

  if (parts.length === 0) {
    return '?';
  }

  const first = parts[0]?.charAt(0) ?? '';
  const last = parts.length > 1 ? (parts[parts.length - 1]?.charAt(0) ?? '') : '';

  return `${first}${last}`.toLocaleUpperCase('tr-TR');
}

export { Avatar, avatarVariants };
