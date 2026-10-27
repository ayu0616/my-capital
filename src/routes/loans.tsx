import { createFileRoute, useRouter } from '@tanstack/react-router'
import {
  CalendarClock,
  Landmark,
  Plus,
  ShieldCheck,
  Wallet,
} from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { LoanCard } from '../components/loans/loan-card'
import { LoanDialog } from '../components/loans/loan-dialog'
import { LoanPaymentDialog } from '../components/loans/loan-payment-dialog'
import { Button } from '../components/ui/button'
import { Card, CardContent } from '../components/ui/card'
import { ConfirmDialog } from '../components/ui/dialog'
import { EmptyState } from '../components/ui/empty-state'
import { MetricCard, MetricGrid } from '../components/ui/metric'
import { PageHeader } from '../components/ui/page'
import type { Loan, LoanPayment } from '../db/schema'
import {
  buildLoanSummaries,
  buildLoanTotals,
} from '../lib/finance'
import { formatDateJa, formatYen, parseDateOnly } from '../lib/format'
import {
  deleteLoan,
  deleteLoanPayment,
} from '../server/actions'
import { getLoansData } from '../server/queries'

export const Route = createFileRoute('/loans')({
  head: () => ({
    meta: [{ title: '奨学金・ローン | Asset & Life Studio' }],
  }),
  loader: () => getLoansData(),
  component: LoansPage,
})

