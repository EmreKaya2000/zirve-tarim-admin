'use client';

import type { FieldValues, Path, UseFormReturn } from 'react-hook-form';
import { FieldError, FieldHint, FormField, Input, Label } from '@zirve/ui';

/**
 * Taksonomi formlarının paylaştığı alanlar.
 *
 * Jenerik tutulur: her sayfa kendi form tipiyle çağırır ama alan adları
 * (`name`, `description`, `sortOrder`) tüm taksonomilerde aynıdır.
 */

interface FieldProps<TForm extends FieldValues> {
  form: UseFormReturn<TForm>;
}

/** Ad alanı — tüm taksonomilerde zorunlu. */
export function NameField<TForm extends FieldValues>({
  form,
  label = 'Ad',
  placeholder,
}: FieldProps<TForm> & { label?: string; placeholder?: string }) {
  const error = form.formState.errors['name'];

  return (
    <FormField>
      <Label htmlFor="name" required>
        {label}
      </Label>
      <Input
        id="name"
        placeholder={placeholder}
        invalid={error !== undefined}
        {...form.register('name' as Path<TForm>)}
      />
      <FieldError message={error?.message as string | undefined} />
    </FormField>
  );
}

/** Açıklama alanı. */
export function DescriptionField<TForm extends FieldValues>({
  form,
  hint,
}: FieldProps<TForm> & { hint?: string }) {
  const error = form.formState.errors['description'];

  return (
    <FormField>
      <Label htmlFor="description">Açıklama</Label>
      <textarea
        id="description"
        rows={3}
        className="w-full rounded-[8px] border border-outline-variant bg-surface-container-lowest px-4 py-3 text-[15px] text-on-surface outline-none transition-all placeholder:text-outline focus:border-primary-container focus:ring-2 focus:ring-secondary-container"
        placeholder="İsteğe bağlı açıklama"
        {...form.register('description' as Path<TForm>)}
      />
      {hint !== undefined && error === undefined ? <FieldHint>{hint}</FieldHint> : null}
      <FieldError message={error?.message as string | undefined} />
    </FormField>
  );
}

/** Sıra numarası alanı. */
export function SortOrderField<TForm extends FieldValues>({ form }: FieldProps<TForm>) {
  const error = form.formState.errors['sortOrder'];

  return (
    <FormField>
      <Label htmlFor="sortOrder">Sıra</Label>
      <Input
        id="sortOrder"
        type="number"
        min={0}
        invalid={error !== undefined}
        {...form.register('sortOrder' as Path<TForm>, { valueAsNumber: true })}
      />
      <FieldHint>Küçük değer listede önce gelir.</FieldHint>
      <FieldError message={error?.message as string | undefined} />
    </FormField>
  );
}

/** Serbest metin alanı üretir. */
export function TextField<TForm extends FieldValues>({
  form,
  name,
  label,
  placeholder,
  hint,
  type = 'text',
}: FieldProps<TForm> & {
  name: string;
  label: string;
  placeholder?: string;
  hint?: string;
  type?: string;
}) {
  const error = form.formState.errors[name];

  return (
    <FormField>
      <Label htmlFor={name}>{label}</Label>
      <Input
        id={name}
        type={type}
        placeholder={placeholder}
        invalid={error !== undefined}
        {...form.register(name as Path<TForm>)}
      />
      {hint !== undefined && error === undefined ? <FieldHint>{hint}</FieldHint> : null}
      <FieldError message={error?.message as string | undefined} />
    </FormField>
  );
}
