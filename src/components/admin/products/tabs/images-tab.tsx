'use client';

import { useEffect, useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { GripVertical, ImagePlus, Star, Trash2, Upload } from 'lucide-react';
import {
  Alert,
  Badge,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  cn,
} from '@zirve/ui';

import { ApiError } from '@/lib/api-error';
import { productsApi, type ProductImage } from '@/lib/products-api';

const ACCEPTED = 'image/jpeg,image/png,image/webp';
const MAX_SIZE_MB = 5;
const MAX_IMAGES = 12;

/**
 * 2. Sekme — Görseller.
 *
 * Sürükle-bırak ile hem YÜKLEME hem SIRALAMA yapılır. Sıralama HTML5
 * draggable ile gerçekleştirilir; ek kütüphane getirmemek için yeterlidir
 * ve dokunmatik cihazlarda ok tuşları alternatifi sunulur.
 *
 * SEKME İKİ MODDA ÇALIŞIR:
 *
 *   `ImagesTab`      — kaydedilmiş ürün. Yükleme/silme/sıralama anında API'ye
 *                      yazılır.
 *   `DraftImagesTab` — YENİ ürün. Dosyalar tarayıcıda tutulur, önizleme
 *                      `URL.createObjectURL` ile gösterilir ve ürün
 *                      kaydedildikten HEMEN SONRA yüklenir.
 *
 * Görsel yüklemenin ürün oluşturmayla aynı transaction'a girmesi mümkün
 * değildir: dosyalar multipart olarak ayrı bir uca gider. Bu kabul edilebilir
 * — görselsiz ürün geçerli bir kayıttır, varyasyonsuz ürün değildir.
 */

// =============================================================================
// KAYDEDİLMİŞ ÜRÜN
// =============================================================================

interface ImagesTabProps {
  productId: string;
  images: ProductImage[];
}

export function ImagesTab({ productId, images }: ImagesTabProps) {
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);

  const invalidate = async (): Promise<void> => {
    setError(null);
    await queryClient.invalidateQueries({ queryKey: ['product', productId] });
  };

  /**
   * Hata mesajını ekrana taşır.
   *
   * HER mutasyonun `onError`ı OLMALIDIR. Aksi hâlde başarısız bir istek
   * yalnızca ağ sekmesinde görünür; ekranda liste tazelenmediği için işlem
   * "hiçbir şey olmadı" gibi algılanır ve kullanıcı aynı düğmeye tekrar basar.
   */
  const reportError = (fallback: string) => (mutationError: unknown) => {
    setError(mutationError instanceof ApiError ? mutationError.message : fallback);
  };

  const uploadMutation = useMutation({
    mutationFn: (files: File[]) => productsApi.uploadImages(productId, files),
    onSuccess: invalidate,
    onError: reportError('Görsel yüklenemedi.'),
  });

  const deleteMutation = useMutation({
    mutationFn: (imageId: string) => productsApi.removeImage(productId, imageId),
    onSuccess: invalidate,
    onError: reportError('Görsel silinemedi.'),
  });

  const primaryMutation = useMutation({
    mutationFn: (imageId: string) => productsApi.setPrimaryImage(productId, imageId),
    onSuccess: invalidate,
    onError: reportError('Ana görsel değiştirilemedi.'),
  });

  const reorderMutation = useMutation({
    mutationFn: (imageIds: string[]) => productsApi.reorderImages(productId, imageIds),
    onSuccess: invalidate,
    onError: reportError('Görsel sırası değiştirilemedi.'),
  });

  const sorted = [...images].sort((a, b) => a.sortOrder - b.sortOrder);

  const tiles: ImageTile[] = sorted.map((image) => ({
    key: image.id,
    url: image.url,
    altText: image.altText ?? '',
    label: image.originalName ?? 'görsel',
    isPrimary: image.isPrimary,
  }));

  /** Verilen sırayı API'ye yazar. */
  function applyOrder(order: number[]): void {
    reorderMutation.mutate(order.map((index) => sorted[index]?.id ?? ''));
  }

  return (
    <ImagesLayout
      error={error}
      onError={setError}
      count={images.length}
      isBusy={uploadMutation.isPending}
      onFiles={(files) => uploadMutation.mutate(files)}
      tiles={tiles}
      isReordering={reorderMutation.isPending}
      onReorder={applyOrder}
      onSetPrimary={(index) => {
        const id = sorted[index]?.id;

        if (id !== undefined) {
          primaryMutation.mutate(id);
        }
      }}
      onRemove={(index) => {
        const id = sorted[index]?.id;

        if (id !== undefined) {
          deleteMutation.mutate(id);
        }
      }}
    />
  );
}

