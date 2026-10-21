import { createServerFn } from '@tanstack/react-start'
import { and, desc, eq } from 'drizzle-orm'
import { z } from 'zod'
import { getDb } from '../db/client.server'
import {
  appSettings,
  assetSnapshots,
  cameraGears,
  careerEvents,
  holdingStockStatus,
  holdingWithdrawals,
  retirementAccounts,
  retirementAllocations,
  securitiesHoldings,
  securitiesImportBatches,
  selfInvestments,
  stockGoals,
} from '../db/schema'
import { readHolding, readSettings } from './db.server'
import { removeImage } from './storage.server'

const dateString = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, '日付の形式が正しくありません')
const yearMonth = z
  .string()
  .regex(/^\d{4}-(0[1-9]|1[0-2])$/, '年月の形式が正しくありません')
const optionalNotes = z.string().trim().max(1000).optional().nullable()

function newId() {
  return crypto.randomUUID()
}

/* -------------------------------------------------------------------------- */
/*  Settings & holding                                                         */
/* -------------------------------------------------------------------------- */

const settingsInput = z.object({
  nickname: z.string().trim().min(1, 'ニックネームを入力してください').max(40),
  birthDate: dateString,
  nisaTargetAmount: z.number().int().min(1).max(1_000_000_000),
  nisaTargetAge: z.number().int().min(18).max(80),
  fujitsuAlertThreshold: z.number().min(0.01).max(1),
  gearFundTarget: z.number().int().min(1).max(100_000_000),
})

export const updateSettings = createServerFn({ method: 'POST' })
  .validator((data: unknown) => settingsInput.parse(data))
  .handler(async ({ data }) => {
    const current = await readSettings()
    await getDb()
      .update(appSettings)
      .set({ ...data, updatedAt: new Date().toISOString() })
      .where(eq(appSettings.id, current.id))
    return { ok: true as const }
  })

const holdingInput = z.object({
  monthlyContribution: z.number().int().min(0).max(10_000_000),
  companyIncentiveRate: z.number().min(0).max(1),
  currentAccumulatedShares: z.number().min(0).max(10_000_000),
  latestStockPrice: z.number().min(0).max(10_000_000),
  targetShares: z.number().int().min(1).max(10_000_000),
  recordedAt: dateString,
  averageAcquisitionPrice: z.number().min(0).max(10_000_000),
  carryoverAmount: z.number().int().min(0).max(1_000_000_000),
})

export const updateHolding = createServerFn({ method: 'POST' })
  .validator((data: unknown) => holdingInput.parse(data))
  .handler(async ({ data }) => {
    const current = await readHolding()
    await getDb()
      .update(holdingStockStatus)
      .set({ ...data, updatedAt: new Date().toISOString() })
      .where(eq(holdingStockStatus.id, current.id))
    return { ok: true as const }
  })

const withdrawalInput = z.object({
  id: z.string().min(1).optional(),
  withdrawnAt: dateString,
  shares: z.number().min(0.0001).max(10_000_000),
  averageAcquisitionPrice: z.number().min(0).max(10_000_000),
  stockPrice: z.number().min(0).max(10_000_000),
  destination: z.string().trim().min(1).max(80),
  notes: optionalNotes,
})

