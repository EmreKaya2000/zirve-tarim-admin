import { ERROR_CODES, type ApiErrorBody, type ApiErrorDetail } from '@zirve/types';

/**
 * API'den dönen standart hatanın istemci tarafı temsili.
 *
 * Axios'un ham `AxiosError`'ı yerine bileşenlere hep bu tip ulaşır; böylece
 * UI kodu HTTP ayrıntısıyla değil, iş anlamı taşıyan `code` ile ilgilenir.
 */
export class ApiError extends Error {
  readonly code: string;
  readonly status: number;
  readonly details: ApiErrorDetail[];

  constructor(params: {
    code: string;
    message: string;
    status: number;
    details?: ApiErrorDetail[];
  }) {
    super(params.message);
    this.name = 'ApiError';
    this.code = params.code;
    this.status = params.status;
    this.details = params.details ?? [];
  }

  /** Sunucudan gelen standart hata gövdesinden üretir. */
  static fromBody(body: ApiErrorBody, status: number): ApiError {
    return new ApiError({
      code: body.code,
      message: body.message,
      status,
      details: body.details,
    });
  }

  /** Ağ hatası, zaman aşımı gibi sunucuya hiç ulaşamayan durumlar için. */
  static network(message = 'Sunucuya ulaşılamadı. İnternet bağlantınızı kontrol edin.'): ApiError {
    return new ApiError({
      code: ERROR_CODES.SERVICE_UNAVAILABLE,
      message,
      status: 0,
    });
  }

  /** Beklenmeyen/biçimsiz yanıtlar için. */
  static unknown(status: number, message = 'Beklenmeyen bir hata oluştu.'): ApiError {
    return new ApiError({
      code: ERROR_CODES.INTERNAL_ERROR,
      message,
      status,
    });
  }

  /** Belirli bir alana ait ilk hata mesajını döndürür (form gösterimi için). */
  fieldMessage(field: string): string | undefined {
    return this.details.find((detail) => detail.field === field)?.message;
  }

  /** Alan bazlı hataları React Hook Form'un beklediği sözlüğe çevirir. */
  toFieldErrors(): Record<string, string> {
    const errors: Record<string, string> = {};

    for (const detail of this.details) {
      if (detail.field !== undefined && errors[detail.field] === undefined) {
        errors[detail.field] = detail.message;
      }
    }

    return errors;
  }

  /** Yeniden denemenin anlamlı olduğu geçici bir hata mı? */
  get isRetryable(): boolean {
    return this.status === 0 || this.status === 429 || this.status >= 500;
  }

  /** Oturumun geçersiz olduğunu gösteren hata mı? */
  get isAuthError(): boolean {
    return this.status === 401;
  }
}
