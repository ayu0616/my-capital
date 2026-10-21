import type {
  AppSettings,
  FinancialAccount,
  HoldingStockStatus,
} from './schema'

export const SETTINGS_ID = 'default'

export const DEFAULT_SETTINGS: Omit<AppSettings, 'updatedAt'> = {
  id: SETTINGS_ID,
  nickname: 'Ayumu',
  birthDate: '1997-02-18',
  nisaTargetAmount: 18_000_000,
  nisaTargetAge: 35,
  fujitsuAlertThreshold: 0.15,
  gearFundTarget: 150_000,
  gearFundSaved: 0,
}

export const DEFAULT_HOLDING: Omit<HoldingStockStatus, 'updatedAt'> = {
  id: SETTINGS_ID,
  monthlyContribution: 33_000,
  companyIncentiveRate: 0.15,
  currentAccumulatedShares: 0,
  latestStockPrice: 0,
  targetShares: 100,
  recordedAt: '',
  averageAcquisitionPrice: 0,
  carryoverAmount: 0,
}

export const DEFAULT_ACCOUNTS: Omit<
  FinancialAccount,
  'createdAt' | 'updatedAt'
>[] = [
  {
    id: 'rakuten-sec',
    name: '楽天証券',
    institution: '楽天証券',
    kind: 'brokerage',
    role: 'NISA・投資信託・個別株',
    notes: 'NISAの積立と個別株の保有。保有資産CSVの取り込み先。',
    sortOrder: 10,
  },
  {
    id: 'smbc-nikko',
    name: 'SMBC日興証券',
    institution: 'SMBC日興証券',
    kind: 'brokerage',
    role: '持株会の引出し先',
    notes: '富士通の持株会から引き出した株式を保管する口座。',
    sortOrder: 20,
  },
  {
    id: 'rakuten-bank',
    name: '楽天銀行',
    institution: '楽天銀行',
    kind: 'bank',
    role: 'メイン口座',
    notes: '生活費と現金の中心。',
    sortOrder: 30,
  },
  {
    id: 'smbc',
    name: 'SMBC',
    institution: '三井住友銀行',
    kind: 'bank',
    role: 'サブ口座',
    notes: 'サブの預金口座。',
    sortOrder: 40,
  },
]