export const saveHoldingWithdrawal = createServerFn({ method: 'POST' })
  .validator((data: unknown) => withdrawalInput.parse(data))
  .handler(async ({ data }) => {
    const db = getDb()
    const current = await readHolding()
    const existing = data.id
      ? (
          await db
            .select()
            .from(holdingWithdrawals)
            .where(eq(holdingWithdrawals.id, data.id))
            .limit(1)
        )[0]
      : null

    if (data.id && !existing) {
      throw new Error('引出しの記録が見つかりませんでした')
    }

    const oldShares = existing?.shares ?? 0
    const delta = data.shares - oldShares
    const nextHoldingShares = current.currentAccumulatedShares - delta
    if (nextHoldingShares < -0.0001) {
      throw new Error('持株会の現在株数を超える引出しは記録できません')
    }

    const now = new Date().toISOString()
    const values = {
      withdrawnAt: data.withdrawnAt,
      shares: data.shares,
      averageAcquisitionPrice:
        data.averageAcquisitionPrice || current.averageAcquisitionPrice,
      stockPrice: data.stockPrice || current.latestStockPrice,
      destination: data.destination,
      notes: data.notes ?? null,
      updatedAt: now,
    }

    if (existing) {
      await db
        .update(holdingWithdrawals)
        .set(values)
        .where(eq(holdingWithdrawals.id, existing.id))
    } else {
      await db.insert(holdingWithdrawals).values({
        id: newId(),
        ...values,
        createdAt: now,
      })
    }

    await db
      .update(holdingStockStatus)
      .set({
        currentAccumulatedShares: Math.max(0, nextHoldingShares),
        updatedAt: now,
      })
      .where(eq(holdingStockStatus.id, current.id))

    return { ok: true as const }
  })

export const deleteHoldingWithdrawal = createServerFn({ method: 'POST' })
  .validator((data: unknown) => z.object({ id: z.string().min(1) }).parse(data))
  .handler(async ({ data }) => {
    const db = getDb()
    const [existing] = await db
      .select()
      .from(holdingWithdrawals)
      .where(eq(holdingWithdrawals.id, data.id))
      .limit(1)
    if (!existing) return { ok: true as const }

    const current = await readHolding()
    const now = new Date().toISOString()
    await db
      .update(holdingStockStatus)
      .set({
        currentAccumulatedShares:
          current.currentAccumulatedShares + existing.shares,
        updatedAt: now,
      })
      .where(eq(holdingStockStatus.id, current.id))
    await db
      .delete(holdingWithdrawals)
      .where(eq(holdingWithdrawals.id, data.id))
    return { ok: true as const }
  })

/* -------------------------------------------------------------------------- */
/*  Asset snapshots                                                            */
/* -------------------------------------------------------------------------- */

const snapshotInput = z.object({
  id: z.string().min(1).optional(),
  yearMonth,
  cashAmount: z.number().int().min(0).max(1_000_000_000_000),
  securitiesCashAmount: z.number().int().min(0).max(1_000_000_000_000),
  nisaMutualFundAmount: z.number().int().min(0).max(1_000_000_000_000),
  nisaIndividualStockAmount: z.number().int().min(0).max(1_000_000_000_000),
  nisaOtherAssetAmount: z.number().int().min(0).max(1_000_000_000_000),
  pensionBalance: z.number().int().min(0).max(1_000_000_000_000),
  nisaContributedPrincipal: z.number().int().min(0).max(1_000_000_000_000),
  fujitsuRomanStockShares: z.number().min(0).max(10_000_000),
  holdingStockShares: z.number().min(0).max(10_000_000),
  withdrawnHoldingShares: z.number().min(0).max(10_000_000),
  holdingAverageAcquisitionPrice: z.number().min(0).max(10_000_000),
  holdingCarryoverAmount: z.number().int().min(0).max(1_000_000_000),
  fujitsuCurrentPrice: z.number().min(0).max(10_000_000),
  gearResaleAmount: z.number().int().min(0).max(1_000_000_000_000),
  notes: optionalNotes,
})

