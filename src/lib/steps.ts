import type { StepRecord } from '../db/schema'
import { formatDateJa, formatNumber } from './format'

/* -------------------------------------------------------------------------- */
/*  Health capital metrics (steps)                                             */
/* -------------------------------------------------------------------------- */

export type StepSeries = 'cumulative' | 'daily'

export interface StepPoint {
  date: string
  label: string
  shortLabel: string
  steps: number
  cumulative: number
}

/** 古い順に並べ、累積歩数と日別歩数の両方を持たせる。 */
export function buildStepPoints(records: StepRecord[]): StepPoint[] {
  let running = 0
  return [...records]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((record) => {
      const steps = Math.max(0, Math.round(record.steps))
      running += steps
      return {
        date: record.date,
        label: formatDateJa(record.date),
        shortLabel: `${Number(record.date.slice(5, 7))}/${Number(record.date.slice(8, 10))}`,
        steps,
        cumulative: running,
      }
    })
}

export function sumSteps(records: StepRecord[]): number {
  return records.reduce(
    (sum, record) => sum + Math.max(0, Math.round(record.steps)),
    0,
  )
}

/** 歩数 × 歩幅(cm) を km に換算する。 */
export function stepDistanceKm(steps: number, strideCm: number): number {
  const safeStride = Number.isFinite(strideCm) ? Math.max(0, strideCm) : 0
  return (steps * safeStride) / 100 / 1000
}

/** 8,432歩 */
export function formatSteps(value: number): string {
  return `${formatNumber(Number.isFinite(value) ? value : 0, 0)}歩`
}

/** 1.2万歩 — グラフのY軸向け。 */
export function formatCompactSteps(value: number): string {
  const safe = Number.isFinite(value) ? Math.abs(value) : 0
  const sign = value < 0 ? '−' : ''
  if (safe >= 100_000) {
    return `${sign}${formatNumber(safe / 10_000, 0)}万歩`
  }
  if (safe >= 10_000) {
    return `${sign}${formatNumber(safe / 10_000, 1)}万歩`
  }
  return `${sign}${formatNumber(safe, 0)}歩`
}

/** 12.3 km（歩幅が未設定なら空文字） */
export function formatDistance(steps: number, strideCm: number): string {
  if (!Number.isFinite(strideCm) || strideCm <= 0) return ''
  return `${formatNumber(stepDistanceKm(steps, strideCm), 1)} km`
}
