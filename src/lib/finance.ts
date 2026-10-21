import type {
  AppSettings,
  AssetSnapshot,
  CameraGear,
  CareerEvent,
  HoldingStockStatus,
  HoldingWithdrawal,
  RetirementAccount,
  RetirementAllocation,
  SelfInvestment,
  StockGoal,
} from '../db/schema'
import {
  addMonths,
  addYears,
  clamp,
  currentYearMonth,
  formatMonthEta,
  monthsBetween,
  parseDateOnly,
  todayDateOnly,
} from './format'

/* -------------------------------------------------------------------------- */
/*  Shared types & palette                                                     */
/* -------------------------------------------------------------------------- */

export const ALLOCATION_COLORS = {
  mutualFunds: '#1E5B45',
  individualStocks: '#5B9C82',
  otherSecurities: '#8A9C8D',
  fujitsu: '#C1913F',
  pension: '#4F6B8A',
  carryover: '#D8C7A3',
  securitiesCash: '#C9C0AE',
  cash: '#AEB6AD',
  gear: '#7A6550',
} as const

export const INVESTMENT_CATEGORY_COLORS = {
  cert: '#1E5B45',
  udemy: '#5B9C82',
  book: '#C1913F',
  other: '#A8AFA8',
} as const

export const INVESTMENT_CATEGORY_LABELS: Record<string, string> = {
  cert: '資格・認定',
  udemy: 'Udemy・講座',
  book: '書籍',
  other: 'その他',
}

export const GEAR_CATEGORY_LABELS: Record<string, string> = {
  body: 'カメラボディ',
  lens: 'レンズ',
  accessory: 'アクセサリー',
}

export function categoryLabel(category: string): string {
  return INVESTMENT_CATEGORY_LABELS[category] ?? 'その他'
}

export function gearCategoryLabel(category: string): string {
  return GEAR_CATEGORY_LABELS[category] ?? 'アクセサリー'
}

const safe = (value: number | null | undefined): number =>
  Number.isFinite(value) ? Number(value) : 0

/* -------------------------------------------------------------------------- */
/*  Snapshot totals & series                                                   */
/* -------------------------------------------------------------------------- */

export function snapshotTotal(snapshot: AssetSnapshot): number {
  const fujitsuShares =
    safe(snapshot.holdingStockShares) +
    safe(snapshot.withdrawnHoldingShares) +
    safe(snapshot.fujitsuRomanStockShares)
  return (
    safe(snapshot.cashAmount) +
    safe(snapshot.securitiesCashAmount) +
    safe(snapshot.nisaMutualFundAmount) +
    safe(snapshot.nisaIndividualStockAmount) +
    safe(snapshot.nisaOtherAssetAmount) +
    safe(snapshot.pensionBalance) +
    fujitsuShares * safe(snapshot.fujitsuCurrentPrice) +
    safe(snapshot.holdingCarryoverAmount) +
    safe(snapshot.gearResaleAmount)
  )
}

export function snapshotFinancialTotal(snapshot: AssetSnapshot): number {
  return snapshotTotal(snapshot) - safe(snapshot.gearResaleAmount)
}

export interface MonthlyPoint {
  yearMonth: string
  label: string
  shortLabel: string
  total: number
  financial: number
  gear: number
  invested: number
  cash: number
  fujitsu: number
}

export function buildMonthlySeries(snapshots: AssetSnapshot[]): MonthlyPoint[] {
  return [...snapshots]
    .sort((a, b) => a.yearMonth.localeCompare(b.yearMonth))
    .map((snapshot) => {
      const fujitsu =
        (safe(snapshot.holdingStockShares) +
          safe(snapshot.withdrawnHoldingShares) +
          safe(snapshot.fujitsuRomanStockShares)) *
        safe(snapshot.fujitsuCurrentPrice)
      const invested =
        safe(snapshot.nisaMutualFundAmount) +
        safe(snapshot.nisaIndividualStockAmount) +
        safe(snapshot.nisaOtherAssetAmount) +
        safe(snapshot.pensionBalance) +
        fujitsu
      return {
        yearMonth: snapshot.yearMonth,
        label: `${snapshot.yearMonth.slice(0, 4)}年${Number(snapshot.yearMonth.slice(5))}月`,
        shortLabel: `${Number(snapshot.yearMonth.slice(5))}月`,
        total: snapshotTotal(snapshot),
        financial: snapshotFinancialTotal(snapshot),
        gear: safe(snapshot.gearResaleAmount),
        invested,
        cash: safe(snapshot.cashAmount) + safe(snapshot.securitiesCashAmount),
        fujitsu,
      }
    })
}

