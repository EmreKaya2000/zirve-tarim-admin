'use client';

import { useState } from 'react';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, Link2, Plus, Search, Trash2 } from 'lucide-react';
import {
  Alert,
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  FieldError,
  FieldHint,
  FormDialog,
  FormField,
  Input,
  Label,
  Select,
  cn,
} from '@zirve/ui';
import {
  DIRECTIONAL_RELATION_TYPES,
  PRODUCT_RELATION_LABELS,
  SYMMETRIC_RELATION_TYPES,
  isSymmetricRelation,
  type ProductRelationType,
} from '@zirve/types';

import { ApiError } from '@/lib/api-error';
import { productsApi } from '@/lib/products-api';

interface RelationsTabProps {
  productId: string;
}

/** İlişki türünün rozet rengi. Uyumsuzluk kırmızı olmalı. */
function relationVariant(type: ProductRelationType): 'error' | 'success' | 'primary' | 'neutral' {
  if (type === 'INCOMPATIBLE') {
    return 'error';
  }

  if (type === 'COMPATIBLE') {
    return 'success';
  }

  if (type === 'SIMILAR') {
    return 'neutral';
  }

  return 'primary';
}

/**
 * 6. Sekme — İlişkili ürünler.
 *
 * Simetrik/yönlü ayrımı kullanıcıya AÇIKÇA gösterilir: yöneticinin
 * "uyumsuzluk iki tarafta da görünür mü?" diye tahmin yürütmesi gerekmez.
 */
