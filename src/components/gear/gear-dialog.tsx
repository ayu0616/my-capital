import { useRouter } from '@tanstack/react-router'
import { ImagePlus, Loader2, Trash2 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import type { CameraGear } from '../../db/schema'
import { formatPercent, formatYen, toDateOnlyString, todayDateOnly } from '../../lib/format'
import { uploadGearImage } from '../../lib/image'
import { parseYenInput } from '../../lib/utils'
import { saveGear } from '../../server/actions'
import { Button } from '../ui/button'
import { Dialog } from '../ui/dialog'
import { Field, FieldGrid, Input, MoneyInput, Select, Textarea } from '../ui/form'
import { GearArtwork } from './gear-artwork'

type GearCategory = 'body' | 'lens' | 'accessory'

const categoryOptions: { value: GearCategory; label: string }[] = [
  { value: 'body', label: 'カメラボディ' },
  { value: 'lens', label: 'レンズ' },
  { value: 'accessory', label: 'アクセサリー' },
]

export function GearDialog({
  open,
  onOpenChange,
  gear,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  gear: CameraGear | null
}) {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [name, setName] = useState('')
  const [category, setCategory] = useState<GearCategory>('lens')
  const [purchasedAt, setPurchasedAt] = useState(toDateOnlyString(todayDateOnly()))
  const [purchasePrice, setPurchasePrice] = useState('')
  const [resaleValue, setResaleValue] = useState('')
  const [notes, setNotes] = useState('')
  const [imageKey, setImageKey] = useState<string | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [objectUrl, setObjectUrl] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setName(gear?.name ?? '')
    setCategory((gear?.category as GearCategory) ?? 'lens')
    setPurchasedAt(gear?.purchasedAt ?? toDateOnlyString(todayDateOnly()))
    setPurchasePrice(gear ? String(gear.purchasePrice) : '')
    setResaleValue(gear ? String(gear.resaleValue) : '')
    setNotes(gear?.notes ?? '')
    setImageKey(gear?.imageKey ?? null)
    setFile(null)
    setError(null)
    setObjectUrl((current) => {
      if (current) URL.revokeObjectURL(current)
      return null
    })
  }, [open, gear])

  useEffect(() => {
    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [objectUrl])

  function pickFile(nextFile: File | null) {
    if (!nextFile) return
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(nextFile.type)) {
      setError('JPEG・PNG・WebP の画像を選択してください')
      return
    }
    if (nextFile.size > 8 * 1024 * 1024) {
      setError('画像は8MB以下にしてください')
      return
    }
    setObjectUrl((current) => {
      if (current) URL.revokeObjectURL(current)
      return URL.createObjectURL(nextFile)
    })
    setFile(nextFile)
    setError(null)
  }

  function removeImage() {
    setFile(null)
    setImageKey(null)
    setObjectUrl((current) => {
      if (current) URL.revokeObjectURL(current)
      return null
    })
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const preview = file && objectUrl ? objectUrl : imageKey ? `/api/images/${imageKey}` : null
  const purchase = parseYenInput(purchasePrice)
  const resale = parseYenInput(resaleValue)
  const gain = resale - purchase
  const retention = purchase > 0 ? resale / purchase : 0

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (!name.trim()) {
      setError('機材名を入力してください')
      return
    }
    setPending(true)
    setError(null)
    try {
      let nextKey = imageKey
      if (file) nextKey = await uploadGearImage(file)
      await saveGear({
        data: {
          id: gear?.id,
          name: name.trim(),
          category,
          purchasedAt,
          purchasePrice: purchase,
          resaleValue: resale,
          imageKey: nextKey,
          notes: notes.trim() || null,
        },
      })
      toast.success(gear ? '機材を更新しました' : '機材を追加しました')
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
      size="lg"
      title={gear ? '機材を編集' : '機材を追加'}
      footer={
        <>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            キャンセル
          </Button>
          <Button type="submit" form="gear-form" disabled={pending}>
            {pending ? (
              <>
                <Loader2 className="size-3.5 animate-spin" />
                保存中…
              </>
            ) : gear ? (
              '更新する'
            ) : (
              '追加する'
            )}
          </Button>
        </>
      }
    >
      <form id="gear-form" onSubmit={handleSubmit} className="space-y-5">
        <div className="relative h-40 overflow-hidden rounded-2xl border border-line bg-canvas/40 sm:h-48">
          {preview ? (
            <img src={preview} alt="" className="size-full object-cover" />
          ) : (
            <GearArtwork
              category={category}
              name={name || '機材'}
              className="size-full"
            />
          )}
          <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 bg-gradient-to-t from-black/55 to-transparent p-3">
            <p className="text-[0.62rem] font-medium text-white/75">
              {preview ? '画像を変更できます' : '任意 · R2に保存されます'}
            </p>
            <div className="flex items-center gap-1.5">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                className="border border-white/20 bg-black/25 text-white hover:bg-black/40 hover:text-white"
              >
                <ImagePlus className="size-3.5" />
                画像を選択
              </Button>
              {preview ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={removeImage}
                  aria-label="画像を削除"
                  className="border border-white/20 bg-black/25 text-white hover:bg-black/40 hover:text-white"
                >
                  <Trash2 className="size-3.5" />
                </Button>
              ) : null}
            </div>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            onChange={(event) => pickFile(event.target.files?.[0] ?? null)}
          />
        </div>

        <FieldGrid>
          <Field label="機材名" htmlFor="gear-name" className="sm:col-span-2">
            <Input
              id="gear-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="例: FE 24-70mm F2.8 GM II"
              maxLength={120}
              required
            />
          </Field>
          <Field label="カテゴリー" htmlFor="gear-category">
            <Select
              id="gear-category"
              value={category}
              onChange={(event) => setCategory(event.target.value as GearCategory)}
            >
              {categoryOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="購入日" htmlFor="gear-date">
            <Input
              id="gear-date"
              type="date"
              value={purchasedAt}
              onChange={(event) => setPurchasedAt(event.target.value)}
              required
            />
          </Field>
          <Field label="購入価格" htmlFor="gear-purchase">
            <MoneyInput
              id="gear-purchase"
              value={purchasePrice}
              onChange={(event) => setPurchasePrice(event.target.value)}
              placeholder="0"
            />
          </Field>
          <Field
            label="現在の買取目安"
            htmlFor="gear-resale"
            hint="マップカメラなどの中古買取相場を参考にしてください。"
          >
            <MoneyInput
              id="gear-resale"
              value={resaleValue}
              onChange={(event) => setResaleValue(event.target.value)}
              placeholder="0"
            />
          </Field>
        </FieldGrid>

        {(purchase > 0 || resale > 0) && (
          <div className="grid grid-cols-3 gap-2 rounded-xl border border-line bg-canvas/40 px-3.5 py-3">
            <div>
              <p className="text-[0.55rem] text-muted">購入価格</p>
              <p className="mt-1 text-[0.72rem] font-semibold tabular text-ink">
                {formatYen(purchase)}
              </p>
            </div>
            <div>
              <p className="text-[0.55rem] text-muted">買取目安</p>
              <p className="mt-1 text-[0.72rem] font-semibold tabular text-ink">
                {formatYen(resale)}
              </p>
            </div>
            <div>
              <p className="text-[0.55rem] text-muted">残存率 / 損益</p>
              <p className="mt-1 text-[0.72rem] font-semibold tabular text-ink">
                {formatPercent(retention, 0)}{' '}
                <span className={gain >= 0 ? 'text-positive' : 'text-danger'}>
                  {formatYen(gain, { sign: true })}
                </span>
              </p>
            </div>
          </div>
        )}

        <Field label="メモ" htmlFor="gear-notes">
          <Textarea
            id="gear-notes"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="例: 旅行の標準ズーム。描写が素直。"
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
