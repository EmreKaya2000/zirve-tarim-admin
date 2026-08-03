'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  ChevronDown,
  ChevronRight,
  Folder,
  Image as ImageIcon,
  FolderOpen,
  FolderTree,
  Pencil,
  Plus,
  Power,
  Search,
  Tag,
  Trash2,
  Upload,
} from 'lucide-react';
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
  sortOrder: z.number().int().min(0).optional(),
});

type FormValues = z.infer<typeof schema>;

/** Formda "üst kategori yok" seçeneğinin değeri. */
const ROOT_VALUE = '__root__';

/*
 * İKON KISITLARI — backend'in uyguladığı sınırların ARAYÜZ KOPYASI.
 *
 * Bunlar yalnız kullanıcıyı erken uyarmak içindir; GERÇEK doğrulama
 * backend'dedir (apps/api/src/modules/uploads/category-icon.service.ts).
 * Arayüzde kontrol etmenin tek amacı 1 MB'ı aşan bir dosyayı boşuna
 * yüklememek; aşağıdaki değerler backend'le birlikte güncellenmelidir.
 */
const ICON_ACCEPT = 'image/png,image/jpeg,image/webp';
const ICON_MAX_MB = 1;
const ICON_MAX_BYTES = ICON_MAX_MB * 1024 * 1024;
const ICON_MIN_PX = 64;
const ICON_MAX_PX = 2048;
const ICON_OUTPUT_PX = 128;

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
  /*
   * YENİ KATEGORİDE İKON BEKLETİLİR.
   *
   * Yükleme ucu `POST /admin/categories/:id/icon` — kategori var olmadan
   * çağrılamaz. Bu yüzden yeni kayıtta seçilen dosya burada tutulur ve
   * kategori OLUŞTUKTAN SONRA yüklenir. Alternatif "önce kaydet, sonra
   * düzenleyip ikon ekle" akışı kullanıcıyı iki tura sokardı.
   */
  const [iconFile, setIconFile] = useState<File | null>(null);
  const [iconError, setIconError] = useState<string | null>(null);
  const iconInputRef = useRef<HTMLInputElement>(null);

  /*
   * Seçilen dosyanın önizlemesi için object URL.
   *
   * `URL.createObjectURL` bellekte bir referans tutar ve GC'ye
   * BIRAKILMAZ; revoke edilmezse her dosya seçimi sızıntı bırakır.
   * Bu yüzden effect içinde üretilip cleanup'ta serbest bırakılır.
   */
  const [iconObjectUrl, setIconObjectUrl] = useState<string | null>(null);

  useEffect(() => {
    if (iconFile === null) {
      setIconObjectUrl(null);

      return;
    }

    const url = URL.createObjectURL(iconFile);

    setIconObjectUrl(url);

    return () => {
      URL.revokeObjectURL(url);
    };
  }, [iconFile]);

  /** Önizleme: yeni seçim varsa o, yoksa kaydedilmiş ikon. */
  const iconPreview = iconObjectUrl ?? editing?.iconUrl ?? null;
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', parentId: ROOT_VALUE, description: '', sortOrder: 0 },
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
        sortOrder: values.sortOrder,
        // ROOT_VALUE seçiliyse köke taşı. Düzenlemede `null` göndermek
        // gerekir; oluşturmada alanın hiç gönderilmemesi yeterlidir.
        parentId:
          values.parentId === ROOT_VALUE ? (editing === null ? undefined : null) : values.parentId,
      };

      const saved =
        editing === null
          ? await categoriesApi.create(payload)
          : await categoriesApi.update(editing.id, payload);

      // Bekletilen ikon, kategori kesinleştikten sonra yüklenir.
      if (iconFile !== null) {
        await categoriesApi.uploadIcon(saved.id, iconFile);
      }

      return saved;
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

  const removeIconMutation = useMutation({
    mutationFn: (id: string) => categoriesApi.removeIcon(id),
    onSuccess: async () => {
      setIconError(null);
      await invalidate();
    },
    onError: (error: unknown) => {
      setIconError(error instanceof ApiError ? error.message : 'İkon kaldırılamadı.');
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
      sortOrder: node.sortOrder,
    });
    setFormOpen(true);
  }

  function closeForm(): void {
    setIconFile(null);
    setIconError(null);
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

  /*
   * `?? []` doğrudan yazılsaydı her render'da YENİ bir dizi üretirdi ve
   * aşağıdaki `useMemo`ların bağımlılığı hep değişirdi — memo hiç tutmazdı.
   */
  const tree = useMemo(() => treeQuery.data ?? [], [treeQuery.data]);
  const totalCount = countNodes(tree);

  /*
   * ARAMA — eşleşen düğüm ATALARIYLA birlikte gösterilir.
   *
   * Yalnız eşleşenleri göstermek ağacı bozar: "Üre" bulunur ama hangi
   * dalın altında olduğu görünmez. Kategori yönetiminde konum, adın
   * kendisi kadar önemlidir (bir kategori yanlış dala taşınmış olabilir).
   */
  const visibleTree = useMemo(() => filterTree(tree, search), [tree, search]);
  const matchCount = useMemo(() => countNodes(visibleTree), [visibleTree]);

  /** Ağaçtaki TÜM düğümlerin id'leri — toplu daraltma için. */
  const allIds = useMemo(() => {
    const ids: string[] = [];
    const walk = (nodes: CategoryTreeNode[]): void => {
      for (const node of nodes) {
        if (node.children.length > 0) {
          ids.push(node.id);
          walk(node.children);
        }
      }
    };
    walk(tree);

    return ids;
  }, [tree]);

  // Arama yapılırken her şey açık kalmalı: kapalı bir dalın altındaki
  // eşleşme bulunmuş ama görünmez olurdu.
  const effectiveCollapsed = search.trim() === '' ? collapsed : new Set<string>();
  const isAllCollapsed = allIds.length > 0 && allIds.every((id) => collapsed.has(id));

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
        {/*
          ARAÇ ÇUBUĞU — 29 kategori ve 5 seviye elle taranamaz.
          Arama ve toplu daraltma, ağaç büyüdükçe zorunlu hâle gelir.
        */}
        <div className="flex flex-col gap-3 border-b border-outline-variant px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="flex items-center gap-2 text-on-surface-variant">
            <FolderTree className="size-4 shrink-0" aria-hidden="true" />
            <span className="text-label-md">Kategori Ağacı</span>
            <span className="font-financial text-xs text-outline">
              {search.trim() === ''
                ? `${totalCount} kategori`
                : `${matchCount}/${totalCount} kategori`}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative min-w-0 flex-1 sm:w-64 sm:flex-none">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-outline"
                aria-hidden="true"
              />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Kategori ara..."
                aria-label="Kategori ara"
                className="h-9 pl-9"
              />
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setCollapsed(isAllCollapsed ? new Set() : new Set(allIds))}
              disabled={allIds.length === 0 || search.trim() !== ''}
              title={
                search.trim() !== ''
                  ? 'Arama sırasında ağaç açık kalır'
                  : isAllCollapsed
                    ? 'Tümünü genişlet'
                    : 'Tümünü daralt'
              }
              /*
                aria-label ŞART: görünen metin `hidden sm:inline` ile mobilde
                kayboluyor ve düğme yalnız ikondan ibaret kalıyor. Etiket
                olmasa mobilde erişilebilir adı hiç olmazdı.
              */
              aria-label={isAllCollapsed ? 'Tümünü genişlet' : 'Tümünü daralt'}
            >
              {isAllCollapsed ? <ChevronDown /> : <ChevronRight />}
              <span className="hidden sm:inline">{isAllCollapsed ? 'Genişlet' : 'Daralt'}</span>
            </Button>
          </div>
        </div>

        <div className="p-2">
          {treeQuery.isPending ? (
            <div className="flex flex-col gap-2 p-4">
              {[0, 1, 2, 3, 4].map((index) => (
                <Skeleton key={index} className="h-10 w-full" />
              ))}
            </div>
          ) : tree.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-16 text-center">
              <FolderTree className="size-8 text-outline" aria-hidden="true" />
              <p className="text-label-md text-on-surface">Henüz kategori eklenmemiş</p>
              <p className="max-w-sm text-sm text-on-surface-variant">
                Yeni kategori ekleyerek ürün taksonomisini oluşturmaya başlayın.
              </p>
            </div>
          ) : visibleTree.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-16 text-center">
              <Search className="size-8 text-outline" aria-hidden="true" />
              <p className="text-label-md text-on-surface">Eşleşen kategori yok</p>
              <p className="max-w-sm text-sm text-on-surface-variant">
                “{search}” için sonuç bulunamadı. Arama kategori adı ve adresinde (slug) yapılır.
              </p>
              <Button variant="outline" size="sm" onClick={() => setSearch('')}>
                Aramayı temizle
              </Button>
            </div>
          ) : (
            <ul className="flex flex-col gap-0.5">
              {visibleTree.map((node) => (
                <CategoryRow
                  key={node.id}
                  node={node}
                  parentId={null}
                  collapsed={effectiveCollapsed}
                  search={search}
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

          <div className="flex items-start gap-4">
            {/*
              ÖNİZLEME: yeni seçilen dosya varsa o, yoksa kaydedilmiş ikon.
              İkisi de yoksa boş çerçeve — "buraya görsel gelecek" sinyali.
            */}
            <span className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-[10px] border border-outline-variant bg-surface-container-low">
              {iconPreview === null ? (
                <ImageIcon className="size-6 text-outline" aria-hidden="true" />
              ) : (
                /*
                  next/image DEĞİL: kaynak ya yerel bir yükleme yolu
                  (/uploads/...) ya da blob: önizlemesidir; ikisi de
                  optimizasyondan geçemez. Panelde mevcut desen de bu
                  (products-list-page, images-tab).
                */
                <img src={iconPreview} alt="" className="size-full object-contain" />
              )}
            </span>

            <div className="flex min-w-0 flex-1 flex-col gap-2">
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => iconInputRef.current?.click()}
                >
                  <Upload />
                  Görsel Seç
                </Button>

                {iconPreview !== null ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      if (iconFile !== null) {
                        setIconFile(null);

                        return;
                      }

                      if (editing !== null) {
                        removeIconMutation.mutate(editing.id);
                      }
                    }}
                    disabled={removeIconMutation.isPending}
                  >
                    <Trash2 />
                    Kaldır
                  </Button>
                ) : null}
              </div>

              <input
                ref={iconInputRef}
                type="file"
                accept={ICON_ACCEPT}
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0] ?? null;

                  // Aynı dosyayı ikinci kez seçebilmek için input sıfırlanır.
                  event.target.value = '';
                  setIconError(null);

                  if (file !== null && file.size > ICON_MAX_BYTES) {
                    setIconError(
                      `Dosya çok büyük (${(file.size / 1024 / 1024).toFixed(1)} MB). En fazla ${ICON_MAX_MB} MB.`,
                    );

                    return;
                  }

                  setIconFile(file);
                }}
              />

              <FieldError message={iconError ?? undefined} />

              <FieldHint>
                PNG, JPG veya WebP · en fazla {ICON_MAX_MB} MB · en az {ICON_MIN_PX}×{ICON_MIN_PX},
                en fazla {ICON_MAX_PX}×{ICON_MAX_PX} piksel · kareye yakın olmalı. Görsel{' '}
                {ICON_OUTPUT_PX}×{ICON_OUTPUT_PX} WebP&apos;ye dönüştürülür, konum bilgisi silinir.
                SVG kabul edilmez.
              </FieldHint>
            </div>
          </div>
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
  search: string;
  onToggle: (id: string) => void;
  onEdit: (node: CategoryTreeNode, parentId: string | null) => void;
  onAddChild: (parentId: string) => void;
  onToggleStatus: (id: string, isActive: boolean) => void;
  onDelete: (node: CategoryTreeNode) => void;
  statusPending: boolean;
}