/* -------------------------------------------------------------------------- */
/*  Current portfolio                                                          */
/* -------------------------------------------------------------------------- */

export interface PortfolioSlice {
  key:
    | 'mutualFunds'
    | 'individualStocks'
    | 'otherSecurities'
    | 'fujitsu'
    | 'pension'
    | 'carryover'
    | 'securitiesCash'
    | 'cash'
    | 'gear'
  label: string
  amount: number
  ratio: number
  color: string
}

export interface Portfolio {
  total: number
  financialTotal: number
  gearValue: number
  slices: PortfolioSlice[]
  fujitsuValue: number
  fujitsuShares: number
  fujitsuPrice: number
  fujitsuRatio: number
  isFujitsuOverLimit: boolean
  threshold: number
}

function buildPortfolio(params: {
  cash: number
  securitiesCash: number
  mutualFunds: number
  individualStocks: number
  otherSecurities: number
  fujitsuShares: number
  fujitsuPrice: number
  pension: number
  carryover: number
  gear: number
  threshold: number
}): Portfolio {
  const fujitsuValue = params.fujitsuShares * params.fujitsuPrice
  const amounts = {
    mutualFunds: safe(params.mutualFunds),
    individualStocks: safe(params.individualStocks),
    otherSecurities: safe(params.otherSecurities),
    fujitsu: safe(fujitsuValue),
    pension: safe(params.pension),
    carryover: safe(params.carryover),
    securitiesCash: safe(params.securitiesCash),
    cash: safe(params.cash),
    gear: safe(params.gear),
  }
  const total = Object.values(amounts).reduce((sum, value) => sum + value, 0)
  const ratioOf = (value: number) => (total > 0 ? value / total : 0)
  const slices: PortfolioSlice[] = [
    { key: 'mutualFunds', label: '投資信託', amount: amounts.mutualFunds, ratio: ratioOf(amounts.mutualFunds), color: ALLOCATION_COLORS.mutualFunds },
    { key: 'individualStocks', label: '個別株（富士通ロマン枠を除く）', amount: amounts.individualStocks, ratio: ratioOf(amounts.individualStocks), color: ALLOCATION_COLORS.individualStocks },
    { key: 'otherSecurities', label: 'その他の証券', amount: amounts.otherSecurities, ratio: ratioOf(amounts.otherSecurities), color: ALLOCATION_COLORS.otherSecurities },
    { key: 'fujitsu', label: '富士通（持株会＋引出し済み＋ロマン枠）', amount: amounts.fujitsu, ratio: ratioOf(amounts.fujitsu), color: ALLOCATION_COLORS.fujitsu },
    { key: 'pension', label: '確定拠出年金（JIS&T）', amount: amounts.pension, ratio: ratioOf(amounts.pension), color: ALLOCATION_COLORS.pension },
    { key: 'carryover', label: '持株会の繰越金', amount: amounts.carryover, ratio: ratioOf(amounts.carryover), color: ALLOCATION_COLORS.carryover },
    { key: 'securitiesCash', label: '証券口座の預り金', amount: amounts.securitiesCash, ratio: ratioOf(amounts.securitiesCash), color: ALLOCATION_COLORS.securitiesCash },
    { key: 'cash', label: '現預金（銀行）', amount: amounts.cash, ratio: ratioOf(amounts.cash), color: ALLOCATION_COLORS.cash },
    { key: 'gear', label: 'カメラ機材', amount: amounts.gear, ratio: ratioOf(amounts.gear), color: ALLOCATION_COLORS.gear },
  ]
  const financialTotal =
    amounts.mutualFunds +
    amounts.individualStocks +
    amounts.otherSecurities +
    amounts.fujitsu +
    amounts.pension +
    amounts.carryover +
    amounts.securitiesCash +
    amounts.cash
  return {
    total,
    financialTotal,
    gearValue: amounts.gear,
    slices,
    fujitsuValue: amounts.fujitsu,
    fujitsuShares: params.fujitsuShares,
    fujitsuPrice: params.fujitsuPrice,
    fujitsuRatio: ratioOf(amounts.fujitsu),
    isFujitsuOverLimit: ratioOf(amounts.fujitsu) > params.threshold,
    threshold: params.threshold,
  }
}

