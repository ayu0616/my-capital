import {
  Check,
  Copy,
  ExternalLink,
  KeyRound,
  Loader2,
  Plus,
  Trash2,
} from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import type { ApiKey } from '../../db/schema'
import { formatDateJa } from '../../lib/format'
import { createApiKey, revokeApiKey } from '../../server/api-keys'
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

type ApiKeySummary = Pick<
  ApiKey,
  'id' | 'name' | 'keyPrefix' | 'createdAt' | 'lastUsedAt'
>

export function ApiKeysCard({
  apiKeys,
  onChanged,
  className,
}: {
  apiKeys: ApiKeySummary[]
  onChanged: () => void
  className?: string
}) {
  const [createOpen, setCreateOpen] = useState(false)
  const [name, setName] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [issued, setIssued] = useState<{ name: string; secret: string } | null>(
    null,
  )
  const [copied, setCopied] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<ApiKeySummary | null>(null)
  const [deleting, setDeleting] = useState(false)

  function openCreateDialog() {
    setName('')
    setError(null)
    setCreateOpen(true)
  }

  async function handleCreate(event: React.FormEvent) {
    event.preventDefault()
    if (!name.trim()) {
      setError('名前を入力してください')
      return
    }
    setPending(true)
    setError(null)
    try {
      const result = await createApiKey({ data: { name: name.trim() } })
      setCreateOpen(false)
      setCopied(false)
      setIssued({ name: result.apiKey.name, secret: result.secret })
      onChanged()
      toast.success('APIキーを発行しました')
    } catch (cause) {
      const message =
        cause instanceof Error ? cause.message : 'APIキーを発行できませんでした'
      setError(message)
      toast.error(message)
    } finally {
      setPending(false)
    }
  }

  async function copySecret() {
    if (!issued) return
    try {
      await navigator.clipboard.writeText(issued.secret)
      setCopied(true)
      toast.success('APIキーをコピーしました')
    } catch {
      toast.error('クリップボードにコピーできませんでした')
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await revokeApiKey({ data: { id: deleteTarget.id } })
      toast.success('APIキーを無効にしました')
      setDeleteTarget(null)
      onChanged()
    } catch (cause) {
      toast.error(
        cause instanceof Error ? cause.message : 'APIキーを無効にできませんでした',
      )
    } finally {
      setDeleting(false)
    }
  }

  return (
    <>
      <Card className={className}>
        <CardHeader>
          <div>
            <CardKicker>API access</CardKicker>
            <CardTitle className="mt-1.5">APIキー</CardTitle>
          </div>
          <KeyRound className="size-4 text-gold" />
        </CardHeader>
        <CardContent>
          <p className="text-xs leading-relaxed text-muted">
            外部のバッチから資産・負債の残高を記録するためのAPIキーです。キーは発行時に一度だけ表示されます。
          </p>
          <a
            href="/openapi.json"
            target="_blank"
            rel="noreferrer"
            className="mt-2 inline-flex items-center gap-1 text-[0.68rem] font-semibold text-brand underline decoration-brand/25 underline-offset-2"
          >
            OpenAPI仕様を開く
            <ExternalLink className="size-3" />
          </a>

          {apiKeys.length === 0 ? (
            <EmptyState
              icon={KeyRound}
              title="APIキーは未発行です"
              description="発行すると、残高記録APIを外部から呼び出せます。"
              className="mt-4 py-8"
            />
          ) : (
            <ul className="mt-4 space-y-2">
              {apiKeys.map((apiKey) => (
                <li
                  key={apiKey.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-line/80 px-3.5 py-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-[0.72rem] font-semibold text-ink">
                      {apiKey.name}
                    </p>
                    <p className="mt-0.5 font-mono text-[0.58rem] text-muted">
                      {apiKey.keyPrefix}…
                    </p>
                    <p className="mt-0.5 text-[0.58rem] text-muted">
                      発行: {formatDateJa(apiKey.createdAt)}
                      {apiKey.lastUsedAt
                        ? ` ・ 最終使用: ${formatDateJa(apiKey.lastUsedAt)}`
                        : ''}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`${apiKey.name}を無効にする`}
                    onClick={() => setDeleteTarget(apiKey)}
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
            onClick={openCreateDialog}
          >
            <Plus className="size-3.5" />
            APIキーを発行
          </Button>
        </CardContent>
      </Card>

      <Dialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        title="APIキーを発行"
        description="用途が分かる名前を付けます。キーは発行後に一度だけ表示されます。"
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              キャンセル
            </Button>
            <Button
              type="submit"
              form="api-key-create-form"
              disabled={pending}
            >
              {pending ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" />
                  発行中…
                </>
              ) : (
                '発行する'
              )}
            </Button>
          </>
        }
      >
        <form
          id="api-key-create-form"
          onSubmit={handleCreate}
          className="space-y-4"
        >
          <Field
            label="名前"
            htmlFor="api-key-name"
            hint="例: 銀行残高の日次バッチ"
          >
            <Input
              id="api-key-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={60}
              placeholder="銀行残高の日次バッチ"
              autoFocus
            />
          </Field>
          {error ? (
            <p className="rounded-xl border border-danger/20 bg-danger/10 px-3 py-2 text-[0.72rem] text-danger">
              {error}
            </p>
          ) : null}
        </form>
      </Dialog>

      <Dialog
        open={issued !== null}
        onOpenChange={(open) => {
          if (!open) setIssued(null)
        }}
        title="APIキーを発行しました"
        description="このキーは再表示できません。安全な場所に保存してください。"
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setIssued(null)}>
              閉じる
            </Button>
            <Button onClick={copySecret}>
              {copied ? (
                <Check className="size-3.5" />
              ) : (
                <Copy className="size-3.5" />
              )}
              {copied ? 'コピーしました' : 'コピーする'}
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <p className="text-[0.7rem] font-semibold text-ink">
            {issued?.name}
          </p>
          <pre className="overflow-x-auto rounded-xl border border-line bg-[#0f1c16] px-3.5 py-3 text-[0.66rem] leading-relaxed text-[#cfe3d7]">
            <code className="select-all">{issued?.secret}</code>
          </pre>
          <p className="text-[0.62rem] leading-relaxed text-muted">
            Authorizationヘッダーに
            <code className="mx-1 rounded bg-canvas px-1 py-0.5 text-[0.6rem] text-ink">
              Bearer &lt;APIキー&gt;
            </code>
            を指定するか、X-API-Keyヘッダーにキーを設定してください。
          </p>
        </div>
      </Dialog>

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null)
        }}
        onConfirm={handleDelete}
        title="APIキーを無効にしますか？"
        description={
          deleteTarget
            ? `「${deleteTarget.name}」を使っているバッチは、すぐに残高を記録できなくなります。`
            : ''
        }
        confirmLabel="無効にする"
        pending={deleting}
      />
    </>
  )
}
