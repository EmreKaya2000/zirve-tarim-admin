'use client';

import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { Loader2 } from 'lucide-react';

import { cn } from '../lib/utils';

/**
 * Buton varyantları — tasarım dokümanındaki "Components > Buttons" bölümü.
 *
 *   primary     : koyu yeşil zemin, beyaz metin. Otorite kuran ana eylem.
 *   secondary   : açık yeşil zemin, koyu yeşil metin. İkincil eylem.
 *   outline     : şeffaf zemin, ince kenarlık.
 *   ghost       : zeminsiz. "İptal" gibi düşük öncelikli eylemler.
 *   destructive : geri alınamaz işlemler (çoğunlukla SUPER_ADMIN eylemleri).
 *
 * Köşe yuvarlaklığı 8px — tasarımda buton ve inputlar için sabit.
 */
const buttonVariants = cva(
  [
    'inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-[8px]',
    'text-label-md transition-all duration-150',
    'disabled:pointer-events-none disabled:opacity-50',
    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-container',
    '[&_svg]:pointer-events-none [&_svg]:shrink-0',
  ].join(' '),
  {
    variants: {
      variant: {
        primary: 'bg-primary-container text-on-primary hover:bg-primary active:scale-[0.98]',
        secondary:
          'bg-secondary-container text-on-primary-fixed-variant hover:bg-primary-fixed active:scale-[0.98]',
        outline:
          'border border-outline-variant bg-transparent text-on-surface hover:bg-surface-container active:scale-[0.98]',
        ghost:
          'bg-transparent text-on-surface-variant hover:bg-surface-container hover:text-on-surface',
        destructive: 'bg-error text-on-error hover:bg-on-error-container active:scale-[0.98]',
        link: 'text-primary-container underline-offset-4 hover:underline',
      },
      size: {
        sm: 'h-9 px-4 text-label-sm [&_svg]:size-4',
        md: 'h-11 px-6 [&_svg]:size-[18px]',
        lg: 'h-12 px-8 text-[15px] [&_svg]:size-5',
        icon: 'h-11 w-11 [&_svg]:size-[18px]',
        'icon-sm': 'h-9 w-9 [&_svg]:size-4',
      },
      full: {
        true: 'w-full',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  /** true ise kendi DOM düğümünü oluşturmaz, çocuğuna stil uygular (Link sarmak için). */
  asChild?: boolean;
  /** Yüklenme durumu: spinner gösterir ve butonu devre dışı bırakır. */
  loading?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      full,
      asChild = false,
      loading = false,
      children,
      disabled,
      /*
       * VARSAYILAN `button`, HTML'in varsayılanı olan `submit` DEĞİL.
       *
       * BULUNAN HATA: bir `<form>` içindeki tipsiz `<button>` submit düğmesidir.
       * Ürün formunun sekmeleri form etiketinin İÇİNDE durduğu için
       * "Varyasyon Ekle", satır düzenleme ve satır silme düğmeleri diyaloğu
       * açmakla birlikte ÜRÜN FORMUNU DA gönderiyordu — yönetici yalnız
       * varyasyon eklemek isterken ürün sessizce kaydediliyordu.
       *
       * Kaynağında düzeltiliyor: gönderim ARTIK AÇIKÇA istenmelidir. Depodaki
       * tüm gönderim düğmeleri hâlihazırda `type="submit"` yazıyor, bu yüzden
       * varsayılanı çevirmek hiçbir formu bozmaz. `Tabs` bileşeni aynı tuzağı
       * kendi içinde zaten elle çözmüştü.
       *
       * `asChild` dalına YAZILMAZ: orada çocuk bir `<a>` olabilir ve `type`
       * bağlantıda geçersiz bir özniteliktir.
       */
      type = 'button',
      ...props
    },
    ref,
  ) => {
    // Slot tek bir çocuk bekler; bu modda spinner eklenmez.
    if (asChild) {
      return (
        <Slot
          className={cn(buttonVariants({ variant, size, full, className }))}
          ref={ref}
          {...props}
        >
          {children}
        </Slot>
      );
    }

    return (
      <button
        className={cn(buttonVariants({ variant, size, full, className }))}
        ref={ref}
        type={type}
        disabled={disabled === true || loading}
        {...props}
      >
        {loading ? <Loader2 className="animate-spin" aria-hidden="true" /> : null}
        {children}
      </button>
    );
  },
);
Button.displayName = 'Button';

export { Button, buttonVariants };
