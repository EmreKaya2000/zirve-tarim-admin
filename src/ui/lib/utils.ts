import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Tailwind sınıflarını koşullu birleştirir ve çakışanları çözer.
 * shadcn/ui bileşenlerinin standart yardımcısı.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
