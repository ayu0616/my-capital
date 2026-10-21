/**
 * 楽天証券「保有商品一覧（すべて）」のCSVパーサー。
 *
 * 実際のCSVは、上部に資産合計などの集計行があり、そのあとに
 * 「種別 / 銘柄コード・ティッカー / 銘柄 / 口座 / 保有数量 ...」の
 * ヘッダーが続く。文字コードはUTF-8またはShift_JIS。
 */

export type RakutenHoldingCategory = 'stock' | 'fund' | 'other'

export interface RakutenCsvHolding {
  type: string
  category: RakutenHoldingCategory
  code: string
  name: string
  accountType: string
  quantity: number
  unit: string
  averagePrice: number
  currentPrice: number
  marketValue: number
  profitLoss: number
  profitLossPercent: number
  costBasis: number
  isFujitsu: boolean
}

export interface RakutenCsvSummary {
  totalValue: number
  productValue: number
  cashValue: number
  stockValue: number
  fundValue: number
  otherValue: number
  fujitsuShares: number
  fujitsuPrice: number
  fujitsuValue: number
  nisaCostBasis: number
  holdingCount: number
  holdings: RakutenCsvHolding[]
}

export interface DecodedCsv {
  text: string
  encoding: 'UTF-8' | 'Shift_JIS'
}

const FUND_TYPE_PATTERN = /(投資信託|ファンド|MMF)/i

function normalize(value: string | undefined | null): string {
  return String(value ?? '')
    .replace(/^\uFEFF/, '')
    .replace(/\u3000/g, ' ')
    .trim()
}

export function parseRakutenNumber(value: string | undefined | null): number {
  const text = normalize(value)
    .replace(/,/g, '')
    .replace(/円/g, '')
    .replace(/[％%]/g, '')
    .replace(/^\+/, '')
  if (text === '' || text === '-' || text === '—' || text === '未取得') {
    return 0
  }
  const parsed = Number(text)
  return Number.isFinite(parsed) ? parsed : 0
}

export function parseCsvRows(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let inQuotes = false
  const source = String(text ?? '').replace(/^\uFEFF/, '')

  for (let index = 0; index < source.length; index += 1) {
    const character = source.charAt(index)
    const nextCharacter = source.charAt(index + 1)

    if (inQuotes) {
      if (character === '"' && nextCharacter === '"') {
        field += '"'
        index += 1
      } else if (character === '"') {
        inQuotes = false
      } else {
        field += character
      }
      continue
    }

    if (character === '"') {
      inQuotes = true
    } else if (character === ',') {
      row.push(field)
      field = ''
    } else if (character === '\r' && nextCharacter === '\n') {
      row.push(field)
      rows.push(row)
      row = []
      field = ''
      index += 1
    } else if (character === '\n' || character === '\r') {
      row.push(field)
      rows.push(row)
      row = []
      field = ''
    } else {
      field += character
    }
  }

  if (field !== '' || row.length > 0) {
    row.push(field)
    rows.push(row)
  }

  return rows
}

function isFundType(type: string): boolean {
  return FUND_TYPE_PATTERN.test(type)
}

function isStockType(type: string): boolean {
  return !isFundType(type) && /株式/.test(type)
}

function categoryOf(type: string): RakutenHoldingCategory {
  if (isStockType(type)) return 'stock'
  if (isFundType(type)) return 'fund'
  return 'other'
}

function isNisaAccount(accountType: string): boolean {
  return /NISA|成長投資枠|つみたて投資枠/i.test(accountType)
}

function isFujitsuHolding(code: string, name: string): boolean {
  const normalizedCode = code.replace(/[^0-9]/g, '')
  return normalizedCode.startsWith('6702') || name.includes('富士通')
}

function findColumnIndex(
  headers: string[],
  aliases: string[],
): number {
  const normalized = headers.map((header) => normalize(header))
  for (const alias of aliases) {
    const exact = normalized.indexOf(alias)
    if (exact >= 0) return exact
  }
  for (const alias of aliases) {
    const partial = normalized.findIndex((header) => header.includes(alias))
    if (partial >= 0) return partial
  }
  return -1
}

function cell(row: string[], index: number): string {
  return index >= 0 ? normalize(row[index]) : ''
}

