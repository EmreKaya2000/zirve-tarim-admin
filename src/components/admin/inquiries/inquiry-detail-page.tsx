'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  ArrowLeft,
  Clock,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  ShieldCheck,
  ShoppingCart,
  User,
  UserPlus,
  UserX,
} from 'lucide-react';
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
  Skeleton,
  cn,
} from '@zirve/ui';
import {
  INQUIRY_SOURCE_LABELS,
  INQUIRY_STATUS_LABELS,
  PREFERRED_CONTACT_LABELS,
  isTerminalInquiryStatus,
  nextInquiryStatuses,
  SALE_CONVERSION_STATUS,
  type InquiryStatus,
} from '@zirve/types';

import { ApiError } from '@/lib/api-error';
import { formatMoney, formatQuantity } from '@/lib/format';
import { inquiriesApi, type InquiryDetail } from '@/lib/inquiries-api';
import { customersApi } from '@/lib/sales-api';

import { ConvertToSaleDialog } from './convert-to-sale-dialog';
import { statusVariant } from './inquiries-list-page';

/** Gerekçe ZORUNLU olan durumlar — backend ile aynı kural. */
const NOTE_REQUIRED: readonly InquiryStatus[] = ['REJECTED', 'CANCELLED'];

export function InquiryDetailPage({ inquiryId }: { inquiryId: string }) {
  const queryClient = useQueryClient();
  const [isStatusOpen, setStatusOpen] = useState(false);
  const [isConvertOpen, setConvertOpen] = useState(false);

  const query = useQuery({
    queryKey: ['inquiry', inquiryId],
    queryFn: () => inquiriesApi.get(inquiryId),
  });

  const invalidate = async (): Promise<void> => {
    await queryClient.invalidateQueries({ queryKey: ['inquiry', inquiryId] });
    await queryClient.invalidateQueries({ queryKey: ['inquiries'] });
  };

  if (query.isPending) {
    return <DetailSkeleton />;
  }

  if (query.isError || query.data === undefined) {
    return (
      <Alert variant="error" title="Talep yüklenemedi">
        {query.error instanceof ApiError ? query.error.message : 'Beklenmeyen bir hata oluştu.'}
      </Alert>
    );
  }

  const inquiry = query.data;

  // Satışa dönüşüm bu ekrandan yapılamaz (Sprint 8); seçeneklerden çıkarılır
  // ki yönetici backend'in reddedeceği bir işlemi denemesin.
  const options = nextInquiryStatuses(inquiry.status).filter(
    (status) => status !== SALE_CONVERSION_STATUS,
  );

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Button asChild variant="ghost" size="sm" className="-ml-2">
          <Link href="/talepler">
            <ArrowLeft />
            Taleplere dön
          </Link>
        </Button>

        <div className="mt-2 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="font-financial text-h1 text-on-surface">{inquiry.inquiryNumber}</h1>
            <p className="mt-1 text-on-surface-variant">
              {new Intl.DateTimeFormat('tr-TR', { dateStyle: 'long', timeStyle: 'short' }).format(
                new Date(inquiry.createdAt),
              )}{' '}
              · {INQUIRY_SOURCE_LABELS[inquiry.source]}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Badge variant={statusVariant(inquiry.status)}>
              {INQUIRY_STATUS_LABELS[inquiry.status]}
            </Badge>

            {isTerminalInquiryStatus(inquiry.status) ? (
              <span className="text-sm text-on-surface-variant">
                Bu talep kapandı; durumu değiştirilemez.
              </span>
            ) : (
              <>
                {/*
                  Satışa dönüştürme, durum makinesinden BAĞIMSIZ bir eylemdir:
                  CONVERTED_TO_SALE yalnız dönüşüm akışıyla set edilir, durum
                  değiştirme ucu onu reddeder.
                */}
                <Button onClick={() => setConvertOpen(true)}>
                  <ShoppingCart />
                  Satışa Dönüştür
                </Button>
                <Button variant="outline" onClick={() => setStatusOpen(true)}>
                  Durumu Değiştir
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px] lg:items-start">
        <div className="flex flex-col gap-6">
          <ItemsCard inquiry={inquiry} />

          <CustomerLinkCard inquiry={inquiry} onChanged={invalidate} />

          {inquiry.customerNote !== null ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-body-lg font-semibold">Müşteri Notu</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-line text-on-surface-variant">
                  {inquiry.customerNote}
                </p>
              </CardContent>
            </Card>
          ) : null}

          {inquiry.internalNote !== null ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-body-lg font-semibold">İç Not</CardTitle>
                <CardDescription>Yalnız yönetim görür; müşteriye gösterilmez.</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-line text-on-surface-variant">
                  {inquiry.internalNote}
                </p>
              </CardContent>
            </Card>
          ) : null}

          <TimelineCard inquiry={inquiry} />
        </div>

        <div className="flex flex-col gap-6">
          <ContactCard inquiry={inquiry} />
          <ConsentCard inquiry={inquiry} />
        </div>
      </div>

      <ConvertToSaleDialog open={isConvertOpen} onOpenChange={setConvertOpen} inquiry={inquiry} />

      <StatusDialog
        open={isStatusOpen}
        onOpenChange={setStatusOpen}
        inquiryId={inquiryId}
        options={options}
        onSuccess={async () => {
          await queryClient.invalidateQueries({ queryKey: ['inquiry', inquiryId] });
          await queryClient.invalidateQueries({ queryKey: ['inquiries'] });
          await queryClient.invalidateQueries({ queryKey: ['inquiry-counts'] });
          setStatusOpen(false);
        }}
      />
    </div>
  );
}

