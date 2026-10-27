import { createFileRoute } from '@tanstack/react-router'
import {
  authenticateApiKey,
  balanceBatchInput,
  BalanceApiError,
  recordBalanceBatch,
} from '../../server/balances.server'

export const Route = createFileRoute('/api/balances')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const apiKey = await authenticateApiKey(request)
        if (!apiKey) {
          return Response.json(
            { error: '有効なAPIキーを指定してください' },
            {
              status: 401,
              headers: { 'WWW-Authenticate': 'Bearer' },
            },
          )
        }

        let body: unknown
        try {
          body = await request.json()
        } catch {
          return Response.json(
            { error: 'JSONの本文を読み取れませんでした' },
            { status: 400 },
          )
        }

        const parsed = balanceBatchInput.safeParse(body)
        if (!parsed.success) {
          return Response.json(
            {
              error: '入力内容が正しくありません',
              issues: parsed.error.issues.map((issue) => ({
                path: issue.path.join('.'),
                message: issue.message,
              })),
            },
            { status: 400 },
          )
        }

        try {
          const result = await recordBalanceBatch(
            parsed.data,
            apiKey.name || apiKey.keyPrefix,
          )
          return Response.json(result)
        } catch (cause) {
          if (cause instanceof BalanceApiError) {
            return Response.json(
              { error: cause.message },
              { status: cause.status },
            )
          }
          throw cause
        }
      },
    },
  },
})
