'use client';

import * as React from 'react';
import { Check, Search } from 'lucide-react';

import { cn } from '../lib/utils';
import { Input } from './input';

export interface CheckboxOption {
  id: string;
  label: string;
  /** İkincil bilgi. Örn. bitkinin latince adı. */
  hint?: string;
}

export interface CheckboxGroupProps {
  options: CheckboxOption[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  /** 8'den fazla seçenek varsa arama kutusu gösterilir. */
  searchable?: boolean;
  searchPlaceholder?: string;
  emptyText?: string;
  className?: string;
  /** Liste yüksekliği; aşınca kendi içinde kayar. */
  maxHeightClass?: string;
}

/**
 * Çoklu seçim listesi.
 *
 * Ürün formunda bitki, toprak türü, yarar ve dönem seçimlerinde kullanılır.
 * Uzun listelerde (9 bitki, 6 yan etki...) arama kutusu, seçili öğeleri
 * bulmayı kolaylaştırır.
 */
export function CheckboxGroup({
  options,
  selectedIds,
  onChange,
  searchable,
  searchPlaceholder = 'Ara...',
  emptyText = 'Seçenek bulunamadı.',
  className,
  maxHeightClass = 'max-h-64',
}: CheckboxGroupProps) {
  const [query, setQuery] = React.useState('');

  const showSearch = searchable ?? options.length > 8;

  const filtered = React.useMemo(() => {
    const term = query.trim().toLocaleLowerCase('tr-TR');

    if (term === '') {
      return options;
    }

    return options.filter(
      (option) =>
        option.label.toLocaleLowerCase('tr-TR').includes(term) ||
        (option.hint ?? '').toLocaleLowerCase('tr-TR').includes(term),
    );
  }, [options, query]);

  const toggle = (id: string): void => {
    onChange(
      selectedIds.includes(id)
        ? selectedIds.filter((selected) => selected !== id)
        : [...selectedIds, id],
    );
  };

  return (
    <div className={cn('flex flex-col gap-3', className)}>
      {showSearch ? (
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={searchPlaceholder}
          startIcon={<Search />}
          aria-label={searchPlaceholder}
        />
      ) : null}

      <div
        className={cn(
          'flex flex-col gap-1 overflow-y-auto rounded-[8px] border border-outline-variant p-2',
          maxHeightClass,
        )}
      >
        {filtered.length === 0 ? (
          <p className="px-2 py-4 text-center text-sm text-on-surface-variant">{emptyText}</p>
        ) : (
          filtered.map((option) => {
            const isSelected = selectedIds.includes(option.id);

            return (
              <button
                key={option.id}
                type="button"
                onClick={() => toggle(option.id)}
                aria-pressed={isSelected}
                className={cn(
                  'flex items-center gap-3 rounded-[6px] px-2 py-2 text-left transition-colors',
                  isSelected ? 'bg-secondary-container' : 'hover:bg-surface-container-low',
                )}
              >
                <span
                  className={cn(
                    'flex size-4 shrink-0 items-center justify-center rounded-[4px] border',
                    isSelected
                      ? 'border-primary-container bg-primary-container text-on-primary'
                      : 'border-outline',
                  )}
                  aria-hidden="true"
                >
                  {isSelected ? <Check className="size-3" strokeWidth={3} /> : null}
                </span>

                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm text-on-surface">{option.label}</span>
                  {option.hint !== undefined ? (
                    <span className="block truncate text-xs text-outline">{option.hint}</span>
                  ) : null}
                </span>
              </button>
            );
          })
        )}
      </div>

      {selectedIds.length > 0 ? (
        <p className="text-xs text-on-surface-variant">
          <span className="font-financial">{selectedIds.length}</span> seçili
        </p>
      ) : null}
    </div>
  );
}
