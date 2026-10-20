import { createFileRoute } from '@tanstack/react-router'
import { env } from 'cloudflare:workers'
import {
  isAuthRequired,
  isAuthenticated,
} from '../../../server/auth.server'

export const Route = createFileRoute('/api/images/$')({
  server: {
    handlers: {
      GET: async ({ params }) => {
        if (!(await isAuthenticated())) {
          return new Response('Unauthorized', { status: 401 })
        }
        const key = params._splat
        if (!key || !key.startsWith('gear/')) {
          return new Response('Not found', { status: 404 })
        }

        const object = await env.GEAR_IMAGES.get(key)
        if (!object) return new Response('Not found', { status: 404 })

        const headers = new Headers()
        object.writeHttpMetadata(headers)
        headers.set('etag', object.httpEtag)
        headers.set(
          'cache-control',
          isAuthRequired()
            ? 'private, max-age=3600'
            : 'public, max-age=31536000, immutable',
        )
        headers.set('x-content-type-options', 'nosniff')

        return new Response(object.body, { headers })
      },
    },
  },
})