// =============================================================================
// YENİ ÜRÜN (TASLAK)
// =============================================================================

/** Henüz yüklenmemiş görsel. */
export interface DraftImage {
  file: File;
  /** `URL.createObjectURL` çıktısı — önizleme için. */
  previewUrl: string;
  isPrimary: boolean;
}

/** Dosyadan taslak görsel üretir. */
export function toDraftImage(file: File, isPrimary: boolean): DraftImage {
  return { file, previewUrl: URL.createObjectURL(file), isPrimary };
}

interface DraftImagesTabProps {
  drafts: DraftImage[];
  onChange: (next: DraftImage[]) => void;
}

/**
 * Yeni ürün için görsel sekmesi.
 *
 * Hiçbir şey yüklenmez: dosyalar bellekte tutulur ve ürün kaydedildikten sonra
 * TEK multipart istekle, listedeki SIRAYLA gönderilir. Sıra önemlidir —
 * backend `sortOrder` değerini geliş sırasından üretir.
 */
export function DraftImagesTab({ drafts, onChange }: DraftImagesTabProps) {
  const [error, setError] = useState<string | null>(null);

  /*
   * Önizleme URL'leri serbest bırakılır.
   *
   * `URL.createObjectURL` dosyayı bellekte TUTAR ve sekme kapanana kadar
   * bırakmaz. Kullanıcı on iki görsel ekleyip formdan çıkarsa, revoke
   * edilmezse hepsi bellekte kalırdı.
   *
   * Temizlik yalnız BİLEŞEN SÖKÜLÜRKEN yapılır: bağımlılığa `drafts`
   * konulsaydı her liste değişiminde hâlâ gösterilen URL'ler iptal edilir ve
   * önizlemeler kırılırdı. Tek tek silmelerin temizliği `remove()` içinde.
   */
  const draftsRef = useRef(drafts);
  draftsRef.current = drafts;

  useEffect(() => {
    return () => {
      for (const draft of draftsRef.current) {
        URL.revokeObjectURL(draft.previewUrl);
      }
    };
  }, []);

  function add(files: File[]): void {
    const next = [...drafts];

    for (const file of files) {
      // İlk görsel otomatik ana görsel olur — backend'deki kuralın aynısı.
      next.push(toDraftImage(file, next.length === 0));
    }

    onChange(next);
  }

  function remove(index: number): void {
    const removed = drafts[index];

    if (removed === undefined) {
      return;
    }

    // Kaldırılan görselin URL'si hemen serbest bırakılır.
    URL.revokeObjectURL(removed.previewUrl);

    const next = drafts.filter((_, current) => current !== index);

    // Ana görsel kaldırıldıysa ilk sıradaki devralır: ürün kartsız kalmasın.
    if (next.length > 0 && !next.some((draft) => draft.isPrimary)) {
      next[0] = { ...(next[0] as DraftImage), isPrimary: true };
    }

    onChange(next);
  }

  const tiles: ImageTile[] = drafts.map((draft, index) => ({
    key: `${draft.file.name}-${index}`,
    url: draft.previewUrl,
    altText: '',
    label: draft.file.name,
    isPrimary: draft.isPrimary,
  }));

  return (
    <div className="flex flex-col gap-6">
      {drafts.length > 0 ? (
        <Alert variant="info" title="Görseller ürünle birlikte yüklenecek">
          {drafts.length} dosya seçildi ama henüz yüklenmedi. “Ürünü Kaydet” dediğinizde ürün
          oluşturulur ve görseller listedeki sırayla yüklenir.
        </Alert>
      ) : null}

      <ImagesLayout
        error={error}
        onError={setError}
        count={drafts.length}
        isBusy={false}
        onFiles={add}
        tiles={tiles}
        isReordering={false}
        onReorder={(order) => onChange(order.map((index) => drafts[index] as DraftImage))}
        onSetPrimary={(index) =>
          onChange(drafts.map((draft, current) => ({ ...draft, isPrimary: current === index })))
        }
        onRemove={remove}
      />
    </div>
  );
}

