'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  ExternalLink,
  Image as ImageIcon,
  Info,
  Layers,
  Leaf,
  Link2,
  Save,
  Settings2,
  Sparkles,
} from 'lucide-react';
import {
  Alert,
  Badge,
  Button,
  PageHeader,
  Skeleton,
  TabPanel,
  Tabs,
  type TabItem,
} from '@zirve/ui';
import { MAX_LIMIT } from '@zirve/types';

import { ApiError } from '@/lib/api-error';
import {
  benefitsApi,
  brandsApi,
  categoriesApi,
  plantsApi,
  sideEffectsApi,
  soilTypesApi,
  unitTypesApi,
  usagePeriodsApi,
} from '@/lib/catalog-api';
import { productsApi, type Product } from '@/lib/products-api';
import {
  productFormSchema,
  type ProductFormValues,
  type VariantFormValues,
} from './product-form-schema';
import { BasicTab } from './tabs/basic-tab';
import { DraftImagesTab, ImagesTab, type DraftImage } from './tabs/images-tab';
import { DraftVariantsTab, VariantsTab, toVariantPayload } from './tabs/variants-tab';
import { AgriTab } from './tabs/agri-tab';
import { BenefitsTab } from './tabs/benefits-tab';
import { RelationsTab } from './tabs/relations-tab';
import { PublishTab } from './tabs/publish-tab';

/**
 * Taksonomi listelerini tek çağrıda çekmek için ortak limit.
 *
 * `MAX_LIMIT` (100) KULLANILIR, elle yazılmış bir sayı DEĞİL.
 *
 * SPRINT 12'DE BULUNAN HATA: burada 200 yazılıydı ve API'nin üst sınırı 100
 * olduğu için formun yüklediği YEDİ listenin tamamı 400 dönüyordu — markalar,
 * bitkiler, toprak türleri, yararlar, yan etkiler, kullanım dönemleri ve ÖLÇÜ
 * BİRİMLERİ. Ölçü birimi olmadan varyasyon oluşturulamadığı için ürün formu
 * fiilen çalışmıyordu. Hata yalnız tarayıcı testiyle görünür oldu: API
 * testleri kendi isteklerini geçerli limitlerle atıyor.
 *
 * Sabiti paylaşılan kaynaktan almak, sınır değişirse çağrıların sessizce
 * bozulmasını engeller.
 */
const TAXONOMY_LIMIT = MAX_LIMIT;

/**
 * Yönlendirme sonrası gösterilecek uyarının `sessionStorage` anahtarı.
 *
 * Yeni ürün kaydedildikten sonra düzenleme sayfasına geçilir ve bileşen
 * sökülür. Görsel yükleme uyarısı gibi "kayıt oldu AMA" mesajları o geçişte
 * kaybolmasın diye tek seferlik olarak buradan taşınır.
 */
const SAVE_WARNING_KEY = 'zirve.product-form.save-warning';

interface ProductFormProps {
  /** Düzenleme modunda ürün id'si; yeni üründe undefined. */
  productId?: string;
}

/**
 * 7 sekmeli ürün formu.
 *
 * TASARIM KARARI — yeni üründe görsel ve varyasyon nasıl toplanıyor:
 *
 *   Görsel, varyasyon ve ilişki KENDİ uçlarına sahip alt kaynaklardır ve bir
 *   ürün id'si olmadan yazılamazlar. Bu yüzden yeni üründe TASLAK olarak
 *   toplanır:
 *
 *     Varyasyonlar — ürünle AYNI istekte gönderilir; backend ikisini tek
 *       transaction'da yazar. Biri geçersizse ürün de kaydedilmez, yani
 *       "varyasyonsuz ürün" hiç oluşmaz (SPEC §15.3).
 *
 *     Görseller — ürün oluştuktan HEMEN SONRA tek multipart istekle yüklenir.
 *       Aynı transaction'a giremezler (dosyalar ayrı uca gider) ama bu kabul
 *       edilebilir: görselsiz ürün geçerli bir kayıttır ve yükleme
 *       başarısız olursa düzenleme ekranından tekrar denenebilir.
 *
 *   İLİŞKİLER hâlâ kayıt bekler: hedef ürünler arasında kendisini de
 *   arayabilmesi gerekir, bu da var olan bir kayıt demektir.
 */