export function buildCurrentPortfolio(
  latest: AssetSnapshot | null | undefined,
  holding: HoldingStockStatus,
  gearValue: number,
  threshold = 0.15,
  withdrawnShares = 0,
  pensionBalance = 0,
): Portfolio {
  return buildPortfolio({
    cash: safe(latest?.cashAmount),
    securitiesCash: safe(latest?.securitiesCashAmount),
    mutualFunds: safe(latest?.nisaMutualFundAmount),
    individualStocks: safe(latest?.nisaIndividualStockAmount),
    otherSecurities: safe(latest?.nisaOtherAssetAmount),
    fujitsuShares:
      safe(holding.currentAccumulatedShares) +
      safe(withdrawnShares) +
      safe(latest?.fujitsuRomanStockShares),
    fujitsuPrice: safe(holding.latestStockPrice) || safe(latest?.fujitsuCurrentPrice),
    pension: safe(latest?.pensionBalance) || safe(pensionBalance),
    carryover: safe(holding.carryoverAmount),
    gear: gearValue,
    threshold,
  })
}

export function buildSnapshotPortfolio(
  snapshot: AssetSnapshot,
  threshold = 0.15,
): Portfolio {
  return buildPortfolio({
    cash: safe(snapshot.cashAmount),
    securitiesCash: safe(snapshot.securitiesCashAmount),
    mutualFunds: safe(snapshot.nisaMutualFundAmount),
    individualStocks: safe(snapshot.nisaIndividualStockAmount),
    otherSecurities: safe(snapshot.nisaOtherAssetAmount),
    fujitsuShares:
      safe(snapshot.holdingStockShares) +
      safe(snapshot.withdrawnHoldingShares) +
      safe(snapshot.fujitsuRomanStockShares),
    fujitsuPrice: safe(snapshot.fujitsuCurrentPrice),
    pension: safe(snapshot.pensionBalance),
    carryover: safe(snapshot.holdingCarryoverAmount),
    gear: safe(snapshot.gearResaleAmount),
    threshold,
  })
}

export interface NetWorthTrend {
  amount: number
  delta: number | null
  deltaRatio: number | null
}

export function buildNetWorthTrend(
  currentTotal: number,
  previousTotal: number | null | undefined,
): NetWorthTrend {
  if (previousTotal == null || previousTotal <= 0) {
    return { amount: currentTotal, delta: null, deltaRatio: null }
  }
  return {
    amount: currentTotal,
    delta: currentTotal - previousTotal,
    deltaRatio: previousTotal > 0 ? (currentTotal - previousTotal) / previousTotal : null,
  }
}

/* -------------------------------------------------------------------------- */
/*  NISA plan                                                                  */
/* -------------------------------------------------------------------------- */

export interface NisaPlan {
  principal: number
  targetAmount: number
  remaining: number
  progress: number
  targetAge: number
  targetDate: Date
  monthsLeft: number
  requiredMonthly: number
  isComplete: boolean
  age: number
}

