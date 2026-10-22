import {
  parseGoogleFinanceQuote,
  parseYahooFinanceQuote,
} from '../lib/stock-quote'

const FUJITSU_CODE = '6702'
const FUJITSU_EXCHANGE = 'TYO'
const GOOGLE_FINANCE_URL = `https://www.google.com/finance/quote/${FUJITSU_CODE}:${FUJITSU_EXCHANGE}?hl=ja`
const YAHOO_FINANCE_URL = `https://query1.finance.yahoo.com/v8/finance/chart/${FUJITSU_CODE}.T?interval=1d&range=1d`

export interface StockQuote {
  price: number
  currency: string
  asOf: string | null
  source: 'google' | 'yahoo'
  sourceUrl: string
}

async function fetchText(url: string): Promise<string> {
  const response = await fetch(url, {
    headers: {
      accept: 'text/html,application/json;q=0.9,*/*;q=0.8',
      'accept-language': 'ja,en;q=0.8',
      'user-agent':
        'Mozilla/5.0 (compatible; my-capital/1.0; +https://github.com/ayu0616/my-capital)',
    },
    signal: AbortSignal.timeout(6_000),
  })
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`)
  }
  return response.text()
}

export async function fetchFujitsuStockQuote(): Promise<StockQuote> {
  const errors: string[] = []

  try {
    const html = await fetchText(GOOGLE_FINANCE_URL)
    const quote = parseGoogleFinanceQuote(
      html,
      FUJITSU_CODE,
      FUJITSU_EXCHANGE,
    )
    if (quote) {
      return {
        ...quote,
        source: 'google',
        sourceUrl: GOOGLE_FINANCE_URL,
      }
    }
    errors.push('Google Financeの形式を解析できませんでした')
  } catch (cause) {
    errors.push(
      `Google Finance: ${cause instanceof Error ? cause.message : '取得失敗'}`,
    )
  }

  try {
    const payload = await fetchText(YAHOO_FINANCE_URL)
    const quote = parseYahooFinanceQuote(payload)
    if (quote) {
      return {
        ...quote,
        source: 'yahoo',
        sourceUrl: YAHOO_FINANCE_URL,
      }
    }
    errors.push('Yahoo Financeの形式を解析できませんでした')
  } catch (cause) {
    errors.push(
      `Yahoo Finance: ${cause instanceof Error ? cause.message : '取得失敗'}`,
    )
  }

  throw new Error(`富士通の株価を取得できませんでした（${errors.join(' / ')}）`)
}
