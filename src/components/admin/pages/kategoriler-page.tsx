'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ChevronDown, ChevronRight, FolderTree, Pencil, Plus, Power, Trash2 } from 'lucide-react';
import { z } from 'zod';
import {
  Alert,
  Badge,
  Button,
  Card,
  ConfirmDialog,
  FieldError,
  FieldHint,
  FormDialog,
  FormField,
  Input,
  Label,
  PageHeader,
  Select,
  Skeleton,
  cn,
} from '@zirve/ui';

import { ApiError } from '@/lib/api-error';
import { categoriesApi, type CategoryTreeNode } from '@/lib/catalog-api';

const schema = z.object({
  name: z.string().min(2, 'Ad en az 2 karakter olmalıdır.').max(150),
  parentId: z.string().optional(),
  description: z.string().max(2000).optional().or(z.literal('')),
  icon: z.string().max(60).optional().or(z.literal('')),
  sortOrder: z.number().int().min(0).optional(),
});

type FormValues = z.infer<typeof schema>;

/** Formda "üst kategori yok" seçeneğinin değeri. */
const ROOT_VALUE = '__root__';

/**
 * Kategori yönetimi — ağaç görünümü.
 *
 * Diğer taksonomilerden farklı olarak düz liste değil HİYERARŞİ gösterir:
 * kategori ağacında bir düğümün nerede durduğu, adından daha önemlidir.
 */
