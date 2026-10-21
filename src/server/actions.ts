import { createServerFn } from '@tanstack/react-start'
import { and, eq } from 'drizzle-orm'
import { z } from 'zod'
import { getDb } from '../db/client.server'
import {
  appSettings,
  assetEntries,
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
import { toDateOnlyString, todayDateOnly } from '../lib/format'

const dateString = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, '日付の形式が正しくありません')
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
    const now = new Date().toISOString()
    await getDb()
      .update(holdingStockStatus)
      .set({ ...data, updatedAt: now })
      .where(eq(holdingStockStatus.id, current.id))

    const entryDate = data.recordedAt || toDateOnlyString(todayDateOnly())
    const holdingEntries: Record<string, number> = {
      holding_shares: data.currentAccumulatedShares,
      holding_average_price: data.averageAcquisitionPrice,
      holding_carryover: data.carryoverAmount,
    }
    if (data.latestStockPrice > 0) {
      holdingEntries.fujitsu_price = data.latestStockPrice
    }
    for (const [itemKey, value] of Object.entries(holdingEntries)) {
      await getDb()
        .insert(assetEntries)
        .values({
          id: newId(),
          itemKey,
          valuedAt: entryDate,
          value,
          notes: '持株会の設定更新',
          createdAt: now,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: [assetEntries.itemKey, assetEntries.valuedAt],
          set: { value, notes: '持株会の設定更新', updatedAt: now },
        })
    }
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

    await db
      .insert(assetEntries)
      .values({
        id: newId(),
        itemKey: 'holding_shares',
        valuedAt: data.withdrawnAt,
        value: Math.max(0, nextHoldingShares),
        notes: '持株会の引出し記録',
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: [assetEntries.itemKey, assetEntries.valuedAt],
        set: {
          value: Math.max(0, nextHoldingShares),
          notes: '持株会の引出し記録',
          updatedAt: now,
        },
      })

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
    const nextHoldingShares =
      current.currentAccumulatedShares + existing.shares
    await db
      .update(holdingStockStatus)
      .set({
        currentAccumulatedShares: nextHoldingShares,
        updatedAt: now,
      })
      .where(eq(holdingStockStatus.id, current.id))
    await db
      .insert(assetEntries)
      .values({
        id: newId(),
        itemKey: 'holding_shares',
        valuedAt: existing.withdrawnAt,
        value: nextHoldingShares,
        notes: '持株会の引出し記録の削除',
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: [assetEntries.itemKey, assetEntries.valuedAt],
        set: {
          value: nextHoldingShares,
          notes: '持株会の引出し記録の削除',
          updatedAt: now,
        },
      })
    await db
      .delete(holdingWithdrawals)
      .where(eq(holdingWithdrawals.id, data.id))
    return { ok: true as const }
  })

/* -------------------------------------------------------------------------- */
/*  Asset entries (item-level valuation ledger)                               */
/* -------------------------------------------------------------------------- */

const assetEntryInput = z.object({
  id: z.string().min(1).optional(),
  itemKey: z.string().min(1).max(60),
  valuedAt: dateString,
  value: z.number().min(0).max(1_000_000_000_000_000),
  notes: optionalNotes,
})

const assetEntriesInput = z.object({
  valuedAt: dateString,
  values: z.record(z.string(), z.number().min(0).max(1_000_000_000_000_000)),
  notes: optionalNotes,
})

export const saveAssetEntry = createServerFn({ method: 'POST' })
  .validator((data: unknown) => assetEntryInput.parse(data))
  .handler(async ({ data }) => {
    const db = getDb()
    const now = new Date().toISOString()
    if (data.id) {
      const [existing] = await db
        .select()
        .from(assetEntries)
        .where(eq(assetEntries.id, data.id))
        .limit(1)
      if (!existing) throw new Error('記録が見つかりませんでした')
      const conflict = await db
        .select({ id: assetEntries.id })
        .from(assetEntries)
        .where(
          and(
            eq(assetEntries.itemKey, data.itemKey),
            eq(assetEntries.valuedAt, data.valuedAt),
          ),
        )
        .limit(1)
      if (conflict[0] && conflict[0].id !== data.id) {
        throw new Error('同じ項目・日付の記録が既にあります')
      }
      await db
        .update(assetEntries)
        .set({
          itemKey: data.itemKey,
          valuedAt: data.valuedAt,
          value: data.value,
          notes: data.notes ?? null,
          updatedAt: now,
        })
        .where(eq(assetEntries.id, data.id))
      return { ok: true as const, id: data.id }
    }

    const id = newId()
    await db
      .insert(assetEntries)
      .values({
        id,
        itemKey: data.itemKey,
        valuedAt: data.valuedAt,
        value: data.value,
        notes: data.notes ?? null,
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: [assetEntries.itemKey, assetEntries.valuedAt],
        set: {
          value: data.value,
          notes: data.notes ?? null,
          updatedAt: now,
        },
      })
    return { ok: true as const, id }
  })

