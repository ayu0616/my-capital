import { useRouter } from '@tanstack/react-router'
import { CalendarPlus, Pencil, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import type { AssetEntry } from '../../db/schema'
import type { AssetItemDefinition } from '../../lib/asset-items'
import { effectiveValue, formatAssetEntryValue } from '../../lib/asset-items'
import { toDateOnlyString, todayDateOnly } from '../../lib/format'
import { parseNumberInput, parseYenInput } from '../../lib/utils'
import {
  deleteAssetEntry,
  saveAssetEntries,
  saveAssetEntry,
} from '../../server/actions'
import { Button } from '../ui/button'
import { Dialog } from '../ui/dialog'
import { Field, FieldGrid, Input, MoneyInput, Textarea } from '../ui/form'

type AssetEntryDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  items: AssetItemDefinition[]
  entries: AssetEntry[]
  defaultDate?: string
  title?: string
  description?: string
}

function todayString() {
  return toDateOnlyString(todayDateOnly())
}

export function AssetEntryDialog({
  open,
  onOpenChange,
  items,
  entries,
  defaultDate,
  title = '資産を更新',
  description = '記録する日付と、更新したい項目の値を入力します。変更していない項目は空のままでも保存できます。',
}: AssetEntryDialogProps) {
  const router = useRouter()
  const single = items.length === 1
  const item = single ? items[0] : null

  const [date, setDate] = useState(defaultDate ?? todayString())
  const [values, setValues] = useState<Record<string, string>>({})
  const [notes, setNotes] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function initForm(nextDate: string) {
    const nextValues: Record<string, string> = {}
    for (const it of items) {
      const v = effectiveValue(entries, it.key, nextDate)
      nextValues[it.key] = v ? String(v) : ''
    }
    setValues(nextValues)
    setNotes('')
    setEditingId(null)
    setDate(nextDate)
  }

  useEffect(() => {
    if (!open) return
    initForm(defaultDate ?? todayString())
    setError(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, defaultDate])

  const history = single && item
    ? entries
        .filter((entry) => entry.itemKey === item.key)
        .sort((a, b) => b.valuedAt.localeCompare(a.valuedAt))
        .slice(0, 8)
    : []

  function parseValue(it: AssetItemDefinition, raw: string): number {
    if (it.unit === 'shares' || it.unit === 'price') {
      const n = parseNumberInput(raw)
      return Number.isFinite(n) ? n : 0
    }
    return parseYenInput(raw)
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (!date) {
      setError('日付を入力してください。')
      return
    }
    setPending(true)
    setError(null)
    try {
      if (single && item) {
        const value = parseValue(item, values[item.key] ?? '')
        await saveAssetEntry({
          data: {
            id: editingId ?? undefined,
            itemKey: item.key,
            valuedAt: date,
            value,
            notes: notes.trim() || null,
          },
        })
      } else {
        const payload: Record<string, number> = {}
        for (const it of items) {
          const raw = values[it.key] ?? ''
          if (raw.trim() === '') continue
          payload[it.key] = parseValue(it, raw)
        }
        if (Object.keys(payload).length === 0) {
          setError('少なくとも1つの項目を入力してください。')
          setPending(false)
          return
        }
        await saveAssetEntries({
          data: {
            valuedAt: date,
            values: payload,
            notes: notes.trim() || null,
          },
        })
      }
      toast.success('記録しました')
      await router.invalidate()
      onOpenChange(false)
    } catch (cause) {
      const message =
        cause instanceof Error ? cause.message : '保存に失敗しました'
      setError(message)
      toast.error(message)
    } finally {
      setPending(false)
    }
  }

  async function handleDelete(entryId: string) {
    setPending(true)
    setError(null)
    try {
      await deleteAssetEntry({ data: { id: entryId } })
      toast.success('記録を削除しました')
      setDeletingId(null)
      await router.invalidate()
    } catch (cause) {
      const message =
        cause instanceof Error ? cause.message : '削除に失敗しました'
      setError(message)
      toast.error(message)
    } finally {
      setPending(false)
    }
  }

  function loadEntry(entry: AssetEntry) {
    if (!item) return
    setDate(entry.valuedAt)
    setValues({ [item.key]: String(entry.value) })
    setNotes(entry.notes ?? '')
    setEditingId(entry.id)
  }

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      size={single ? 'md' : 'lg'}
      title={title}
      description={description}
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        <section>
          <div className="mb-3 flex items-center gap-2">
            <CalendarPlus className="size-3.5 text-brand" />
            <h3 className="text-[0.72rem] font-bold tracking-wide text-ink">
              記録日
            </h3>
          </div>
          <FieldGrid>
            <Field label="日付" htmlFor="entry-date">
              <Input
                id="entry-date"
                type="date"
                value={date}
                onChange={(event) => setDate(event.target.value)}
              />
            </Field>
            <Field label="メモ" htmlFor="entry-notes">
              <Textarea
                id="entry-notes"
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="例: ボーナスで現金を増やした。"
                maxLength={1000}
              />
            </Field>
          </FieldGrid>
        </section>

        <section>
          <div className="mb-3 flex items-center gap-2">
            <span className="h-3 w-0.5 rounded-full bg-brand" />
            <h3 className="text-[0.72rem] font-bold tracking-wide text-ink">
              更新する項目
            </h3>
          </div>
          <FieldGrid>
            {items.map((it) => (
              <Field
                key={it.key}
                label={it.label}
                htmlFor={`entry-${it.key}`}
                hint={it.hint}
              >
                {it.unit === 'shares' || it.unit === 'price' ? (
                  <Input
                    id={`entry-${it.key}`}
                    inputMode="decimal"
                    value={values[it.key] ?? ''}
                    onChange={(event) =>
                      setValues((current) => ({
                        ...current,
                        [it.key]: event.target.value,
                      }))
                    }
                    placeholder="0"
                  />
                ) : (
                  <MoneyInput
                    id={`entry-${it.key}`}
                    value={values[it.key] ?? ''}
                    onChange={(event) =>
                      setValues((current) => ({
                        ...current,
                        [it.key]: event.target.value,
                      }))
                    }
                    placeholder="0"
                  />
                )}
              </Field>
            ))}
          </FieldGrid>
        </section>

        {single && item && history.length > 0 ? (
          <section>
            <div className="mb-3 flex items-center gap-2">
              <Pencil className="size-3.5 text-brand" />
              <h3 className="text-[0.72rem] font-bold tracking-wide text-ink">
                この項目の履歴
              </h3>
            </div>
            <ul className="divide-y divide-line/70">
              {history.map((entry) => (
                <li
                  key={entry.id}
                  className="flex items-center justify-between gap-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="text-[0.72rem] font-semibold text-ink">
                      {entry.valuedAt} · {formatAssetEntryValue(item, entry.value)}
                    </p>
                    {entry.notes ? (
                      <p className="truncate text-[0.56rem] text-muted">
                        {entry.notes}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      aria-label="編集"
                      onClick={() => loadEntry(entry)}
                    >
                      <Pencil className="size-3.5" />
                    </Button>
                    {deletingId === entry.id ? (
                      <div className="flex items-center gap-1">
                        <Button
                          type="button"
                          variant="danger"
                          size="sm"
                          disabled={pending}
                          onClick={() => handleDelete(entry.id)}
                        >
                          削除
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeletingId(null)}
                        >
                          取消
                        </Button>
                      </div>
                    ) : (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        aria-label="削除"
                        className="text-muted hover:text-danger"
                        onClick={() => setDeletingId(entry.id)}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {error ? (
          <p className="rounded-xl border border-danger/20 bg-danger/10 px-3 py-2 text-[0.7rem] text-danger">
            {error}
          </p>
        ) : null}

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            キャンセル
          </Button>
          <Button type="submit" disabled={pending}>
            {pending ? '保存中…' : editingId ? '更新する' : '記録する'}
          </Button>
        </div>
      </form>
    </Dialog>
  )
}

// Back-compat alias
export const SnapshotDialog = AssetEntryDialog