export const saveSnapshot = createServerFn({ method: 'POST' })
  .validator((data: unknown) => snapshotInput.parse(data))
  .handler(async ({ data }) => {
    const db = getDb()
    const now = new Date().toISOString()
    if (data.id) {
      await db
        .update(assetSnapshots)
        .set({
          yearMonth: data.yearMonth,
          cashAmount: data.cashAmount,
          securitiesCashAmount: data.securitiesCashAmount,
          nisaMutualFundAmount: data.nisaMutualFundAmount,
          nisaIndividualStockAmount: data.nisaIndividualStockAmount,
          nisaOtherAssetAmount: data.nisaOtherAssetAmount,
          pensionBalance: data.pensionBalance,
          nisaOrkanAmount: 0,
          nisaSp500Amount: 0,
          nisaContributedPrincipal: data.nisaContributedPrincipal,
          fujitsuRomanStockShares: data.fujitsuRomanStockShares,
          holdingStockShares: data.holdingStockShares,
          withdrawnHoldingShares: data.withdrawnHoldingShares,
          holdingAverageAcquisitionPrice: data.holdingAverageAcquisitionPrice,
          holdingCarryoverAmount: data.holdingCarryoverAmount,
          fujitsuCurrentPrice: data.fujitsuCurrentPrice,
          gearResaleAmount: data.gearResaleAmount,
          notes: data.notes ?? null,
          updatedAt: now,
        })
        .where(eq(assetSnapshots.id, data.id))
      return { ok: true as const, id: data.id }
    }

    const [existing] = await db
      .select({ id: assetSnapshots.id })
      .from(assetSnapshots)
      .where(eq(assetSnapshots.yearMonth, data.yearMonth))
      .limit(1)
    if (existing) {
      throw new Error('この年月にはすでに記録があります。一覧から編集してください。')
    }

    const id = newId()
    await db.insert(assetSnapshots).values({
      id,
      yearMonth: data.yearMonth,
      cashAmount: data.cashAmount,
      securitiesCashAmount: data.securitiesCashAmount,
      nisaMutualFundAmount: data.nisaMutualFundAmount,
      nisaIndividualStockAmount: data.nisaIndividualStockAmount,
      nisaOtherAssetAmount: data.nisaOtherAssetAmount,
      pensionBalance: data.pensionBalance,
      nisaOrkanAmount: 0,
      nisaSp500Amount: 0,
      nisaContributedPrincipal: data.nisaContributedPrincipal,
      fujitsuRomanStockShares: data.fujitsuRomanStockShares,
      holdingStockShares: data.holdingStockShares,
      withdrawnHoldingShares: data.withdrawnHoldingShares,
      holdingAverageAcquisitionPrice: data.holdingAverageAcquisitionPrice,
      holdingCarryoverAmount: data.holdingCarryoverAmount,
      fujitsuCurrentPrice: data.fujitsuCurrentPrice,
      gearResaleAmount: data.gearResaleAmount,
      notes: data.notes ?? null,
      createdAt: now,
      updatedAt: now,
    })
    return { ok: true as const, id }
  })

export const deleteSnapshot = createServerFn({ method: 'POST' })
  .validator((data: unknown) => z.object({ id: z.string().min(1) }).parse(data))
  .handler(async ({ data }) => {
    await getDb().delete(assetSnapshots).where(eq(assetSnapshots.id, data.id))
    return { ok: true as const }
  })

/* -------------------------------------------------------------------------- */
/*  Shareholder-benefit stock goals                                            */
/* -------------------------------------------------------------------------- */

const stockGoalInput = z.object({
  id: z.string().min(1).optional(),
  code: z.string().trim().max(40).default(''),
  name: z.string().trim().min(1, '銘柄名を入力してください').max(120),
  account: z.string().trim().min(1).max(80).default('楽天証券'),
  targetShares: z.number().min(0.0001).max(10_000_000),
  currentShares: z.number().min(0).max(10_000_000),
  targetDate: dateString,
  minimumPurchaseUnit: z.number().int().min(1).max(100_000),
  averageAcquisitionPrice: z.number().min(0).max(10_000_000),
  currentPrice: z.number().min(0).max(10_000_000),
  monthlyBudget: z.number().int().min(0).max(1_000_000_000),
  benefitNote: z.string().trim().max(1000).default(''),
  notes: optionalNotes,
  autoUpdateFromCsv: z.boolean().default(true),
})

