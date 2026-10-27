import type { AssetEntry } from '../db/schema'

export type AssetItemUnit = 'yen' | 'shares' | 'price'

export interface AssetItemDefinition {
  key: string
  label: string
  group: string
  unit: AssetItemUnit
  field: keyof AssetEntry | null
  snapshotField: string
  hint: string
}

export const ASSET_ITEM_GROUPS = ['金融資産', '富士通・持株会', '実物資産'] as const

export const ASSET_ITEMS: AssetItemDefinition[] = [
  {
    key: 'rakuten_bank',
    label: '現預金（楽天銀行）',
    group: '金融資産',
    unit: 'yen',
    field: null,
    snapshotField: 'cashAmount',
    hint: '楽天銀行の普通預金残高。',
  },
  {
    key: 'smbc_bank',
    label: '現預金（三井住友銀行）',
    group: '金融資産',
    unit: 'yen',
    field: null,
    snapshotField: 'cashAmount',
    hint: '三井住友銀行（SMBC）の普通預金残高。',
  },
  {
    key: 'securities_cash',
    label: '楽天証券の預り金',
    group: '金融資産',
    unit: 'yen',
    field: null,
    snapshotField: 'securitiesCashAmount',
    hint: 'CSVの「預り金合計」。',
  },
  {
    key: 'mutual_funds',
    label: '投資信託の評価額',
    group: '金融資産',
    unit: 'yen',
    field: null,
    snapshotField: 'nisaMutualFundAmount',
    hint: '楽天証券の投資信託の合計。',
  },
  {
    key: 'individual_stocks',
    label: '個別株の評価額',
    group: '金融資産',
    unit: 'yen',
    field: null,
    snapshotField: 'nisaIndividualStockAmount',
    hint: '富士通のロマン枠を除く個別株。',
  },
  {
    key: 'other_securities',
    label: 'その他の証券',
    group: '金融資産',
    unit: 'yen',
    field: null,
    snapshotField: 'nisaOtherAssetAmount',
    hint: '債券・金など、投資信託と株式以外。',
  },
  {
    key: 'pension',
    label: '確定拠出年金（JIS&T）',
    group: '金融資産',
    unit: 'yen',
    field: null,
    snapshotField: 'pensionBalance',
    hint: '設定の確定拠出年金の評価額。',
  },
  {
    key: 'nisa_principal',
    label: 'NISA累計元本',
    group: '金融資産',
    unit: 'yen',
    field: null,
    snapshotField: 'nisaContributedPrincipal',
    hint: 'NISAの目標額に対する進捗に使う簿価ベースの金額。',
  },
  {
    key: 'fujitsu_roman_shares',
    label: 'NISAロマン枠 株数',
    group: '富士通・持株会',
    unit: 'shares',
    field: null,
    snapshotField: 'fujitsuRomanStockShares',
    hint: 'NISAロマン枠で保有する富士通の株数。',
  },
  {
    key: 'holding_shares',
    label: '持株会の株数',
    group: '富士通・持株会',
    unit: 'shares',
    field: null,
    snapshotField: 'holdingStockShares',
    hint: '設定の現在株数が初期値です。',
  },
  {
    key: 'holding_average_price',
    label: '持株会の平均取得単価',
    group: '富士通・持株会',
    unit: 'price',
    field: null,
    snapshotField: 'holdingAverageAcquisitionPrice',
    hint: '会社ページの「平均取得単価」を記録します。',
  },
  {
    key: 'holding_carryover',
    label: '持株会の繰越金',
    group: '富士通・持株会',
    unit: 'yen',
    field: null,
    snapshotField: 'holdingCarryoverAmount',
    hint: '次回の購入に使う、持株会内の現金。',
  },
  {
    key: 'fujitsu_price',
    label: '富士通 株価',
    group: '富士通・持株会',
    unit: 'price',
    field: null,
    snapshotField: 'fujitsuCurrentPrice',
    hint: '持株会・引出し済み・ロマン枠の評価に使います。',
  },
  {
    key: 'gear_resale',
    label: '機材の買取目安',
    group: '実物資産',
    unit: 'yen',
    field: null,
    snapshotField: 'gearResaleAmount',
    hint: '機材台帳の買取目安の合計が初期値です。',
  },
] as const

export const ASSET_ITEM_BY_KEY: Record<string, AssetItemDefinition> = Object.fromEntries(
  ASSET_ITEMS.map((item) => [item.key, item]),
)

export function formatAssetEntryValue(
  item: AssetItemDefinition,
  value: number,
): string {
  if (item.unit === 'shares') return `${Number(value.toFixed(1))}株`
  if (item.unit === 'price') return `¥${Math.round(value).toLocaleString('ja-JP')}`
  return `¥${Math.round(value).toLocaleString('ja-JP')}`
}

export function findLatestEntry(
  entries: AssetEntry[],
  itemKey: string,
): AssetEntry | null {
  const filtered = entries
    .filter((entry) => entry.itemKey === itemKey)
    .sort((a, b) => {
      if (a.valuedAt !== b.valuedAt) return a.valuedAt.localeCompare(b.valuedAt)
      return a.createdAt.localeCompare(b.createdAt)
    })
  return filtered.at(-1) ?? null
}

export function effectiveValue(entries: AssetEntry[], itemKey: string, asOfDate: string): number {
  const candidate = entries
    .filter((entry) => entry.itemKey === itemKey && entry.valuedAt <= asOfDate)
    .sort((a, b) => {
      if (a.valuedAt !== b.valuedAt) return a.valuedAt.localeCompare(b.valuedAt)
      return a.createdAt.localeCompare(b.createdAt)
    })
    .at(-1)
  return candidate?.value ?? 0
}