/* -------------------------------------------------------------------------- */
/*  Number & date formatting (Japanese UI, JPY)                                */
/* -------------------------------------------------------------------------- */

const yenFormatter = new Intl.NumberFormat('ja-JP', {
  maximumFractionDigits: 0,
})

const numberFormatter = new Intl.NumberFormat('ja-JP', {
  maximumFractionDigits: 1,
})

export function formatNumber(value: number, digits = 1): string {
  return new Intl.NumberFormat('ja-JP', {
    maximumFractionDigits: digits,
    minimumFractionDigits: 0,
  }).format(Number.isFinite(value) ? value : 0)
}

/** ¥1,234,567 */
export function formatYen(value: number, options: { sign?: boolean } = {}): string {
  const safe = Number.isFinite(value) ? Math.round(value) : 0
  const sign = options.sign && safe > 0 ? '+' : safe < 0 ? '−' : ''
  return `${sign}¥${yenFormatter.format(Math.abs(safe))}`
}

/** 1,643万円 / 1.2億円 — good for charts and compact tiles. */
export function formatCompactYen(value: number): string {
  const safe = Number.isFinite(value) ? value : 0
  const abs = Math.abs(safe)
  const sign = safe < 0 ? '−' : ''
  if (abs >= 100_000_000) {
    return `${sign}${formatNumber(abs / 100_000_000, 2)}億円`
  }
  if (abs >= 10_000) {
    const man = abs / 10_000
    return `${sign}${formatNumber(man, man >= 1000 ? 0 : 1)}万円`
  }
  return `${sign}${yenFormatter.format(abs)}円`
}

/** Input ratio (0.152) → "15.2%" */
export function formatPercent(ratio: number, digits = 1): string {
  const safe = Number.isFinite(ratio) ? ratio : 0
  return `${new Intl.NumberFormat('ja-JP', {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  }).format(safe * 100)}%`
}

export function formatSignedPercent(ratio: number, digits = 1): string {
  if (!Number.isFinite(ratio) || ratio === 0) return formatPercent(0, digits)
  return `${ratio > 0 ? '+' : '−'}${formatPercent(Math.abs(ratio), digits)}`
}

export function formatShares(shares: number): string {
  return numberFormatter.format(Number.isFinite(shares) ? shares : 0)
}

/* -------------------------------------------------------------------------- */
/*  Date-only helpers (timezone-stable, app is pinned to JST)                  */
/* -------------------------------------------------------------------------- */

const JST_OFFSET_MS = 9 * 60 * 60 * 1000
const DATE_TIME_ZONE = 'UTC'

/** Return a Date whose UTC fields are the current JST date. */
export function nowJst(): Date {
  return new Date(Date.now() + JST_OFFSET_MS)
}

/** A stable "date-only" Date at UTC noon. */
export function todayDateOnly(): Date {
  const jst = nowJst()
  return new Date(
    Date.UTC(jst.getUTCFullYear(), jst.getUTCMonth(), jst.getUTCDate(), 12),
  )
}

export function currentYearMonth(today = todayDateOnly()): string {
  return `${today.getUTCFullYear()}-${String(today.getUTCMonth() + 1).padStart(2, '0')}`
}

export function parseDateOnly(value: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value)
  if (!match) return todayDateOnly()
  return new Date(
    Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 12),
  )
}

export function toDateOnlyString(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`
}

export function addMonths(date: Date, months: number): Date {
  const result = new Date(date.getTime())
  const day = result.getUTCDate()
  result.setUTCDate(1)
  result.setUTCMonth(result.getUTCMonth() + Math.round(months))
  const daysInTargetMonth = new Date(
    Date.UTC(result.getUTCFullYear(), result.getUTCMonth() + 1, 0, 12),
  ).getUTCDate()
  result.setUTCDate(Math.min(day, daysInTargetMonth))
  return result
}

export function addYears(date: Date, years: number): Date {
  return addMonths(date, years * 12)
}

/** Fractional months from `from` to `to` (to > from → positive). */
export function monthsBetween(from: Date, to: Date): number {
  const monthDiff =
    (to.getUTCFullYear() - from.getUTCFullYear()) * 12 +
    (to.getUTCMonth() - from.getUTCMonth())
  const dayFraction = (to.getUTCDate() - from.getUTCDate()) / 30.4375
  return monthDiff + dayFraction
}

export function formatDateJa(
  value: string | Date,
  options: { withYear?: boolean; weekday?: boolean } = {},
): string {
  const date = typeof value === 'string' ? parseDateOnly(value) : value
  const { withYear = true, weekday = false } = options
  return new Intl.DateTimeFormat('ja-JP', {
    year: withYear ? 'numeric' : undefined,
    month: 'long',
    day: 'numeric',
    weekday: weekday ? 'short' : undefined,
    timeZone: DATE_TIME_ZONE,
  }).format(date)
}

export function formatYearMonth(yearMonth: string): string {
  const [year, month] = yearMonth.split('-')
  return `${year}年${Number(month)}月`
}

export function formatMonthShort(yearMonth: string): string {
  return `${Number(yearMonth.split('-')[1])}月`
}

export function formatMonthEta(date: Date): string {
  return new Intl.DateTimeFormat('ja-JP', {
    year: 'numeric',
    month: 'long',
    timeZone: DATE_TIME_ZONE,
  }).format(date)
}

export function daysAgoLabel(isoDate: string): string {
  const date = parseDateOnly(isoDate)
  const today = todayDateOnly()
  const days = Math.round((today.getTime() - date.getTime()) / 86_400_000)
  if (days <= 0) return '今日'
  if (days === 1) return '昨日'
  if (days < 30) return `${days}日前`
  if (days < 365) return `${Math.floor(days / 30)}ヶ月前`
  return `${Math.floor(days / 365)}年前`
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}