export const saveStockGoal = createServerFn({ method: 'POST' })
  .validator((data: unknown) => stockGoalInput.parse(data))
  .handler(async ({ data }) => {
    const db = getDb()
    const now = new Date().toISOString()
    const values = {
      code: data.code,
      name: data.name,
      account: data.account,
      targetShares: data.targetShares,
      currentShares: data.currentShares,
      targetDate: data.targetDate,
      minimumPurchaseUnit: data.minimumPurchaseUnit,
      averageAcquisitionPrice: data.averageAcquisitionPrice,
      currentPrice: data.currentPrice,
      monthlyBudget: data.monthlyBudget,
      benefitNote: data.benefitNote,
      notes: data.notes ?? null,
      autoUpdateFromCsv: data.autoUpdateFromCsv ? 1 : 0,
      updatedAt: now,
    }

    if (data.id) {
      await db
        .update(stockGoals)
        .set(values)
        .where(eq(stockGoals.id, data.id))
      return { ok: true as const, id: data.id }
    }

    const id = newId()
    await db.insert(stockGoals).values({
      id,
      ...values,
      createdAt: now,
    })
    return { ok: true as const, id }
  })

export const deleteStockGoal = createServerFn({ method: 'POST' })
  .validator((data: unknown) => z.object({ id: z.string().min(1) }).parse(data))
  .handler(async ({ data }) => {
    await getDb().delete(stockGoals).where(eq(stockGoals.id, data.id))
    return { ok: true as const }
  })

/* -------------------------------------------------------------------------- */
/*  Defined-contribution pension (JIS&T)                                       */
/* -------------------------------------------------------------------------- */

const retirementAllocationInput = z.object({
  label: z.string().trim().min(1, '商品名を入力してください').max(60),
  ratio: z.number().min(0).max(100),
})

const retirementInput = z.object({
  provider: z.string().trim().min(1).max(80),
  schemeName: z.string().trim().min(1).max(120),
  balance: z.number().int().min(0).max(1_000_000_000_000),
  totalContributed: z.number().int().min(0).max(1_000_000_000_000),
  monthlyContribution: z.number().int().min(0).max(10_000_000),
  employerContribution: z.number().int().min(0).max(10_000_000),
  valuedAt: dateString,
  notes: optionalNotes,
  allocations: z.array(retirementAllocationInput).max(10).default([]),
})

export const saveRetirementAccount = createServerFn({ method: 'POST' })
  .validator((data: unknown) => retirementInput.parse(data))
  .handler(async ({ data }) => {
    const allocationTotal = data.allocations.reduce(
      (sum, allocation) => sum + allocation.ratio,
      0,
    )
    if (allocationTotal > 100.01) {
      throw new Error('配分の合計は100%以下にしてください。')
    }

    const db = getDb()
    const now = new Date().toISOString()
    const [existing] = await db
      .select()
      .from(retirementAccounts)
      .limit(1)
    const id = existing?.id ?? 'default'
    const values = {
      provider: data.provider,
      schemeName: data.schemeName,
      balance: data.balance,
      totalContributed: data.totalContributed,
      monthlyContribution: data.monthlyContribution,
      employerContribution: data.employerContribution,
      valuedAt: data.valuedAt,
      notes: data.notes ?? null,
      updatedAt: now,
    }

    if (existing) {
      await db
        .update(retirementAccounts)
        .set(values)
        .where(eq(retirementAccounts.id, id))
    } else {
      await db.insert(retirementAccounts).values({ id, ...values })
    }

    await db
      .delete(retirementAllocations)
      .where(eq(retirementAllocations.accountId, id))
    if (data.allocations.length > 0) {
      await db.insert(retirementAllocations).values(
        data.allocations.map((allocation, index) => ({
          id: newId(),
          accountId: id,
          label: allocation.label,
          ratio: allocation.ratio,
          sortOrder: index,
        })),
      )
    }

    const [latest] = await db
      .select({ id: assetSnapshots.id })
      .from(assetSnapshots)
      .orderBy(desc(assetSnapshots.yearMonth))
      .limit(1)
    if (latest) {
      await db
        .update(assetSnapshots)
        .set({ pensionBalance: data.balance, updatedAt: now })
        .where(eq(assetSnapshots.id, latest.id))
    }

    return { ok: true as const }
  })

