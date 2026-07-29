'use client';

import { useEffect, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import {
  Alert,
  FieldError,
  FieldHint,
  FormDialog,
  FormField,
  Input,
  Label,
  Select,
} from '@zirve/ui';
import {
  CUSTOMER_TYPES,
  CUSTOMER_TYPE_LABELS,
  hasFirstAndLastName,
  type ApiWarning,
  type CustomerType,
} from '@zirve/types';

import { ApiError } from '@/lib/api-error';
import { customersApi, type CustomerDetail, type CustomerPayload } from '@/lib/sales-api';

interface CustomerFormDialogProps {
  open: boolean;
  /** Dolu ise düzenleme, boş ise oluşturma. */
  customer?: CustomerDetail | null;
  onOpenChange: (open: boolean) => void;
  onSaved: (customer: CustomerDetail) => void | Promise<void>;
}

const EMPTY: CustomerPayload = {
  type: 'INDIVIDUAL',
  fullName: '',
  companyName: '',
  phone: '',
  altPhone: '',
  email: '',
  taxNumber: '',
  taxOffice: '',
  city: '',
  district: '',
  address: '',
  creditLimit: '0',
  openingBalance: '0',
  note: '',
};

/**
 * Müşteri oluşturma/düzenleme formu.
 *
 * TİPE GÖRE DEĞİŞEN ALANLAR (Sprint 7 şartı 2): bireysel müşteride ad ve
 * soyad birlikte zorunlu, kurumsalda firma adı zorunlu. Kural
 * `@zirve/types` içindeki tek tablodan okunur; formun yıldızlı gösterdiği
 * alan ile backend'in reddettiği alan ayrışamaz.
 *
 * MÜKERRER TELEFON KAYDI ENGELLEMEZ: numara girildiğinde ön kontrol yapılır
 * ve kullanıcı uyarılır, ama kaydetme yolu açık kalır — aynı hattı paylaşan
 * baba ile oğul gerçek iki müşteridir.
 */
export function CustomerFormDialog({
  open,
  customer,
  onOpenChange,
  onSaved,
}: CustomerFormDialogProps) {
  const isEdit = customer !== undefined && customer !== null;

  const [values, setValues] = useState<CustomerPayload>(EMPTY);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [duplicate, setDuplicate] = useState<ApiWarning | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    setFormError(null);
    setFieldErrors({});
    setDuplicate(null);
    setValues(
      isEdit
        ? {
            type: customer.type,
            fullName: customer.fullName,
            companyName: customer.companyName ?? '',
            phone: customer.phone,
            altPhone: customer.altPhone ?? '',
            email: customer.email ?? '',
            taxNumber: customer.taxNumber ?? '',
            taxOffice: customer.taxOffice ?? '',
            city: customer.city ?? '',
            district: customer.district ?? '',
            address: customer.address ?? '',
            creditLimit: customer.creditLimit,
            note: customer.note ?? '',
          }
        : EMPTY,
    );
  }, [open, customer, isEdit]);

  const type = (values.type ?? 'INDIVIDUAL') as CustomerType;
  const isCorporate = type === 'CORPORATE';

  const saveMutation = useMutation({
    mutationFn: () => {
      const payload = toPayload(values, isEdit);

      return isEdit ? customersApi.update(customer.id, payload) : customersApi.create(payload);
    },
    onSuccess: async (saved) => {
      await onSaved(saved);
      onOpenChange(false);
    },
    onError: (error: unknown) => {
      if (error instanceof ApiError) {
        setFormError(error.message);
        setFieldErrors(error.toFieldErrors());
        return;
      }

      setFormError('Müşteri kaydedilemedi.');
    },
  });

  /**
   * Telefon alanından çıkıldığında mükerrer kontrolü.
   *
   * Her tuş vuruşunda değil `onBlur`'da yapılır: numara yazılırken her ara
   * hâl için istek atmak hem gereksiz hem yanıltıcı olurdu.
   */
  async function checkDuplicate(): Promise<void> {
    const phone = (values.phone ?? '').trim();

    if (phone.length < 10) {
      setDuplicate(null);
      return;
    }

    try {
      const result = await customersApi.checkDuplicatePhone(
        phone,
        isEdit ? customer.id : undefined,
      );

      setDuplicate(result.warning);
    } catch {
      // Ön kontrol bir KOLAYLIKTIR; başarısız olması kaydı engellememeli.
      setDuplicate(null);
    }
  }

  function set(field: keyof CustomerPayload, value: string): void {
    setValues((previous) => ({ ...previous, [field]: value }));
  }

  function onSubmit(event: React.FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    setFormError(null);

    // Backend aynı kuralı bağımsız uygular; buradaki kontrol kullanıcıyı
    // sunucuya gitmeden uyarmak içindir (Kural 10).
    const errors = validate(values, type);

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setFieldErrors({});
    saveMutation.mutate();
  }

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={isEdit ? 'Müşteriyi Düzenle' : 'Yeni Müşteri'}
      description={
        isCorporate
          ? 'Kurumsal müşteride fatura ticari unvana kesilir.'
          : 'Bireysel müşteride ad ve soyad birlikte girilmelidir.'
      }
      onSubmit={onSubmit}
      errorMessage={formError}
      isSubmitting={saveMutation.isPending}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField>
          <Label htmlFor="customer-type" required>
            Müşteri Tipi
          </Label>
          <Select
            id="customer-type"
            value={type}
            onChange={(event) => set('type', event.target.value)}
          >
            {CUSTOMER_TYPES.map((value) => (
              <option key={value} value={value}>
                {CUSTOMER_TYPE_LABELS[value]}
              </option>
            ))}
          </Select>
        </FormField>

        <FormField>
          <Label htmlFor="customer-fullName" required>
            {isCorporate ? 'Yetkili Kişi' : 'Ad Soyad'}
          </Label>
          <Input
            id="customer-fullName"
            placeholder={isCorporate ? 'Ahmet Yılmaz' : 'Ahmet Yılmaz'}
            value={values.fullName ?? ''}
            invalid={fieldErrors['fullName'] !== undefined}
            onChange={(event) => set('fullName', event.target.value)}
          />
          {fieldErrors['fullName'] === undefined ? (
            <FieldHint>
              {isCorporate ? 'Firmadaki muhatap.' : 'Ad ve soyad birlikte yazılmalıdır.'}
            </FieldHint>
          ) : (
            <FieldError message={fieldErrors['fullName']} />
          )}
        </FormField>

        {/* Firma alanları YALNIZ kurumsalda gösterilir: bireysel müşteride
            boş duran vergi dairesi alanı formu gereksiz uzatır. */}
        {isCorporate ? (
          <>
            <FormField>
              <Label htmlFor="customer-companyName" required>
                Firma Adı
              </Label>
              <Input
                id="customer-companyName"
                placeholder="Ova Tarım Ltd. Şti."
                value={values.companyName ?? ''}
                invalid={fieldErrors['companyName'] !== undefined}
                onChange={(event) => set('companyName', event.target.value)}
              />
              <FieldError message={fieldErrors['companyName']} />
            </FormField>

            <FormField>
              <Label htmlFor="customer-taxOffice">Vergi Dairesi</Label>
              <Input
                id="customer-taxOffice"
                value={values.taxOffice ?? ''}
                onChange={(event) => set('taxOffice', event.target.value)}
              />
            </FormField>
          </>
        ) : null}

        <FormField>
          <Label htmlFor="customer-phone" required>
            Telefon
          </Label>
          <Input
            id="customer-phone"
            inputMode="tel"
            placeholder="0532 123 45 67"
            value={values.phone ?? ''}
            invalid={fieldErrors['phone'] !== undefined}
            onChange={(event) => set('phone', event.target.value)}
            onBlur={() => void checkDuplicate()}
          />
          <FieldError message={fieldErrors['phone']} />
        </FormField>

        <FormField>
          <Label htmlFor="customer-altPhone">İkinci Telefon</Label>
          <Input
            id="customer-altPhone"
            inputMode="tel"
            value={values.altPhone ?? ''}
            onChange={(event) => set('altPhone', event.target.value)}
          />
        </FormField>

        <FormField>
          <Label htmlFor="customer-email">E-posta</Label>
          <Input
            id="customer-email"
            type="email"
            value={values.email ?? ''}
            invalid={fieldErrors['email'] !== undefined}
            onChange={(event) => set('email', event.target.value)}
          />
          <FieldError message={fieldErrors['email']} />
        </FormField>

        <FormField>
          <Label htmlFor="customer-taxNumber">{isCorporate ? 'Vergi No' : 'TC Kimlik No'}</Label>
          <Input
            id="customer-taxNumber"
            inputMode="numeric"
            value={values.taxNumber ?? ''}
            onChange={(event) => set('taxNumber', event.target.value)}
          />
        </FormField>

        <FormField>
          <Label htmlFor="customer-city">İl</Label>
          <Input
            id="customer-city"
            value={values.city ?? ''}
            onChange={(event) => set('city', event.target.value)}
          />
        </FormField>

        <FormField>
          <Label htmlFor="customer-district">İlçe</Label>
          <Input
            id="customer-district"
            value={values.district ?? ''}
            onChange={(event) => set('district', event.target.value)}
          />
        </FormField>

        <FormField>
          <Label htmlFor="customer-creditLimit">Kredi Limiti</Label>
          <Input
            id="customer-creditLimit"
            inputMode="decimal"
            value={values.creditLimit ?? '0'}
            onChange={(event) => set('creditLimit', event.target.value)}
          />
          <FieldHint>Aşım satışı ENGELLEMEZ, yalnız uyarı üretir.</FieldHint>
        </FormField>

        {/* Devir bakiyesi yalnız OLUŞTURMADA girilir: sonradan değiştirmek
            geçmiş borç hesabını sessizce kaydırır. */}
        {!isEdit ? (
          <FormField>
            <Label htmlFor="customer-openingBalance">Devir Bakiyesi</Label>
            <Input
              id="customer-openingBalance"
              inputMode="decimal"
              value={values.openingBalance ?? '0'}
              onChange={(event) => set('openingBalance', event.target.value)}
            />
            <FieldHint>Pozitif = müşteri borçlu. Sonradan değiştirilemez.</FieldHint>
          </FormField>
        ) : null}
      </div>

      <FormField>
        <Label htmlFor="customer-address">Adres</Label>
        <Input
          id="customer-address"
          value={values.address ?? ''}
          onChange={(event) => set('address', event.target.value)}
        />
      </FormField>

      <FormField>
        <Label htmlFor="customer-note">Kalıcı Not</Label>
        <Input
          id="customer-note"
          placeholder="Örn. kapıda ödeme istiyor"
          value={values.note ?? ''}
          onChange={(event) => set('note', event.target.value)}
        />
        <FieldHint>
          Müşteriyle ilgili değişmeyen bilgi. Görüşme kayıtları için detay sayfasındaki “Notlar”
          sekmesini kullanın.
        </FieldHint>
      </FormField>

      {duplicate !== null ? (
        <Alert variant="warning" title="Bu numara başka müşteride de kayıtlı">
          {duplicate.message} Kaydetmeye devam edebilirsiniz — aynı hattı paylaşan iki müşteri
          olabilir.
        </Alert>
      ) : null}
    </FormDialog>
  );
}