export function ProductForm({ productId }: ProductFormProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const isEdit = productId !== undefined;

  const [activeTab, setActiveTab] = useState('basic');
  const [saveError, setSaveError] = useState<string | null>(null);
  const [justSaved, setJustSaved] = useState(false);

  // --- Yeni ürün taslakları (düzenlemede kullanılmaz) ---
  const [draftVariants, setDraftVariants] = useState<VariantFormValues[]>([]);
  const [draftImages, setDraftImages] = useState<DraftImage[]>([]);

  // Yeni üründen yönlendirilirken bırakılmış uyarı varsa gösterilir.
  const [carriedWarning, setCarriedWarning] = useState<string | null>(null);

  useEffect(() => {
    const stored = sessionStorage.getItem(SAVE_WARNING_KEY);

    if (stored !== null) {
      // Tek seferlik: okunduğu anda silinir, sayfa yenilenince tekrar çıkmasın.
      sessionStorage.removeItem(SAVE_WARNING_KEY);
      setCarriedWarning(stored);
    }
  }, []);

  // --- Veri ---

  const productQuery = useQuery({
    queryKey: ['product', productId],
    queryFn: () => productsApi.get(productId as string),
    enabled: isEdit,
  });

  const taxonomyQuery = useQuery({
    queryKey: ['product-form-taxonomy'],
    queryFn: async () => {
      const [tree, brands, plants, soilTypes, benefits, sideEffects, usagePeriods, unitTypes] =
        await Promise.all([
          categoriesApi.tree(),
          brandsApi.list({ limit: TAXONOMY_LIMIT, isActive: true }),
          plantsApi.list({ limit: TAXONOMY_LIMIT, isActive: true }),
          soilTypesApi.list({ limit: TAXONOMY_LIMIT, isActive: true }),
          benefitsApi.list({ limit: TAXONOMY_LIMIT, isActive: true }),
          sideEffectsApi.list({ limit: TAXONOMY_LIMIT, isActive: true }),
          usagePeriodsApi.list({ limit: TAXONOMY_LIMIT, isActive: true }),
          unitTypesApi.list({ limit: TAXONOMY_LIMIT, isActive: true }),
        ]);

      return {
        tree,
        brands: brands.items,
        plants: plants.items,
        soilTypes: soilTypes.items,
        benefits: benefits.items,
        sideEffects: sideEffects.items,
        usagePeriods: usagePeriods.items,
        unitTypes: unitTypes.items,
      };
    },
  });

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productFormSchema),
    defaultValues: emptyFormValues(),
  });

  // Ürün yüklenince formu doldur.
  useEffect(() => {
    if (productQuery.data !== undefined) {
      form.reset(toFormValues(productQuery.data));
    }
  }, [productQuery.data, form]);

  // --- Kaydetme ---

  const saveMutation = useMutation({
    mutationFn: async (values: ProductFormValues) => {
      const payload = {
        name: values.name,
        shortDescription: emptyToUndefined(values.shortDescription),
        description: emptyToUndefined(values.description),
        brandId: emptyToUndefined(values.brandId),
        usageInstructions: emptyToUndefined(values.usageInstructions),
        ingredients: emptyToUndefined(values.ingredients),
        storageConditions: emptyToUndefined(values.storageConditions),
        licenseNumber: emptyToUndefined(values.licenseNumber),
        isActive: values.isActive,
        isPublished: values.isPublished,
        showPrice: values.showPrice,
        isFeatured: values.isFeatured,
        isNew: values.isNew,
        isPopular: values.isPopular,
        metaTitle: emptyToUndefined(values.metaTitle),
        metaDesc: emptyToUndefined(values.metaDesc),
        sortOrder: values.sortOrder,
        categories: values.categoryIds.map((categoryId) => ({
          categoryId,
          isPrimary: categoryId === values.primaryCategoryId,
        })),
        plants: values.plantIds.map((id) => ({ id })),
        soilTypes: values.soilTypeIds.map((id) => ({ id })),
        usagePeriods: values.usagePeriodIds.map((id) => ({ id })),
        benefits: values.benefits.map((item) => ({
          id: item.id,
          note: emptyToUndefined(item.note),
        })),
        sideEffects: values.sideEffects.map((item) => ({
          id: item.id,
          note: emptyToUndefined(item.note),
          severityOverride: item.severityOverride,
        })),
      };

      if (isEdit) {
        return { product: await productsApi.update(productId as string, payload), warning: null };
      }

      /*
       * Ürün ve VARYASYONLARI tek istekte gönderilir.
       *
       * Varyasyonlar ayrı ayrı POST edilseydi ikincisinin hatası, ilki
       * kaydedilmiş ve ürün oluşmuş bir ara durum bırakırdı. Backend ikisini
       * aynı transaction'da yazıyor: hata hâlinde hiçbiri kaydedilmez.
       */
      // `variants` KOŞULSUZ gönderilir: en az bir aktif varyasyon zorunlu
      // (SPEC §15.3) ve gönderim öncesi kontrol bunu garanti etti.
      const product = await productsApi.create({
        ...payload,
        variants: draftVariants.map(toVariantPayload),
      });

      if (draftImages.length === 0) {
        return { product, warning: null };
      }

      /*
       * Görseller ürün oluştuktan SONRA yüklenir — ayrı multipart uç.
       *
       * Yükleme hatası ÜRÜNÜ İPTAL ETMEZ: ürün ve varyasyonları geçerli
       * biçimde kaydedilmiştir, görselsiz ürün de geçerli bir kayıttır.
       * Hatayı yutmak yerine uyarı olarak taşınır; kullanıcı düzenleme
       * ekranında tekrar deneyebilir.
       */
      try {
        const uploaded = await productsApi.uploadImages(
          product.id,
          // Sıra korunur: backend `sortOrder`ı geliş sırasından üretir.
          draftImages.map((draft) => draft.file),
        );

        // Ana görsel ilk sıradaki değilse ayrıca işaretlenir; backend
        // yüklemede otomatik olarak ilkini ana görsel yapar.
        const primaryIndex = draftImages.findIndex((draft) => draft.isPrimary);
        const primaryImage = primaryIndex > 0 ? uploaded[primaryIndex] : undefined;

        if (primaryImage !== undefined) {
          await productsApi.setPrimaryImage(product.id, primaryImage.id);
        }

        return { product, warning: null };
      } catch (error) {
        return {
          product,
          warning:
            error instanceof ApiError
              ? `Ürün kaydedildi ama görseller yüklenemedi: ${error.message}`
              : 'Ürün kaydedildi ama görseller yüklenemedi. Görseller sekmesinden tekrar deneyin.',
        };
      }
    },
    onSuccess: async ({ product, warning }) => {
      setSaveError(null);
      setJustSaved(true);
      await queryClient.invalidateQueries({ queryKey: ['products'] });

      if (!isEdit) {
        // Taslaklar sunucuya geçti; önizleme URL'leri artık gereksiz.
        for (const draft of draftImages) {
          URL.revokeObjectURL(draft.previewUrl);
        }

        setDraftVariants([]);
        setDraftImages([]);

        /*
         * Görsel yükleme uyarısı `sessionStorage` ile taşınır.
         *
         * Yönlendirme bileşeni SÖKER; state'te tutulan mesaj kaybolurdu.
         * Uyarıyı yönlendirmeden önce göstermek de olmaz — kullanıcı ürünün
         * gerçekten kaydedildiğini görmeden ekran değişir.
         */
        if (warning !== null) {
          sessionStorage.setItem(SAVE_WARNING_KEY, warning);
        }

        // Yeni ürün kaydedildi: düzenleme sayfasına geç.
        router.replace(`/urunler/${product.id}`);

        return;
      }

      await queryClient.invalidateQueries({ queryKey: ['product', productId] });
      form.reset(toFormValues(product));
    },
    onError: (error: unknown) => {
      setJustSaved(false);
      setSaveError(error instanceof ApiError ? error.message : 'Ürün kaydedilemedi.');
    },
  });

  // --- Sekmeler ---

  const product = productQuery.data;
  const errors = form.formState.errors;

  /*
   * Aktif varyasyon var mı?
   *
   * Düzenlemede kaydedilmiş varyasyonlara, yeni üründe TASLAK listeye bakılır.
   * Yayın ayarları sekmesi bu değere göre "yayınla" seçeneğini açar; taslak
   * sayılmasaydı yönetici varyasyonunu girmiş olmasına rağmen ürünü aynı anda
   * yayına alamazdı.
   */
  const hasActiveVariant = isEdit
    ? (product?.variants ?? []).some((variant) => variant.isActive)
    : draftVariants.some((variant) => variant.isActive);

  const imageCount = isEdit ? product?.images.length : draftImages.length;
  const variantCount = isEdit ? product?.variants.length : draftVariants.length;

  const lockedHint = 'Önce ürünü kaydedin.';

  const tabs: TabItem[] = [
    {
      id: 'basic',
      label: 'Temel Bilgiler',
      icon: <Info />,
      hasError: errors.name !== undefined || errors.categoryIds !== undefined,
    },
    {
      id: 'images',
      label: 'Görseller',
      icon: <ImageIcon />,
      badge: imageCount === 0 ? undefined : imageCount,
    },
    {
      id: 'variants',
      label: 'Varyasyonlar',
      icon: <Layers />,
      badge: variantCount === 0 ? undefined : variantCount,
      /*
       * Yeni üründe uyarı KAYDETME DENEMESİNDEN SONRA çıkar.
       *
       * Aktif varyasyon artık kaydın ön koşulu (SPEC §15.3), yani eksiklik
       * gerçek. Ama boş bir formu açar açmaz kırmızı sekme göstermek gürültü
       * olurdu: kullanıcı henüz hiçbir şey yapmamıştır. `isSubmitted`,
       * kullanıcı kaydete bastıktan sonra true olur.
       */
      hasError: (isEdit || form.formState.isSubmitted) && !hasActiveVariant,
    },
    { id: 'agri', label: 'Tarımsal Bilgiler', icon: <Leaf /> },
    { id: 'benefits', label: 'Yararlar ve Uyarılar', icon: <Sparkles /> },
    {
      id: 'relations',
      label: 'İlişkili Ürünler',
      icon: <Link2 />,
      disabled: !isEdit,
      disabledHint: lockedHint,
    },
    { id: 'publish', label: 'Yayın Ayarları', icon: <Settings2 /> },
  ];

  if (taxonomyQuery.isPending || (isEdit && productQuery.isPending)) {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton className="h-12 w-64" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (taxonomyQuery.isError || (isEdit && productQuery.isError)) {
    return (
      <Alert variant="error" title="Sayfa yüklenemedi">
        {productQuery.error instanceof ApiError
          ? productQuery.error.message
          : 'Ürün veya katalog verileri alınamadı.'}
      </Alert>
    );
  }

  const taxonomy = taxonomyQuery.data;

  if (taxonomy === undefined) {
    return null;
  }

  return (
    <form
      onSubmit={form.handleSubmit((values) => {
        setSaveError(null);

        /*
         * EN AZ BİR AKTİF VARYASYON — kaydın ön koşulu (SPEC §15.3).
         *
         * Backend zaten reddediyor ama kullanıcıyı sunucuya göndermeden
         * uyarmak ve DOĞRU SEKMEYE atmak gerekir: hata mesajı "Varyasyonlar"
         * sekmesindeki eksiği anlatıyor, kullanıcı Temel Bilgiler sekmesinde
         * duruyorsa neyi düzeltmesi gerektiğini görmez.
         *
         * Yalnız YENİ üründe kontrol edilir; düzenlemede varyasyonlar kendi
         * uçlarıyla yönetiliyor ve son aktif varyasyonun kaldırılması zaten
         * sunucuda engelli.
         */
        if (!isEdit && !draftVariants.some((variant) => variant.isActive)) {
          setSaveError(
            'Ürünün en az bir aktif varyasyonu olmalıdır. Varyasyonlar sekmesinden ekleyin.',
          );
          setActiveTab('variants');

          return;
        }

        saveMutation.mutate(values);
      })}
      className="flex flex-col gap-6"
      noValidate
    >
      <PageHeader
        title={isEdit ? (product?.name ?? 'Ürün') : 'Yeni Ürün'}
        description={
          isEdit
            ? 'Değişiklikler kaydedilene kadar uygulanmaz. Görsel ve varyasyon işlemleri anında kaydedilir.'
            : 'Görsel ve varyasyonları da şimdi ekleyebilirsiniz; hepsi tek kayıtta oluşturulur.'
        }
        actions={
          <>
            {isEdit && product !== undefined && product.isPublished ? (
              <Button asChild variant="outline">
                <a href={`/urun/${product.slug}`} target="_blank" rel="noreferrer">
                  <ExternalLink />
                  Sitede Gör
                </a>
              </Button>
            ) : null}

            <Button type="submit" loading={saveMutation.isPending}>
              <Save />
              {isEdit ? 'Değişiklikleri Kaydet' : 'Ürünü Kaydet'}
            </Button>
          </>
        }
      />

      {saveError !== null ? <Alert variant="error">{saveError}</Alert> : null}

      {/* Yeni ürün kaydedilirken görseller yüklenemediyse buraya düşer. */}
      {carriedWarning !== null ? (
        <Alert variant="warning" title="Ürün kaydedildi, eksik kaldı">
          {carriedWarning}
        </Alert>
      ) : null}

      {justSaved && !form.formState.isDirty && saveError === null ? (
        <Alert variant="success">Ürün kaydedildi.</Alert>
      ) : null}

      {isEdit && product !== undefined ? (
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={product.isActive ? 'success' : 'neutral'}>
            {product.isActive ? 'Aktif' : 'Pasif'}
          </Badge>
          <Badge variant={product.isPublished ? 'primary' : 'neutral'}>
            {product.isPublished ? 'Yayında' : 'Yayında değil'}
          </Badge>
          {!product.showPrice ? <Badge variant="warning">Fiyat gizli</Badge> : null}
          <span className="font-financial text-xs text-outline">{product.slug}</span>
        </div>
      ) : null}

      <Tabs items={tabs} activeId={activeTab} onChange={setActiveTab} />

      <TabPanel id="basic" activeId={activeTab}>
        <BasicTab form={form} brands={taxonomy.brands} categoryTree={taxonomy.tree} />
      </TabPanel>

      <TabPanel id="images" activeId={activeTab}>
        {isEdit ? (
          product !== undefined ? (
            <ImagesTab productId={product.id} images={product.images} />
          ) : null
        ) : (
          <DraftImagesTab drafts={draftImages} onChange={setDraftImages} />
        )}
      </TabPanel>

      <TabPanel id="variants" activeId={activeTab}>
        {isEdit ? (
          product !== undefined ? (
            <VariantsTab
              productId={product.id}
              variants={product.variants}
              unitTypes={taxonomy.unitTypes}
            />
          ) : null
        ) : (
          <DraftVariantsTab
            drafts={draftVariants}
            onChange={setDraftVariants}
            unitTypes={taxonomy.unitTypes}
          />
        )}
      </TabPanel>

      <TabPanel id="agri" activeId={activeTab}>
        <AgriTab
          form={form}
          plants={taxonomy.plants}
          soilTypes={taxonomy.soilTypes}
          usagePeriods={taxonomy.usagePeriods}
        />
      </TabPanel>

      <TabPanel id="benefits" activeId={activeTab}>
        <BenefitsTab form={form} benefits={taxonomy.benefits} sideEffects={taxonomy.sideEffects} />
      </TabPanel>

      <TabPanel id="relations" activeId={activeTab}>
        {isEdit && product !== undefined ? <RelationsTab productId={product.id} /> : null}
      </TabPanel>

      <TabPanel id="publish" activeId={activeTab}>
        <PublishTab form={form} hasActiveVariant={hasActiveVariant} />
      </TabPanel>
    </form>
  );
}

