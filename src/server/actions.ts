import { createServerFn } from '@tanstack/react-start'
import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { getDb } from '../db/client.server'
import {
  appSettings,
  assetSnapshots,
  cameraGears,
  careerEvents,
  holdingStockStatus,
  selfInvestments,
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

/* -------------------------------------------------------------------------- */
/*  Asset snapshots                                                            */
/* -------------------------------------------------------------------------- */

const snapshotInput = z.object({
  id: z.string().min(1).optional(),
  yearMonth,
  cashAmount: z.number().int().min(0).max(1_000_000_000_000),
  nisaOrkanAmount: z.number().int().min(0).max(1_000_000_000_000),
  nisaSp500Amount: z.number().int().min(0).max(1_000_000_000_000),
  nisaContributedPrincipal: z.number().int().min(0).max(1_000_000_000_000),
  fujitsuRomanStockShares: z.number().min(0).max(10_000_000),
  holdingStockShares: z.number().min(0).max(10_000_000),
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
          nisaOrkanAmount: data.nisaOrkanAmount,
          nisaSp500Amount: data.nisaSp500Amount,
          nisaContributedPrincipal: data.nisaContributedPrincipal,
          fujitsuRomanStockShares: data.fujitsuRomanStockShares,
          holdingStockShares: data.holdingStockShares,
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
      nisaOrkanAmount: data.nisaOrkanAmount,
      nisaSp500Amount: data.nisaSp500Amount,
      nisaContributedPrincipal: data.nisaContributedPrincipal,
      fujitsuRomanStockShares: data.fujitsuRomanStockShares,
      holdingStockShares: data.holdingStockShares,
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