/** Talep kalemleri — snapshot alanlarından gösterilir. */
function ItemsCard({ inquiry }: { inquiry: InquiryDetail }) {
  const hasHiddenPrice = inquiry.items.some((item) => item.displayedPriceSnapshot === null);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-body-lg font-semibold">
          Talep Kalemleri ({inquiry.items.length})
        </CardTitle>
        <CardDescription>
          Bilgiler talep anındaki hâliyle saklanır; ürün sonradan değişse de bu kayıt değişmez.
        </CardDescription>
      </CardHeader>

      <CardContent className="flex flex-col gap-3">
        {inquiry.items.map((item) => {
          const unavailable =
            item.product === null ||
            item.product.deletedAt !== null ||
            !item.product.isActive ||
            !item.product.isPublished ||
            item.variant === null ||
            !item.variant.isActive;

          return (
            <div
              key={item.id}
              className="flex flex-wrap items-start justify-between gap-3 rounded-[10px] border border-outline-variant p-3"
            >
              <div className="min-w-0 flex-1">
                <p className="text-label-md text-on-surface">
                  {item.product === null ? (
                    item.productNameSnapshot
                  ) : (
                    <Link
                      href={`/urunler/${item.product.slug}`}
                      target="_blank"
                      className="hover:text-primary-container hover:underline"
                    >
                      {item.productNameSnapshot}
                    </Link>
                  )}
                </p>

                <p className="text-sm text-on-surface-variant">
                  {item.variantNameSnapshot ?? '—'} · SKU:{' '}
                  <span className="font-financial">{item.skuSnapshot}</span>
                </p>

                {item.note !== null ? (
                  <p className="mt-1 text-sm text-on-surface-variant">Not: {item.note}</p>
                ) : null}

                {unavailable ? (
                  <p className="mt-1 flex items-center gap-1.5 text-sm text-warning">
                    <AlertTriangle className="size-3.5" aria-hidden="true" />
                    Ürün veya satış birimi artık yayında değil.
                  </p>
                ) : item.variant !== null &&
                  Number(item.variant.stockQuantity) < Number(item.quantity) ? (
                  <p className="mt-1 flex items-center gap-1.5 text-sm text-warning">
                    <AlertTriangle className="size-3.5" aria-hidden="true" />
                    Stok yetersiz: {formatQuantity(item.variant.stockQuantity)}{' '}
                    {item.unitTypeSnapshot} mevcut.
                  </p>
                ) : null}
              </div>

              <div className="text-right">
                <p className="font-financial text-label-md text-on-surface">
                  {formatQuantity(item.quantity)} {item.unitTypeSnapshot}
                </p>

                {item.displayedPriceSnapshot === null ? (
                  <p className="text-sm text-primary-container">Fiyat gösterilmedi</p>
                ) : (
                  <p className="font-financial text-sm text-on-surface-variant">
                    {formatMoney(item.displayedPriceSnapshot)} → {formatMoney(item.lineTotal)}
                  </p>
                )}
              </div>
            </div>
          );
        })}

        <div className="flex items-baseline justify-between border-t border-outline-variant pt-3">
          <span className="text-label-md text-on-surface">Tahmini Toplam</span>
          <span className="font-financial text-h3 text-on-surface">
            {formatMoney(inquiry.estimatedTotal)}
          </span>
        </div>

        {hasHiddenPrice ? (
          <p className="text-sm text-on-surface-variant">
            Bazı kalemlerin fiyatı müşteriye gösterilmedi; toplam onları içermez.
          </p>
        ) : null}

        <Alert variant="info" title="Bu tutar bağlayıcı değildir">
          Talep anında müşteriye gösterilen fiyatlar üzerinden hesaplanmıştır. Satış fiyatı
          görüşmede netleşir.
        </Alert>
      </CardContent>
    </Card>
  );
}

