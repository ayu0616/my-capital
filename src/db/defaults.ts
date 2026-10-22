import type {
  AppSettings,
  FinancialAccount,
  HoldingStockStatus,
  RetirementAccount,
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

export const DEFAULT_RETIREMENT: Omit<RetirementAccount, 'updatedAt'> = {
  id: SETTINGS_ID,
  provider: 'JIS&T',
  schemeName: '会社型確定拠出年金',
  balance: 0,
  totalContributed: 0,
  monthlyContribution: 0,
  employerContribution: 0,
  valuedAt: '',
  notes: null,
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
    notes: null,
    sortOrder: 10,
  },
  {
    id: 'smbc-nikko',
    name: 'SMBC日興証券',
    institution: 'SMBC日興証券',
    kind: 'brokerage',
    role: '持株会の引出し先',
    notes: null,
    sortOrder: 20,
  },
  {
    id: 'rakuten-bank',
    name: '楽天銀行',
    institution: '楽天銀行',
    kind: 'bank',
    role: 'メイン口座',
    notes: null,
    sortOrder: 30,
  },
  {
    id: 'smbc',
    name: 'SMBC',
    institution: '三井住友銀行',
    kind: 'bank',
    role: 'サブ口座',
    notes: null,
    sortOrder: 40,
  },
  {
    id: 'jist',
    name: 'JIS&T',
    institution: 'JIS&T',
    kind: 'pension',
    role: '会社の確定拠出年金',
    notes: null,
    sortOrder: 50,
  },
]