/* -------------------------------------------------------------------------- */
/*  Rakuten Securities CSV import                                              */
/* -------------------------------------------------------------------------- */

const securitiesHoldingInput = z.object({
  type: z.string().trim().max(60),
  category: z.enum(['stock', 'fund', 'other']),
  code: z.string().trim().max(40).default(''),
  name: z.string().trim().min(1).max(200),
  accountType: z.string().trim().max(80).default(''),
  quantity: z.number().min(0).max(1_000_000_000),
  unit: z.string().trim().max(20).default(''),
  averagePrice: z.number().min(0).max(1_000_000_000),
  currentPrice: z.number().min(0).max(1_000_000_000),
  marketValue: z.number().int().min(0).max(1_000_000_000_000),
  profitLoss: z
    .number()
    .int()
    .min(-1_000_000_000_000)
    .max(1_000_000_000_000),
  profitLossPercent: z.number().min(-1_000).max(1_000),
})

const securitiesImportInput = z.object({
  asOfDate: dateString,
  fileName: z.string().trim().max(200).default(''),
  cashValue: z.number().int().min(0).max(1_000_000_000_000),
  updateNisaPrincipal: z.boolean().default(false),
  updateStockGoals: z.boolean().default(true),
  holdings: z.array(securitiesHoldingInput).min(1).max(500),
})

function isNisaAccountType(accountType: string): boolean {
  return /NISA|成長投資枠|つみたて投資枠/i.test(accountType)
}

function normalizeStockCode(code: string): string {
  return code.trim().toUpperCase().replace(/[^0-9A-Z]/g, '')
}

function isFujitsuHolding(code: string, name: string): boolean {
  const normalizedCode = code.replace(/[^0-9]/g, '')
  return normalizedCode.startsWith('6702') || name.includes('富士通')
}

