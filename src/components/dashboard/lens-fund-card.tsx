import { Link, useRouter } from '@tanstack/react-router'
import { Aperture, Pencil } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import type { AppSettings } from '../../db/schema'
import { buildLensFund } from '../../lib/finance'
import { formatPercent, formatYen } from '../../lib/format'
import { cn, parseYenInput } from '../../lib/utils'
import { updateGearFund } from '../../server/actions'
import { Button } from '../ui/button'
import { Card, CardContent, CardHeader, CardKicker, CardTitle } from '../ui/card'
import { Dialog } from '../ui/dialog'
import { Badge, Field, MoneyInput } from '../ui/form'
import { Progress } from '../ui/progress'

export function LensFundCard({
  settings,
  className,
}: {
  settings: AppSettings
  className?: string
}) {
  const fund = buildLensFund(settings)
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [value, setValue] = useState(String(fund.saved))
  const [pending, setPending] = useState(false)

  useEffect(() => {
    if (open) setValue(String(settings.gearFundSaved))
  }, [open, settings.gearFundSaved])

  async function save() {
    setPending(true)
    try {
      await updateGearFund({ data: { saved: parseYenInput(value) } })
      await router.invalidate()
      toast.success('レンズ積立を更新しました')
      setOpen(false)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '更新に失敗しました')
    } finally {
      setPending(false)
    }
  }

  return (
    <Card className={cn('flex flex-col', className)}>
      <CardHeader className="items-start">
        <div>
          <CardKicker>Gear fund</CardKicker>
          <CardTitle className="mt-1.5">次の一本まで</CardTitle>
        </div>
        <span className="flex size-8 items-center justify-center rounded-xl border border-gold/15 bg-gold-soft text-gold-strong">
          <Aperture className="size-4" />
        </span>
      </CardHeader>

      <CardContent className="flex flex-1 flex-col">
        <div className="flex items-baseline gap-1.5">
          <span className="font-display text-[1.7rem] font-semibold leading-none text-ink tabular">
            {formatYen(fund.saved)}
          </span>
          <span className="text-[0.62rem] text-muted">/ {formatYen(fund.target)}</span>
        </div>
        <div className="mt-2 flex items-center gap-2">
          <Badge variant={fund.isComplete ? 'success' : 'gold'}>
            {fund.isComplete ? '購入できます' : formatPercent(fund.progress)}
          </Badge>
          <span className="text-[0.58rem] text-muted">
            {fund.isComplete ? 'ご褒美のタイミング' : `あと ${formatYen(fund.remaining)}`}
          </span>
        </div>

        <Progress
          value={fund.progress}
          tone="gold"
          className="mt-4"
          barClassName="bg-[linear-gradient(90deg,#b3823d,#e0bd82)]"
          label="レンズ積立の進捗"
        />
        <p className="mt-2 text-[0.58rem] leading-relaxed text-muted">
          半年に1本。ボーナスから少しずつ、機材基金へ。
        </p>

        <div className="mt-auto flex items-center justify-between gap-2 border-t border-line/70 pt-3.5">
          <Link
            to="/gear"
            className="text-[0.62rem] font-semibold text-brand underline decoration-brand/25 underline-offset-2"
          >
            機材台帳を見る
          </Link>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setOpen(true)}
            className="h-7 gap-1 px-2 text-[0.62rem]"
          >
            <Pencil className="size-3" />
            積立額を編集
          </Button>
        </div>
      </CardContent>

      <Dialog
        open={open}
        onOpenChange={setOpen}
        title="レンズ積立を更新"
        description="いま貯まっている金額を入力してください。"
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setOpen(false)}>
              キャンセル
            </Button>
            <Button onClick={save} disabled={pending}>
              {pending ? '保存中…' : '保存する'}
            </Button>
          </>
        }
      >
        <Field
          label="現在の積立額"
          htmlFor="gear-fund-saved"
          hint={`目標 ${formatYen(settings.gearFundTarget)} に対しての進捗を表示します。`}
        >
          <MoneyInput
            id="gear-fund-saved"
            value={value}
            onChange={(event) => setValue(event.target.value)}
            placeholder="0"
          />
        </Field>
      </Dialog>
    </Card>
  )
}
