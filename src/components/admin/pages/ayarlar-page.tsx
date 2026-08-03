'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Eye, EyeOff, Save } from 'lucide-react';
import {
  Alert,
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  FieldHint,
  FormField,
  Input,
  Label,
  PageHeader,
  Select,
  Skeleton,
} from '@zirve/ui';

import { ApiError } from '@/lib/api-error';
import { useAuth } from '@/providers/auth-provider';
import { settingsApi, type Setting } from '@/lib/catalog-api';

/** Ayar gruplarının Türkçe başlıkları ve açıklamaları. */
const GROUP_META: Record<string, { title: string; description: string }> = {
  store: {
    title: 'Mağaza Bilgileri',
    description: 'Public sitede gösterilen iletişim bilgileri.',
  },
  general: {
    title: 'Genel',
    description: 'Sistem geneli ayarlar ve belge numarası ön ekleri.',
  },
  sales: {
    title: 'Satış',
    description: 'Fiyatlandırma ve vergi varsayılanları.',
  },
  inventory: {
    title: 'Stok',
    description: 'Stok davranışı ve uyarı ayarları.',
  },
  seo: {
    title: 'SEO',
    description: 'Arama motoru için varsayılan meta bilgileri.',
  },
};

/** Uzun metin olarak düzenlenmesi gereken ayarlar. */
const MULTILINE_KEYS = new Set(['legal.productWarning', 'store.address']);

/**
 * Sistem ayarları sayfası.
 *
 * Ayar EKLEME/SİLME yoktur: anahtarlar kodda sabit olarak referans verilir
 * ve çalışma zamanında yaratılan bir anahtarın karşılığı bulunmaz. Yönetici
 * yalnız DEĞERİ değiştirir.
 */
