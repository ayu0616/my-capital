import { z } from 'zod'
import { getDb } from '../db/client.server'
import { stepRecords } from '../db/schema'

const dateString = z
  .string({ error: '日付を指定してください' })
  .regex(/^\d{4}-\d{2}-\d{2}$/, '日付の形式は YYYY-MM-DD で指定してください')

const stepsValue = z
  .number({ error: '歩数を数値で指定してください' })
  .int('歩数は整数で指定してください')
  .min(0, '歩数は0以上で指定してください')
  .max(1_000_000, '歩数は1,000,000以下で指定してください')

const placeValue = z
  .string({ error: '場所は文字列で指定してください' })
  .trim()
  .max(200, '場所は200文字以内で指定してください')

const stepRecordInput = z.object(
  {
    date: dateString,
    steps: stepsValue,
    place: placeValue.optional(),
  },
  {
    error: 'records の各要素は日付と歩数のオブジェクトで指定してください',
  },
)

/**
 * 単一の記録 `{ date, steps }` と、複数件の記録 `{ records: [...] }` の
 * どちらも受け付ける。保存時は日付の配列に正規化する。
 */
export const stepSyncInput = z
  .object(
    {
      date: dateString.optional(),
      steps: stepsValue.optional(),
      place: placeValue.optional(),
      records: z
        .array(stepRecordInput, { error: 'records は配列で指定してください' })
        .max(366, 'records は366件以内で指定してください')
        .optional(),
    },
    {
      error: 'リクエスト本文はJSONオブジェクトで指定してください',
    },
  )
  .superRefine((data, ctx) => {
    const hasRecords = data.records !== undefined
    const hasSingle =
      data.date !== undefined ||
      data.steps !== undefined ||
      data.place !== undefined

    if (hasRecords && hasSingle) {
      ctx.addIssue({
        code: 'custom',
        message: 'records と date/steps は同時に指定できません',
      })
      return
    }

    if (data.records !== undefined) {
      if (data.records.length === 0) {
        ctx.addIssue({
          code: 'custom',
          message: 'records を1件以上指定してください',
          path: ['records'],
        })
        return
      }
      const seen = new Set<string>()
      for (const [index, record] of data.records.entries()) {
        if (seen.has(record.date)) {
          ctx.addIssue({
            code: 'custom',
            message: `日付 ${record.date} が複数指定されています`,
            path: ['records', index, 'date'],
          })
        }
        seen.add(record.date)
      }
      return
    }

    if (data.date === undefined) {
      ctx.addIssue({
        code: 'custom',
        message: 'date を指定してください',
        path: ['date'],
      })
    }
    if (data.steps === undefined) {
      ctx.addIssue({
        code: 'custom',
        message: 'steps を指定してください',
        path: ['steps'],
      })
    }
  })
  .transform((data): StepSyncRecord[] => {
    if (data.records !== undefined) return data.records
    return [{ date: data.date!, steps: data.steps!, place: data.place }]
  })

export type StepSyncInput = z.infer<typeof stepSyncInput>
export type StepSyncRecord = z.infer<typeof stepRecordInput>

/**
 * 日付をキーに歩数を保存する。同じ日付を再送しても二重計上せず、
 * updatedAt は毎回現在時刻に更新する（最終同期日時の判定に使う）。
 */
export async function recordStepBatch(records: StepSyncInput) {
  const now = new Date().toISOString()
  const db = getDb()

  for (const record of records) {
    await db
      .insert(stepRecords)
      .values({
        id: crypto.randomUUID(),
        date: record.date,
        steps: record.steps,
        place: record.place ?? null,
        source: 'shortcut',
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: [stepRecords.date],
        set: {
          steps: record.steps,
          place: record.place ?? null,
          source: 'shortcut',
          updatedAt: now,
        },
      })
  }

  return {
    recorded: records.length,
    dates: records.map((record) => record.date).sort(),
  }
}