export function parseRakutenCsv(text: string): RakutenCsvSummary {
  const rows = parseCsvRows(text)
  if (rows.length === 0) {
    throw new Error('CSVが空です。')
  }

  const headerIndex = rows.findIndex((row) => {
    const first = normalize(row[0])
    const second = normalize(row[1])
    return first === '種別' && second.includes('銘柄コード')
  })

  if (headerIndex < 0) {
    throw new Error(
      '「保有商品一覧（すべて）」のCSVを選択してください。見出し行（種別・銘柄コード）を検出できませんでした。',
    )
  }

  const headers = rows[headerIndex]
  const indexMap = {
    type: findColumnIndex(headers, ['種別']),
    code: findColumnIndex(headers, ['銘柄コード・ティッカー', '銘柄コード']),
    name: findColumnIndex(headers, ['銘柄']),
    accountType: findColumnIndex(headers, ['口座']),
    quantity: findColumnIndex(headers, ['保有数量']),
    unit: findColumnIndex(headers, ['［単位］', '[単位]', '単位']),
    averagePrice: findColumnIndex(headers, [
      '平均取得価額',
      '平均取得単価',
    ]),
    currentPrice: findColumnIndex(headers, ['現在値']),
    marketValue: findColumnIndex(headers, [
      '時価評価額[円]',
      '時価評価額（円）',
      '時価評価額',
    ]),
    profitLoss: findColumnIndex(headers, [
      '評価損益[円]',
      '評価損益（円）',
      '評価損益',
    ]),
    profitLossPercent: findColumnIndex(headers, [
      '評価損益[％]',
      '評価損益[%]',
      '評価損益（％）',
      '評価損益（%）',
    ]),
  }

  if (indexMap.type < 0 || indexMap.name < 0 || indexMap.marketValue < 0) {
    throw new Error(
      'CSVの列構成を認識できませんでした。種別・銘柄・時価評価額[円]の列が必要です。',
    )
  }

  const summary: Record<string, number> = {}
  for (let index = 0; index < headerIndex; index += 1) {
    const row = rows[index]
    const label = normalize(row[0])
    const value = parseRakutenNumber(row[1])
    if (label && value !== 0) summary[label] = value
  }

  const holdings: RakutenCsvHolding[] = []

  for (let index = headerIndex + 1; index < rows.length; index += 1) {
    const row = rows[index]
    const first = normalize(row[0])
    if (!first) continue
    if (first.startsWith('■') || first.includes('合計')) break
    if (first === '種別') continue

    const type = cell(row, indexMap.type)
    const name = cell(row, indexMap.name)
    if (!type || !name) continue

    const category = categoryOf(type)
    const code = cell(row, indexMap.code)
    const quantity = parseRakutenNumber(cell(row, indexMap.quantity))
    const averagePrice = parseRakutenNumber(cell(row, indexMap.averagePrice))
    const currentPrice = parseRakutenNumber(cell(row, indexMap.currentPrice))
    const rawMarketValue = parseRakutenNumber(cell(row, indexMap.marketValue))
    const marketValue =
      rawMarketValue > 0
        ? Math.round(rawMarketValue)
        : Math.round(
            quantity *
              currentPrice /
              (category === 'fund' ? 10_000 : 1),
          )
    const costBasis = Math.round(
      quantity * averagePrice / (category === 'fund' ? 10_000 : 1),
    )

    holdings.push({
      type,
      category,
      code,
      name,
      accountType: cell(row, indexMap.accountType),
      quantity,
      unit: cell(row, indexMap.unit),
      averagePrice,
      currentPrice,
      marketValue,
      profitLoss: Math.round(
        parseRakutenNumber(cell(row, indexMap.profitLoss)),
      ),
      profitLossPercent:
        parseRakutenNumber(cell(row, indexMap.profitLossPercent)) / 100,
      costBasis,
      isFujitsu: isFujitsuHolding(code, name),
    })
  }

  if (holdings.length === 0) {
    throw new Error('保有商品を1件も検出できませんでした。')
  }

  const productValue = summary['保有商品の評価額合計'] ??
    holdings.reduce((sum, holding) => sum + holding.marketValue, 0)
  const cashValue = summary['預り金合計'] ?? summary['預り金'] ?? 0
  const totalValue = summary['資産合計'] || productValue + cashValue

  const stockValue = holdings
    .filter((holding) => holding.category === 'stock' && !holding.isFujitsu)
    .reduce((sum, holding) => sum + holding.marketValue, 0)
  const fundValue = holdings
    .filter((holding) => holding.category === 'fund')
    .reduce((sum, holding) => sum + holding.marketValue, 0)
  const otherValue = holdings
    .filter((holding) => holding.category === 'other')
    .reduce((sum, holding) => sum + holding.marketValue, 0)
  const fujitsuHoldings = holdings.filter((holding) => holding.isFujitsu)
  const fujitsuShares = fujitsuHoldings.reduce(
    (sum, holding) => sum + holding.quantity,
    0,
  )
  const fujitsuValue = fujitsuHoldings.reduce(
    (sum, holding) => sum + holding.marketValue,
    0,
  )
  const fujitsuPrice =
    fujitsuHoldings.find((holding) => holding.currentPrice > 0)?.currentPrice ??
    0
  const nisaCostBasis = holdings
    .filter((holding) => isNisaAccount(holding.accountType))
    .reduce((sum, holding) => sum + holding.costBasis, 0)

  return {
    totalValue: Math.round(totalValue),
    productValue: Math.round(productValue),
    cashValue: Math.round(cashValue),
    stockValue: Math.round(stockValue),
    fundValue: Math.round(fundValue),
    otherValue: Math.round(otherValue),
    fujitsuShares,
    fujitsuPrice,
    fujitsuValue: Math.round(fujitsuValue),
    nisaCostBasis: Math.round(nisaCostBasis),
    holdingCount: holdings.length,
    holdings,
  }
}

export function decodeRakutenCsvBuffer(buffer: ArrayBuffer): DecodedCsv {
  const utf8 = new TextDecoder('utf-8', { fatal: false }).decode(buffer)
  const replacementCount = (utf8.match(/\uFFFD/g) ?? []).length
  if (replacementCount === 0) {
    return { text: utf8, encoding: 'UTF-8' }
  }

  try {
    return {
      text: new TextDecoder('shift_jis', { fatal: false }).decode(buffer),
      encoding: 'Shift_JIS',
    }
  } catch {
    return { text: utf8, encoding: 'UTF-8' }
  }
}
