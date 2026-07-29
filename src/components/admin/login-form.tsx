'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Eye, EyeOff, LogIn, Mail } from 'lucide-react';
import { z } from 'zod';
import { Alert, Button, FieldError, FormField, Input, Label } from '@zirve/ui';

import { authApi } from '@/lib/auth-api';
import { ApiError } from '@/lib/api-error';
import { authStore } from '@/lib/auth-store';

/**
 * Giriş formu şeması.
 *
 * Bu doğrulama YALNIZCA kullanıcı deneyimi içindir (Kural 10). Backend aynı
 * kuralları bağımsız olarak uygular; `curl` ile atılan istek de reddedilir.
 */
const loginSchema = z.object({
  email: z.string().min(1, 'E-posta adresi zorunludur.').email('Geçerli bir e-posta adresi girin.'),
  password: z.string().min(1, 'Şifre zorunludur.'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

/** Giriş sonrası varsayılan hedef. */
const DEFAULT_REDIRECT = '/';

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);

    try {
      const session = await authApi.login(values);
      authStore.setSession(session);

      // Açık yönlendirme (open redirect) engeli: yalnız uygulama içi,
      // /admin ile başlayan göreli yollara izin verilir.
      const next = searchParams.get('next');
      const target = isSafeRedirect(next) ? next : DEFAULT_REDIRECT;

      router.replace(target);
      router.refresh();
    } catch (error) {
      setFormError(
        error instanceof ApiError ? error.message : 'Giriş yapılamadı. Lütfen tekrar deneyin.',
      );
    }
  });

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
      {formError !== null ? <Alert variant="error">{formError}</Alert> : null}

      <FormField>
        <Label htmlFor="email" required>
          E-posta
        </Label>
        <Input
          id="email"
          type="email"
          autoComplete="username"
          placeholder="ornek@zirvetarim.com"
          startIcon={<Mail />}
          invalid={errors.email !== undefined}
          aria-describedby={errors.email !== undefined ? 'email-error' : undefined}
          {...register('email')}
        />
        <FieldError id="email-error" message={errors.email?.message} />
      </FormField>

      <FormField>
        <Label htmlFor="password" required>
          Şifre
        </Label>
        <Input
          id="password"
          type={showPassword ? 'text' : 'password'}
          autoComplete="current-password"
          placeholder="••••••••"
          invalid={errors.password !== undefined}
          aria-describedby={errors.password !== undefined ? 'password-error' : undefined}
          endAdornment={
            <button
              type="button"
              onClick={() => setShowPassword((current) => !current)}
              className="inline-flex size-8 items-center justify-center rounded-[6px] text-outline transition-colors hover:bg-surface-container hover:text-on-surface"
              aria-label={showPassword ? 'Şifreyi gizle' : 'Şifreyi göster'}
            >
              {showPassword ? <EyeOff className="size-[18px]" /> : <Eye className="size-[18px]" />}
            </button>
          }
          {...register('password')}
        />
        <FieldError id="password-error" message={errors.password?.message} />
      </FormField>

      <Button type="submit" size="lg" full loading={isSubmitting}>
        {isSubmitting ? null : <LogIn />}
        Giriş Yap
      </Button>

      <p className="text-center text-sm text-on-surface-variant">
        Şifrenizi mi unuttunuz? Sistem yöneticinizle iletişime geçin.
      </p>
    </form>
  );
}

/**
 * Yönlendirme hedefinin güvenli olup olmadığını kontrol eder.
 *
 * `//evil.com` ve `https://evil.com` gibi değerler tarayıcıda dış siteye
 * yönlendirir; yalnız tek eğik çizgiyle başlayan uygulama içi yollar kabul edilir.
 */
function isSafeRedirect(value: string | null): value is string {
  return value !== null && value.startsWith('/') && !value.startsWith('//');
}