export const importRakutenSecurities = createServerFn({ method: 'POST' })
  .validator((data: unknown) => securitiesImportInput.parse(data))
  .handler(async ({ data }) => {
    const db = getDb()
    const now = new Date().toISOString()
    const batchId = newId()
    const account = '楽天証券'

    const rows = data.holdings.map((holding) => {
      const divisor = holding.category === 'fund' ? 10_000 : 1
      const costBasis = Math.round(
        (holding.quantity * holding.averagePrice) / divisor,
      )
      return {
        id: newId(),
        batchId,
        asOfDate: data.asOfDate,
        account,
        category: holding.category,
        type: holding.type,
        code: holding.code,
        name: holding.name,
        accountType: holding.accountType,
        quantity: holding.quantity,
        unit: holding.unit,
        averagePrice: holding.averagePrice,
        currentPrice: holding.currentPrice,
        marketValue: holding.marketValue,
        profitLoss: holding.profitLoss,
        profitLossPercent: holding.profitLossPercent,
        costBasis,
        isFujitsu: isFujitsuHolding(holding.code, holding.name) ? 1 : 0,
        source: 'rakuten_csv',
        importedAt: now,
      }
    })

    const stockValue = rows
      .filter((row) => row.category === 'stock' && row.isFujitsu === 0)
      .reduce((sum, row) => sum + row.marketValue, 0)
    const fundValue = rows
      .filter((row) => row.category === 'fund')
      .reduce((sum, row) => sum + row.marketValue, 0)
    const otherValue = rows
      .filter((row) => row.category === 'other')
      .reduce((sum, row) => sum + row.marketValue, 0)
    const fujitsuRows = rows.filter((row) => row.isFujitsu === 1)
    const fujitsuShares = fujitsuRows.reduce(
      (sum, row) => sum + row.quantity,
      0,
    )
    const fujitsuValue = fujitsuRows.reduce(
      (sum, row) => sum + row.marketValue,
      0,
    )
    const fujitsuPrice =
      fujitsuRows.find((row) => row.currentPrice > 0)?.currentPrice ?? 0
    const productValue = rows.reduce(
      (sum, row) => sum + row.marketValue,
      0,
    )
    const totalValue = productValue + data.cashValue
    const nisaCostBasis = rows
      .filter((row) => isNisaAccountType(row.accountType))
      .reduce((sum, row) => sum + row.costBasis, 0)

    await db
      .delete(securitiesHoldings)
      .where(
        and(
          eq(securitiesHoldings.asOfDate, data.asOfDate),
          eq(securitiesHoldings.account, account),
        ),
      )
    await db
      .delete(securitiesImportBatches)
      .where(
        and(
          eq(securitiesImportBatches.asOfDate, data.asOfDate),
          eq(securitiesImportBatches.account, account),
        ),
      )

    // D1 allows at most 100 bound parameters per statement. This row has
    // 20 columns, so insert 5 holdings at a time.
    const insertChunkSize = 5
    for (let index = 0; index < rows.length; index += insertChunkSize) {
      await db
        .insert(securitiesHoldings)
        .values(rows.slice(index, index + insertChunkSize))
    }

    await db.insert(securitiesImportBatches).values({
      id: batchId,
      asOfDate: data.asOfDate,
      account,
      fileName: data.fileName,
      totalValue,
      productValue,
      cashValue: data.cashValue,
      stockValue,
      fundValue,
      otherValue,
      fujitsuValue,
      holdingCount: rows.length,
      importedAt: now,
    })

    let updatedGoals = 0
    if (data.updateStockGoals) {
      const goals = await db
        .select()
        .from(stockGoals)
        .where(eq(stockGoals.autoUpdateFromCsv, 1))
      for (const goal of goals) {
        const goalCode = normalizeStockCode(goal.code)
        if (!goalCode) continue
        const matches = rows.filter(
          (row) =>
            row.category === 'stock' &&
            normalizeStockCode(row.code) === goalCode,
        )
        if (matches.length === 0) continue
        const currentShares = matches.reduce(
          (sum, row) => sum + row.quantity,
          0,
        )
        const currentPrice =
          [...matches].reverse().find((row) => row.currentPrice > 0)
            ?.currentPrice ?? goal.currentPrice
        const totalCost = matches.reduce(
          (sum, row) => sum + row.costBasis,
          0,
        )
        await db
          .update(stockGoals)
          .set({
            currentShares,
            currentPrice,
            averageAcquisitionPrice:
              currentShares > 0 && totalCost > 0
                ? totalCost / currentShares
                : goal.averageAcquisitionPrice,
            updatedAt: now,
          })
          .where(eq(stockGoals.id, goal.id))
        updatedGoals += 1
      }
    }

    const [latest] = await db
      .select()
      .from(assetSnapshots)
      .orderBy(desc(assetSnapshots.yearMonth))
      .limit(1)
    const holding = await readHolding()
    const yearMonth = data.asOfDate.slice(0, 7)
    const [existing] = await db
      .select()
      .from(assetSnapshots)
      .where(eq(assetSnapshots.yearMonth, yearMonth))
      .limit(1)
    const base = existing ?? latest ?? null
    const nextFujitsuPrice =
      fujitsuPrice ||
      base?.fujitsuCurrentPrice ||
      holding.latestStockPrice
    const nextNisaPrincipal =
      data.updateNisaPrincipal && nisaCostBasis > 0
        ? nisaCostBasis
        : base?.nisaContributedPrincipal ?? 0
    const values = {
      cashAmount: base?.cashAmount ?? 0,
      securitiesCashAmount: data.cashValue,
      nisaMutualFundAmount: fundValue,
      nisaIndividualStockAmount: stockValue,
      nisaOtherAssetAmount: otherValue,
      pensionBalance: base?.pensionBalance ?? 0,
      nisaOrkanAmount: 0,
      nisaSp500Amount: 0,
      nisaContributedPrincipal: nextNisaPrincipal,
      fujitsuRomanStockShares: fujitsuShares,
      holdingStockShares:
        base?.holdingStockShares ?? holding.currentAccumulatedShares,
      withdrawnHoldingShares: base?.withdrawnHoldingShares ?? 0,
      holdingAverageAcquisitionPrice:
        base?.holdingAverageAcquisitionPrice ||
        holding.averageAcquisitionPrice,
      holdingCarryoverAmount:
        base?.holdingCarryoverAmount ?? holding.carryoverAmount,
      fujitsuCurrentPrice: nextFujitsuPrice,
      gearResaleAmount: base?.gearResaleAmount ?? 0,
      notes:
        existing?.notes ??
        `楽天証券の保有資産CSVを取り込み（${data.fileName || 'CSV'}）`,
      updatedAt: now,
    }

    if (existing) {
      await db
        .update(assetSnapshots)
        .set(values)
        .where(eq(assetSnapshots.id, existing.id))
    } else {
      await db.insert(assetSnapshots).values({
        id: newId(),
        yearMonth,
        ...values,
        createdAt: now,
      })
    }

    if (nextFujitsuPrice > 0) {
      await db
        .update(holdingStockStatus)
        .set({ latestStockPrice: nextFujitsuPrice, updatedAt: now })
        .where(eq(holdingStockStatus.id, holding.id))
    }

    return {
      ok: true as const,
      batchId,
      yearMonth,
      totalValue,
      productValue,
      cashValue: data.cashValue,
      holdingCount: rows.length,
      updatedGoals,
    }
  })

