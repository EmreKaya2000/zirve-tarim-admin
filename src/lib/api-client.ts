import axios, {
  AxiosError,
  type AxiosInstance,
  type AxiosRequestConfig,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from 'axios';
import type {
  ApiErrorResponse,
  ApiSuccessResponse,
  LoginResponse,
  PaginationMeta,
} from '@zirve/types';

import { ApiError } from './api-error';
import { resolveApiBaseUrl } from './env';

/** İstek zaman aşımı (ms). */
const REQUEST_TIMEOUT_MS = 15_000;

/** Gövdesiz başarı yanıtı: silme uçlarının döndürdüğü durum kodu. */
const HTTP_NO_CONTENT = 204;

/** Yenileme denemesinin sonsuz döngüye girmemesi için işaretlenen istek alanı. */
interface RetriableConfig extends InternalAxiosRequestConfig {
  _retried?: boolean;
}

/**
 * Oturum sağlayıcısı.
 *
 * api-client kimlik doğrulama STRATEJİSİNİ bilmez; yalnız bu arayüzü çağırır.
 * Web'de zustand store, mobilde secure-store bağlanacaktır (ARCHITECTURE §4.3).
 */
export interface AuthBridge {
  getAccessToken: () => string | null;
  getRefreshToken: () => string | null;
  setSession: (session: LoginResponse) => void;
  clear: () => void;
}

let authBridge: AuthBridge | null = null;
let onUnauthorized: (() => void) | null = null;

export function setAuthBridge(bridge: AuthBridge): void {
  authBridge = bridge;
}

export function setUnauthorizedHandler(handler: () => void): void {
  onUnauthorized = handler;
}

/**
 * Merkezi axios örneği.
 *
 * Tüm istekler buradan geçer; bileşenler doğrudan `fetch`/`axios` kullanmaz.
 * Hata dönüşümü, kimlik başlığı ve jeton yenileme tek yerde yapılır.
 */
export const apiClient: AxiosInstance = axios.create({
  baseURL: resolveApiBaseUrl(),
  timeout: REQUEST_TIMEOUT_MS,
  headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
  withCredentials: true,
});

// --- İstek: kimlik başlığını ekle ---
apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = authBridge?.getAccessToken() ?? null;

  if (token !== null && token.length > 0) {
    config.headers.set('Authorization', `Bearer ${token}`);
  }

  return config;
});

/**
 * Eşzamanlı 401'lerde tek bir yenileme isteği yapılmasını sağlar.
 *
 * Sayfa açılışında 4-5 sorgu paralel gidip hepsi 401 alırsa, her biri ayrı
 * refresh denerse: refresh token TEK KULLANIMLIK olduğu için ilki başarılı
 * olur, diğerleri "yeniden kullanım" sayılır ve backend TÜM oturumları
 * düşürür. Kullanıcı sebepsiz yere login ekranına atılır.
 *
 * Bu yüzden yenileme tek bir promise üzerinden paylaşılır.
 */
let refreshPromise: Promise<string> | null = null;

async function refreshAccessToken(): Promise<string> {
  const refreshToken = authBridge?.getRefreshToken() ?? null;

  if (refreshToken === null || refreshToken.length === 0) {
    throw ApiError.unknown(401, 'Oturum bulunamadı.');
  }

  // Interceptor'a takılmaması için ayrı bir axios örneği kullanılır.
  const response = await axios.post<ApiSuccessResponse<LoginResponse>>(
    '/auth/refresh',
    { refreshToken },
    {
      baseURL: resolveApiBaseUrl(),
      timeout: REQUEST_TIMEOUT_MS,
      headers: { 'Content-Type': 'application/json' },
      withCredentials: true,
    },
  );

  const session = response.data.data;
  authBridge?.setSession(session);

  return session.accessToken;
}