export function RelationsTab({ productId }: RelationsTabProps) {
  const queryClient = useQueryClient();

  const [isOpen, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [targetId, setTargetId] = useState('');
  const [type, setType] = useState<ProductRelationType>('SIMILAR');
  const [note, setNote] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const relationsQuery = useQuery({
    queryKey: ['product-relations', productId],
    queryFn: () => productsApi.listRelations(productId),
  });

  // Ürün arama — ilişkilendirilecek hedefi bulmak için.
  const searchQuery = useQuery({
    queryKey: ['product-search', search],
    queryFn: () => productsApi.list({ search, limit: 10 }),
    enabled: isOpen && search.trim().length >= 2,
    placeholderData: keepPreviousData,
  });

  const invalidate = async (): Promise<void> => {
    await queryClient.invalidateQueries({ queryKey: ['product-relations', productId] });
  };

  const createMutation = useMutation({
    mutationFn: () =>
      productsApi.createRelation(productId, {
        targetProductId: targetId,
        type,
        note: note.trim() === '' ? undefined : note.trim(),
      }),
    onSuccess: async () => {
      await invalidate();
      close();
    },
    onError: (error: unknown) => {
      setFormError(error instanceof ApiError ? error.message : 'İlişki eklenemedi.');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (relationId: string) => productsApi.removeRelation(productId, relationId),
    onSuccess: async () => {
      setDeleteError(null);
      await invalidate();
    },
    onError: (error: unknown) => {
      setDeleteError(error instanceof ApiError ? error.message : 'İlişki kaldırılamadı.');
    },
  });

  function close(): void {
    setOpen(false);
    setSearch('');
    setTargetId('');
    setType('SIMILAR');
    setNote('');
    setFormError(null);
  }

  const requiresNote = type === 'INCOMPATIBLE';
  const canSubmit = targetId !== '' && (!requiresNote || note.trim().length > 0);

  const relations = relationsQuery.data ?? [];

  return (
    <div className="flex flex-col gap-6">
      {deleteError !== null ? <Alert variant="error">{deleteError}</Alert> : null}

      <Alert variant="info" title="İlişki türleri iki grupta çalışır">
        <ul className="mt-1 flex flex-col gap-1 text-sm">
          <li>
            <strong>Simetrik</strong> (
            {SYMMETRIC_RELATION_TYPES.map((t) => PRODUCT_RELATION_LABELS[t]).join(', ')}): tek kayıt
            tutulur, <strong>her iki ürünün</strong> sayfasında görünür.
          </li>
          <li>
            <strong>Yönlü</strong> (
            {DIRECTIONAL_RELATION_TYPES.map((t) => PRODUCT_RELATION_LABELS[t]).join(', ')}): yalnız{' '}
            <strong>bu ürünün</strong> sayfasında görünür.
          </li>
        </ul>
      </Alert>

      <Card>
        <CardHeader className="flex-row items-start justify-between gap-4">
          <div>
            <CardTitle className="text-body-lg font-semibold">İlişkili Ürünler</CardTitle>
            <CardDescription>
              Uyumsuzluk uyarıları çiftçi güvenliği için kritiktir; gerekçe yazmak zorunludur.
            </CardDescription>
          </div>

          <Button onClick={() => setOpen(true)}>
            <Plus />
            İlişki Ekle
          </Button>
        </CardHeader>

        <CardContent>
          {relationsQuery.isPending ? (
            <p className="py-8 text-center text-sm text-on-surface-variant">Yükleniyor...</p>
          ) : relations.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-10 text-center">
              <Link2 className="size-8 text-outline" aria-hidden="true" />
              <p className="text-label-md text-on-surface">Henüz ilişki tanımlanmamış</p>
              <p className="max-w-sm text-sm text-on-surface-variant">
                Birlikte kullanılamayan ürünleri işaretlemek çiftçiyi yanlış uygulamadan korur.
              </p>
            </div>
          ) : (
            <ul className="flex flex-col gap-2">
              {relations.map((relation) => (
                <li
                  key={relation.id}
                  className={cn(
                    'flex items-center gap-3 rounded-[8px] border p-3',
                    relation.type === 'INCOMPATIBLE'
                      ? 'border-error/30 bg-error-container/40'
                      : 'border-outline-variant',
                  )}
                >
                  {relation.type === 'INCOMPATIBLE' ? (
                    <AlertTriangle className="size-4 shrink-0 text-error" aria-hidden="true" />
                  ) : null}

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="truncate text-label-md text-on-surface">
                        {relation.product.name}
                      </span>
                      <Badge variant={relationVariant(relation.type)}>
                        {PRODUCT_RELATION_LABELS[relation.type]}
                      </Badge>
                      {isSymmetricRelation(relation.type) ? (
                        <span className="text-xs text-outline">çift yönlü</span>
                      ) : relation.isSource ? null : (
                        <span className="text-xs text-outline">karşı üründen tanımlı</span>
                      )}
                    </div>

                    {relation.note !== null ? (
                      <p className="mt-1 text-sm text-on-surface-variant">{relation.note}</p>
                    ) : null}
                  </div>

                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => deleteMutation.mutate(relation.id)}
                    disabled={
                      deleteMutation.isPending ||
                      (!isSymmetricRelation(relation.type) && !relation.isSource)
                    }
                    title={
                      !isSymmetricRelation(relation.type) && !relation.isSource
                        ? 'Yönlü ilişki yalnız kaynak üründen kaldırılabilir.'
                        : 'İlişkiyi kaldır'
                    }
                  >
                    <Trash2 />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <FormDialog
        open={isOpen}
        onOpenChange={(next) => (next ? setOpen(true) : close())}
        title="İlişki Ekle"
        description="Önce ürünü arayın, sonra ilişki türünü seçin."
        onSubmit={(event) => {
          event.preventDefault();
          setFormError(null);
          createMutation.mutate();
        }}
        errorMessage={formError}
        isSubmitting={createMutation.isPending}
        submitLabel="Ekle"
      >
        <FormField>
          <Label htmlFor="relation-search" required>
            Ürün Ara
          </Label>
          <Input
            id="relation-search"
            startIcon={<Search />}
            placeholder="En az 2 karakter yazın..."
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setTargetId('');
            }}
          />

          {search.trim().length >= 2 ? (
            <div className="mt-2 max-h-52 overflow-y-auto rounded-[8px] border border-outline-variant">
              {searchQuery.isPending ? (
                <p className="p-3 text-sm text-on-surface-variant">Aranıyor...</p>
              ) : (searchQuery.data?.items ?? []).filter((item) => item.id !== productId).length ===
                0 ? (
                <p className="p-3 text-sm text-on-surface-variant">Sonuç bulunamadı.</p>
              ) : (
                (searchQuery.data?.items ?? [])
                  .filter((item) => item.id !== productId)
                  .map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setTargetId(item.id)}
                      className={cn(
                        'flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors',
                        targetId === item.id
                          ? 'bg-secondary-container text-on-primary-fixed-variant'
                          : 'hover:bg-surface-container-low',
                      )}
                    >
                      <span className="truncate">{item.name}</span>
                    </button>
                  ))
              )}
            </div>
          ) : null}

          <FieldHint>Bir ürün kendisiyle ilişkilendirilemez.</FieldHint>
        </FormField>

        <FormField>
          <Label htmlFor="relation-type" required>
            İlişki Türü
          </Label>
          <Select
            id="relation-type"
            value={type}
            onChange={(event) => setType(event.target.value as ProductRelationType)}
          >
            <optgroup label="Simetrik (iki tarafta da görünür)">
              {SYMMETRIC_RELATION_TYPES.map((value) => (
                <option key={value} value={value}>
                  {PRODUCT_RELATION_LABELS[value]}
                </option>
              ))}
            </optgroup>
            <optgroup label="Yönlü (yalnız bu üründe görünür)">
              {DIRECTIONAL_RELATION_TYPES.map((value) => (
                <option key={value} value={value}>
                  {PRODUCT_RELATION_LABELS[value]}
                </option>
              ))}
            </optgroup>
          </Select>
        </FormField>

        <FormField>
          <Label htmlFor="relation-note" required={requiresNote}>
            Açıklama
          </Label>
          <textarea
            id="relation-note"
            rows={3}
            className="w-full rounded-[8px] border border-outline-variant bg-surface-container-lowest px-4 py-3 text-[15px] text-on-surface outline-none transition-all placeholder:text-outline focus:border-primary-container focus:ring-2 focus:ring-secondary-container"
            placeholder={
              requiresNote ? 'Bu iki ürün neden birlikte kullanılmamalı?' : 'İsteğe bağlı açıklama'
            }
            value={note}
            onChange={(event) => setNote(event.target.value)}
          />
          {requiresNote ? (
            <FieldError
              message={
                note.trim() === '' ? 'Uyumsuzluk ilişkisinde gerekçe zorunludur.' : undefined
              }
            />
          ) : null}
        </FormField>

        {!canSubmit ? (
          <p className="text-xs text-on-surface-variant">
            Devam etmek için bir ürün seçin
            {requiresNote ? ' ve gerekçe yazın' : ''}.
          </p>
        ) : null}
      </FormDialog>
    </div>
  );
}
