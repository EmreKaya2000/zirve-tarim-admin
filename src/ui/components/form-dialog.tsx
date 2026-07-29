'use client';

import * as React from 'react';

import { Alert } from './alert';
import { Button } from './button';
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './dialog';

export interface FormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;

  title: string;
  description?: string;

  /** Form alanları. */
  children: React.ReactNode;

  /** Form gönderildiğinde çalışır. Dialog kendi `<form>` etiketini sağlar. */
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;

  /** Alan bazlı olmayan genel hata. */
  errorMessage?: string | null;

  isSubmitting?: boolean;
  submitLabel?: string;
  cancelLabel?: string;

  /** Silme gibi yıkıcı işlemler için buton rengini değiştirir. */
  destructive?: boolean;
}

/**
 * Form içeren modal.
 *
 * Sprint 3'ten itibaren tüm admin oluşturma/düzenleme formları bunu kullanır.
 * `<form>` etiketini kendisi sağlar; böylece Enter ile gönderme ve
 * `type="submit"` davranışı her yerde aynı çalışır.
 *
 * Not: Form durumu (React Hook Form) DIŞARIDA yönetilir — bu bileşen yalnız
 * kabuk ve düğmelerden sorumludur.
 */
export function FormDialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  onSubmit,
  errorMessage,
  isSubmitting = false,
  submitLabel = 'Kaydet',
  cancelLabel = 'İptal',
  destructive = false,
}: FormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description !== undefined ? <DialogDescription>{description}</DialogDescription> : null}
        </DialogHeader>

        <form
          onSubmit={(event) => {
            /*
             * OLAY DIŞ FORMA SIZMASIN.
             *
             * BULUNAN HATA: React olayları DOM ağacında değil REACT ağacında
             * yükselir. Diyalog içeriği `Dialog.Portal` ile `body`ye taşınsa
             * bile bu `<form>`un submit olayı React ağacındaki ATALARA ulaşır.
             *
             * Ürün formu yedi sekmesini kendi `<form>` etiketinin içinde
             * tutuyor ve varyasyon diyaloğu o ağacın içinde yaşıyor. Sonuç:
             * diyalogdaki "Kaydet" varyasyonu kaydetmekle birlikte ÜRÜN
             * FORMUNU DA gönderiyordu — yönetici yalnız varyasyon eklerken
             * ürün sessizce kaydediliyor, hatta yeni üründe kayıt sırasında
             * düzenleme sayfasına atılıyordu.
             *
             * `stopPropagation` diyaloğun gönderimini kendi içinde tutar.
             */
            event.stopPropagation();
            onSubmit(event);
          }}
          noValidate
        >
          <DialogBody className="flex flex-col gap-4">
            {errorMessage !== null && errorMessage !== undefined ? (
              <Alert variant="error">{errorMessage}</Alert>
            ) : null}

            {children}
          </DialogBody>

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              {cancelLabel}
            </Button>
            <Button
              type="submit"
              variant={destructive ? 'destructive' : 'primary'}
              loading={isSubmitting}
            >
              {submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  onConfirm: () => void;

  /**
   * İşlem başarısız olduğunda gösterilecek mesaj.
   *
   * NEDEN GEREKLİ: onay kutusu yalnız BAŞARIDA kapanır. Hata mesajı için yer
   * olmadığında başarısız bir silme, kullanıcıya "düğme çalışmıyor" olarak
   * görünür — açık kalan diyalogda hiçbir açıklama olmaz. Silme akışlarının
   * sessiz kalması Sprint 12 sonrası bulunan 204 hatasını da gizlemişti.
   */
  errorMessage?: string | null;

  isPending?: boolean;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
}

/** Silme gibi geri alınamaz işlemler için onay kutusu. */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  onConfirm,
  errorMessage,
  isPending = false,
  confirmLabel = 'Evet, devam et',
  cancelLabel = 'Vazgeç',
  destructive = true,
}: ConfirmDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        {errorMessage !== null && errorMessage !== undefined ? (
          <DialogBody>
            <Alert variant="error">{errorMessage}</Alert>
          </DialogBody>
        ) : null}

        <DialogFooter>
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            {cancelLabel}
          </Button>
          <Button
            type="button"
            variant={destructive ? 'destructive' : 'primary'}
            onClick={onConfirm}
            loading={isPending}
          >
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