// --- Yanıt: hatayı ApiError'a çevir, 401'de sessizce yenile ---
apiClient.interceptors.response.use(
  (response) => response,
  async (error: unknown) => {
    if (!(error instanceof AxiosError)) {
      return Promise.reject(ApiError.unknown(0));
    }

    if (error.response === undefined) {
      return Promise.reject(ApiError.network());
    }

    const status = error.response.status;
    const body = error.response.data;
    const config = error.config as RetriableConfig | undefined;

    const apiError = isApiErrorResponse(body)
      ? ApiError.fromBody(body.error, status)
      : ApiError.unknown(status);

    const canRetry =
      status === 401 &&
      config !== undefined &&
      config._retried !== true &&
      // /auth/refresh'in kendisi 401 verdiyse yenileme anlamsızdır.
      config.url?.includes('/auth/refresh') !== true &&
      (authBridge?.getRefreshToken() ?? null) !== null;

    if (!canRetry) {
      if (status === 401) {
        authBridge?.clear();
        onUnauthorized?.();
      }

      return Promise.reject(apiError);
    }

    /*
     * YENİLEME İLE YENİDEN DENEME AYRI AYRI ELE ALINIR.
     *
     * NEDEN (Sprint 12'de bulunan hata): burada tek bir `try/catch` vardı ve
     * `catch` bloğu oturumu siliyordu. Ama blok İKİ farklı şeyi kapsıyordu:
     * jeton yenileme ve yenilenmiş jetonla yapılan İSTEĞİN KENDİSİ. İkinci
     * istek kimlikle ilgisiz bir nedenle (400, 404, 422) düştüğünde de oturum
     * siliniyor ve kullanıcı giriş ekranına atılıyordu.
     *
     * Gerçekte yaşandı: `/urunler` sayfası açılışta dört sorgu atıyor,
     * hepsi 401 alıyor, yenileme başarılı oluyor ve üçü 200 dönüyor. Dördüncüsü
     * (`brands?limit=200`) geçersiz parametre yüzünden 400 dönüyor ve o 400,
     * çalışan oturumu siliyordu. Sonuç: yönetim panelinde sayfa yenilemek
     * kullanıcıyı çıkışa zorluyordu.
     *
     * Kural: OTURUM YALNIZ KİMLİK DOĞRULAMA BAŞARISIZ OLDUĞUNDA silinir.
     */
    let newToken: string;

    try {
      refreshPromise = refreshPromise ?? refreshAccessToken();
      newToken = await refreshPromise;
    } catch {
      // Yenileme başarısız: oturum gerçekten bitti.
      authBridge?.clear();
      onUnauthorized?.();

      return Promise.reject(apiError);
    } finally {
      refreshPromise = null;
    }

    config._retried = true;
    config.headers.set('Authorization', `Bearer ${newToken}`);

    /*
     * Yeniden denenen isteğin hatası OLDUĞU GİBİ yukarı gider.
     *
     * `_retried` işaretli olduğu için tekrar 401 alsa bile bu interceptor'a
     * ikinci kez girip döngü kurmaz; `canRetry` false olur ve o noktada
     * (gerçek bir kimlik hatası olduğu için) oturum silinir.
     */
    return apiClient.request(config);
  },
);

/**
 * Standart sarmalayıcıyı açar ve yalnız `data` alanını döndürür.
 * Çağıran kod `{ success, data }` kabuğunu hiç görmez.
 */
export async function apiGet<TData>(url: string, config?: AxiosRequestConfig): Promise<TData> {
  return unwrapResponse(await apiClient.get<ApiSuccessResponse<TData>>(url, config));
}

export async function apiPost<TData, TBody = unknown>(
  url: string,
  body?: TBody,
  config?: AxiosRequestConfig,
): Promise<TData> {
  return unwrapResponse(await apiClient.post<ApiSuccessResponse<TData>>(url, body, config));
}

export async function apiPatch<TData, TBody = unknown>(
  url: string,
  body?: TBody,
  config?: AxiosRequestConfig,
): Promise<TData> {
  return unwrapResponse(await apiClient.patch<ApiSuccessResponse<TData>>(url, body, config));
}

