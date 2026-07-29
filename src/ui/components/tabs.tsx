'use client';

import * as React from 'react';

import { cn } from '../lib/utils';

export interface TabItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  /** Sekmede doldurulmamış zorunlu alan varsa gösterilen uyarı işareti. */
  hasError?: boolean;
  /** Sekmedeki öğe sayısı (ör. "Görseller 4"). */
  badge?: number;
  /** Ürün kaydedilmeden erişilemeyen sekmeler için. */
  disabled?: boolean;
  disabledHint?: string;
}

export interface TabsProps {
  items: TabItem[];
  activeId: string;
  onChange: (id: string) => void;
  className?: string;
}

/**
 * Yatay sekme çubuğu.
 *
 * Erişilebilirlik: `role="tablist"` ve ok tuşlarıyla gezinme desteklenir.
 * Dar ekranda çubuk yatay kayar; sekmeler alt alta düşüp yer kaplamaz.
 */
export function Tabs({ items, activeId, onChange, className }: TabsProps) {
  const refs = React.useRef<(HTMLButtonElement | null)[]>([]);

  const handleKeyDown = (event: React.KeyboardEvent, index: number): void => {
    const enabled = items.map((item, i) => (item.disabled === true ? -1 : i)).filter((i) => i >= 0);
    const position = enabled.indexOf(index);

    if (position === -1) {
      return;
    }

    let nextIndex: number | undefined;

    if (event.key === 'ArrowRight') {
      nextIndex = enabled[(position + 1) % enabled.length];
    } else if (event.key === 'ArrowLeft') {
      nextIndex = enabled[(position - 1 + enabled.length) % enabled.length];
    } else if (event.key === 'Home') {
      nextIndex = enabled[0];
    } else if (event.key === 'End') {
      nextIndex = enabled[enabled.length - 1];
    }

    if (nextIndex !== undefined) {
      event.preventDefault();
      const target = items[nextIndex];

      if (target !== undefined) {
        onChange(target.id);
        refs.current[nextIndex]?.focus();
      }
    }
  };

  return (
    <div
      role="tablist"
      className={cn('flex gap-1 overflow-x-auto border-b border-outline-variant pb-px', className)}
    >
      {items.map((item, index) => {
        const isActive = item.id === activeId;
        const isDisabled = item.disabled === true;

        return (
          <button
            key={item.id}
            ref={(element) => {
              refs.current[index] = element;
            }}
            type="button"
            role="tab"
            aria-selected={isActive}
            aria-controls={`panel-${item.id}`}
            tabIndex={isActive ? 0 : -1}
            disabled={isDisabled}
            title={isDisabled ? item.disabledHint : undefined}
            onClick={() => onChange(item.id)}
            onKeyDown={(event) => handleKeyDown(event, index)}
            className={cn(
              'relative flex shrink-0 items-center gap-2 whitespace-nowrap rounded-t-[8px] px-4 py-3',
              'text-label-md transition-colors',
              '[&_svg]:size-4',
              isDisabled && 'cursor-not-allowed opacity-40',
              !isDisabled && isActive
                ? 'border-b-2 border-primary-container text-primary-container'
                : 'border-b-2 border-transparent text-on-surface-variant hover:text-on-surface',
            )}
          >
            {item.icon}
            {item.label}

            {item.badge !== undefined && item.badge > 0 ? (
              <span className="rounded-full bg-surface-container-high px-1.5 font-financial text-[11px] text-on-surface-variant">
                {item.badge}
              </span>
            ) : null}

            {item.hasError === true ? (
              <span
                className="size-1.5 rounded-full bg-error"
                aria-label="Bu sekmede eksik alan var"
              />
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

/** Sekme içeriği kabı. */
export function TabPanel({
  id,
  activeId,
  children,
  className,
}: {
  id: string;
  activeId: string;
  children: React.ReactNode;
  className?: string;
}) {
  if (id !== activeId) {
    return null;
  }

  return (
    <div id={`panel-${id}`} role="tabpanel" className={cn('pt-6', className)}>
      {children}
    </div>
  );
}
