import { and, asc, desc, eq, lt, sql } from 'drizzle-orm'
import { getDb } from '../db/client.server'
import {
  DEFAULT_ACCOUNTS,
  DEFAULT_HOLDING,
  DEFAULT_RETIREMENT,
  DEFAULT_SETTINGS,
} from '../db/defaults'
import {
  appSettings,
  assetEntries,
  authChallenges,
  authConfig,
  authPasskeys,
  cameraGears,
  careerEvents,
  financialAccounts,
  holdingStockStatus,
  holdingWithdrawals,
  retirementAccounts,
  retirementAllocations,
  securitiesHoldings,
  securitiesImportBatches,
  selfInvestments,
  stockGoals,
} from '../db/schema'
import { toDateOnlyString, todayDateOnly } from '../lib/format'
import { buildAssetSnapshots } from '../lib/asset-history'
import { fetchFujitsuStockQuote } from './stock-price.server'

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

  const [retirement] = await db
    .select()
    .from(retirementAccounts)
    .limit(1)
  if (!retirement) {
    await db
      .insert(retirementAccounts)
      .values({
        ...DEFAULT_RETIREMENT,
        valuedAt: toDateOnlyString(todayDateOnly()),
        updatedAt: now,
      })
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

export async function readAssetEntries() {
  return getDb()
    .select()
    .from(assetEntries)
    .orderBy(asc(assetEntries.valuedAt), asc(assetEntries.createdAt))
}

export async function readStockGoals() {
  return getDb()
    .select()
    .from(stockGoals)
    .orderBy(asc(stockGoals.targetDate), asc(stockGoals.createdAt))
}

export async function syncFujitsuStockPrice(options: { force?: boolean } = {}) {
  const db = getDb()
  const holding = await readHolding()
  const today = toDateOnlyString(todayDateOnly())

  if (!options.force) {
    const [latest] = await db
      .select({ valuedAt: assetEntries.valuedAt, value: assetEntries.value })
      .from(assetEntries)
      .where(eq(assetEntries.itemKey, 'fujitsu_price'))
      .orderBy(desc(assetEntries.valuedAt))
      .limit(1)
    if (latest?.valuedAt === today) {
      return {
        price: latest.value,
        updated: false,
        source: null,
        asOf: null,
      }
    }
  }

  const quote = await fetchFujitsuStockQuote()
  const now = new Date().toISOString()

  await db
    .update(holdingStockStatus)
    .set({ latestStockPrice: quote.price, updatedAt: now })
    .where(eq(holdingStockStatus.id, holding.id))

  await db
    .insert(assetEntries)
    .values({
      id: crypto.randomUUID(),
      itemKey: 'fujitsu_price',
      valuedAt: today,
      value: quote.price,
      notes: '富士通株価の自動取得',
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: [assetEntries.itemKey, assetEntries.valuedAt],
      set: {
        value: quote.price,
        notes: '富士通株価の自動取得',
        updatedAt: now,
      },
    })

  return {
    price: quote.price,
    updated: true,
    source: quote.source,
    asOf: quote.asOf,
  }
}

export async function readRetirementAccount() {
  const db = getDb()
  const [row] = await db.select().from(retirementAccounts).limit(1)
  if (!row) {
    await ensureBaseRows()
    const [created] = await db.select().from(retirementAccounts).limit(1)
    return created
  }
  return row
}

export async function readRetirementAllocations() {
  return getDb()
    .select()
    .from(retirementAllocations)
    .orderBy(asc(retirementAllocations.sortOrder))
}

/* -------------------------------------------------------------------------- */
/*  Authentication                                                            */
/* -------------------------------------------------------------------------- */

export async function readPasskeys() {
  return getDb()
    .select()
    .from(authPasskeys)
    .orderBy(desc(authPasskeys.createdAt))
}

export async function readPasskeySummaries() {
  return getDb()
    .select({
      id: authPasskeys.id,
      label: authPasskeys.label,
      createdAt: authPasskeys.createdAt,
      lastUsedAt: authPasskeys.lastUsedAt,
    })
    .from(authPasskeys)
    .orderBy(desc(authPasskeys.createdAt))
}

export async function readPasskeyByCredentialId(credentialId: string) {
  const [row] = await getDb()
    .select()
    .from(authPasskeys)
    .where(eq(authPasskeys.credentialId, credentialId))
    .limit(1)
  return row ?? null
}

export async function countPasskeys() {
  const [row] = await getDb()
    .select({ count: sql<number>`count(*)` })
    .from(authPasskeys)
  return Number(row?.count ?? 0)
}

export async function insertPasskey(input: {
  id: string
  credentialId: string
  publicKey: string
  counter: number
  transports: string
  label: string
  createdAt: string
}) {
  await getDb().insert(authPasskeys).values(input)
}

export async function updatePasskeyUsage(id: string, counter: number) {
  await getDb()
    .update(authPasskeys)
    .set({ counter, lastUsedAt: new Date().toISOString() })
    .where(eq(authPasskeys.id, id))
}

export async function deletePasskey(id: string) {
  await getDb().delete(authPasskeys).where(eq(authPasskeys.id, id))
}

export async function readAuthSessionSecret() {
  const [row] = await getDb()
    .select({ sessionSecret: authConfig.sessionSecret })
    .from(authConfig)
    .limit(1)
  return row?.sessionSecret ?? null
}

export async function createAuthSessionSecret(secret: string) {
  const now = new Date().toISOString()
  const db = getDb()
  await db
    .insert(authConfig)
    .values({ id: 'default', sessionSecret: secret, createdAt: now, updatedAt: now })
    .onConflictDoNothing()
  const [row] = await db
    .select({ sessionSecret: authConfig.sessionSecret })
    .from(authConfig)
    .limit(1)
  return row?.sessionSecret ?? secret
}

export async function saveAuthChallenge(
  challenge: string,
  kind: 'registration' | 'authentication',
  ttlSeconds = 300,
) {
  const db = getDb()
  const now = new Date()
  await db
    .delete(authChallenges)
    .where(lt(authChallenges.expiresAt, now.toISOString()))
  await db.insert(authChallenges).values({
    challenge,
    kind,
    expiresAt: new Date(now.getTime() + ttlSeconds * 1000).toISOString(),
    createdAt: now.toISOString(),
  })
}

export async function consumeAuthChallenge(
  challenge: string,
  kind: 'registration' | 'authentication',
) {
  const db = getDb()
  const [row] = await db
    .select()
    .from(authChallenges)
    .where(eq(authChallenges.challenge, challenge))
    .limit(1)
  if (!row) return null
  await db.delete(authChallenges).where(eq(authChallenges.challenge, challenge))
  if (row.kind !== kind || row.expiresAt < new Date().toISOString()) return null
  return row
}

export async function fetchDashboardData() {
  await ensureBaseRows()
  await syncFujitsuStockPrice().catch(() => null)
  const db = getDb()
  const [
    settings,
    holding,
    withdrawals,
    entries,
    gears,
    investments,
    events,
    goals,
    retirement,
    pensionAllocations,
  ] = await Promise.all([
    readSettings(),
    readHolding(),
    readHoldingWithdrawals(),
    readAssetEntries(),
    db.select().from(cameraGears).orderBy(desc(cameraGears.purchasedAt)),
    db
      .select()
      .from(selfInvestments)
      .orderBy(desc(selfInvestments.completedAt)),
    db.select().from(careerEvents).orderBy(desc(careerEvents.occurredAt)),
    readStockGoals(),
    readRetirementAccount(),
    readRetirementAllocations(),
  ])

  const snapshots = buildAssetSnapshots(entries, withdrawals)

  return {
    settings,
    holding,
    withdrawals,
    snapshots,
    assetEntries: entries,
    gears,
    investments,
    careerEvents: events,
    stockGoals: goals,
    retirement,
    retirementAllocations: pensionAllocations,
    today: toDateOnlyString(todayDateOnly()),
  }
}

export async function fetchStockGoalsData() {
  await ensureBaseRows()
  const goals = await readStockGoals()
  return {
    goals,
    today: toDateOnlyString(todayDateOnly()),
  }
}

export async function fetchAssetsData() {
  await ensureBaseRows()
  await syncFujitsuStockPrice().catch(() => null)
  const db = getDb()
  const [
    settings,
    holding,
    withdrawals,
    entries,
    gears,
    retirement,
    latestBatch,
  ] = await Promise.all([
    readSettings(),
    readHolding(),
    readHoldingWithdrawals(),
    readAssetEntries(),
    db.select().from(cameraGears),
    readRetirementAccount(),
    db
      .select()
      .from(securitiesImportBatches)
      .orderBy(
        desc(securitiesImportBatches.asOfDate),
        desc(securitiesImportBatches.importedAt),
      )
      .limit(1),
  ])

  const snapshots = buildAssetSnapshots(entries, withdrawals)
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
    assetEntries: entries,
    gears,
    retirement,
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
    entries,
    gearCount,
    investmentCount,
    securitiesCount,
    stockGoalCount,
    retirement,
    retirementAllocationRows,
    passkeys,
  ] = await Promise.all([
    readSettings(),
    readHolding(),
    readHoldingWithdrawals(),
    db
      .select()
      .from(financialAccounts)
      .orderBy(asc(financialAccounts.sortOrder)),
    readAssetEntries(),
    db.select().from(cameraGears),
    db.select().from(selfInvestments),
    db.select().from(securitiesHoldings),
    db.select().from(stockGoals),
    readRetirementAccount(),
    readRetirementAllocations(),
    readPasskeySummaries(),
  ])
  const snapshotCount = buildAssetSnapshots(entries, withdrawals)
  return {
    settings,
    holding,
    withdrawals,
    accounts,
    retirement,
    retirementAllocations: retirementAllocationRows,
    passkeys,
    counts: {
      snapshots: snapshotCount.length,
      gears: gearCount.length,
      investments: investmentCount.length,
      withdrawals: withdrawals.length,
      securities: securitiesCount.length,
      stockGoals: stockGoalCount.length,
    },
  }
}
