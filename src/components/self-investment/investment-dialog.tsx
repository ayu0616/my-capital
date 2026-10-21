import { useRouter } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import type { SelfInvestment } from '../../db/schema'
import {
  categoryLabel,
  INVESTMENT_CATEGORY_LABELS,
} from '../../lib/finance'
import { toDateOnlyString, todayDateOnly } from '../../lib/format'
import { parseYenInput } from '../../lib/utils'
import { saveInvestment } from '../../server/actions'
import { Button } from '../ui/button'
import { Dialog } from '../ui/dialog'
import { Field, FieldGrid, Input, MoneyInput, Select, Textarea } from '../ui/form'

type Category = 'cert' | 'udemy' | 'book' | 'other'
const categories: Category[] = ['cert', 'udemy', 'book', 'other']

export function InvestmentDialog({
  open,
  onOpenChange,
  investment,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  investment: SelfInvestment | null
}) {
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState<Category>('cert')
  const [cost, setCost] = useState('')
  const [completedAt, setCompletedAt] = useState(toDateOnlyString(todayDateOnly()))
  const [notes, setNotes] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setTitle(investment?.title ?? '')
    setCategory((investment?.category as Category) ?? 'cert')
    setCost(investment ? String(investment.cost) : '')
    setCompletedAt(
      investment?.completedAt ?? toDateOnlyString(todayDateOnly()),
    )
    setNotes(investment?.notes ?? '')
    setError(null)
  }, [open, investment])

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (!title.trim()) {
      setError('タイトルを入力してください')
      return
    }
    setPending(true)
    setError(null)
    try {
      await saveInvestment({
        data: {
          id: investment?.id,
          title: title.trim(),
          category,
          cost: parseYenInput(cost),
          completedAt,
          notes: notes.trim() || null,
        },
      })
      toast.success(investment ? '記録を更新しました' : '自己投資を記録しました')
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
      title={investment ? '自己投資を編集' : '自己投資を記録'}
      description="資格・講座・書籍の費用を記録します。"
      footer={
        <>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            キャンセル
          </Button>
          <Button type="submit" form="investment-form" disabled={pending}>
            {pending ? '保存中…' : investment ? '更新する' : '記録する'}
          </Button>
        </>
      }
    >
      <form id="investment-form" onSubmit={handleSubmit} className="space-y-4">
        <Field label="タイトル" htmlFor="inv-title">
          <Input
            id="inv-title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="例: AWS Certified Solutions Architect – Professional"
            maxLength={200}
            required
          />
        </Field>
        <FieldGrid>
          <Field label="カテゴリー" htmlFor="inv-category">
            <Select
              id="inv-category"
              value={category}
              onChange={(event) => setCategory(event.target.value as Category)}
            >
              {categories.map((value) => (
                <option key={value} value={value}>
                  {INVESTMENT_CATEGORY_LABELS[value]}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="完了日" htmlFor="inv-date">
            <Input
              id="inv-date"
              type="date"
              value={completedAt}
              onChange={(event) => setCompletedAt(event.target.value)}
              required
            />
          </Field>
          <Field label="自己負担額" htmlFor="inv-cost" hint="補助金を除いた実質の支払額。">
            <MoneyInput
              id="inv-cost"
              value={cost}
              onChange={(event) => setCost(event.target.value)}
              placeholder="0"
            />
          </Field>
          <div className="flex items-end pb-1">
            <p className="text-[0.62rem] leading-relaxed text-muted">
              記録したカテゴリーは
              <br />
              「{categoryLabel(category)}」として集計されます。
            </p>
          </div>
        </FieldGrid>
        <Field label="メモ" htmlFor="inv-notes">
          <Textarea
            id="inv-notes"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="例: クラウド設計の基礎固め。業務のレビューで活用した。"
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