export async function apiPut<TData, TBody = unknown>(
  url: string,
  body?: TBody,
  config?: AxiosRequestConfig,
): Promise<TData> {
  return unwrapResponse(await apiClient.put<ApiSuccessResponse<TData>>(url, body, config));
}

export async function apiDelete<TData = void>(
  url: string,
  config?: AxiosRequestConfig,
): Promise<TData> {
  return unwrapResponse(await apiClient.delete<ApiSuccessResponse<TData>>(url, config));
}

/** Sayfalanmış liste çeker; kayıtları ve sayfalama üstverisini birlikte döner. */
export async function apiGetPaginated<TItem>(
  url: string,
  config?: AxiosRequestConfig,
): Promise<{ items: TItem[]; meta: PaginationMeta }> {
  const response = await apiClient.get<ApiSuccessResponse<TItem[]>>(url, config);
  const body = response.data;

  if (body.meta === undefined) {
    throw ApiError.unknown(
      response.status,
      'Liste yanıtında sayfalama üstverisi (meta) bulunamadı.',
    );
  }

  return { items: unwrap(body), meta: body.meta };
}

/**
 * Yanıtı HTTP durumuyla birlikte açar.
 *
 * SPRINT 12 SONRASI BULUNAN HATA — neden `unwrap(response.data)` yetmiyor:
 *
 *   Silme uçları `@HttpCode(204)` döndürüyor. `ResponseInterceptor` gövdeyi
 *   `{ success: true, data: null }` olarak sarsa da Express, 204 No Content
 *   yanıtında gövdeyi TAMAMEN atar (RFC 9110: 204 gövde içeremez). İstemciye
 *   boş gövde ulaşır, axios `response.data` alanını boş dizge bırakır ve
 *   `unwrap` bunu "biçim bozuk" sayıp hata fırlatırdı.
 *
 *   Sonuç: sunucu kaydı SİLİYOR, istemci hata alıyor. React Query'nin
 *   `onSuccess`i çalışmadığı için liste tazelenmiyor; ekranda silinmiş kayıt
 *   duruyor. Kullanıcı tekrar bastığında kayıt gerçekten yok olduğu için
 *   NOT_FOUND dönüyor. Gözlenen belirti buydu: ürün görselini silmek
 *   "çalışmıyor", ikinci denemede "Görsel bulunamadı." hatası veriyor.
 *
 * 204 bir ANOMALİ DEĞİL, sözleşmenin parçasıdır: "gövde yok" demektir.
 * Bu yüzden koşul durum koduna bakar, gövdenin boş olmasına değil — durum 200
 * iken boş gövde hâlâ gerçek bir hatadır ve hata olarak kalmalıdır.
 */
function unwrapResponse<TData>(response: AxiosResponse<ApiSuccessResponse<TData>>): TData {
  if (response.status === HTTP_NO_CONTENT) {
    // 204 uçlarını çağıran kod `TData = void` kullanır; `undefined` doğru değer.
    return undefined as unknown as TData;
  }

  return unwrap(response.data);
}

function unwrap<TData>(body: ApiSuccessResponse<TData>): TData {
  if (body.success !== true) {
    throw ApiError.unknown(200, 'Sunucu beklenmeyen bir yanıt biçimi döndürdü.');
  }

  return body.data;
}

function isApiErrorResponse(value: unknown): value is ApiErrorResponse {
  if (value === null || typeof value !== 'object') {
    return false;
  }

  const candidate = value as { success?: unknown; error?: unknown };

  if (candidate.success !== false || candidate.error === null) {
    return false;
  }

  if (typeof candidate.error !== 'object' || candidate.error === undefined) {
    return false;
  }

  const errorBody = candidate.error as { code?: unknown; message?: unknown };

  return typeof errorBody.code === 'string' && typeof errorBody.message === 'string';
}