/**
 * Ağaçtaki tek bir satır ve alt ağacı.
 *
 * =============================================================================
 * TASARIM KARARLARI
 * =============================================================================
 * 1. DERİNLİK RAY ile gösterilir, boşlukla değil. Önceki sürüm `padding-left`
 *    kullanıyordu: beş seviyeli, 29 düğümlü bir ağaçta bir satırın hangi dala
 *    ait olduğu okunamıyordu. Girinti artık iç içe `<ul>` üzerindeki sol
 *    kenarlıktan geliyor — dallar gözle takip edilebilir hâle geldi.
 *
 * 2. İKON DURUMU ANLATIR: dolu dal açıkken `FolderOpen`, kapalıyken `Folder`,
 *    yaprak `Tag`. Kullanıcı satırı okumadan yapıyı görebiliyor.
 *
 * 3. EYLEMLER GİZLENMİYOR. Önceki sürüm `opacity-0 group-hover:opacity-100`
 *    kullanıyordu; bu, DOKUNMATİK CİHAZDA eylemleri tamamen erişilemez
 *    kılıyordu (hover yok) ve panel mobil uyumlu olmak zorunda (SPEC §7).
 *    Artık düğmeler her zaman görünür, yalnız düşük kontrastta duruyor ve
 *    hover/odakta belirginleşiyor: keşfedilebilirlik var, gürültü yok.
 *
 * 4. SLUG İKİNCİ SATIRDA DEĞİL. Satır yüksekliğini iki katına çıkarıyor ve
 *    nadiren gerekiyordu; artık adın yanında soluk bir ek olarak duruyor.
 *
 * 5. ARAMA EŞLEŞMESİ VURGULANIR — hangi kelimenin tuttuğu görünmezse
 *    kullanıcı sonucu doğrulayamaz.
 */