/** Boş string'i `undefined` yapar — API'de "değer yok" anlamına gelir. */
function emptyToUndefined(value: string | undefined): string | undefined {
  return value === undefined || value.trim() === '' ? undefined : value;
}

function emptyFormValues(): ProductFormValues {
  return {
    name: '',
    shortDescription: '',
    description: '',
    brandId: '',
    categoryIds: [],
    primaryCategoryId: '',
    usageInstructions: '',
    ingredients: '',
    storageConditions: '',
    licenseNumber: '',
    plantIds: [],
    soilTypeIds: [],
    usagePeriodIds: [],
    benefits: [],
    sideEffects: [],
    isActive: true,
    isPublished: false,
    showPrice: true,
    isFeatured: false,
    isNew: false,
    isPopular: false,
    metaTitle: '',
    metaDesc: '',
    sortOrder: 0,
  };
}

/** API ürününü form değerlerine çevirir. */
function toFormValues(product: Product): ProductFormValues {
  return {
    name: product.name,
    shortDescription: product.shortDescription ?? '',
    description: product.description ?? '',
    brandId: product.brandId ?? '',
    categoryIds: product.categories.map((link) => link.category.id),
    primaryCategoryId:
      product.categories.find((link) => link.isPrimary)?.category.id ??
      product.categories[0]?.category.id ??
      '',
    usageInstructions: product.usageInstructions ?? '',
    ingredients: product.ingredients ?? '',
    storageConditions: product.storageConditions ?? '',
    licenseNumber: product.licenseNumber ?? '',
    plantIds: product.plants.map((link) => link.plantId),
    soilTypeIds: product.soilTypes.map((link) => link.soilTypeId),
    usagePeriodIds: product.usagePeriods.map((link) => link.usagePeriodId),
    benefits: product.benefits.map((link) => ({
      id: link.benefitId,
      note: link.note ?? undefined,
    })),
    sideEffects: product.sideEffects.map((link) => ({
      id: link.sideEffectId,
      note: link.note ?? undefined,
      severityOverride:
        (link.severityOverride as 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' | null) ?? undefined,
    })),
    isActive: product.isActive,
    isPublished: product.isPublished,
    showPrice: product.showPrice,
    isFeatured: product.isFeatured,
    isNew: product.isNew,
    isPopular: product.isPopular,
    metaTitle: product.metaTitle ?? '',
    metaDesc: product.metaDesc ?? '',
    sortOrder: product.sortOrder,
  };
}