export const deleteAssetEntry = createServerFn({ method: 'POST' })
  .validator((data: unknown) => z.object({ id: z.string().min(1) }).parse(data))
  .handler(async ({ data }) => {
    await getDb().delete(assetEntries).where(eq(assetEntries.id, data.id))
    return { ok: true as const }
  })

export const saveAssetEntries = createServerFn({ method: 'POST' })
  .validator((data: unknown) => assetEntriesInput.parse(data))
  .handler(async ({ data }) => {
    const db = getDb()
    const now = new Date().toISOString()
    let saved = 0
    for (const [itemKey, value] of Object.entries(data.values)) {
      if (!Number.isFinite(value)) continue
      await db
        .insert(assetEntries)
        .values({
          id: newId(),
          itemKey,
          valuedAt: data.valuedAt,
          value,
          notes: data.notes ?? null,
          createdAt: now,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: [assetEntries.itemKey, assetEntries.valuedAt],
          set: {
            value,
            notes: data.notes ?? null,
            updatedAt: now,
          },
        })
      saved += 1
    }
    return { ok: true as const, saved }
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

    await db
      .insert(assetEntries)
      .values({
        id: newId(),
        itemKey: 'pension',
        valuedAt: data.valuedAt,
        value: data.balance,
        notes: data.notes ?? null,
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: [assetEntries.itemKey, assetEntries.valuedAt],
        set: {
          value: data.balance,
          notes: data.notes ?? null,
          updatedAt: now,
        },
      })

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

    const holding = await readHolding()
    const nextFujitsuPrice =
      fujitsuPrice || holding.latestStockPrice
    const nextNisaPrincipal =
      data.updateNisaPrincipal && nisaCostBasis > 0
        ? nisaCostBasis
        : 0
    const importNote = `楽天証券の保有資産CSVを取り込み（${data.fileName || 'CSV'}）`

    const entryValues: Record<string, number> = {
      securities_cash: data.cashValue,
      mutual_funds: fundValue,
      individual_stocks: stockValue,
      other_securities: otherValue,
      fujitsu_roman_shares: fujitsuShares,
    }
    if (nextNisaPrincipal > 0) {
      entryValues.nisa_principal = nextNisaPrincipal
    }
    if (nextFujitsuPrice > 0) {
      entryValues.fujitsu_price = nextFujitsuPrice
    }

    for (const [itemKey, value] of Object.entries(entryValues)) {
      await db
        .insert(assetEntries)
        .values({
          id: newId(),
          itemKey,
          valuedAt: data.asOfDate,
          value,
          notes: importNote,
          createdAt: now,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: [assetEntries.itemKey, assetEntries.valuedAt],
          set: {
            value,
            notes: importNote,
            updatedAt: now,
          },
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
      yearMonth: data.asOfDate.slice(0, 7),
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
    } else {
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
    }

    const gearRows = await db.select().from(cameraGears)
    const totalResale = gearRows.reduce(
      (sum, gear) => sum + gear.resaleValue,
      0,
    )
    const today = toDateOnlyString(todayDateOnly())
    await db
      .insert(assetEntries)
      .values({
        id: newId(),
        itemKey: 'gear_resale',
        valuedAt: today,
        value: totalResale,
        notes: '機材台帳の更新',
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: [assetEntries.itemKey, assetEntries.valuedAt],
        set: { value: totalResale, notes: '機材台帳の更新', updatedAt: now },
      })

    return { ok: true as const, id: data.id ?? 'created' }
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

    const gearRows = await db.select().from(cameraGears)
    const totalResale = gearRows.reduce(
      (sum, gear) => sum + gear.resaleValue,
      0,
    )
    const now = new Date().toISOString()
    const today = toDateOnlyString(todayDateOnly())
    await db
      .insert(assetEntries)
      .values({
        id: newId(),
        itemKey: 'gear_resale',
        valuedAt: today,
        value: totalResale,
        notes: '機材台帳の更新',
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: [assetEntries.itemKey, assetEntries.valuedAt],
        set: { value: totalResale, notes: '機材台帳の更新', updatedAt: now },
      })

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
