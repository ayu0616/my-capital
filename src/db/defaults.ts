import type { AppSettings, HoldingStockStatus } from './schema'

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
}