function ContactCard({ inquiry }: { inquiry: InquiryDetail }) {
  const phoneDigits = inquiry.contactPhone.replace(/\D/g, '');

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-body-lg font-semibold">İletişim Bilgileri</CardTitle>
        <CardDescription>
          Tercih edilen kanal: {PREFERRED_CONTACT_LABELS[inquiry.preferredContact]}
        </CardDescription>
      </CardHeader>

      <CardContent className="flex flex-col gap-3">
        <Row icon={<User className="size-4" />} label="Ad Soyad" value={inquiry.contactName} />

        <Row
          icon={<Phone className="size-4" />}
          label="Telefon"
          value={inquiry.contactPhone}
          href={`tel:+90${phoneDigits}`}
        />

        <Row
          icon={<MessageCircle className="size-4" />}
          label="WhatsApp"
          value="Mesaj gönder"
          href={`https://wa.me/90${phoneDigits}`}
          external
        />

        {inquiry.contactEmail !== null ? (
          <Row
            icon={<Mail className="size-4" />}
            label="E-posta"
            value={inquiry.contactEmail}
            href={`mailto:${inquiry.contactEmail}`}
          />
        ) : null}

        <Row
          icon={<MapPin className="size-4" />}
          label="Konum"
          value={`${inquiry.city} / ${inquiry.district}`}
        />

        {inquiry.address !== null ? (
          <Row icon={<MapPin className="size-4" />} label="Adres" value={inquiry.address} />
        ) : null}

        {inquiry.contactedAt !== null ? (
          <Row
            icon={<Clock className="size-4" />}
            label="İlk temas"
            value={new Intl.DateTimeFormat('tr-TR', {
              dateStyle: 'medium',
              timeStyle: 'short',
            }).format(new Date(inquiry.contactedAt))}
          />
        ) : null}
      </CardContent>
    </Card>
  );
}

/**
 * KVKK onay kanıtı.
 *
 * Onayın zamanı ve isteğin IP'si birlikte gösterilir: bir uyuşmazlıkta
 * "onay alınmış mı" sorusunun cevabı bu kayıttır.
 */
function ConsentCard({ inquiry }: { inquiry: InquiryDetail }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-body-lg font-semibold">
          <ShieldCheck className="size-4 text-success" aria-hidden="true" />
          KVKK Onayı
        </CardTitle>
      </CardHeader>

      <CardContent className="flex flex-col gap-2 text-sm text-on-surface-variant">
        <p>
          Onay{' '}
          <span className="font-financial text-on-surface">
            {new Intl.DateTimeFormat('tr-TR', {
              dateStyle: 'medium',
              timeStyle: 'medium',
            }).format(new Date(inquiry.consentAt))}
          </span>{' '}
          tarihinde alındı.
        </p>

        {inquiry.ipAddress !== null ? (
          <p>
            IP: <span className="font-financial">{inquiry.ipAddress}</span>
          </p>
        ) : null}

        {inquiry.userAgent !== null ? <p className="break-all">{inquiry.userAgent}</p> : null}
      </CardContent>
    </Card>
  );
}

