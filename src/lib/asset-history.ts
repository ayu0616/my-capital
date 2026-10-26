import type { AssetEntry, AssetSnapshot, HoldingWithdrawal } from '../db/schema'
import { ASSET_ITEMS } from './asset-items'

// re-export safe helper without redefining
const safe = (value: number | null | undefined): number =>
  Number.isFinite(value) ? Number(value) : 0

export function buildAssetSnapshots(
  entries: AssetEntry[],
  withdrawals: HoldingWithdrawal[] = [],
): AssetSnapshot[] {
  const months = new Set<string>()
  for (const entry of entries) {
    months.add(entry.valuedAt.slice(0, 7))
  }
  for (const withdrawal of withdrawals) {
    months.add(withdrawal.withdrawnAt.slice(0, 7))
  }
  const sortedMonths = [...months].sort()
  if (sortedMonths.length === 0) return []

  const sortedEntries = [...entries].sort((a, b) => {
    if (a.valuedAt !== b.valuedAt) return a.valuedAt.localeCompare(b.valuedAt)
    return a.createdAt.localeCompare(b.createdAt)
  })

  return sortedMonths.map((yearMonth) => {
    const snapshot: AssetSnapshot = {
      id: `derived-${yearMonth}`,
      yearMonth,
      cashAmount: 0,
      nisaOrkanAmount: 0,
      nisaSp500Amount: 0,
      nisaMutualFundAmount: 0,
      nisaIndividualStockAmount: 0,
      nisaOtherAssetAmount: 0,
      securitiesCashAmount: 0,
      pensionBalance: 0,
      nisaContributedPrincipal: 0,
      fujitsuRomanStockShares: 0,
      holdingStockShares: 0,
      withdrawnHoldingShares: 0,
      holdingAverageAcquisitionPrice: 0,
      holdingCarryoverAmount: 0,
      fujitsuCurrentPrice: 0,
      loanBalance: 0,
      gearResaleAmount: 0,
      notes: null,
      createdAt: sortedEntries[0]?.createdAt ?? new Date().toISOString(),
      updatedAt: sortedEntries[sortedEntries.length - 1]?.updatedAt ?? new Date().toISOString(),
    }

    for (const item of ASSET_ITEMS) {
      const value = effectiveValueForMonth(
        sortedEntries,
        item.key,
        yearMonth,
      )
      const field = item.snapshotField as keyof AssetSnapshot
      ;(snapshot as any)[field] = roundForField(item.key, value)
    }

    // withdrawn shares derived from holding withdrawals up to this month
    const withdrawnShares = withdrawals
      .filter((withdrawal) => withdrawal.withdrawnAt.slice(0, 7) <= yearMonth)
      .reduce((sum, withdrawal) => sum + safe(withdrawal.shares), 0)
    snapshot.withdrawnHoldingShares = withdrawnShares

    // notes: join entry notes in this month
    const monthNotes = [
      ...new Set(
        sortedEntries
          .filter((entry) => entry.valuedAt.slice(0, 7) === yearMonth)
          .map((entry) => (entry.notes ?? '').trim())
          .filter(Boolean),
      ),
    ]
    if (monthNotes.length > 0) {
      snapshot.notes = monthNotes.join(' / ')
    }

    return snapshot
  })
}

function roundForField(itemKey: string, value: number): number {
  const item = ASSET_ITEMS.find((entry) => entry.key === itemKey)
  if (!item) return value
  if (item.unit === 'yen') return Math.round(safe(value))
  return safe(value)
}

function effectiveValueForMonth(
  entries: AssetEntry[],
  itemKey: string,
  yearMonth: string,
): number {
  const candidate = entries
    .filter(
      (entry) =>
        entry.itemKey === itemKey && entry.valuedAt.slice(0, 7) <= yearMonth,
    )
    .sort((a, b) => {
      if (a.valuedAt !== b.valuedAt) return a.valuedAt.localeCompare(b.valuedAt)
      return a.createdAt.localeCompare(b.createdAt)
    })
    .at(-1)
  return candidate?.value ?? 0
}