export function SettingsPage() {
  const { isSuperAdmin } = useAuth();
  const queryClient = useQueryClient();

  const [draft, setDraft] = useState<Record<string, string>>({});
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [showInternal, setShowInternal] = useState(true);

  /**
   * Kullanıcının elle değiştirdiği anahtarlar.
   *
   * State DEĞİL ref: yalnız aşağıdaki etki okur, değeri değiştiğinde yeniden
   * render gerekmez.
   */
  const touchedKeys = useRef<Set<string>>(new Set());

  /**
   * Taslağın en güncel hâli.
   *
   * `onSuccess` içinde `draft`ı okumak GÜVENİLMEZ: kapanış (closure) mutasyon
   * başlatıldığı andaki değeri taşır. Karşılaştırma güncel değer üzerinden
   * yapılmalı, yoksa aşağıdaki kontrol hiçbir şeyi yakalamaz.
   */
  const draftRef = useRef<Record<string, string>>({});

  const settingsQuery = useQuery({
    queryKey: ['settings'],
    queryFn: () => settingsApi.list(),
  });

  /*
   * Sunucudan gelen değerler taslağa yüklenir; KULLANICININ DOKUNDUĞU alanlar
   * korunur.
   *
   * NEDEN DOKUNULANLAR AYRILIYOR: bu etki eskiden taslağın TAMAMINI sunucu
   * verisiyle değiştiriyordu. Sorgu her yeniden çalıştığında (kaydetme
   * sonrasındaki invalidate ya da sayfaya geri dönüş) o an düzenlenmekte olan
   * alan sessizce eski değerine dönüyor, "Kaydet" pasife düşüyor ve yazılan
   * değer hiç gönderilmiyordu — hata mesajı da olmadığı için panel çalışıyor
   * görünüyordu.
   */
  useEffect(() => {
    const data = settingsQuery.data;

    if (data === undefined) {
      return;
    }

    setDraft((current) =>
      Object.fromEntries(
        data.map((item) => [
          item.key,
          touchedKeys.current.has(item.key) ? (current[item.key] ?? item.value) : item.value,
        ]),
      ),
    );
  }, [settingsQuery.data]);

  useEffect(() => {
    draftRef.current = draft;
  }, [draft]);

  const saveMutation = useMutation({
    mutationFn: (items: { key: string; value: string }[]) => settingsApi.updateMany(items),
    onSuccess: async (_data, savedItems) => {
      setSaveError(null);
      setSaved(true);

      /*
       * Bir alan "dokunulmadı" sayılmak için İKİ koşulu birlikte karşılamalı:
       * gönderilmiş olmalı VE formdaki değeri hâlâ gönderilen değere eşit
       * olmalı.
       *
       * Gönderilenler dışındakiler zaten dışarıda: istek uçarken kullanıcı
       * BAŞKA bir alanı düzenlemiş olabilir ve aşağıdaki invalidate onu
       * sunucu değerine döndürürdü.
       *
       * Eşitlik kontrolü ise AYNI alanın yeniden düzenlenmesini kapsıyor:
       * kullanıcı kaydete bastıktan sonra yanıt gelmeden aynı alana yazmışsa
       * işaret KALMALI, yoksa tazeleme o yeni değeri de sessizce silerdi —
       * düzeltilmek istenen hatanın aynısı.
       */
      for (const item of savedItems) {
        if (draftRef.current[item.key] === item.value) {
          touchedKeys.current.delete(item.key);
        }
      }

      await queryClient.invalidateQueries({ queryKey: ['settings'] });
      // Public ayarlar da değişmiş olabilir.
      await queryClient.invalidateQueries({ queryKey: ['public-settings'] });
    },
    onError: (error: unknown) => {
      setSaved(false);
      setSaveError(error instanceof ApiError ? error.message : 'Ayarlar kaydedilemedi.');
    },
  });

  /** Sunucudaki değerden farklı olan ayarlar. */
  const changed = useMemo(() => {
    if (settingsQuery.data === undefined) {
      return [];
    }

    return settingsQuery.data
      .filter((setting) => draft[setting.key] !== undefined && draft[setting.key] !== setting.value)
      .map((setting) => ({ key: setting.key, value: draft[setting.key] as string }));
  }, [settingsQuery.data, draft]);

  const handleSave = useCallback(() => {
    setSaved(false);
    saveMutation.mutate(changed);
  }, [changed, saveMutation]);

  /** Kaydedilmemiş değişiklikleri atar; alanlar sunucudaki değere döner. */
  const handleDiscard = useCallback(() => {
    touchedKeys.current.clear();
    setSaveError(null);
    setDraft(Object.fromEntries((settingsQuery.data ?? []).map((item) => [item.key, item.value])));
  }, [settingsQuery.data]);

  /** Ayarları gruba göre öbekler. */
  const grouped = useMemo(() => {
    const visible = (settingsQuery.data ?? []).filter(
      (setting) => showInternal || setting.isPublic,
    );

    const map = new Map<string, Setting[]>();

    for (const setting of visible) {
      const list = map.get(setting.group) ?? [];
      list.push(setting);
      map.set(setting.group, list);
    }

    return [...map.entries()];
  }, [settingsQuery.data, showInternal]);

  if (!isSuperAdmin) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title="Ayarlar" />
        <Alert variant="warning" title="Bu sayfa için yetkiniz yok">
          Sistem ayarlarını yalnızca <strong>Süper Yönetici</strong> rolündeki hesaplar
          düzenleyebilir.
        </Alert>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Ayarlar"
        description="Mağaza bilgileri, vergi varsayılanları ve yasal metinler."
        /*
         * KAYDET DÜĞMESİ BURADA DEĞİL, ALTTAKİ YAPIŞIK ÇUBUKTA.
         *
         * Sayfa başlığı uzun formun tepesinde kalır; aşağıdaki bir alanı
         * düzenleyen kullanıcı onu görmez. Tek kaydetme yeri olması, "hangi
         * düğme aktif?" ikiliğini de ortadan kaldırır.
         */
        actions={
          <Button
            variant="outline"
            onClick={() => setShowInternal((current) => !current)}
            title={showInternal ? 'Yalnız public ayarları göster' : 'Tüm ayarları göster'}
          >
            {showInternal ? <EyeOff /> : <Eye />}
            {showInternal ? 'Yalnız Public' : 'Tümü'}
          </Button>
        }
      />

      {settingsQuery.isPending ? (
        <div className="flex flex-col gap-4">
          {[0, 1, 2].map((index) => (
            <Skeleton key={index} className="h-48 w-full" />
          ))}
        </div>
      ) : settingsQuery.isError ? (
        <Alert variant="error">
          {settingsQuery.error instanceof ApiError
            ? settingsQuery.error.message
            : 'Ayarlar yüklenemedi.'}
        </Alert>
      ) : (
        grouped.map(([group, settings]) => (
          <Card key={group}>
            <CardHeader>
              <CardTitle className="text-body-lg font-semibold">
                {GROUP_META[group]?.title ?? group}
              </CardTitle>
              <CardDescription>{GROUP_META[group]?.description}</CardDescription>
            </CardHeader>

            <CardContent className="flex flex-col gap-5">
              {settings.map((setting) => (
                <SettingRow
                  key={setting.key}
                  setting={setting}
                  value={draft[setting.key] ?? setting.value}
                  onChange={(value) => {
                    setSaved(false);
                    touchedKeys.current.add(setting.key);
                    setDraft((current) => ({ ...current, [setting.key]: value }));
                  }}
                />
              ))}
            </CardContent>
          </Card>
        ))
      )}

      <SaveBar
        changedCount={changed.length}
        saveError={saveError}
        saved={saved}
        isPending={saveMutation.isPending}
        onSave={handleSave}
        onDiscard={handleDiscard}
      />
    </div>
  );
}