/* -------------------------------------------------------------------------- */
/*  Camera gear                                                                */
/* -------------------------------------------------------------------------- */

const gearInput = z.object({
  id: z.string().min(1).optional(),
  name: z.string().trim().min(1, '機材名を入力してください').max(120),
  category: z.enum(['body', 'lens', 'accessory']),
  purchasedAt: dateString,
  purchasePrice: z.number().int().min(0).max(1_000_000_000),
  resaleValue: z.number().int().min(0).max(1_000_000_000),
  imageKey: z.string().max(300).optional().nullable(),
  notes: optionalNotes,
})

export const saveGear = createServerFn({ method: 'POST' })
  .validator((data: unknown) => gearInput.parse(data))
  .handler(async ({ data }) => {
    const db = getDb()
    const now = new Date().toISOString()

    if (data.id) {
      const [existing] = await db
        .select()
        .from(cameraGears)
        .where(eq(cameraGears.id, data.id))
        .limit(1)
      if (!existing) throw new Error('機材が見つかりませんでした')
      if (existing.imageKey && existing.imageKey !== data.imageKey) {
        await removeImage(existing.imageKey)
      }
      await db
        .update(cameraGears)
        .set({
          name: data.name,
          category: data.category,
          purchasedAt: data.purchasedAt,
          purchasePrice: data.purchasePrice,
          resaleValue: data.resaleValue,
          imageKey: data.imageKey ?? null,
          notes: data.notes ?? null,
          updatedAt: now,
        })
        .where(eq(cameraGears.id, data.id))
      return { ok: true as const, id: data.id }
    }

    const id = newId()
    await db.insert(cameraGears).values({
      id,
      name: data.name,
      category: data.category,
      purchasedAt: data.purchasedAt,
      purchasePrice: data.purchasePrice,
      resaleValue: data.resaleValue,
      imageKey: data.imageKey ?? null,
      notes: data.notes ?? null,
      createdAt: now,
      updatedAt: now,
    })
    return { ok: true as const, id }
  })