export function CategoriesPage() {
  const queryClient = useQueryClient();

  const [isFormOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<CategoryTreeNode | null>(null);
  const [deleting, setDeleting] = useState<CategoryTreeNode | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', parentId: ROOT_VALUE, description: '', icon: '', sortOrder: 0 },
  });

  const treeQuery = useQuery({
    queryKey: ['categories', 'tree'],
    queryFn: categoriesApi.tree,
  });

  const invalidate = async (): Promise<void> => {
    await queryClient.invalidateQueries({ queryKey: ['categories'] });
  };

  const saveMutation = useMutation({
    mutationFn: async (values: FormValues) => {
      const payload = {
        name: values.name,
        description: values.description === '' ? undefined : values.description,
        icon: values.icon === '' ? undefined : values.icon,
        sortOrder: values.sortOrder,
        // ROOT_VALUE seçiliyse köke taşı. Düzenlemede `null` göndermek
        // gerekir; oluşturmada alanın hiç gönderilmemesi yeterlidir.
        parentId:
          values.parentId === ROOT_VALUE ? (editing === null ? undefined : null) : values.parentId,
      };

      return editing === null
        ? categoriesApi.create(payload)
        : categoriesApi.update(editing.id, payload);
    },
    onSuccess: async () => {
      await invalidate();
      closeForm();
    },
    onError: (error: unknown) => {
      setFormError(
        error instanceof ApiError ? error.message : 'İşlem tamamlanamadı. Lütfen tekrar deneyin.',
      );
    },
  });

  const [actionError, setActionError] = useState<string | null>(null);

  const statusMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      categoriesApi.setActive(id, isActive),
    onSuccess: invalidate,
    onError: (error: unknown) => {
      setActionError(error instanceof ApiError ? error.message : 'Durum değiştirilemedi.');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => categoriesApi.remove(id),
    onSuccess: async () => {
      setActionError(null);
      await invalidate();
      setDeleting(null);
    },
    onError: (error: unknown) => {
      setActionError(error instanceof ApiError ? error.message : 'Kategori silinemedi.');
    },
  });

  /**
   * Üst kategori seçenekleri — girintili düz liste.
   *
   * Düzenlenen kategorinin KENDİSİ ve ALT AĞACI seçilemez: böyle bir taşıma
   * döngü oluşturur ve sunucu 422 döner. Seçeneği baştan kapatmak kullanıcıyı
   * gereksiz hatadan korur.
   *
   * DİKKAT: yasaklı olan ATALAR değil TORUNLARDIR. Bir kategoriyi üst
   * kategorisinin üstüne taşımak tamamen geçerlidir.
   */
  const parentOptions = useMemo(() => {
    const forbidden =
      editing === null ? new Set<string>() : collectSubtreeIds(treeQuery.data ?? [], editing.id);

    const options: { id: string; label: string; disabled: boolean }[] = [];

    const walk = (nodes: CategoryTreeNode[], prefix: string): void => {
      for (const node of nodes) {
        options.push({
          id: node.id,
          label: `${prefix}${node.name}`,
          disabled: forbidden.has(node.id),
        });

        walk(node.children, `${prefix}— `);
      }
    };

    walk(treeQuery.data ?? [], '');

    return options;
  }, [treeQuery.data, editing]);

  function openCreate(parentId?: string): void {
    setEditing(null);
    setFormError(null);
    form.reset({
      name: '',
      parentId: parentId ?? ROOT_VALUE,
      description: '',
      icon: '',
      sortOrder: 0,
    });
    setFormOpen(true);
  }

  function openEdit(node: CategoryTreeNode, parentId: string | null): void {
    setEditing(node);
    setFormError(null);
    form.reset({
      name: node.name,
      parentId: parentId ?? ROOT_VALUE,
      description: node.description ?? '',
      icon: node.icon ?? '',
      sortOrder: node.sortOrder,
    });
    setFormOpen(true);
  }

  function closeForm(): void {
    setFormOpen(false);
    setEditing(null);
    setFormError(null);
  }

  function toggleCollapse(id: string): void {
    setCollapsed((current) => {
      const next = new Set(current);

      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }

      return next;
    });
  }

  const totalCount = countNodes(treeQuery.data ?? []);

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Kategoriler"
        description="Ürün kategorileri hiyerarşik olarak düzenlenir. En fazla 5 seviye desteklenir."
        actions={
          <Button onClick={() => openCreate()}>
            <Plus />
            Yeni Kategori
          </Button>
        }
      />

      {treeQuery.isError ? (
        <Alert variant="error">
          {treeQuery.error instanceof ApiError
            ? treeQuery.error.message
            : 'Kategori ağacı yüklenemedi.'}
        </Alert>
      ) : null}

      {/* Onay kutusu kapalıyken oluşan hatalar (aktiflik değişimi) burada
          görünür; kutu açıkken mesaj kutunun içinde gösterilir. */}
      {actionError !== null && deleting === null ? (
        <Alert variant="error">{actionError}</Alert>
      ) : null}

      <Card>
        <div className="flex items-center justify-between border-b border-outline-variant px-6 py-4">
          <div className="flex items-center gap-2 text-on-surface-variant">
            <FolderTree className="size-4" aria-hidden="true" />
            <span className="text-label-md">Kategori Ağacı</span>
          </div>
          <span className="font-financial text-sm text-outline">{totalCount} kategori</span>
        </div>

        <div className="p-2">
          {treeQuery.isPending ? (
            <div className="flex flex-col gap-2 p-4">
              {[0, 1, 2, 3, 4].map((index) => (
                <Skeleton key={index} className="h-10 w-full" />
              ))}
            </div>
          ) : (treeQuery.data ?? []).length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-16 text-center">
              <FolderTree className="size-8 text-outline" aria-hidden="true" />
              <p className="text-label-md text-on-surface">Henüz kategori eklenmemiş</p>
              <p className="max-w-sm text-sm text-on-surface-variant">
                Yeni kategori ekleyerek ürün taksonomisini oluşturmaya başlayın.
              </p>
            </div>
          ) : (
            <ul className="flex flex-col">
              {(treeQuery.data ?? []).map((node) => (
                <CategoryRow
                  key={node.id}
                  node={node}
                  parentId={null}
                  collapsed={collapsed}
                  onToggle={toggleCollapse}
                  onEdit={openEdit}
                  onAddChild={openCreate}
                  onToggleStatus={(id, isActive) => statusMutation.mutate({ id, isActive })}
                  onDelete={(target) => {
                    setActionError(null);
                    setDeleting(target);
                  }}
                  statusPending={statusMutation.isPending}
                />
              ))}
            </ul>
          )}
        </div>
      </Card>

      <FormDialog
        open={isFormOpen}
        onOpenChange={(next) => (next ? setFormOpen(true) : closeForm())}
        title={editing === null ? 'Yeni Kategori' : 'Kategori Düzenle'}
        description={
          editing === null
            ? 'Adres (slug) addan otomatik üretilir.'
            : 'Üst kategoriyi değiştirerek kategoriyi taşıyabilirsiniz.'
        }
        onSubmit={form.handleSubmit((values) => {
          setFormError(null);
          saveMutation.mutate(values);
        })}
        errorMessage={formError}
        isSubmitting={saveMutation.isPending}
      >
        <FormField>
          <Label htmlFor="name" required>
            Ad
          </Label>
          <Input
            id="name"
            placeholder="Sıvı Gübre"
            invalid={form.formState.errors.name !== undefined}
            {...form.register('name')}
          />
          <FieldError message={form.formState.errors.name?.message} />
        </FormField>

        <FormField>
          <Label htmlFor="parentId">Üst Kategori</Label>
          <Select id="parentId" {...form.register('parentId')}>
            <option value={ROOT_VALUE}>— Kök kategori —</option>
            {parentOptions.map((option) => (
              <option key={option.id} value={option.id} disabled={option.disabled}>
                {option.label}
                {option.disabled ? ' (seçilemez)' : ''}
              </option>
            ))}
          </Select>
          <FieldHint>
            Kategori kendi alt ağacına taşınamaz; bu seçenekler kapalı gösterilir.
          </FieldHint>
        </FormField>

        <FormField>
          <Label htmlFor="icon">İkon</Label>
          <Input id="icon" placeholder="sprout" {...form.register('icon')} />
          <FieldHint>Lucide ikon adı. Örn. sprout, shield, droplets</FieldHint>
        </FormField>

        <FormField>
          <Label htmlFor="description">Açıklama</Label>
          <textarea
            id="description"
            rows={3}
            className="w-full rounded-[8px] border border-outline-variant bg-surface-container-lowest px-4 py-3 text-[15px] text-on-surface outline-none transition-all placeholder:text-outline focus:border-primary-container focus:ring-2 focus:ring-secondary-container"
            {...form.register('description')}
          />
        </FormField>

        <FormField>
          <Label htmlFor="sortOrder">Sıra</Label>
          <Input
            id="sortOrder"
            type="number"
            min={0}
            {...form.register('sortOrder', { valueAsNumber: true })}
          />
          <FieldHint>Küçük değer listede önce gelir.</FieldHint>
        </FormField>
      </FormDialog>

      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(next) => {
          if (!next) {
            setDeleting(null);
            setActionError(null);
          }
        }}
        title="Kategori silinsin mi?"
        description={`"${deleting?.name ?? ''}" kategorisi listeden kaldırılacak. Altında alt kategori varsa işlem reddedilir.`}
        onConfirm={() => {
          if (deleting !== null) {
            setActionError(null);
            deleteMutation.mutate(deleting.id);
          }
        }}
        errorMessage={actionError}
        isPending={deleteMutation.isPending}
        confirmLabel="Evet, sil"
      />
    </div>
  );
}

