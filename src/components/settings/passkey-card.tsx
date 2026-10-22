import {
  browserSupportsWebAuthn,
  startRegistration,
  type PublicKeyCredentialCreationOptionsJSON,
} from '@simplewebauthn/browser'
import { Fingerprint, Loader2, Plus, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import type { AuthPasskey } from '../../db/schema'
import { formatDateJa } from '../../lib/format'
import {
  deletePasskey,
  getPasskeyRegistrationOptions,
  registerPasskey,
} from '../../server/auth'
import { Button } from '../ui/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardKicker,
  CardTitle,
} from '../ui/card'
import { ConfirmDialog, Dialog } from '../ui/dialog'
import { EmptyState } from '../ui/empty-state'
import { Field, Input } from '../ui/form'

type PasskeySummary = Pick<
  AuthPasskey,
  'id' | 'label' | 'createdAt' | 'lastUsedAt'
>

export function PasskeyCard({
  passkeys,
  passcodeEnabled,
  onChanged,
  className,
}: {
  passkeys: PasskeySummary[]
  passcodeEnabled: boolean
  onChanged: () => void
  className?: string
}) {
  const [addOpen, setAddOpen] = useState(false)
  const [label, setLabel] = useState('この端末')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [supported, setSupported] = useState(true)
  const [deleteTarget, setDeleteTarget] = useState<PasskeySummary | null>(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    setSupported(browserSupportsWebAuthn())
  }, [])

  function openAddDialog() {
    setLabel('この端末')
    setError(null)
    setAddOpen(true)
  }

  async function handleRegister(event: React.FormEvent) {
    event.preventDefault()
    if (!supported) {
      setError('このブラウザはパスキーに対応していません。')
      return
    }
    setPending(true)
    setError(null)
    try {
      const options = await getPasskeyRegistrationOptions()
      if (!options.ok) {
        setError(options.error)
        return
      }
      const response = await startRegistration({
        optionsJSON:
          options.options as unknown as PublicKeyCredentialCreationOptionsJSON,
      })
      const result = await registerPasskey({
        data: { response, label: label.trim() || 'パスキー' },
      })
      if (!result.ok) {
        setError(result.error)
        return
      }
      toast.success('パスキーを追加しました')
      setAddOpen(false)
      onChanged()
    } catch (cause) {
      setError(
        cause instanceof Error && cause.name === 'NotAllowedError'
          ? 'パスキーの作成がキャンセルされました'
          : cause instanceof Error
            ? cause.message
            : 'パスキーを追加できませんでした',
      )
    } finally {
      setPending(false)
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      const result = await deletePasskey({ data: { id: deleteTarget.id } })
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      toast.success('パスキーを削除しました')
      setDeleteTarget(null)
      onChanged()
    } finally {
      setDeleting(false)
    }
  }

  return (
    <>
      <Card className={className}>
        <CardHeader>
          <div>
            <CardKicker>Passkeys</CardKicker>
            <CardTitle className="mt-1.5">パスキー</CardTitle>
          </div>
          <Fingerprint className="size-4 text-gold" />
        </CardHeader>
        <CardContent>
          <p className="text-xs leading-relaxed text-muted">
            パスキーを登録すると、パスコードの代わりに端末の生体認証やPINでログインできます。
          </p>
          {passkeys.length > 0 && !passcodeEnabled ? (
            <p className="mt-2 text-[0.62rem] leading-relaxed text-muted">
              パスコードが未設定のため、パスキーがログインの唯一の方法です。
            </p>
          ) : null}

          {passkeys.length === 0 ? (
            <EmptyState
              icon={Fingerprint}
              title="パスキーは未登録です"
              description="追加すると、次回からログイン画面でパスキーを選べます。"
              className="mt-4 py-8"
            />
          ) : (
            <ul className="mt-4 space-y-2">
              {passkeys.map((passkey) => (
                <li
                  key={passkey.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-line/80 px-3.5 py-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-[0.72rem] font-semibold text-ink">
                      {passkey.label || 'パスキー'}
                    </p>
                    <p className="mt-0.5 text-[0.58rem] text-muted">
                      追加: {formatDateJa(passkey.createdAt)}
                      {passkey.lastUsedAt
                        ? ` ・ 最終使用: ${formatDateJa(passkey.lastUsedAt)}`
                        : ''}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`${passkey.label || 'パスキー'}を削除`}
                    onClick={() => setDeleteTarget(passkey)}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </li>
              ))}
            </ul>
          )}

          <Button
            variant="outline"
            size="sm"
            className="mt-4 w-full"
            onClick={openAddDialog}
          >
            <Plus className="size-3.5" />
            パスキーを追加
          </Button>
        </CardContent>
      </Card>

      <Dialog
        open={addOpen}
        onOpenChange={setAddOpen}
        title="パスキーを追加"
        description="端末の生体認証やPINを使って、この台帳のパスキーを作成します。"
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setAddOpen(false)}>
              キャンセル
            </Button>
            <Button
              type="submit"
              form="passkey-register-form"
              disabled={pending}
            >
              {pending ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" />
                  作成中…
                </>
              ) : (
                'パスキーを作成'
              )}
            </Button>
          </>
        }
      >
        <form
          id="passkey-register-form"
          onSubmit={handleRegister}
          className="space-y-4"
        >
          <Field
            label="名前"
            htmlFor="passkey-label"
            hint="どの端末のパスキーか分かる名前を付けます。"
          >
            <Input
              id="passkey-label"
              value={label}
              onChange={(event) => setLabel(event.target.value)}
              maxLength={60}
              placeholder="この端末"
              autoFocus
            />
          </Field>
          {!supported ? (
            <p className="rounded-xl border border-danger/20 bg-danger/10 px-3 py-2 text-[0.72rem] text-danger">
              このブラウザはパスキーに対応していません。
            </p>
          ) : null}
          {error ? (
            <p className="rounded-xl border border-danger/20 bg-danger/10 px-3 py-2 text-[0.72rem] text-danger">
              {error}
            </p>
          ) : null}
        </form>
      </Dialog>

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null)
        }}
        onConfirm={handleDelete}
        title="パスキーを削除"
        description={
          passkeys.length === 1 && !passcodeEnabled
            ? `「${deleteTarget?.label || 'パスキー'}」を削除します。パスコードが未設定のため、削除するとこの台帳はログインなしで開くようになります。`
            : `「${deleteTarget?.label || 'パスキー'}」を削除します。この端末ではパスキーでログインできなくなります。`
        }
        confirmLabel="削除する"
        pending={deleting}
      />
    </>
  )
}
