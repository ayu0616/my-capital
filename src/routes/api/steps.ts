import { createFileRoute } from '@tanstack/react-router'
import { authenticateApiKey } from '../../server/balances.server'
import { recordStepBatch, stepSyncInput } from '../../server/steps.server'

export const Route = createFileRoute('/api/steps')({
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

        const parsed = stepSyncInput.safeParse(body)
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

        const result = await recordStepBatch(parsed.data)
        return Response.json(result)
      },
    },
  },
})