function LoansPage() {
  const { loans, payments, today } = Route.useLoaderData()
  const router = useRouter()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Loan | null>(null)
  const [deletingLoan, setDeletingLoan] = useState<Loan | null>(null)
  const [paymentLoan, setPaymentLoan] = useState<Loan | null>(null)
  const [editingPayment, setEditingPayment] =
    useState<LoanPayment | null>(null)
  const [deletingPayment, setDeletingPayment] =
    useState<LoanPayment | null>(null)
  const [pending, setPending] = useState(false)

  const summaries = buildLoanSummaries(loans, parseDateOnly(today))
  const totals = buildLoanTotals(summaries)
  const nearestEnd = summaries
    .filter((summary) => !summary.isPaidOff && summary.repaymentEndDate)
    .sort((a, b) =>
      a.repaymentEndDate.localeCompare(b.repaymentEndDate),
    )[0]

  function openNew() {
    setEditing(null)
    setDialogOpen(true)
  }

  function openEdit(loan: Loan) {
    setEditing(loan)
    setDialogOpen(true)
  }

  function openNewPayment(loan: Loan) {
    setEditingPayment(null)
    setPaymentLoan(loan)
  }

  function openEditPayment(loan: Loan, payment: LoanPayment) {
    setEditingPayment(payment)
    setPaymentLoan(loan)
  }

  async function confirmDeleteLoan() {
    if (!deletingLoan) return
    setPending(true)
    try {
      await deleteLoan({ data: { id: deletingLoan.id } })
      toast.success('奨学金・ローンの記録を削除しました')
      setDeletingLoan(null)
      await router.invalidate()
    } catch (cause) {
      toast.error(
        cause instanceof Error ? cause.message : '削除に失敗しました',
      )
    } finally {
      setPending(false)
    }
  }

  async function confirmDeletePayment() {
    if (!deletingPayment) return
    setPending(true)
    try {
      await deleteLoanPayment({ data: { id: deletingPayment.id } })
      toast.success('返済記録を削除しました')
      setDeletingPayment(null)
      await router.invalidate()
    } catch (cause) {
      toast.error(
        cause instanceof Error ? cause.message : '削除に失敗しました',
      )
    } finally {
      setPending(false)
    }
  }

  return (
    <>
      <PageHeader
        kicker="Liabilities"
        title="奨学金・ローン"
        description="奨学金やローンの借入額・残高・返済履歴を記録します。残高は純資産から差し引かれます。"
        actions={
          <Button onClick={openNew}>
            <Plus className="size-3.5" />
            記録を追加
          </Button>
        }
      />

      <MetricGrid>
        <MetricCard
          label="残高の合計"
          value={formatYen(totals.balanceTotal)}
          icon={Landmark}
          tone="gold"
          hint={
            totals.count > 0
              ? `${totals.activeCount}件が返済中`
              : '奨学金・ローンを登録'
          }
        />
        <MetricCard
          label="毎月の返済額"
          value={formatYen(totals.monthlyPaymentTotal)}
          icon={Wallet}
          tone="ink"
          hint="返済中の記録を合計"
        />
        <MetricCard
          label="返済済み"
          value={formatYen(totals.repaidTotal)}
          icon={ShieldCheck}
          tone="brand"
          badge={
            totals.principalTotal > 0 ? (
              <span className="text-[0.62rem] font-bold text-brand">
                {Math.round(totals.progress * 100)}%
              </span>
            ) : undefined
          }
          hint="借入額に対する返済の進捗"
        />
        <MetricCard
          label="直近の返済終了"
          value={
            nearestEnd ? formatDateJa(nearestEnd.repaymentEndDate) : '—'
          }
          icon={CalendarClock}
          tone="muted"
          hint={
            totals.paidOffCount > 0
              ? `${totals.paidOffCount}件が完済済み`
              : '返済終了予定日から表示'
          }
        />
      </MetricGrid>

      <div className="mt-4">
        {summaries.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <EmptyState
                icon={Landmark}
                title="奨学金・ローンの記録はまだありません"
                description="借入先・借入額・現在の残高を登録すると、返済進捗と純資産への影響を確認できます。返済したら元金を記録します。"
                action={
                  <Button size="sm" onClick={openNew}>
                    <Plus className="size-3.5" />
                    最初の記録を追加
                  </Button>
                }
              />
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
              {summaries.map((summary) => {
                const loan = loans.find((item) => item.id === summary.id)
                if (!loan) return null
                const loanPayments = payments.filter(
                  (payment) => payment.loanId === loan.id,
                )
                return (
                  <LoanCard
                    key={summary.id}
                    summary={summary}
                    payments={loanPayments}
                    onEdit={() => openEdit(loan)}
                    onDelete={() => setDeletingLoan(loan)}
                    onAddPayment={() => openNewPayment(loan)}
                    onEditPayment={(payment) =>
                      openEditPayment(loan, payment)
                    }
                    onDeletePayment={setDeletingPayment}
                  />
                )
              })}
            </div>
            <p className="mt-4 text-[0.6rem] leading-relaxed text-muted">
              返済記録では元金が残高から差し引かれます。利息は履歴に残すだけで、残高には含めません。金利・返済額は目安として入力してください。
            </p>
          </>
        )}
      </div>

      <LoanDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        loan={editing}
      />

      <LoanPaymentDialog
        open={Boolean(paymentLoan)}
        onOpenChange={(open) => {
          if (!open) {
            setPaymentLoan(null)
            setEditingPayment(null)
          }
        }}
        loan={paymentLoan}
        payment={editingPayment}
      />

      <ConfirmDialog
        open={Boolean(deletingLoan)}
        onOpenChange={(open) => {
          if (!open) setDeletingLoan(null)
        }}
        onConfirm={confirmDeleteLoan}
        pending={pending}
        title="奨学金・ローンの記録を削除しますか？"
        description={
          deletingLoan
            ? `${deletingLoan.name}と、ひもづく返済履歴を削除します。`
            : ''
        }
      />

      <ConfirmDialog
        open={Boolean(deletingPayment)}
        onOpenChange={(open) => {
          if (!open) setDeletingPayment(null)
        }}
        onConfirm={confirmDeletePayment}
        pending={pending}
        title="返済記録を削除しますか？"
        description={
          deletingPayment
            ? `${formatDateJa(deletingPayment.paidAt)}の返済記録を削除します。元金は残高に戻ります。`
            : ''
        }
      />
    </>
  )
}
