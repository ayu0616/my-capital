import type { StepRecord } from '../db/schema'
import {
  addMonths,
  formatDateJa,
  formatMonthShort,
  formatNumber,
  formatYearMonth,
  parseDateOnly,
  toDateOnlyString,
} from './format'

/* -------------------------------------------------------------------------- */
/*  Health capital metrics (steps)                                             */
/* -------------------------------------------------------------------------- */

export type StepGranularity = 'daily' | 'monthly' | 'yearly'

export interface StepBucket {
  key: string
  label: string
  shortLabel: string
  steps: number
  recordedDays: number
}

export interface StepSummary {
  periodLabel: string
  total: number
  recordedDays: number
  average: number
  previousTotal: number
  changeRatio: number | null
}

const DAY_MS = 86_400_000

/** UTC 正午の Date を日単位でずらす（夏時間の影響を受けない）。 */
function shiftDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * DAY_MS)
}

function normalizeRecords(records: StepRecord[]): Map<string, number> {
  const stepsByDate = new Map<string, number>()
  for (const record of records) {
    stepsByDate.set(record.date, Math.max(0, Math.round(record.steps)))
  }
  return stepsByDate
}

function sumWindow(
  stepsByDate: Map<string, number>,
  start: string,
  end: string,
): { total: number; recordedDays: number } {
  let total = 0
  let recordedDays = 0
  for (const [date, steps] of stepsByDate) {
    if (date >= start && date <= end) {
      total += steps
      recordedDays += 1
    }
  }
  return { total, recordedDays }
}

function buildSummary(
  periodLabel: string,
  current: { total: number; recordedDays: number },
  previousTotal: number,
): StepSummary {
  return {
    periodLabel,
    total: current.total,
    recordedDays: current.recordedDays,
    average: current.recordedDays > 0 ? current.total / current.recordedDays : 0,
    previousTotal,
    changeRatio:
      previousTotal > 0 ? (current.total - previousTotal) / previousTotal : null,
  }
}

function summarizeByKey(
  stepsByDate: Map<string, number>,
  keyOf: (date: string) => string,
  currentKey: string,
  previousKey: string,
  periodLabel: string,
): StepSummary {
  const totals = new Map<string, { total: number; recordedDays: number }>()
  for (const [date, steps] of stepsByDate) {
    const key = keyOf(date)
    const bucket = totals.get(key) ?? { total: 0, recordedDays: 0 }
    bucket.total += steps
    bucket.recordedDays += 1
    totals.set(key, bucket)
  }

  return buildSummary(
    periodLabel,
    totals.get(currentKey) ?? { total: 0, recordedDays: 0 },
    totals.get(previousKey)?.total ?? 0,
  )
}

/** 期間ごとのバケットを古い順に返す。記録のない日・月・年も 0 で含める。 */
export function aggregateSteps(
  records: StepRecord[],
  granularity: StepGranularity,
  today: string,
): StepBucket[] {
  const stepsByDate = normalizeRecords(records)
  const todayDate = parseDateOnly(today)
  const todayKey = toDateOnlyString(todayDate)

  if (granularity === 'daily') {
    const buckets: StepBucket[] = []
    for (let offset = 29; offset >= 0; offset -= 1) {
      const date = shiftDays(todayDate, -offset)
      const key = toDateOnlyString(date)
      const steps = stepsByDate.get(key)
      buckets.push({
        key,
        label: formatDateJa(date),
        shortLabel: `${Number(key.slice(5, 7))}/${Number(key.slice(8, 10))}`,
        steps: steps ?? 0,
        recordedDays: steps === undefined ? 0 : 1,
      })
    }
    return buckets
  }

  if (granularity === 'monthly') {
    const buckets: StepBucket[] = []
    const monthTotals = new Map<string, { total: number; recordedDays: number }>()
    for (const [date, steps] of stepsByDate) {
      const key = date.slice(0, 7)
      const bucket = monthTotals.get(key) ?? { total: 0, recordedDays: 0 }
      bucket.total += steps
      bucket.recordedDays += 1
      monthTotals.set(key, bucket)
    }

    for (let offset = 11; offset >= 0; offset -= 1) {
      const monthDate = addMonths(todayDate, -offset)
      const key = `${monthDate.getUTCFullYear()}-${String(monthDate.getUTCMonth() + 1).padStart(2, '0')}`
      const bucket = monthTotals.get(key)
      buckets.push({
        key,
        label: formatYearMonth(key),
        shortLabel: formatMonthShort(key),
        steps: bucket?.total ?? 0,
        recordedDays: bucket?.recordedDays ?? 0,
      })
    }
    return buckets
  }

  const yearTotals = new Map<string, { total: number; recordedDays: number }>()
  for (const [date, steps] of stepsByDate) {
    const key = date.slice(0, 4)
    const bucket = yearTotals.get(key) ?? { total: 0, recordedDays: 0 }
    bucket.total += steps
    bucket.recordedDays += 1
    yearTotals.set(key, bucket)
  }

  const currentYear = Number(todayKey.slice(0, 4))
  const years = [...yearTotals.keys()]
    .map((key) => Number(key))
    .filter((year) => Number.isFinite(year))
  const startYear =
    years.length > 0 ? Math.min(currentYear, ...years) : currentYear

  const buckets: StepBucket[] = []
  for (let year = startYear; year <= currentYear; year += 1) {
    const key = String(year)
    const bucket = yearTotals.get(key)
    buckets.push({
      key,
      label: `${year}年`,
      shortLabel: key,
      steps: bucket?.total ?? 0,
      recordedDays: bucket?.recordedDays ?? 0,
    })
  }
  return buckets
}

/**
 * 現在期間の合計・平均と、直前の同期間との比較を返す。
 * monthly=今月 / daily=直近30日 / yearly=今年。
 */
export function buildStepSummary(
  records: StepRecord[],
  granularity: StepGranularity,
  today: string,
): StepSummary {
  const stepsByDate = normalizeRecords(records)
  const todayDate = parseDateOnly(today)
  const todayKey = toDateOnlyString(todayDate)

  if (granularity === 'daily') {
    const currentStart = toDateOnlyString(shiftDays(todayDate, -29))
    const previousStart = toDateOnlyString(shiftDays(todayDate, -59))
    const previousEnd = toDateOnlyString(shiftDays(todayDate, -30))
    return buildSummary(
      '直近30日',
      sumWindow(stepsByDate, currentStart, todayKey),
      sumWindow(stepsByDate, previousStart, previousEnd).total,
    )
  }

  if (granularity === 'monthly') {
    const currentKey = todayKey.slice(0, 7)
    const previousKey = toDateOnlyString(
      addMonths(todayDate, -1),
    ).slice(0, 7)
    return summarizeByKey(
      stepsByDate,
      (date) => date.slice(0, 7),
      currentKey,
      previousKey,
      formatYearMonth(currentKey),
    )
  }

  const currentKey = todayKey.slice(0, 4)
  const previousKey = String(Number(currentKey) - 1)
  return summarizeByKey(
    stepsByDate,
    (date) => date.slice(0, 4),
    currentKey,
    previousKey,
    `${currentKey}年`,
  )
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