/** Boş metinleri gönderme: backend'de `""` ile `undefined` aynı şey değildir. */
function toPayload(values: CustomerPayload, isEdit: boolean): CustomerPayload {
  const payload: CustomerPayload = {};

  for (const [key, value] of Object.entries(values)) {
    if (typeof value === 'string' && value.trim() === '') {
      continue;
    }

    (payload as Record<string, unknown>)[key] = value;
  }

  // Devir bakiyesi güncelleme gövdesinde KABUL EDİLMEZ; gönderilirse
  // istek tümüyle reddedilir (forbidNonWhitelisted).
  if (isEdit) {
    delete payload.openingBalance;
  }

  return payload;
}

/** Kaydetmeden önceki istemci tarafı kontrolü. */
function validate(values: CustomerPayload, type: CustomerType): Record<string, string> {
  const errors: Record<string, string> = {};
  const fullName = (values.fullName ?? '').trim();

  if (fullName === '') {
    errors['fullName'] = 'Ad soyad zorunludur.';
  } else if (type === 'INDIVIDUAL' && !hasFirstAndLastName(fullName)) {
    errors['fullName'] = 'Bireysel müşteride ad ve soyad birlikte girilmelidir.';
  }

  if (type === 'CORPORATE' && (values.companyName ?? '').trim() === '') {
    errors['companyName'] = 'Kurumsal müşteride firma adı zorunludur.';
  }

  if ((values.phone ?? '').trim() === '') {
    errors['phone'] = 'Telefon numarası zorunludur.';
  }

  return errors;
}
