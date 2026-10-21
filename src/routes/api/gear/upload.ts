import { createFileRoute } from '@tanstack/react-router'
import { env } from 'cloudflare:workers'
import { isAuthenticated } from '../../../server/auth.server'

const MAX_BYTES = 8 * 1024 * 1024
const ALLOWED_TYPES = new Set(['image/webp', 'image/jpeg', 'image/png'])

export const Route = createFileRoute('/api/gear/upload')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (!(await isAuthenticated())) {
          return new Response('Unauthorized', { status: 401 })
        }
        const formData = await request.formData()
        const file = formData.get('file')

        if (!(file instanceof File)) {
          return new Response('画像ファイルを選択してください', { status: 400 })
        }
        if (!ALLOWED_TYPES.has(file.type)) {
          return new Response('対応していない画像形式です', { status: 415 })
        }
        if (file.size > MAX_BYTES) {
          return new Response('画像が大きすぎます（8MBまで）', { status: 413 })
        }

        const extension =
          file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg'
        const key = `gear/${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID()}.${extension}`

        await env.GEAR_IMAGES.put(key, file.stream(), {
          httpMetadata: {
            contentType: file.type,
            cacheControl: 'public, max-age=31536000, immutable',
          },
        })

        return Response.json({ key })
      },
    },
  },
})
