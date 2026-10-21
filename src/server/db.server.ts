import { and, asc, desc, eq } from 'drizzle-orm'
import { getDb } from '../db/client.server'
import {
  DEFAULT_ACCOUNTS,
  DEFAULT_HOLDING,
  DEFAULT_SETTINGS,
} from '../db/defaults'
import {
  appSettings,
  assetSnapshots,
  cameraGears,
  careerEvents,
  financialAccounts,
  holdingStockStatus,
  holdingWithdrawals,
  securitiesHoldings,
  securitiesImportBatches,
  selfInvestments,
} from '../db/schema'
import { toDateOnlyString, todayDateOnly } from '../lib/format'

/**
 * Server-only data access. Never import this module from a component or a
 * route file directly — it is only reachable through server functions in
 * `queries.ts`, so the client bundle never sees `cloudflare:workers`.
 */

async function ensureBaseRows() {
  const db = getDb()
  const now = new Date().toISOString()

  const [settings] = await db.select().from(appSettings).limit(1)
  if (!settings) {
    await db
      .insert(appSettings)
      .values({ ...DEFAULT_SETTINGS, updatedAt: now })
      .onConflictDoNothing()
  }

  const [holding] = await db.select().from(holdingStockStatus).limit(1)
  if (!holding) {
    await db
      .insert(holdingStockStatus)
      .values({ ...DEFAULT_HOLDING, updatedAt: now })
      .onConflictDoNothing()
  }

  await db
    .insert(financialAccounts)
    .values(
      DEFAULT_ACCOUNTS.map((account) => ({
        ...account,
        createdAt: now,
        updatedAt: now,
      })),
    )
    .onConflictDoNothing()
}

export async function readSettings() {
  const db = getDb()
  const [row] = await db.select().from(appSettings).limit(1)
  if (!row) {
    await ensureBaseRows()
    const [created] = await db.select().from(appSettings).limit(1)
    return created
  }
  return row
}

export async function readHolding() {
  const db = getDb()
  const [row] = await db.select().from(holdingStockStatus).limit(1)
  if (!row) {
    await ensureBaseRows()
    const [created] = await db.select().from(holdingStockStatus).limit(1)
    return created
  }
  return row
}

export async function readHoldingWithdrawals() {
  return getDb()
    .select()
    .from(holdingWithdrawals)
    .orderBy(desc(holdingWithdrawals.withdrawnAt), desc(holdingWithdrawals.createdAt))
}

export async function fetchDashboardData() {
  await ensureBaseRows()
  const db = getDb()
  const [
    settings,
    holding,
    withdrawals,
    snapshots,
    gears,
    investments,
    events,
  ] = await Promise.all([
    readSettings(),
    readHolding(),
    readHoldingWithdrawals(),
    db.select().from(assetSnapshots).orderBy(asc(assetSnapshots.yearMonth)),
    db.select().from(cameraGears).orderBy(desc(cameraGears.purchasedAt)),
    db
      .select()
      .from(selfInvestments)
      .orderBy(desc(selfInvestments.completedAt)),
    db.select().from(careerEvents).orderBy(desc(careerEvents.occurredAt)),
  ])

  return {
    settings,
    holding,
    withdrawals,
    snapshots,
    gears,
    investments,
    careerEvents: events,
    today: toDateOnlyString(todayDateOnly()),
  }
}

export async function fetchAssetsData() {
  await ensureBaseRows()
  const db = getDb()
  const [settings, holding, withdrawals, snapshots, gears, latestBatch] =
    await Promise.all([
      readSettings(),
      readHolding(),
      readHoldingWithdrawals(),
      db.select().from(assetSnapshots).orderBy(asc(assetSnapshots.yearMonth)),
      db.select().from(cameraGears),
      db
        .select()
        .from(securitiesImportBatches)
        .orderBy(
          desc(securitiesImportBatches.asOfDate),
          desc(securitiesImportBatches.importedAt),
        )
        .limit(1),
    ])
  const batch = latestBatch[0] ?? null
  const holdings = batch
    ? await db
        .select()
        .from(securitiesHoldings)
        .where(
          and(
            eq(securitiesHoldings.asOfDate, batch.asOfDate),
            eq(securitiesHoldings.account, batch.account),
          ),
        )
        .orderBy(desc(securitiesHoldings.marketValue))
    : []
  return {
    settings,
    holding,
    withdrawals,
    snapshots,
    gears,
    securities: { batch, holdings },
    today: toDateOnlyString(todayDateOnly()),
  }
}

export async function fetchGearData() {
  await ensureBaseRows()
  const db = getDb()
  const [settings, gears] = await Promise.all([
    readSettings(),
    db.select().from(cameraGears).orderBy(desc(cameraGears.purchasedAt)),
  ])
  return {
    settings,
    gears,
    today: toDateOnlyString(todayDateOnly()),
  }
}

export async function fetchSelfInvestmentData() {
  await ensureBaseRows()
  const db = getDb()
  const [investments, events] = await Promise.all([
    db
      .select()
      .from(selfInvestments)
      .orderBy(desc(selfInvestments.completedAt)),
    db.select().from(careerEvents).orderBy(desc(careerEvents.occurredAt)),
  ])
  return {
    investments,
    careerEvents: events,
    today: toDateOnlyString(todayDateOnly()),
  }
}

export async function fetchSettingsData() {
  await ensureBaseRows()
  const db = getDb()
  const [
    settings,
    holding,
    withdrawals,
    accounts,
    snapshotCount,
    gearCount,
    investmentCount,
    securitiesCount,
  ] = await Promise.all([
    readSettings(),
    readHolding(),
    readHoldingWithdrawals(),
    db
      .select()
      .from(financialAccounts)
      .orderBy(asc(financialAccounts.sortOrder)),
    db.select().from(assetSnapshots),
    db.select().from(cameraGears),
    db.select().from(selfInvestments),
    db.select().from(securitiesHoldings),
  ])
  return {
    settings,
    holding,
    withdrawals,
    accounts,
    counts: {
      snapshots: snapshotCount.length,
      gears: gearCount.length,
      investments: investmentCount.length,
      withdrawals: withdrawals.length,
      securities: securitiesCount.length,
    },
  }
}
