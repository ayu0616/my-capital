import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function parseYenInput(value: string): number {
  const digits = value.replace(/[^\d-]/g, '')
  const parsed = Number(digits)
  return Number.isFinite(parsed) ? Math.max(0, Math.round(parsed)) : 0
}

export function parseNumberInput(value: string): number {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}
