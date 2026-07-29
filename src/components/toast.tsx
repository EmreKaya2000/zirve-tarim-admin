'use client';

import { useEffect } from 'react';
import { create } from 'zustand';
import { AlertTriangle, CheckCircle2, Info, X } from 'lucide-react';
import { cn } from '@zirve/ui';

/**
 * Hafif bildirim (toast) altyapısı — Sprint 11.
 *
 * NEDEN `@zirve/ui` İÇİNDE DEĞİL: bildirim bir bileşen değil, uygulama
 * genelinde tek bir KUYRUKTUR. Tasarım sistemi paketi durumsuz kalır
 * (bileşenler kaynak olarak dağıtılır, örnek tutmazlar); kuyruk uygulamaya
 * aittir. Görsel dil `Alert` bileşeniyle aynı token'ları kullanır.
 *
 * NEDEN `Alert` YETMEDİ: birleştirme sonucu ("2 ürün taşınamadı") sayfa
 * geçişinden SONRA gösterilmelidir — kullanıcı `/giris`ten `/talep-sepeti`ne
 * yönlendirilir. Sayfaya gömülü bir uyarı, yönlendirmede kaybolurdu.
 */

export type ToastVariant = 'success' | 'warning' | 'info';

export interface Toast {
  id: number;
  variant: ToastVariant;
  title: string;
  /** Alt satırlar — atlanan ürünlerin nedenleri gibi. */
  lines?: string[];
}

/** Bildirimin ekranda kalma süresi (ms). */
const AUTO_DISMISS_MS = 8_000;

interface ToastState {
  toasts: Toast[];
  push: (toast: Omit<Toast, 'id'>) => void;
  dismiss: (id: number) => void;
}

let nextId = 0;

const useToastStore = create<ToastState>((set) => ({
  toasts: [],

  push: (toast) =>
    set((state) => {
      nextId += 1;

      // En fazla üç bildirim: dördüncüsü en eskisini düşürür. Sınırsız
      // yığılma ekranı kaplar ve asıl içeriği okunamaz hâle getirir.
      return { toasts: [...state.toasts, { ...toast, id: nextId }].slice(-3) };
    }),

  dismiss: (id) => set((state) => ({ toasts: state.toasts.filter((item) => item.id !== id) })),
}));

/**
 * Bildirim gönderir.
 *
 * React DIŞINDAN da çağrılabilir (mutation `onSuccess` gibi); bu yüzden
 * kanca değil düz bir işlevdir.
 */
export function showToast(toast: Omit<Toast, 'id'>): void {
  useToastStore.getState().push(toast);
}

const VARIANT_STYLES: Record<ToastVariant, string> = {
  success: 'border-success/40 bg-success-container text-on-success-container',
  warning: 'border-warning/40 bg-warning-container text-on-warning-container',
  info: 'border-outline-variant bg-surface-container-lowest text-on-surface',
};

const VARIANT_ICONS: Record<ToastVariant, typeof Info> = {
  success: CheckCircle2,
  warning: AlertTriangle,
  info: Info,
};

/**
 * Bildirim alanı — kök yerleşimde bir kez mount edilir.
 *
 * `aria-live="polite"`: ekran okuyucu, kullanıcının o anki işini kesmeden
 * bildirimi okur. "assertive" olsaydı sepetteki her değişiklik konuşmayı
 * bölerdi.
 */
export function ToastViewport() {
  const toasts = useToastStore((state) => state.toasts);

  return (
    <div
      aria-live="polite"
      aria-atomic="false"
      className="pointer-events-none fixed inset-x-0 bottom-0 z-[60] flex flex-col items-center gap-2 p-4 sm:inset-x-auto sm:right-4 sm:items-end"
    >
      {toasts.map((toast) => (
        <ToastCard key={toast.id} toast={toast} />
      ))}
    </div>
  );
}

function ToastCard({ toast }: { toast: Toast }) {
  const dismiss = useToastStore((state) => state.dismiss);
  const Icon = VARIANT_ICONS[toast.variant];

  useEffect(() => {
    const timer = setTimeout(() => dismiss(toast.id), AUTO_DISMISS_MS);

    return () => clearTimeout(timer);
  }, [toast.id, dismiss]);

  return (
    <div
      role="status"
      className={cn(
        'pointer-events-auto flex w-full max-w-md gap-3 rounded-[12px] border p-4 shadow-lg',
        VARIANT_STYLES[toast.variant],
      )}
    >
      <Icon className="mt-0.5 size-5 shrink-0" aria-hidden="true" />

      <div className="min-w-0 flex-1">
        <p className="text-label-md">{toast.title}</p>

        {toast.lines !== undefined && toast.lines.length > 0 ? (
          <ul className="mt-1 flex flex-col gap-0.5 text-sm opacity-90">
            {toast.lines.map((line, index) => (
              <li key={index}>{line}</li>
            ))}
          </ul>
        ) : null}
      </div>

      <button
        type="button"
        onClick={() => dismiss(toast.id)}
        aria-label="Bildirimi kapat"
        className="-mr-1 -mt-1 flex size-8 shrink-0 items-center justify-center rounded-[8px] opacity-70 transition-opacity hover:opacity-100"
      >
        <X className="size-4" aria-hidden="true" />
      </button>
    </div>
  );
}
