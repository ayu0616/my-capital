import { useRouter } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { toDateOnlyString, todayDateOnly } from '../../lib/format'
import { parseNumberInput } from '../../lib/utils'
import { saveStepRecord } from '../../server/actions'
import { Button } from '../ui/button'
import { Dialog } from '../ui/dialog'
import { Field, FieldGrid, Input } from '../ui/form'

export function StepDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const router = useRouter()
  const [date, setDate] = useState(toDateOnlyString(todayDateOnly()))
  const [steps, setSteps] = useState('')
  const [place, setPlace] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setDate(toDateOnlyString(todayDateOnly()))
    setSteps('')
    setPlace('')
    setError(null)
  }, [open])

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (!steps.trim()) {
      setError('歩数を入力してください')
      return
    }
    const stepCount = Math.round(parseNumberInput(steps))
    if (stepCount < 0) {
      setError('歩数は0以上で入力してください')
      return
    }
    setPending(true)
    setError(null)
    try {
      await saveStepRecord({
        data: {
          date,
          steps: stepCount,
          place: place.trim() || null,
        },
      })
      toast.success('歩行記録を保存しました')
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
      title="歩行記録を追加"
      description="1日1件で記録します。同じ日付は上書きされます。"
      footer={
        <>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            キャンセル
          </Button>
          <Button type="submit" form="step-form" disabled={pending}>
            {pending ? '保存中…' : '記録する'}
          </Button>
        </>
      }
    >
      <form id="step-form" onSubmit={handleSubmit} className="space-y-4">
        <FieldGrid>
          <Field label="日付" htmlFor="step-date">
            <Input
              id="step-date"
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
              required
            />
          </Field>
          <Field label="歩数" htmlFor="step-count">
            <div className="relative">
              <Input
                id="step-count"
                inputMode="numeric"
                value={steps}
                onChange={(event) => setSteps(event.target.value)}
                placeholder="例: 8000"
                className="pr-9 tabular"
                required
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[0.68rem] text-muted">
                歩
              </span>
            </div>
          </Field>
        </FieldGrid>
        <Field label="場所メモ" htmlFor="step-place" hint="任意。歩いた場所やコースを残せます。">
          <Input
            id="step-place"
            value={place}
            onChange={(event) => setPlace(event.target.value)}
            placeholder="例: 通勤、河川敷"
            maxLength={200}
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
