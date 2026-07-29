'use client';

import { useState, type ReactNode } from 'react';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm, type DefaultValues, type FieldValues, type UseFormReturn } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Pencil, Plus, Power, Trash2 } from 'lucide-react';
import type { ZodType } from 'zod';
import {
  Alert,
  Badge,
  Button,
  ConfirmDialog,
  DataTable,
  FormDialog,
  PageHeader,
  Select,
  type DataTableColumn,
  type SortDirection,
} from '@zirve/ui';

import { ApiError } from '@/lib/api-error';
import type { LookupListParams, LookupRecord, PaginatedResponse } from '@/lib/catalog-api';

const PAGE_SIZE = 20;

/** Bir taksonomi kaynağı için gereken CRUD istemcisi. */
export interface LookupApi<TRecord> {
  list: (params: LookupListParams) => Promise<PaginatedResponse<TRecord>>;
  create: (payload: Record<string, unknown>) => Promise<TRecord>;
  update: (id: string, payload: Record<string, unknown>) => Promise<TRecord>;
  setActive: (id: string, isActive: boolean) => Promise<TRecord>;
  remove: (id: string) => Promise<void>;
}

export interface LookupPageProps<TRecord extends LookupRecord, TForm extends FieldValues> {
  /** Sayfa başlığı. Örn. "Bitkiler" */
  title: string;
  description?: string;
  /** Tekil ad. Örn. "Bitki" — dialog başlıklarında kullanılır. */
  singularName: string;
  /** Sayfalama etiketinde kullanılır. Örn. "bitki" */
  itemLabel: string;

  /** TanStack Query anahtarının kök parçası. Örn. "plants" */
  queryKey: string;

  api: LookupApi<TRecord>;

  /** Ada ve duruma ek olarak gösterilecek sütunlar. */
  extraColumns?: DataTableColumn<TRecord>[];

  /** Form doğrulama şeması. */
  formSchema: ZodType<TForm>;
  /** Yeni kayıt için varsayılan form değerleri. */
  formDefaults: DefaultValues<TForm>;
  /** Düzenlemede kaydı form değerlerine çevirir. */
  toFormValues: (record: TRecord) => DefaultValues<TForm>;
  /** Form alanlarını render eder. */
  renderFields: (form: UseFormReturn<TForm>) => ReactNode;
}

/**
 * Taksonomi yönetim sayfası.
 *
 * Sekiz modülün tamamı yapı olarak aynıdır: liste + arama + sıralama +
 * sayfalama + oluştur/düzenle formu + pasife al + sil. Bu bileşen o ortak
 * kabuğu sağlar; her sayfa yalnız kendi alanlarını ve sütunlarını tanımlar.
 *
 * Not: Yetki kontrolü YOKTUR — backend zaten reddeder (Kural 10). Burada
 * yapılacak bir kontrol yalnız kullanıcı deneyimi olurdu ve taksonomi
 * yönetimi tüm panel kullanıcılarına açıktır.
 */
