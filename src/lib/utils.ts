import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Format price with Swedish number formatting
export function formatPrice(amount: number | null | undefined, currency = 'SEK'): string {
  if (amount == null) return '-'

  return new Intl.NumberFormat('sv-SE', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount)
}

// Format number with Swedish thousand separators
export function formatNumber(num: number | null | undefined): string {
  if (num == null) return '-'

  return new Intl.NumberFormat('sv-SE').format(num)
}

// Format date to Swedish format
export function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return '-'

  const date = new Date(dateString)
  return new Intl.DateTimeFormat('sv-SE', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date)
}

// Format date to short format
export function formatDateShort(dateString: string | null | undefined): string {
  if (!dateString) return '-'

  const date = new Date(dateString)
  return new Intl.DateTimeFormat('sv-SE', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date)
}

// Status labels in Swedish
export const statusLabels: Record<string, string> = {
  received: 'Mottagen',
  reviewing: 'Granskas',
  selected: 'Vald',
  rejected: 'Avvisad',
}

// Status colors
export const statusColors: Record<string, string> = {
  received: 'bg-blue-500/20 text-blue-400',
  reviewing: 'bg-yellow-500/20 text-yellow-400',
  selected: 'bg-green-500/20 text-green-400',
  rejected: 'bg-red-500/20 text-red-400',
}
