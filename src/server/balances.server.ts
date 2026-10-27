import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { getDb } from '../db/client.server'
import { assetEntries, loans } from '../db/schema'
import { ASSET_ITEMS } from '../lib/asset-items'
import { toDateOnlyString, todayDateOnly } from '../lib/format'
import {
  readApiKeyByHash,
  syncLoanBalanceEntry,
  touchApiKey,
} from './db.server'

const DERIVED_ASSET_KEYS = new Set(['pension', 'gear_resale', 'loan_balance'])

export const BALANCE_ASSET_KEYS = ASSET_ITEMS.filter(
  (item) => item.unit === 'yen' && !DERIVED_ASSET_KEYS.has(item.key),
).map((item) => item.key)

const dateString = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, '日付の形式は YYYY-MM-DD で指定してください')

const loanBalanceInput = z
  .object({
    id: z.string().trim().min(1).max(200).optional(),
    name: z.string().trim().min(1).max(120).optional(),
    balance: z.number().finite().min(0).max(1_000_000_000_000),
  })
  .refine((item) => Boolean(item.id || item.name), {
    message: 'id または name を指定してください',
  })

export const balanceBatchInput = z
  .object({
    asOfDate: dateString.optional(),
    assets: z
      .record(
        z.string(),
        z.number().finite().min(0).max(1_000_000_000_000_000),
      )
      .optional(),
    loans: z.array(loanBalanceInput).max(100).optional(),
    note: z.string().trim().max(500).optional(),
  })
  .superRefine((data, ctx) => {
    const assetKeys = Object.keys(data.assets ?? {})
    const hasLoans = (data.loans?.length ?? 0) > 0
    if (assetKeys.length === 0 && !hasLoans) {
      ctx.addIssue({
        code: 'custom',
        message: 'assets または loans を1件以上指定してください',
      })
    }
    for (const key of assetKeys) {
      if (!BALANCE_ASSET_KEYS.includes(key)) {
        ctx.addIssue({
          code: 'custom',
          message: `assets.${key} は記録できません`,
          path: ['assets', key],
        })
      }
    }
    const seen = new Set<string>()
    for (const [index, loan] of (data.loans ?? []).entries()) {
      const key = loan.id ? `id:${loan.id}` : `name:${loan.name}`
      if (seen.has(key)) {
        ctx.addIssue({
          code: 'custom',
          message: '同じローンの残高が複数指定されています',
          path: ['loans', index],
        })
      }
      seen.add(key)
    }
  })

export type BalanceBatchInput = z.infer<typeof balanceBatchInput>

export class BalanceApiError extends Error {
  status: number

  constructor(message: string, status = 422) {
    super(message)
    this.name = 'BalanceApiError'
    this.status = status
  }
}

export async function hashApiKey(value: string) {
  const hash = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(value),
  )
  return [...new Uint8Array(hash)]
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
}

export function extractApiKey(request: Request) {
  const authorization = request.headers.get('authorization')?.trim()
  if (authorization) {
    const match = /^Bearer\s+(.+)$/i.exec(authorization)
    if (match) return match[1].trim()
  }
  return request.headers.get('x-api-key')?.trim() || null
}

export async function authenticateApiKey(request: Request) {
  const secret = extractApiKey(request)
  if (!secret) return null
  const row = await readApiKeyByHash(await hashApiKey(secret))
  if (!row) return null
  await touchApiKey(row.id)
  return row
}

type LoanBalanceInput = z.infer<typeof loanBalanceInput>

type LoanPlan = {
  input: LoanBalanceInput
  existing: typeof loans.$inferSelect | null
}

function loanKindFromName(name: string) {
  return /奨学金|学生支援機構|JASSO/i.test(name) ? 'scholarship' : 'loan'
}

export async function recordBalanceBatch(
  data: BalanceBatchInput,
  actor: string,
) {
  const db = getDb()
  const now = new Date().toISOString()
  const asOfDate = data.asOfDate ?? toDateOnlyString(todayDateOnly())
  const note = data.note || `API（${actor}）から残高を記録`

  const loanRows = await db.select().from(loans)
  const plans: LoanPlan[] = (data.loans ?? []).map((input) => {
    if (input.id) {
      const existing = loanRows.find((loan) => loan.id === input.id)
      if (!existing) {
        throw new BalanceApiError(`ローンのID ${input.id} が見つかりません`)
      }
      return { input, existing }
    }
    const existing =
      loanRows.find((loan) => loan.name.trim() === input.name?.trim()) ?? null
    return { input, existing }
  })

  let assetCount = 0
  for (const [itemKey, value] of Object.entries(data.assets ?? {})) {
    await db
      .insert(assetEntries)
      .values({
        id: crypto.randomUUID(),
        itemKey,
        valuedAt: asOfDate,
        value: Math.round(value),
        notes: note,
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: [assetEntries.itemKey, assetEntries.valuedAt],
        set: {
          value: Math.round(value),
          notes: note,
          updatedAt: now,
        },
      })
    assetCount += 1
  }

  const recordedLoans: Array<{
    id: string
    name: string
    balance: number
    created: boolean
  }> = []

  for (const plan of plans) {
    const balance = Math.round(plan.input.balance)
    if (plan.existing) {
      await db
        .update(loans)
        .set({ currentBalance: balance, updatedAt: now })
        .where(eq(loans.id, plan.existing.id))
      recordedLoans.push({
        id: plan.existing.id,
        name: plan.existing.name,
        balance,
        created: false,
      })
      continue
    }

    const name = plan.input.name?.trim() || ''
    const id = crypto.randomUUID()
    await db.insert(loans).values({
      id,
      name,
      lender: '',
      kind: loanKindFromName(name),
      principalAmount: balance,
      currentBalance: balance,
      interestRate: 0,
      monthlyPayment: 0,
      borrowedAt: asOfDate,
      repaymentEndDate: '',
      notes: note,
      createdAt: now,
      updatedAt: now,
    })
    recordedLoans.push({ id, name, balance, created: true })
  }

  let loanBalanceTotal: number | null = null
  if (plans.length > 0) {
    loanBalanceTotal = await syncLoanBalanceEntry(
      asOfDate,
      `API（${actor}）によるローンの残高更新`,
    )
  }

  return {
    ok: true as const,
    asOfDate,
    assets: { saved: assetCount },
    loans: recordedLoans,
    loanBalanceTotal,
  }
}