export function buildNisaPlan(
  settings: AppSettings,
  principal: number,
  today = todayDateOnly(),
): NisaPlan {
  const targetAmount = Math.max(1, safe(settings.nisaTargetAmount))
  const birthDate = parseBirthDate(settings.birthDate, today)
  const targetDate = addYears(birthDate, Math.max(1, safe(settings.nisaTargetAge)))
  const monthsLeft = Math.max(0, monthsBetween(today, targetDate))
  const safePrincipal = clamp(safe(principal), 0, Number.MAX_SAFE_INTEGER)
  const remaining = Math.max(0, targetAmount - safePrincipal)
  return {
    principal: safePrincipal,
    targetAmount,
    remaining,
    progress: clamp(safePrincipal / targetAmount, 0, 1),
    targetAge: safe(settings.nisaTargetAge),
    targetDate,
    monthsLeft,
    requiredMonthly: remaining > 0 ? remaining / Math.max(1, monthsLeft) : 0,
    isComplete: remaining <= 0,
    age: Math.floor(monthsBetween(birthDate, today) / 12),
  }
}

function parseBirthDate(value: string, fallback: Date): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value)
  if (!match) return addYears(fallback, -30)
  return new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 12))
}

/* -------------------------------------------------------------------------- */
/*  Employee holding plan (Fujitsu)                                            */
/* -------------------------------------------------------------------------- */

export interface HoldingPlan {
  currentShares: number
  withdrawnShares: number
  totalShares: number
  targetShares: number
  price: number
  monthlyContribution: number
  incentiveRate: number
  monthlyPurchaseAmount: number
  monthlyShares: number
  remainingShares: number
  progress: number
  monthsToTarget: number | null
  etaDate: Date | null
  etaLabel: string | null
  value: number
  withdrawnValue: number
  totalValue: number
  recordedAt: string
  averageAcquisitionPrice: number
  costBasis: number | null
  unrealizedGain: number | null
  unrealizedGainRatio: number | null
  withdrawnCostBasis: number | null
  withdrawnUnrealizedGain: number | null
  withdrawnUnrealizedGainRatio: number | null
  carryoverAmount: number
  isComplete: boolean
  predictedShares: number
}

export function buildHoldingPlan(
  holding: HoldingStockStatus,
  today = todayDateOnly(),
  withdrawals: HoldingWithdrawal[] = [],
): HoldingPlan {
  const currentShares = Math.max(0, safe(holding.currentAccumulatedShares))
  const withdrawnShares = withdrawals.reduce(
    (sum, withdrawal) => sum + Math.max(0, safe(withdrawal.shares)),
    0,
  )
  const totalShares = currentShares + withdrawnShares
  const targetShares = Math.max(1, safe(holding.targetShares) || 100)
  const price = Math.max(0, safe(holding.latestStockPrice))
  const incentiveRate = Math.max(0, safe(holding.companyIncentiveRate))
  const monthlyContribution = Math.max(0, safe(holding.monthlyContribution))
  const monthlyPurchaseAmount = monthlyContribution * (1 + incentiveRate)
  const monthlyShares = price > 0 ? monthlyPurchaseAmount / price : 0
  const remainingShares = Math.max(0, targetShares - totalShares)
  const monthsToTarget =
    remainingShares <= 0 ? 0 : monthlyShares > 0 ? remainingShares / monthlyShares : null
  const etaDate =
    monthsToTarget == null ? null : addMonths(today, Math.ceil(monthsToTarget))
  const averageAcquisitionPrice = Math.max(0, safe(holding.averageAcquisitionPrice))
  const carryoverAmount = Math.max(0, safe(holding.carryoverAmount))
  const costBasis =
    averageAcquisitionPrice > 0 ? currentShares * averageAcquisitionPrice : null
  const unrealizedGain =
    costBasis != null && price > 0 ? currentShares * (price - averageAcquisitionPrice) : null
  const unrealizedGainRatio =
    costBasis != null && costBasis > 0 && price > 0
      ? (price - averageAcquisitionPrice) / averageAcquisitionPrice
      : null
  const withdrawnCostBasis =
    withdrawnShares > 0
      ? withdrawals.reduce((sum, withdrawal) => {
          const costPrice =
            safe(withdrawal.averageAcquisitionPrice) || averageAcquisitionPrice
          return sum + Math.max(0, safe(withdrawal.shares)) * costPrice
        }, 0)
      : null
  const withdrawnValue = withdrawnShares * price
  const withdrawnUnrealizedGain =
    withdrawnCostBasis != null && withdrawnCostBasis > 0 && price > 0
      ? withdrawnValue - withdrawnCostBasis
      : null
  const withdrawnUnrealizedGainRatio =
    withdrawnUnrealizedGain != null && withdrawnCostBasis
      ? withdrawnUnrealizedGain / withdrawnCostBasis
      : null
  const value = currentShares * price
  return {
    currentShares,
    withdrawnShares,
    totalShares,
    targetShares,
    price,
    monthlyContribution,
    incentiveRate,
    monthlyPurchaseAmount,
    monthlyShares,
    remainingShares,
    progress: clamp(totalShares / targetShares, 0, 1),
    monthsToTarget,
    etaDate,
    etaLabel: etaDate && remainingShares > 0 ? formatMonthEta(etaDate) : null,
    value,
    withdrawnValue,
    totalValue: value + withdrawnValue,
    recordedAt: holding.recordedAt,
    averageAcquisitionPrice,
    costBasis,
    unrealizedGain,
    unrealizedGainRatio,
    withdrawnCostBasis,
    withdrawnUnrealizedGain,
    withdrawnUnrealizedGainRatio,
    carryoverAmount,
    isComplete: remainingShares <= 0,
    predictedShares: Math.min(targetShares, totalShares + monthlyShares),
  }
}