export function LookupPage<TRecord extends LookupRecord, TForm extends FieldValues>({
  title,
  description,
  singularName,
  itemLabel,
  queryKey,
  api,
  extraColumns = [],
  formSchema,
  formDefaults,
  toFormValues,
  renderFields,
}: LookupPageProps<TRecord, TForm>) {
  const queryClient = useQueryClient();

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('sortOrder');
  const [sortOrder, setSortOrder] = useState<SortDirection>('asc');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  const [editing, setEditing] = useState<TRecord | null>(null);
  const [isFormOpen, setFormOpen] = useState(false);
  const [deleting, setDeleting] = useState<TRecord | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const form = useForm<TForm>({
    resolver: zodResolver(formSchema),
    defaultValues: formDefaults,
  });

  const listQuery = useQuery({
    queryKey: [queryKey, { page, search, sortBy, sortOrder, statusFilter }],
    queryFn: () =>
      api.list({
        page,
        limit: PAGE_SIZE,
        sortBy,
        sortOrder,
        ...(search.trim() !== '' && { search: search.trim() }),
        ...(statusFilter !== 'all' && { isActive: statusFilter === 'active' }),
      }),
    placeholderData: keepPreviousData,
  });

  const invalidate = async (): Promise<void> => {
    setActionError(null);
    await queryClient.invalidateQueries({ queryKey: [queryKey] });
  };

  /**
   * Liste üzerindeki işlemlerin (silme, aktiflik) hatasını ekrana taşır.
   *
   * `onError` OLMAZSA başarısız işlem hiçbir iz bırakmaz: liste tazelenmediği
   * için ekran değişmez, onay kutusu açık kalır ve kullanıcı aynı düğmeye
   * tekrar basar. Hatanın kendisi yalnız ağ sekmesinde görünür.
   */
  const reportActionError = (fallback: string) => (error: unknown) => {
    setActionError(error instanceof ApiError ? error.message : fallback);
  };

  const saveMutation = useMutation({
    mutationFn: async (values: TForm) => {
      const payload = values as unknown as Record<string, unknown>;

      return editing === null ? api.create(payload) : api.update(editing.id, payload);
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

  const statusMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      api.setActive(id, isActive),
    onSuccess: invalidate,
    onError: reportActionError('Durum değiştirilemedi.'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.remove(id),
    onSuccess: async () => {
      await invalidate();
      setDeleting(null);
    },
    onError: reportActionError('Kayıt silinemedi.'),
  });

  function openCreate(): void {
    setEditing(null);
    setFormError(null);
    form.reset(formDefaults);
    setFormOpen(true);
  }

  function openEdit(record: TRecord): void {
    setEditing(record);
    setFormError(null);
    form.reset(toFormValues(record));
    setFormOpen(true);
  }

  function closeForm(): void {
    setFormOpen(false);
    setEditing(null);
    setFormError(null);
    form.reset(formDefaults);
  }

  const columns: DataTableColumn<TRecord>[] = [
    {
      key: 'name',
      header: 'Ad',
      sortable: true,
      cell: (row) => (
        <div className="min-w-0">
          <p className="truncate text-label-md text-on-surface">{row.name}</p>
          <p className="truncate font-financial text-xs text-outline">{row.slug}</p>
        </div>
      ),
    },
    ...extraColumns,
    {
      key: 'sortOrder',
      header: 'Sıra',
      sortable: true,
      className: 'font-financial',
      cell: (row) => row.sortOrder,
    },
    {
      key: 'isActive',
      header: 'Durum',
      cell: (row) => (
        <Badge variant={row.isActive ? 'success' : 'neutral'}>
          {row.isActive ? 'Aktif' : 'Pasif'}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: 'İşlem',
      headerClassName: 'text-right',
      className: 'text-right',
      cell: (row) => (
        <div className="flex items-center justify-end gap-1">
          <Button variant="ghost" size="icon-sm" onClick={() => openEdit(row)} title="Düzenle">
            <Pencil />
            <span className="sr-only">Düzenle</span>
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => statusMutation.mutate({ id: row.id, isActive: !row.isActive })}
            disabled={statusMutation.isPending}
            title={row.isActive ? 'Pasife al' : 'Aktifleştir'}
          >
            <Power />
            <span className="sr-only">{row.isActive ? 'Pasife al' : 'Aktifleştir'}</span>
          </Button>
          <Button variant="ghost" size="icon-sm" onClick={() => setDeleting(row)} title="Sil">
            <Trash2 />
            <span className="sr-only">Sil</span>
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title={title}
        description={description}
        actions={
          <Button onClick={openCreate}>
            <Plus />
            Yeni {singularName}
          </Button>
        }
      />

      {/* Onay kutusu kapalıyken oluşan hatalar (aktiflik değişimi) burada
          görünür; kutu açıkken mesaj kutunun içinde gösterilir. */}
      {actionError !== null && deleting === null ? (
        <Alert variant="error">{actionError}</Alert>
      ) : null}

      <DataTable
        columns={columns}
        rows={listQuery.data?.items ?? []}
        rowKey={(row) => row.id}
        isLoading={listQuery.isPending}
        errorMessage={
          listQuery.isError
            ? listQuery.error instanceof ApiError
              ? listQuery.error.message
              : 'Bilinmeyen bir hata oluştu.'
            : undefined
        }
        searchValue={search}
        onSearchChange={(value) => {
          setSearch(value);
          setPage(1);
        }}
        searchPlaceholder={`${title} içinde ara...`}
        sortBy={sortBy}
        sortOrder={sortOrder}
        onSortChange={(field, order) => {
          setSortBy(field);
          setSortOrder(order);
        }}
        page={listQuery.data?.meta.page ?? 1}
        totalPages={listQuery.data?.meta.totalPages ?? 0}
        total={listQuery.data?.meta.total ?? 0}
        limit={listQuery.data?.meta.limit ?? PAGE_SIZE}
        onPageChange={setPage}
        itemLabel={itemLabel}
        emptyTitle={`Henüz ${itemLabel} eklenmemiş`}
        emptyDescription={
          search.trim() !== '' || statusFilter !== 'all'
            ? 'Arama veya filtre kriterlerinizi değiştirmeyi deneyin.'
            : `Yeni ${singularName} ekleyerek başlayın.`
        }
        filters={
          <div className="w-full sm:w-44">
            <Select
              value={statusFilter}
              onChange={(event) => {
                setStatusFilter(event.target.value as 'all' | 'active' | 'inactive');
                setPage(1);
              }}
              aria-label="Duruma göre filtrele"
            >
              <option value="all">Tüm durumlar</option>
              <option value="active">Yalnız aktif</option>
              <option value="inactive">Yalnız pasif</option>
            </Select>
          </div>
        }
      />

      <FormDialog
        open={isFormOpen}
        onOpenChange={(next) => (next ? setFormOpen(true) : closeForm())}
        title={editing === null ? `Yeni ${singularName}` : `${singularName} Düzenle`}
        description={
          editing === null
            ? 'Adres (slug) addan otomatik üretilir.'
            : 'Ad değiştirilirse adres de yeniden üretilir.'
        }
        onSubmit={form.handleSubmit((values) => {
          setFormError(null);
          saveMutation.mutate(values);
        })}
        errorMessage={formError}
        isSubmitting={saveMutation.isPending}
      >
        {renderFields(form)}
      </FormDialog>

      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(next) => {
          if (!next) {
            setDeleting(null);
            setActionError(null);
          }
        }}
        title={`${singularName} silinsin mi?`}
        description={`"${deleting?.name ?? ''}" kaydı listeden kaldırılacak. Kayıt veritabanında saklanır; ürün geçmişi kırılmaz.`}
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