interface CategoryRowProps {
  node: CategoryTreeNode;
  parentId: string | null;
  collapsed: Set<string>;
  onToggle: (id: string) => void;
  onEdit: (node: CategoryTreeNode, parentId: string | null) => void;
  onAddChild: (parentId: string) => void;
  onToggleStatus: (id: string, isActive: boolean) => void;
  onDelete: (node: CategoryTreeNode) => void;
  statusPending: boolean;
}

/** Ağaçtaki tek bir satır ve alt ağacı. */
function CategoryRow({
  node,
  parentId,
  collapsed,
  onToggle,
  onEdit,
  onAddChild,
  onToggleStatus,
  onDelete,
  statusPending,
}: CategoryRowProps) {
  const hasChildren = node.children.length > 0;
  const isCollapsed = collapsed.has(node.id);

  return (
    <li>
      <div
        className={cn(
          'group flex items-center gap-2 rounded-[8px] px-2 py-2 transition-colors hover:bg-surface-container-low',
          !node.isActive && 'opacity-55',
        )}
        style={{ paddingLeft: `${node.depth * 24 + 8}px` }}
      >
        {hasChildren ? (
          <button
            type="button"
            onClick={() => onToggle(node.id)}
            className="inline-flex size-6 shrink-0 items-center justify-center rounded text-on-surface-variant hover:bg-surface-container"
            aria-label={isCollapsed ? 'Genişlet' : 'Daralt'}
          >
            {isCollapsed ? <ChevronRight className="size-4" /> : <ChevronDown className="size-4" />}
          </button>
        ) : (
          <span className="size-6 shrink-0" aria-hidden="true" />
        )}

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate text-label-md text-on-surface">{node.name}</span>
            {!node.isActive ? <Badge variant="neutral">Pasif</Badge> : null}
            {hasChildren ? (
              <span className="font-financial text-xs text-outline">
                {node.children.length} alt
              </span>
            ) : null}
          </div>
          <span className="truncate font-financial text-xs text-outline">{node.slug}</span>
        </div>

        <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => onAddChild(node.id)}
            title="Alt kategori ekle"
          >
            <Plus />
            <span className="sr-only">Alt kategori ekle</span>
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => onEdit(node, parentId)}
            title="Düzenle"
          >
            <Pencil />
            <span className="sr-only">Düzenle</span>
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => onToggleStatus(node.id, !node.isActive)}
            disabled={statusPending}
            title={node.isActive ? 'Pasife al' : 'Aktifleştir'}
          >
            <Power />
            <span className="sr-only">{node.isActive ? 'Pasife al' : 'Aktifleştir'}</span>
          </Button>
          <Button variant="ghost" size="icon-sm" onClick={() => onDelete(node)} title="Sil">
            <Trash2 />
            <span className="sr-only">Sil</span>
          </Button>
        </div>
      </div>

      {hasChildren && !isCollapsed ? (
        <ul className="flex flex-col">
          {node.children.map((child) => (
            <CategoryRow
              key={child.id}
              node={child}
              parentId={node.id}
              collapsed={collapsed}
              onToggle={onToggle}
              onEdit={onEdit}
              onAddChild={onAddChild}
              onToggleStatus={onToggleStatus}
              onDelete={onDelete}
              statusPending={statusPending}
            />
          ))}
        </ul>
      ) : null}
    </li>
  );
}

/**
 * Verilen kategorinin kendisi DAHİL tüm alt ağacındaki id'leri toplar.
 * Taşıma sırasında seçilemeyecek üst kategorileri belirlemek için kullanılır.
 */
export function collectSubtreeIds(nodes: CategoryTreeNode[], rootId: string): Set<string> {
  const found = findNodeById(nodes, rootId);

  if (found === undefined) {
    return new Set([rootId]);
  }

  const ids = new Set<string>();

  const walk = (node: CategoryTreeNode): void => {
    ids.add(node.id);
    node.children.forEach(walk);
  };

  walk(found);

  return ids;
}

/** Ağaçta id ile düğüm arar. */
function findNodeById(nodes: CategoryTreeNode[], id: string): CategoryTreeNode | undefined {
  for (const node of nodes) {
    if (node.id === id) {
      return node;
    }

    const found = findNodeById(node.children, id);

    if (found !== undefined) {
      return found;
    }
  }

  return undefined;
}

/** Ağaçtaki toplam düğüm sayısı. */
function countNodes(nodes: CategoryTreeNode[]): number {
  return nodes.reduce((sum, node) => sum + 1 + countNodes(node.children), 0);
}