/* -------------------------------------------------------------------------- */
/*  Shareholder-benefit stock goals                                            */
/* -------------------------------------------------------------------------- */

export interface StockGoalSummary {
  id: string
  code: string
  name: string
  account: string
  currentShares: number
  targetShares: number
  remainingShares: number
  progress: number
  targetDate: Date
  daysRemaining: number
  monthsRemaining: number | null
  requiredSharesPerMonth: number | null
  requiredBudgetPerMonth: number | null
  purchaseCountRemaining: number | null
  projectedDate: Date | null
  projectedMonthLabel: string | null
  isAchieved: boolean
  isOverdue: boolean
  isOnTrack: boolean | null
  minimumPurchaseUnit: number
  averageAcquisitionPrice: number
  currentPrice: number
  monthlyBudget: number
  value: number
  costBasis: number | null
  unrealizedGain: number | null
  unrealizedGainRatio: number | null
  benefitNote: string
  notes: string | null
  autoUpdateFromCsv: boolean
}

export function buildStockGoalSummary(
  goal: StockGoal,
  today = todayDateOnly(),
): StockGoalSummary {
  const currentShares = Math.max(0, safe(goal.currentShares))
  const targetShares = Math.max(1, safe(goal.targetShares) || 100)
  const minimumPurchaseUnit = Math.max(
    1,
    Math.floor(safe(goal.minimumPurchaseUnit) || 1),
  )
  const targetDate = parseDateOnly(goal.targetDate)
  const remainingShares = Math.max(0, targetShares - currentShares)
  const isAchieved = remainingShares <= 0
  const daysRemaining = Math.ceil(
    (targetDate.getTime() - today.getTime()) / 86_400_000,
  )
  const monthsRemaining = monthsBetween(today, targetDate)
  const requiredSharesPerMonth =
    isAchieved
      ? 0
      : monthsRemaining > 0
        ? remainingShares / monthsRemaining
        : null
  const currentPrice = Math.max(0, safe(goal.currentPrice))
  const monthlyBudget = Math.max(0, safe(goal.monthlyBudget))
  const requiredBudgetPerMonth =
    requiredSharesPerMonth != null && currentPrice > 0
      ? requiredSharesPerMonth * currentPrice
      : null
  const purchaseCountRemaining = isAchieved
    ? 0
    : Math.ceil(remainingShares / minimumPurchaseUnit)
  const monthlySharesByBudget =
    currentPrice > 0 && monthlyBudget > 0 ? monthlyBudget / currentPrice : 0
  const projectedDate =
    isAchieved
      ? today
      : monthlySharesByBudget > 0
        ? addMonths(today, Math.ceil(remainingShares / monthlySharesByBudget))
        : null
  const isOverdue = !isAchieved && daysRemaining < 0
  const isOnTrack =
    isAchieved
      ? true
      : projectedDate != null
        ? projectedDate.getTime() <= targetDate.getTime()
        : null
  const averageAcquisitionPrice = Math.max(
    0,
    safe(goal.averageAcquisitionPrice),
  )
  const value = currentShares * currentPrice
  const costBasis =
    averageAcquisitionPrice > 0
      ? currentShares * averageAcquisitionPrice
      : null
  const unrealizedGain =
    costBasis != null && currentPrice > 0
      ? value - costBasis
      : null
  const unrealizedGainRatio =
    costBasis != null && costBasis > 0 && currentPrice > 0
      ? (currentPrice - averageAcquisitionPrice) / averageAcquisitionPrice
      : null
  return {
    id: goal.id,
    code: goal.code,
    name: goal.name,
    account: goal.account,
    currentShares,
    targetShares,
    remainingShares,
    progress: clamp(currentShares / targetShares, 0, 1),
    targetDate,
    daysRemaining,
    monthsRemaining: monthsRemaining > 0 ? monthsRemaining : null,
    requiredSharesPerMonth,
    requiredBudgetPerMonth,
    purchaseCountRemaining,
    projectedDate,
    projectedMonthLabel:
      projectedDate && !isAchieved ? formatMonthEta(projectedDate) : null,
    isAchieved,
    isOverdue,
    isOnTrack,
    minimumPurchaseUnit,
    averageAcquisitionPrice,
    currentPrice,
    monthlyBudget,
    value,
    costBasis,
    unrealizedGain,
    unrealizedGainRatio,
    benefitNote: goal.benefitNote,
    notes: goal.notes,
    autoUpdateFromCsv: goal.autoUpdateFromCsv === 1,
  }
}

