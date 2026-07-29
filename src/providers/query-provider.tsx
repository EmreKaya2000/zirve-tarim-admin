'use client';

import { useState, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

import { ApiError } from '@/lib/api-error';

/** Yeniden deneme üst sınırı. */
const MAX_RETRIES = 2;

/** Verinin bayat sayılmadan önceki süresi (ms). */
const STALE_TIME_MS = 60_000;

function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: STALE_TIME_MS,
        refetchOnWindowFocus: false,
        retry: (failureCount, error) => {
          // İş kuralı ve yetki hataları yeniden denenmez; yalnız geçici hatalar.
          if (error instanceof ApiError) {
            return error.isRetryable && failureCount < MAX_RETRIES;
          }

          return failureCount < MAX_RETRIES;
        },
      },
      mutations: {
        // Mutasyonlar asla otomatik tekrar edilmez: çift satış/çift tahsilat riski.
        retry: false,
      },
    },
  });
}

/**
 * TanStack Query sağlayıcısı.
 *
 * QueryClient `useState` içinde oluşturulur; her render'da yeniden
 * yaratılmaması ve sunucu tarafında istekler arasında paylaşılmaması için.
 */
export function QueryProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(createQueryClient);

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {process.env.NODE_ENV === 'development' ? (
        <ReactQueryDevtools initialIsOpen={false} buttonPosition="bottom-left" />
      ) : null}
    </QueryClientProvider>
  );
}