function CategoryRow({
  node,
  parentId,
  collapsed,
  search,
  onToggle,
  onEdit,
  onAddChild,
  onToggleStatus,
  onDelete,
  statusPending,
}: CategoryRowProps) {
  const hasChildren = node.children.length > 0;
  const isCollapsed = collapsed.has(node.id);
  const isRoot = node.depth === 0;

  return (
    <li>
      <div
        className={cn(
          'group relative flex items-center gap-2 rounded-[8px] py-1.5 pl-1 pr-1.5 transition-colors',
          'hover:bg-surface-container-low focus-within:bg-surface-container-low',
          !node.isActive && 'opacity-60',
        )}
      >
        {hasChildren ? (
          <button
            type="button"
            onClick={() => onToggle(node.id)}
            className="inline-flex size-6 shrink-0 items-center justify-center rounded-[6px] text-on-surface-variant transition-colors hover:bg-surface-container hover:text-on-surface"
            /*
              ETİKET KATEGORİ ADIYLA NİTELENİR. Yalnız "Daralt" deseydi ekran
              okuyucu kullanıcısı 29 özdeş düğme duyardı ve hangisinin hangi
              dala ait olduğunu ayırt edemezdi.
            */
            aria-label={`${node.name} kategorisini ${isCollapsed ? 'genişlet' : 'daralt'}`}
            aria-expanded={!isCollapsed}
          >
            {isCollapsed ? <ChevronRight className="size-4" /> : <ChevronDown className="size-4" />}
          </button>
        ) : (
          <span className="size-6 shrink-0" aria-hidden="true" />
        )}

        {/* İkon kutusu: kök kategoriler daha ağır, alt seviyeler daha sakin. */}
        <span
          className={cn(
            'inline-flex size-7 shrink-0 items-center justify-center rounded-[6px]',
            isRoot
              ? 'bg-secondary-container text-on-primary-fixed-variant'
              : 'bg-surface-container text-on-surface-variant',
          )}
          aria-hidden="true"
        >
          {hasChildren ? (
            isCollapsed ? (
              <Folder className="size-4" />
            ) : (
              <FolderOpen className="size-4" />
            )
          ) : (
            <Tag className="size-3.5" />
          )}
        </span>

        <div className="flex min-w-0 flex-1 items-center gap-2">
          {/*
            Ad mobilde SARAR, masaüstünde tek satırda kırpılır.

            Dar ekranda dört eylem düğmesi genişliğin yarısını alıyor ve
            `truncate` adları "Katı ...", "Komp..." hâline getiriyordu —
            listedeki en önemli bilgi okunamaz oluyordu.
          */}
          <span
            className={cn(
              'line-clamp-2 sm:truncate',
              isRoot ? 'text-label-md text-on-surface' : 'text-sm text-on-surface',
            )}
          >
            {highlight(node.name, search)}
          </span>

          <span className="hidden truncate font-financial text-xs text-outline sm:inline">
            {highlight(node.slug, search)}
          </span>

          {hasChildren ? (
            <span className="shrink-0 rounded-full bg-surface-container px-2 py-0.5 font-financial text-[11px] text-on-surface-variant">
              {node.children.length}
            </span>
          ) : null}

          {!node.isActive ? <Badge variant="neutral">Pasif</Badge> : null}
        </div>

        {/*
          EYLEMLER — cihaza göre davranır.

          `(hover: hover)` yalnız GERÇEK işaretleme cihazlarında (fare/trackpad)
          eşleşir. Orada düğmeler gizlenip hover ile açılır: 29 satır × 4 ikon =
          116 ikonluk bir duvar masaüstünde gereksiz gürültüydü.

          Dokunmatikte hover diye bir şey YOKTUR, bu yüzden orada düğmeler her
          zaman görünür kalır. Basit `group-hover` kullanılsaydı eylemler
          telefonda tamamen erişilemez olurdu — panel mobil uyumlu olmak
          zorunda (SPEC §7).
        */}
        <div className="flex shrink-0 items-center gap-0.5 opacity-100 transition-opacity focus-within:opacity-100 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100">
          <Button
            variant="ghost"
            size="icon-sm"
            className="size-8 sm:size-9"
            onClick={() => onAddChild(node.id)}
            title="Alt kategori ekle"
          >
            <Plus />
            <span className="sr-only">Alt kategori ekle</span>
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            className="size-8 sm:size-9"
            onClick={() => onEdit(node, parentId)}
            title="Düzenle"
          >
            <Pencil />
            <span className="sr-only">Düzenle</span>
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            className="size-8 sm:size-9"
            onClick={() => onToggleStatus(node.id, !node.isActive)}
            disabled={statusPending}
            title={node.isActive ? 'Pasife al' : 'Aktifleştir'}
          >
            <Power />
            <span className="sr-only">{node.isActive ? 'Pasife al' : 'Aktifleştir'}</span>
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            className="size-8 sm:size-9"
            onClick={() => onDelete(node)}
            title="Sil"
          >
            <Trash2 />
            <span className="sr-only">Sil</span>
          </Button>
        </div>
      </div>

      {/*
        ALT AĞAÇ — girinti ve RAY buradan gelir.
        `ml-[15px]` chevron'un ortasına denk gelir, böylece ray düğmeden aşağı
        iner ve dal görsel olarak ebeveynine bağlanır.
      */}
      {hasChildren && !isCollapsed ? (
        <ul className="ml-[15px] flex flex-col gap-0.5 border-l border-outline-variant pl-3">
          {node.children.map((child) => (
            <CategoryRow
              key={child.id}
              node={child}
              parentId={node.id}
              collapsed={collapsed}
              search={search}
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
 * Aramayı Türkçe karakterden bağımsız kılar: "sivi" yazan "Sıvı Gübre"yi bulur.
 *
 * NEDEN GEREKLİ: kullanıcı arama kutusuna diakritik yazmaz. Düz
 * `toLocaleLowerCase('tr')` ile "sivi" ≠ "sıvı" olur ve ad hiç eşleşmez —
 * ilk sürümde eşleşme yalnız slug üzerinden geliyordu, çünkü slug zaten
 * normalleştirilmiş. Ada göre arama sessizce çalışmıyordu.
 *
 * Eşleme BİRE BİR karakterdir (NFD ayrıştırması DEĞİL): dizgenin uzunluğu
 * korunur, böylece bulunan indeks orijinal metinde de geçerli olur ve
 * vurgulama doğru yeri işaretler.
 */
const TR_FOLD: Record<string, string> = {
  ı: 'i',
  İ: 'i',
  ş: 's',
  Ş: 's',
  ğ: 'g',
  Ğ: 'g',
  ü: 'u',
  Ü: 'u',
  ö: 'o',
  Ö: 'o',
  ç: 'c',
  Ç: 'c',
};

function fold(value: string): string {
  return value.replace(/[ıİşŞğĞüÜöÖçÇ]/g, (char) => TR_FOLD[char] ?? char).toLowerCase();
}

/**
 * Arama terimini metin içinde vurgular.
 *
 * Eşleşmenin NEREDE tuttuğunu göstermek şart: "gubre" araması hem ada hem
 * slug'a bakıyor, vurgu olmadan kullanıcı sonucun neden geldiğini anlayamaz.
 */
function highlight(text: string, search: string): React.ReactNode {
  const term = search.trim();

  if (term === '') {
    return text;
  }

  const index = fold(text).indexOf(fold(term));

  if (index === -1) {
    return text;
  }

  return (
    <>
      {text.slice(0, index)}
      <mark className="rounded-[3px] bg-secondary-container px-0.5 text-on-primary-fixed-variant">
        {text.slice(index, index + term.length)}
      </mark>
      {text.slice(index + term.length)}
    </>
  );
}

/**
 * Ağacı arama terimine göre süzer — eşleşen düğüm ATALARIYLA birlikte kalır.
 *
 * Yalnız eşleşenleri döndürmek ağacın anlamını bozar: kategori yönetiminde
 * bir düğümün hangi dalın altında durduğu, adı kadar önemlidir.
 */
function filterTree(nodes: CategoryTreeNode[], search: string): CategoryTreeNode[] {
  const term = fold(search.trim());

  if (term === '') {
    return nodes;
  }

  const result: CategoryTreeNode[] = [];

  for (const node of nodes) {
    const children = filterTree(node.children, search);
    const selfMatches = fold(node.name).includes(term) || fold(node.slug).includes(term);

    // Çocuğu eşleşen düğüm, kendisi eşleşmese de KALIR: yoksa eşleşme
    // ağaçta yetim görünür.
    if (selfMatches || children.length > 0) {
      result.push({ ...node, children });
    }
  }

  return result;
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
