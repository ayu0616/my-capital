import { useRouter } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import type { CareerEvent } from '../../db/schema'
import { toDateOnlyString, todayDateOnly } from '../../lib/format'
import { parseYenInput } from '../../lib/utils'
import { saveCareerEvent } from '../../server/actions'
import { Button } from '../ui/button'
import { Dialog } from '../ui/dialog'
import { Field, FieldGrid, Input, MoneyInput, Textarea } from '../ui/form'

export function CareerDialog({
  open,
  onOpenChange,
  event,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  event: CareerEvent | null
}) {
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [occurredAt, setOccurredAt] = useState(toDateOnlyString(todayDateOnly()))
  const [annualIncomeIncrease, setAnnualIncomeIncrease] = useState('')
  const [notes, setNotes] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setTitle(event?.title ?? '')
    setOccurredAt(event?.occurredAt ?? toDateOnlyString(todayDateOnly()))
    setAnnualIncomeIncrease(
      event ? String(event.annualIncomeIncrease) : '',
    )
    setNotes(event?.notes ?? '')
    setError(null)
  }, [open, event])

  async function handleSubmit(submitEvent: React.FormEvent) {
    submitEvent.preventDefault()
    if (!title.trim()) {
      setError('タイトルを入力してください')
      return
    }
    setPending(true)
    setError(null)
    try {
      await saveCareerEvent({
        data: {
          id: event?.id,
          title: title.trim(),
          occurredAt,
          annualIncomeIncrease: parseYenInput(annualIncomeIncrease),
          notes: notes.trim() || null,
        },
      })
      toast.success(event ? 'キャリアイベントを更新しました' : 'キャリアイベントを記録しました')
      await router.invalidate()
      onOpenChange(false)
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : '保存に失敗しました'
      setError(message)
      toast.error(message)
    } finally {
      setPending(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={event ? 'キャリアイベントを編集' : 'キャリアイベントを記録'}
      description="昇格・昇給・転職による年収の増加を記録します。"
      footer={
        <>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            キャンセル
          </Button>
          <Button type="submit" form="career-form" disabled={pending}>
            {pending ? '保存中…' : event ? '更新する' : '記録する'}
          </Button>
        </>
      }
    >
      <form id="career-form" onSubmit={handleSubmit} className="space-y-4">
        <Field label="イベント" htmlFor="career-title">
          <Input
            id="career-title"
            value={title}
            onChange={(changeEvent) => setTitle(changeEvent.target.value)}
            placeholder="例: 昇格 Lv7 → Lv8"
            maxLength={200}
            required
          />
        </Field>
        <FieldGrid>
          <Field label="発生日" htmlFor="career-date">
            <Input
              id="career-date"
              type="date"
              value={occurredAt}
              onChange={(changeEvent) => setOccurredAt(changeEvent.target.value)}
              required
            />
          </Field>
          <Field
            label="年収の増加額"
            htmlFor="career-increase"
            hint="昇格・昇給による年間の増加額。"
          >
            <MoneyInput
              id="career-increase"
              value={annualIncomeIncrease}
              onChange={(changeEvent) =>
                setAnnualIncomeIncrease(changeEvent.target.value)
              }
              placeholder="0"
            />
          </Field>
        </FieldGrid>
        <Field label="メモ" htmlFor="career-notes">
          <Textarea
            id="career-notes"
            value={notes}
            onChange={(changeEvent) => setNotes(changeEvent.target.value)}
            placeholder="例: シニアエンジニアとして採用面接官も担当。"
            maxLength={1000}
          />
        </Field>
        {error ? (
          <p className="rounded-xl border border-danger/20 bg-danger/10 px-3 py-2 text-[0.7rem] text-danger">
            {error}
          </p>
        ) : null}
      </form>
    </Dialog>
  )
}