/** Durum geçmişi zaman çizelgesi. */
function TimelineCard({ inquiry }: { inquiry: InquiryDetail }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-body-lg font-semibold">Durum Geçmişi</CardTitle>
        <CardDescription>Kayıtlar silinmez; her değişiklik burada görünür.</CardDescription>
      </CardHeader>

      <CardContent>
        <ol className="flex flex-col">
          {inquiry.statusHistories.map((entry, index) => (
            <li key={entry.id} className="flex gap-3">
              <div className="flex flex-col items-center">
                <span
                  className={cn(
                    'mt-1 size-2.5 shrink-0 rounded-full',
                    index === 0 ? 'bg-primary' : 'bg-outline-variant',
                  )}
                  aria-hidden="true"
                />
                {index < inquiry.statusHistories.length - 1 ? (
                  <span className="w-px flex-1 bg-outline-variant" aria-hidden="true" />
                ) : null}
              </div>

              <div className="pb-5">
                <p className="text-label-md text-on-surface">
                  {entry.fromStatus === null
                    ? 'Talep oluşturuldu'
                    : `${INQUIRY_STATUS_LABELS[entry.fromStatus]} → ${INQUIRY_STATUS_LABELS[entry.toStatus]}`}
                </p>

                <p className="font-financial text-sm text-on-surface-variant">
                  {new Intl.DateTimeFormat('tr-TR', {
                    dateStyle: 'medium',
                    timeStyle: 'short',
                  }).format(new Date(entry.createdAt))}
                  {' · '}
                  {entry.changedBy?.fullName ?? 'Müşteri (web)'}
                </p>

                {entry.note !== null ? (
                  <p className="mt-1 text-sm text-on-surface-variant">{entry.note}</p>
                ) : null}
              </div>
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  );
}

function StatusDialog({
  open,
  onOpenChange,
  inquiryId,
  options,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  inquiryId: string;
  options: readonly InquiryStatus[];
  onSuccess: () => Promise<void>;
}) {
  const [status, setStatus] = useState<InquiryStatus | ''>('');
  const [note, setNote] = useState('');
  const [internalNote, setInternalNote] = useState('');
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () =>
      inquiriesApi.updateStatus(inquiryId, {
        status: status as InquiryStatus,
        ...(note.trim() !== '' && { note: note.trim() }),
        ...(internalNote.trim() !== '' && { internalNote: internalNote.trim() }),
      }),
    onSuccess: async () => {
      setStatus('');
      setNote('');
      setInternalNote('');
      setError(null);
      await onSuccess();
    },
    onError: (mutationError: unknown) => {
      setError(
        mutationError instanceof ApiError
          ? [mutationError.message, ...mutationError.details.map((d) => d.message)].join(' ')
          : 'Durum değiştirilemedi.',
      );
    },
  });

  const noteRequired = status !== '' && NOTE_REQUIRED.includes(status);
  const canSubmit = status !== '' && (!noteRequired || note.trim() !== '');

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Durumu Değiştir"
      description="Değişiklik durum geçmişine ve denetim günlüğüne yazılır."
      errorMessage={error}
      isSubmitting={mutation.isPending}
      submitLabel="Kaydet"
      onSubmit={(event) => {
        event.preventDefault();
        setError(null);

        if (canSubmit) {
          mutation.mutate();
        }
      }}
    >
      <FormField>
        <Label htmlFor="status" required>
          Yeni Durum
        </Label>
        <Select
          id="status"
          value={status}
          onChange={(event) => setStatus(event.target.value as InquiryStatus)}
        >
          <option value="">Seçiniz...</option>
          {options.map((value) => (
            <option key={value} value={value}>
              {INQUIRY_STATUS_LABELS[value]}
            </option>
          ))}
        </Select>
        <FieldHint>
          Yalnız mevcut durumdan geçilebilecek durumlar listelenir. Kapanan talep yeniden açılamaz.
        </FieldHint>
      </FormField>

      <FormField>
        <Label htmlFor="note" required={noteRequired}>
          Gerekçe / Açıklama
        </Label>
        <textarea
          id="note"
          rows={3}
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder={
            noteRequired ? 'Talep neden iptal/red edildi?' : 'Durum geçmişinde görünecek not'
          }
          className="w-full rounded-[8px] border border-outline-variant bg-surface-container-lowest px-4 py-3 text-[15px] text-on-surface outline-none transition-all placeholder:text-outline focus:border-primary-container focus:ring-2 focus:ring-secondary-container"
        />
        {noteRequired ? (
          <FieldError
            message={
              note.trim() === '' ? 'İptal ve red işlemlerinde gerekçe zorunludur.' : undefined
            }
          />
        ) : null}
      </FormField>

      <FormField>
        <Label htmlFor="internalNote">İç Not</Label>
        <textarea
          id="internalNote"
          rows={2}
          value={internalNote}
          onChange={(event) => setInternalNote(event.target.value)}
          placeholder="Yalnız yönetimin göreceği not"
          className="w-full rounded-[8px] border border-outline-variant bg-surface-container-lowest px-4 py-3 text-[15px] text-on-surface outline-none transition-all placeholder:text-outline focus:border-primary-container focus:ring-2 focus:ring-secondary-container"
        />
      </FormField>
    </FormDialog>
  );
}

function Row({
  icon,
  label,
  value,
  href,
  external = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  href?: string;
  external?: boolean;
}) {
  const content = (
    <>
      <span className="flex size-8 shrink-0 items-center justify-center rounded-[8px] bg-surface-container-high text-on-surface-variant">
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block text-label-sm uppercase text-on-surface-variant">{label}</span>
        <span className="block break-words text-sm text-on-surface">{value}</span>
      </span>
    </>
  );

  if (href === undefined) {
    return <div className="flex items-center gap-3">{content}</div>;
  }

  return (
    <a
      href={href}
      {...(external && { target: '_blank', rel: 'noopener noreferrer' })}
      className="flex items-center gap-3 hover:text-primary-container"
    >
      {content}
    </a>
  );
}

function DetailSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <Skeleton className="h-10 w-64" />
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <Skeleton className="h-72" />
        <Skeleton className="h-72" />
      </div>
    </div>
  );
}

/**
 * Talep–müşteri eşleştirme kartı (Sprint 7 şartı 4).
 *
 * NEDEN GEREKLİ: talep formunu dolduran ziyaretçinin sistemde zaten bir
 * müşteri kartı olabilir. Talebi ona bağlamak, müşteri geçmişini tek yerde
 * toplar ve satışa dönüşümde ikinci bir mükerrer kart açılmasını önler.
 *
 * Satışa dönüşmüş talepte bağ DEĞİŞTİRİLEMEZ: satış zaten bir müşteriye
 * yazılmıştır, talebi başka müşteriye taşımak belgeyle talebi koparırdı.
 */
function CustomerLinkCard({
  inquiry,
  onChanged,
}: {
  inquiry: InquiryDetail;
  onChanged: () => void | Promise<void>;
}) {
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);

  const isLocked = inquiry.status === 'CONVERTED_TO_SALE';

  const candidatesQuery = useQuery({
    queryKey: ['customer-candidates', search],
    // Arama boşken talebin TELEFONUYLA aranır: en olası eşleşme odur.
    queryFn: () =>
      customersApi.list({
        limit: 10,
        search: search.trim() === '' ? inquiry.contactPhone : search.trim(),
      }),
    enabled: !isLocked && inquiry.customer === null,
  });

  const linkMutation = useMutation({
    mutationFn: (customerId: string | null) => inquiriesApi.linkCustomer(inquiry.id, customerId),
    onSuccess: async () => {
      setError(null);
      await onChanged();
    },
    onError: (mutationError: unknown) => {
      setError(mutationError instanceof ApiError ? mutationError.message : 'Müşteri bağlanamadı.');
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-body-lg font-semibold">Müşteri Eşleştirme</CardTitle>
        <CardDescription>
          {inquiry.customer === null
            ? 'Bu talep henüz bir müşteri kartına bağlı değil.'
            : 'Talep bir müşteri kartına bağlı; geçmiş o kartta toplanıyor.'}
        </CardDescription>
      </CardHeader>

      <CardContent className="flex flex-col gap-3">
        {error !== null ? <FieldError message={error} /> : null}

        {inquiry.customer !== null ? (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-[8px] border border-outline-variant px-4 py-3">
            <Link
              href={`/musteriler/${inquiry.customer.id}`}
              className="text-on-surface hover:text-primary-container"
            >
              <span className="block text-label-md">{inquiry.customer.fullName}</span>
              <span className="block font-financial text-label-sm text-on-surface-variant">
                {inquiry.customer.code} · {inquiry.customer.phone}
              </span>
            </Link>

            {isLocked ? (
              <Badge variant="neutral">Satışa dönüştü</Badge>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                disabled={linkMutation.isPending}
                onClick={() => linkMutation.mutate(null)}
              >
                <UserX />
                Bağı kaldır
              </Button>
            )}
          </div>
        ) : isLocked ? (
          <p className="text-sm text-on-surface-variant">
            Satışa dönüşmüş talebin müşterisi satış üzerinden yönetilir.
          </p>
        ) : (
          <>
            <Input
              placeholder="Ad, telefon veya müşteri kodu ile ara..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />

            {(candidatesQuery.data?.items ?? []).length === 0 ? (
              <p className="text-sm text-on-surface-variant">
                Eşleşen müşteri bulunamadı. Talebi satışa dönüştürürken yeni müşteri
                oluşturabilirsiniz.
              </p>
            ) : (
              <ul className="flex flex-col gap-2">
                {(candidatesQuery.data?.items ?? []).map((candidate) => (
                  <li
                    key={candidate.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-[8px] border border-outline-variant px-3 py-2"
                  >
                    <span>
                      <span className="block text-sm text-on-surface">{candidate.fullName}</span>
                      <span className="block font-financial text-label-sm text-on-surface-variant">
                        {candidate.code} · {candidate.phone}
                      </span>
                    </span>

                    <Button
                      variant="outline"
                      size="sm"
                      disabled={linkMutation.isPending}
                      onClick={() => linkMutation.mutate(candidate.id)}
                    >
                      <UserPlus />
                      Bağla
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