export function buildStockGoalSummaries(
  goals: StockGoal[],
  today = todayDateOnly(),
): StockGoalSummary[] {
  return goals
    .map((goal) => buildStockGoalSummary(goal, today))
    .sort((a, b) => {
      if (a.isAchieved !== b.isAchieved) return a.isAchieved ? 1 : -1
      return a.targetDate.getTime() - b.targetDate.getTime()
    })
}

/* -------------------------------------------------------------------------- */
/*  Defined-contribution pension                                               */
/* -------------------------------------------------------------------------- */

export interface RetirementSummary {
  balance: number
  totalContributed: number
  gain: number
  gainRatio: number | null
  monthlyContribution: number
  employerContribution: number
  monthlyTotal: number
  valuedAt: string
  allocations: RetirementAllocation[]
  allocationTotal: number
  isAllocationComplete: boolean
}

export function buildRetirementSummary(
  account: RetirementAccount,
  allocations: RetirementAllocation[] = [],
): RetirementSummary {
  const balance = Math.max(0, safe(account.balance))
  const totalContributed = Math.max(0, safe(account.totalContributed))
  const gain = balance - totalContributed
  const monthlyContribution = Math.max(
    0,
    safe(account.monthlyContribution),
  )
  const employerContribution = Math.max(
    0,
    safe(account.employerContribution),
  )
  const allocationTotal = allocations.reduce(
    (sum, allocation) => sum + Math.max(0, safe(allocation.ratio)),
    0,
  )
  return {
    balance,
    totalContributed,
    gain,
    gainRatio:
      totalContributed > 0 ? gain / totalContributed : null,
    monthlyContribution,
    employerContribution,
    monthlyTotal: monthlyContribution + employerContribution,
    valuedAt: account.valuedAt,
    allocations: [...allocations].sort(
      (a, b) => a.sortOrder - b.sortOrder,
    ),
    allocationTotal,
    isAllocationComplete:
      allocationTotal >= 99.5 && allocationTotal <= 100.5,
  }
}

