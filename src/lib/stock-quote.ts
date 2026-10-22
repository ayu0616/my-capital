export interface ParsedStockQuote {
  price: number
  currency: string
  asOf: string | null
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export function parseGoogleFinanceQuote(
  html: string,
  code: string,
  exchange: string,
): ParsedStockQuote | null {
  const pattern = new RegExp(
    `\\["${escapeRegExp(code)}","${escapeRegExp(exchange)}"\\],"[^"]*",\\d+,"([A-Z]{3})",\\[([0-9]+(?:\\.[0-9]+)?),`,
  )
  const match = pattern.exec(html)
  if (!match) return null

  const price = Number(match[2])
  if (!Number.isFinite(price) || price <= 0) return null

  const timestamp = /\[(\d{10})\],"Asia\/Tokyo"/.exec(
    html.slice(match.index, match.index + 500),
  )
  const asOf = timestamp
    ? new Date(Number(timestamp[1]) * 1000).toISOString()
    : null

  return { price, currency: match[1], asOf }
}

interface YahooChartResponse {
  chart?: {
    result?: Array<{
      meta?: {
        currency?: unknown
        regularMarketPrice?: unknown
        regularMarketTime?: unknown
      }
    }>
  }
}

export function parseYahooFinanceQuote(
  payload: string,
): ParsedStockQuote | null {
  try {
    const parsed = JSON.parse(payload) as YahooChartResponse
    const meta = parsed.chart?.result?.[0]?.meta
    const price = Number(meta?.regularMarketPrice)
    if (!Number.isFinite(price) || price <= 0) return null

    const time = Number(meta?.regularMarketTime)
    return {
      price,
      currency: typeof meta?.currency === 'string' ? meta.currency : '',
      asOf:
        Number.isFinite(time) && time > 0
          ? new Date(time * 1000).toISOString()
          : null,
    }
  } catch {
    return null
  }
}