export const deleteGear = createServerFn({ method: 'POST' })
  .validator((data: unknown) => z.object({ id: z.string().min(1) }).parse(data))
  .handler(async ({ data }) => {
    const db = getDb()
    const [existing] = await db
      .select()
      .from(cameraGears)
      .where(eq(cameraGears.id, data.id))
      .limit(1)
    if (existing?.imageKey) await removeImage(existing.imageKey)
    await db.delete(cameraGears).where(eq(cameraGears.id, data.id))
    return { ok: true as const }
  })

export const updateGearFund = createServerFn({ method: 'POST' })
  .validator((data: unknown) =>
    z.object({ saved: z.number().int().min(0).max(1_000_000_000) }).parse(data),
  )
  .handler(async ({ data }) => {
    const current = await readSettings()
    await getDb()
      .update(appSettings)
      .set({ gearFundSaved: data.saved, updatedAt: new Date().toISOString() })
      .where(eq(appSettings.id, current.id))
    return { ok: true as const }
  })

/* -------------------------------------------------------------------------- */
/*  Self investments & career events                                           */
/* -------------------------------------------------------------------------- */

const investmentInput = z.object({
  id: z.string().min(1).optional(),
  title: z.string().trim().min(1, 'タイトルを入力してください').max(200),
  category: z.enum(['cert', 'udemy', 'book', 'other']),
  cost: z.number().int().min(0).max(100_000_000),
  completedAt: dateString,
  notes: optionalNotes,
})

export const saveInvestment = createServerFn({ method: 'POST' })
  .validator((data: unknown) => investmentInput.parse(data))
  .handler(async ({ data }) => {
    const db = getDb()
    if (data.id) {
      await db
        .update(selfInvestments)
        .set({
          title: data.title,
          category: data.category,
          cost: data.cost,
          completedAt: data.completedAt,
          notes: data.notes ?? null,
        })
        .where(eq(selfInvestments.id, data.id))
      return { ok: true as const, id: data.id }
    }
    const id = newId()
    await db.insert(selfInvestments).values({
      id,
      title: data.title,
      category: data.category,
      cost: data.cost,
      completedAt: data.completedAt,
      notes: data.notes ?? null,
      createdAt: new Date().toISOString(),
    })
    return { ok: true as const, id }
  })

export const deleteInvestment = createServerFn({ method: 'POST' })
  .validator((data: unknown) => z.object({ id: z.string().min(1) }).parse(data))
  .handler(async ({ data }) => {
    await getDb()
      .delete(selfInvestments)
      .where(eq(selfInvestments.id, data.id))
    return { ok: true as const }
  })

const careerInput = z.object({
  id: z.string().min(1).optional(),
  title: z.string().trim().min(1, 'タイトルを入力してください').max(200),
  occurredAt: dateString,
  annualIncomeIncrease: z.number().int().min(0).max(1_000_000_000),
  notes: optionalNotes,
})

export const saveCareerEvent = createServerFn({ method: 'POST' })
  .validator((data: unknown) => careerInput.parse(data))
  .handler(async ({ data }) => {
    const db = getDb()
    if (data.id) {
      await db
        .update(careerEvents)
        .set({
          title: data.title,
          occurredAt: data.occurredAt,
          annualIncomeIncrease: data.annualIncomeIncrease,
          notes: data.notes ?? null,
        })
        .where(eq(careerEvents.id, data.id))
      return { ok: true as const, id: data.id }
    }
    const id = newId()
    await db.insert(careerEvents).values({
      id,
      title: data.title,
      occurredAt: data.occurredAt,
      annualIncomeIncrease: data.annualIncomeIncrease,
      notes: data.notes ?? null,
      createdAt: new Date().toISOString(),
    })
    return { ok: true as const, id }
  })

export const deleteCareerEvent = createServerFn({ method: 'POST' })
  .validator((data: unknown) => z.object({ id: z.string().min(1) }).parse(data))
  .handler(async ({ data }) => {
    await getDb().delete(careerEvents).where(eq(careerEvents.id, data.id))
    return { ok: true as const }
  })
