'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { UserPlus } from 'lucide-react';
import { z } from 'zod';
import {
  Alert,
  Button,
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  FieldError,
  FieldHint,
  FormField,
  Input,
  Label,
  Select,
} from '@zirve/ui';
import { ACTIVE_USER_ROLES, USER_ROLE_DESCRIPTIONS, USER_ROLE_LABELS } from '@zirve/types';

import { ApiError } from '@/lib/api-error';
import { usersApi } from '@/lib/users-api';

/** Şifre kuralları backend ile birebir aynı olmalıdır (UX içindir, Kural 10). */
const createUserSchema = z.object({
  fullName: z.string().min(3, 'Ad soyad en az 3 karakter olmalıdır.').max(150),
  email: z.string().min(1, 'E-posta zorunludur.').email('Geçerli bir e-posta adresi girin.'),
  password: z
    .string()
    .min(10, 'Şifre en az 10 karakter olmalıdır.')
    .max(128)
    .regex(/(?=.*[A-Za-zÇĞİÖŞÜçğıöşü])(?=.*\d)/, 'Şifre en az bir harf ve bir rakam içermelidir.'),
  role: z.enum(ACTIVE_USER_ROLES),
  phone: z.string().max(30).optional(),
});

type CreateUserValues = z.infer<typeof createUserSchema>;

export function CreateUserDialog() {
  const [open, setOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<CreateUserValues>({
    resolver: zodResolver(createUserSchema),
    defaultValues: { fullName: '', email: '', password: '', role: 'ADMIN', phone: '' },
  });

  const mutation = useMutation({
    mutationFn: usersApi.create,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      setOpen(false);
      reset();
    },
    onError: (error: unknown) => {
      if (error instanceof ApiError) {
        // Backend alan bazlı hata döndürdüyse ilgili alana bağla.
        const fieldErrors = error.toFieldErrors();

        if (fieldErrors['email'] !== undefined) {
          setError('email', { message: fieldErrors['email'] });
          return;
        }

        setFormError(error.message);
        return;
      }

      setFormError('Kullanıcı oluşturulamadı. Lütfen tekrar deneyin.');
    },
  });

  const onSubmit = handleSubmit((values) => {
    setFormError(null);
    mutation.mutate({
      ...values,
      phone: values.phone !== undefined && values.phone.trim() !== '' ? values.phone : undefined,
    });
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) {
          reset();
          setFormError(null);
        }
      }}
    >
      <DialogTrigger asChild>
        <Button>
          <UserPlus />
          Yeni Kullanıcı
        </Button>
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Yeni Yönetici Kullanıcı</DialogTitle>
          <DialogDescription>
            Kullanıcı oluşturulduktan sonra bu bilgilerle giriş yapabilir.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} noValidate>
          <DialogBody className="flex flex-col gap-4">
            {formError !== null ? <Alert variant="error">{formError}</Alert> : null}

            <FormField>
              <Label htmlFor="fullName" required>
                Ad Soyad
              </Label>
              <Input
                id="fullName"
                placeholder="Ayşe Yılmaz"
                invalid={errors.fullName !== undefined}
                {...register('fullName')}
              />
              <FieldError message={errors.fullName?.message} />
            </FormField>

            <FormField>
              <Label htmlFor="new-email" required>
                E-posta
              </Label>
              <Input
                id="new-email"
                type="email"
                autoComplete="off"
                placeholder="ayse@zirvetarim.com"
                invalid={errors.email !== undefined}
                {...register('email')}
              />
              <FieldError message={errors.email?.message} />
            </FormField>

            <FormField>
              <Label htmlFor="new-password" required>
                Geçici Şifre
              </Label>
              <Input
                id="new-password"
                type="text"
                autoComplete="new-password"
                placeholder="En az 10 karakter"
                invalid={errors.password !== undefined}
                {...register('password')}
              />
              {errors.password === undefined ? (
                <FieldHint>
                  En az 10 karakter, bir harf ve bir rakam. Kullanıcıya güvenli bir kanaldan iletin.
                </FieldHint>
              ) : (
                <FieldError message={errors.password.message} />
              )}
            </FormField>

            <FormField>
              <Label htmlFor="role" required>
                Rol
              </Label>
              <Select id="role" invalid={errors.role !== undefined} {...register('role')}>
                {ACTIVE_USER_ROLES.map((role) => (
                  <option key={role} value={role}>
                    {USER_ROLE_LABELS[role]}
                  </option>
                ))}
              </Select>
              <FieldHint>{USER_ROLE_DESCRIPTIONS.ADMIN}</FieldHint>
              <FieldError message={errors.role?.message} />
            </FormField>

            <FormField>
              <Label htmlFor="phone">Telefon</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="+90 555 000 00 00"
                invalid={errors.phone !== undefined}
                {...register('phone')}
              />
              <FieldError message={errors.phone?.message} />
            </FormField>
          </DialogBody>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              İptal
            </Button>
            <Button type="submit" loading={isSubmitting || mutation.isPending}>
              Oluştur
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
