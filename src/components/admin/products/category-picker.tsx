'use client';

import { Check, Star } from 'lucide-react';
import { Badge, cn } from '@zirve/ui';

import type { CategoryTreeNode } from '@/lib/catalog-api';

interface CategoryPickerProps {
  tree: CategoryTreeNode[];
  selectedIds: string[];
  primaryId: string;
  onChange: (selectedIds: string[], primaryId: string) => void;
}

/**
 * Hiyerarşik kategori seçici.
 *
 * Ana kategori seçimi ayrı bir alan DEĞİL, seçili kategorilerden birine
 * yıldız verilerek yapılır. Böylece "ana kategori seçilenler arasında
 * olmalı" kuralı arayüzde ihlal edilemez hâle gelir.
 */
export function CategoryPicker({ tree, selectedIds, primaryId, onChange }: CategoryPickerProps) {
  const toggle = (id: string): void => {
    const isSelected = selectedIds.includes(id);
    const nextSelected = isSelected
      ? selectedIds.filter((selected) => selected !== id)
      : [...selectedIds, id];

    let nextPrimary = primaryId;

    if (isSelected && primaryId === id) {
      // Ana kategori seçimden çıkarıldı: kalan ilk kategori ana olur.
      nextPrimary = nextSelected[0] ?? '';
    } else if (!isSelected && nextSelected.length === 1) {
      // İlk kategori otomatik ana kategori olur.
      nextPrimary = id;
    }

    onChange(nextSelected, nextPrimary);
  };

  const setPrimary = (id: string): void => {
    if (!selectedIds.includes(id)) {
      onChange([...selectedIds, id], id);

      return;
    }

    onChange(selectedIds, id);
  };

  const renderNodes = (nodes: CategoryTreeNode[]): React.ReactNode =>
    nodes.map((node) => {
      const isSelected = selectedIds.includes(node.id);
      const isPrimary = primaryId === node.id;

      return (
        <div key={node.id}>
          <div
            className="flex items-center gap-2 rounded-[6px] py-1.5 pr-1 transition-colors hover:bg-surface-container-low"
            style={{ paddingLeft: `${node.depth * 16 + 4}px` }}
          >
            <button
              type="button"
              onClick={() => toggle(node.id)}
              aria-pressed={isSelected}
              className="flex min-w-0 flex-1 items-center gap-2 text-left"
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

              <span className="truncate text-sm text-on-surface">{node.name}</span>

              {isPrimary ? <Badge variant="primary">Ana</Badge> : null}
            </button>

            {isSelected && !isPrimary ? (
              <button
                type="button"
                onClick={() => setPrimary(node.id)}
                title="Ana kategori yap"
                className="shrink-0 rounded p-1 text-outline transition-colors hover:bg-surface-container hover:text-on-surface"
              >
                <Star className="size-3.5" />
                <span className="sr-only">Ana kategori yap</span>
              </button>
            ) : null}
          </div>

          {node.children.length > 0 ? renderNodes(node.children) : null}
        </div>
      );
    });

  return (
    <div className="max-h-96 overflow-y-auto rounded-[8px] border border-outline-variant p-2">
      {tree.length === 0 ? (
        <p className="px-2 py-6 text-center text-sm text-on-surface-variant">
          Henüz kategori tanımlanmamış.
        </p>
      ) : (
        renderNodes(tree)
      )}
    </div>
  );
}