/**
 * Kaydetme çubuğu — ekranın altına yapışık durur.
 *
 * NEDEN AYRICA BURADA: sayfadaki tek kaydetme düğmesi sayfa başlığının
 * sağındaydı. Ayarlar listesi ekrandan uzundur; mağaza telefonunu düzenleyen
 * kullanıcı çok aşağıda olur ve ne düğmeyi ne de "kaydedilmemiş değişiklik
 * var" uyarısını görür. Kaydetmeden ayrılınca hiçbir hata çıkmaz — panel
 * çalışıyor görünür, değer sunucuya hiç gitmez. Hata mesajı da bu çubukta
 * gösterilir: başarısız kaydın uyarısı da düzenlenen yerde görünmelidir.
 */
function SaveBar({
  changedCount,
  saveError,
  saved,
  isPending,
  onSave,
  onDiscard,
}: {
  changedCount: number;
  saveError: string | null;
  saved: boolean;
  isPending: boolean;
  onSave: () => void;
  onDiscard: () => void;
}) {
  const hasChanges = changedCount > 0;

  if (!hasChanges && saveError === null && !saved) {
    return null;
  }

  return (
    <div className="sticky bottom-4 z-20 flex flex-wrap items-center justify-between gap-3 rounded-[12px] border border-outline-variant bg-surface-container-lowest px-4 py-3 shadow-elevated">
      {saveError !== null ? (
        <p className="min-w-0 text-sm text-error">{saveError}</p>
      ) : hasChanges ? (
        <p className="min-w-0 text-sm text-on-surface-variant">
          <strong className="text-on-surface">{changedCount} ayarda</strong> kaydedilmemiş
          değişiklik var. Tümü tek işlemde kaydedilir.
        </p>
      ) : (
        <p className="min-w-0 text-sm text-primary">Ayarlar kaydedildi.</p>
      )}

      {hasChanges ? (
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={onDiscard} disabled={isPending}>
            Geri Al
          </Button>
          <Button onClick={onSave} loading={isPending}>
            <Save />
            Kaydet ({changedCount})
          </Button>
        </div>
      ) : null}
    </div>
  );
}

function SettingRow({
  setting,
  value,
  onChange,
}: {
  setting: Setting;
  value: string;
  onChange: (value: string) => void;
}) {
  const isMultiline = MULTILINE_KEYS.has(setting.key);

  return (
    <FormField>
      <div className="flex flex-wrap items-center gap-2">
        <Label htmlFor={setting.key}>{setting.description ?? setting.key}</Label>
        {setting.isPublic ? <Badge variant="primary">Public</Badge> : null}
      </div>

      <p className="font-financial text-xs text-outline">{setting.key}</p>

      {setting.valueType === 'boolean' ? (
        <Select
          id={setting.key}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="max-w-xs"
        >
          <option value="true">Evet</option>
          <option value="false">Hayır</option>
        </Select>
      ) : isMultiline ? (
        <textarea
          id={setting.key}
          rows={8}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="w-full rounded-[8px] border border-outline-variant bg-surface-container-lowest px-4 py-3 text-[15px] leading-relaxed text-on-surface outline-none transition-all placeholder:text-outline focus:border-primary-container focus:ring-2 focus:ring-secondary-container"
        />
      ) : (
        <Input
          id={setting.key}
          type={setting.valueType === 'number' ? 'number' : 'text'}
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
      )}

      {setting.valueType === 'number' ? <FieldHint>Sayısal değer girin.</FieldHint> : null}
    </FormField>
  );
}