// =============================================================================
// PAYLAŞILAN GÖRÜNÜM
// =============================================================================

/** Izgarada çizilen tek görsel. */
interface ImageTile {
  key: string;
  url: string;
  altText: string;
  label: string;
  isPrimary: boolean;
}

interface ImagesLayoutProps {
  error: string | null;
  onError: (message: string | null) => void;
  count: number;
  isBusy: boolean;
  onFiles: (files: File[]) => void;
  tiles: ImageTile[];
  isReordering: boolean;
  /** Yeni sıra, MEVCUT indeksler dizisi olarak verilir. */
  onReorder: (order: number[]) => void;
  onSetPrimary: (index: number) => void;
  onRemove: (index: number) => void;
}

/**
 * Yükleme alanı ve görsel izgarası.
 *
 * Kaydedilmiş ve taslak modların TEK görünümü. Mod farkı yalnız işlemlerin
 * nereye gittiğidir; düzen, doğrulama ve sıralama etkileşimi ortaktır.
 */
function ImagesLayout({
  error,
  onError,
  count,
  isBusy,
  onFiles,
  tiles,
  isReordering,
  onReorder,
  onSetPrimary,
  onRemove,
}: ImagesLayoutProps) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [isDragOver, setDragOver] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  function handleFiles(fileList: FileList | null): void {
    if (fileList === null || fileList.length === 0) {
      return;
    }

    const files = Array.from(fileList);

    // İstemci tarafı ön kontrol: kullanıcıyı sunucuya gitmeden uyarır.
    // Gerçek doğrulama backend'dedir (magic byte kontrolü dahil).
    const tooLarge = files.filter((file) => file.size > MAX_SIZE_MB * 1024 * 1024);

    if (tooLarge.length > 0) {
      onError(
        `Bu dosyalar ${MAX_SIZE_MB} MB sınırını aşıyor: ${tooLarge.map((f) => f.name).join(', ')}`,
      );

      return;
    }

    if (count + files.length > MAX_IMAGES) {
      onError(`En fazla ${MAX_IMAGES} görsel eklenebilir. Şu an ${count} görsel var.`);

      return;
    }

    onError(null);
    onFiles(files);
  }

  /** Sürükle-bırak ile sıralama. */
  function handleDrop(targetIndex: number): void {
    if (draggedIndex === null || draggedIndex === targetIndex) {
      return;
    }

    const order = tiles.map((_, index) => index);
    order.splice(targetIndex, 0, ...order.splice(draggedIndex, 1));

    onReorder(order);
    setDraggedIndex(null);
  }

  /** Ok tuşlarıyla sıralama — dokunmatik ve klavye erişilebilirliği. */
  function move(index: number, direction: -1 | 1): void {
    const target = index + direction;

    if (target < 0 || target >= tiles.length) {
      return;
    }

    const order = tiles.map((_, current) => current);
    [order[index], order[target]] = [order[target] as number, order[index] as number];

    onReorder(order);
  }

  return (
    <div className="flex flex-col gap-6">
      {error !== null ? <Alert variant="error">{error}</Alert> : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-body-lg font-semibold">Ürün Görselleri</CardTitle>
          <CardDescription>
            JPG, PNG veya WebP. Dosya başına en fazla {MAX_SIZE_MB} MB, toplam {MAX_IMAGES} görsel.
            İlk görsel otomatik olarak ana görsel olur.
          </CardDescription>
        </CardHeader>

        <CardContent className="flex flex-col gap-4">
          <button
            type="button"
            onClick={() => fileInput.current?.click()}
            onDragOver={(event) => {
              event.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(event) => {
              event.preventDefault();
              setDragOver(false);
              handleFiles(event.dataTransfer.files);
            }}
            disabled={isBusy || count >= MAX_IMAGES}
            className={cn(
              'flex flex-col items-center justify-center gap-2 rounded-[12px] border-2 border-dashed p-10 transition-colors',
              'disabled:cursor-not-allowed disabled:opacity-50',
              isDragOver
                ? 'border-primary-container bg-secondary-container'
                : 'border-outline-variant hover:border-primary-container hover:bg-surface-container-low',
            )}
          >
            <Upload className="size-6 text-on-surface-variant" aria-hidden="true" />
            <span className="text-label-md text-on-surface">
              {isBusy ? 'Yükleniyor...' : 'Dosyaları buraya sürükleyin'}
            </span>
            <span className="text-xs text-on-surface-variant">veya tıklayarak seçin</span>
          </button>

          <input
            ref={fileInput}
            type="file"
            accept={ACCEPTED}
            multiple
            hidden
            onChange={(event) => {
              handleFiles(event.target.files);
              event.target.value = '';
            }}
          />

          {tiles.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-8 text-center">
              <ImagePlus className="size-8 text-outline" aria-hidden="true" />
              <p className="text-sm text-on-surface-variant">Henüz görsel eklenmemiş.</p>
            </div>
          ) : (
            <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {tiles.map((tile, index) => (
                <li
                  key={tile.key}
                  draggable
                  onDragStart={() => setDraggedIndex(index)}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={() => handleDrop(index)}
                  className={cn(
                    'group relative overflow-hidden rounded-[12px] border bg-surface-container-lowest',
                    draggedIndex === index
                      ? 'border-primary-container opacity-50'
                      : 'border-outline-variant',
                  )}
                >
                  <div className="relative aspect-square bg-surface-container">
                    {/* Yerel yükleme yolları ve blob önizlemeleri next/image ile
                        optimize edilmiyor; basit img yeterli ve sürücü
                        değişiminde kırılmaz. */}
                    <img src={tile.url} alt={tile.altText} className="size-full object-cover" />

                    {tile.isPrimary ? (
                      <span className="absolute left-2 top-2">
                        <Badge variant="primary">Ana</Badge>
                      </span>
                    ) : null}

                    <span
                      className="absolute right-2 top-2 cursor-grab rounded bg-inverse-surface/60 p-1 text-inverse-on-surface"
                      title="Sürükleyerek sıralayın"
                    >
                      <GripVertical className="size-3.5" />
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-1 p-2">
                    <span className="min-w-0 truncate font-financial text-[11px] text-outline">
                      {index + 1}. {tile.label}
                    </span>

                    <div className="flex shrink-0 items-center gap-0.5">
                      <button
                        type="button"
                        onClick={() => move(index, -1)}
                        disabled={index === 0 || isReordering}
                        title="Sola taşı"
                        className="rounded p-1 text-outline hover:bg-surface-container disabled:opacity-30"
                      >
                        ←
                      </button>
                      <button
                        type="button"
                        onClick={() => move(index, 1)}
                        disabled={index === tiles.length - 1 || isReordering}
                        title="Sağa taşı"
                        className="rounded p-1 text-outline hover:bg-surface-container disabled:opacity-30"
                      >
                        →
                      </button>

                      {!tile.isPrimary ? (
                        <button
                          type="button"
                          onClick={() => onSetPrimary(index)}
                          title="Ana görsel yap"
                          className="rounded p-1 text-outline hover:bg-surface-container hover:text-on-surface"
                        >
                          <Star className="size-3.5" />
                        </button>
                      ) : null}

                      <button
                        type="button"
                        onClick={() => onRemove(index)}
                        title="Sil"
                        className="rounded p-1 text-outline hover:bg-error-container hover:text-on-error-container"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