/* -------------------------------------------------------------------------- */
/*  Gear ledger                                                                */
/* -------------------------------------------------------------------------- */

export interface GearSummary {
  count: number
  purchaseTotal: number
  resaleTotal: number
  gain: number
  retentionRate: number
  byCategory: {
    key: string
    label: string
    count: number
    purchase: number
    resale: number
  }[]
}

export function buildGearSummary(gears: CameraGear[]): GearSummary {
  const purchaseTotal = gears.reduce((sum, gear) => sum + safe(gear.purchasePrice), 0)
  const resaleTotal = gears.reduce((sum, gear) => sum + safe(gear.resaleValue), 0)
  const categories = ['body', 'lens', 'accessory']
  return {
    count: gears.length,
    purchaseTotal,
    resaleTotal,
    gain: resaleTotal - purchaseTotal,
    retentionRate: purchaseTotal > 0 ? resaleTotal / purchaseTotal : 0,
    byCategory: categories.map((key) => {
      const items = gears.filter((gear) => gear.category === key)
      return {
        key,
        label: gearCategoryLabel(key),
        count: items.length,
        purchase: items.reduce((sum, gear) => sum + safe(gear.purchasePrice), 0),
        resale: items.reduce((sum, gear) => sum + safe(gear.resaleValue), 0),
      }
    }),
  }
}

export function buildLensFund(settings: AppSettings) {
  const target = Math.max(1, safe(settings.gearFundTarget))
  const saved = Math.max(0, safe(settings.gearFundSaved))
  return {
    target,
    saved,
    remaining: Math.max(0, target - saved),
    progress: clamp(saved / target, 0, 1),
    isComplete: saved >= target,
  }
}

/* -------------------------------------------------------------------------- */
/*  Human capital                                                              */
/* -------------------------------------------------------------------------- */

export interface HumanCapitalSummary {
  totalCost: number
  annualGain: number
  roi: number | null
  paybackMonths: number | null
  monthlyGain: number
  count: number
  byCategory: {
    key: string
    label: string
    amount: number
    ratio: number
    count: number
    color: string
  }[]
}

export function buildHumanCapital(
  investments: SelfInvestment[],
  careerEvents: CareerEvent[],
): HumanCapitalSummary {
  const totalCost = investments.reduce((sum, item) => sum + safe(item.cost), 0)
  const annualGain = careerEvents.reduce(
    (sum, event) => sum + safe(event.annualIncomeIncrease),
    0,
  )
  const categories = ['cert', 'udemy', 'book', 'other']
  return {
    totalCost,
    annualGain,
    roi: totalCost > 0 ? annualGain / totalCost : null,
    paybackMonths: annualGain > 0 ? (totalCost / annualGain) * 12 : null,
    monthlyGain: annualGain / 12,
    count: investments.length,
    byCategory: categories.map((key) => {
      const items = investments.filter((item) => item.category === key)
      const amount = items.reduce((sum, item) => sum + safe(item.cost), 0)
      return {
        key,
        label: categoryLabel(key),
        amount,
        ratio: totalCost > 0 ? amount / totalCost : 0,
        count: items.length,
        color:
          INVESTMENT_CATEGORY_COLORS[
            key as keyof typeof INVESTMENT_CATEGORY_COLORS
          ],
      }
    }),
  }
}

/* -------------------------------------------------------------------------- */
/*  Misc                                                                       */
/* -------------------------------------------------------------------------- */

export function defaultSnapshotYearMonth(): string {
  return currentYearMonth()
}

export function progressLabel(ratio: number): string {
  return `${(clamp(ratio, 0, 1) * 100).toFixed(1)}%`
}
