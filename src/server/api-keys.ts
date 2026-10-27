import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { hashApiKey } from './balances.server'
import { isAuthenticated } from './auth.server'
import { deleteApiKeyById, insertApiKey } from './db.server'

const API_KEY_PREFIX = 'als_'

function toBase64Url(bytes: Uint8Array) {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function createApiKeySecret() {
  return `${API_KEY_PREFIX}${toBase64Url(
    crypto.getRandomValues(new Uint8Array(32)),
  )}`
}

async function requireApiKeyAccess() {
  if (!(await isAuthenticated())) {
    throw new Error('ログインしてからAPIキーを管理してください')
  }
}

export const createApiKey = createServerFn({ method: 'POST' })
  .validator((data: unknown) =>
    z
      .object({
        name: z.string().trim().min(1, '名前を入力してください').max(60),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    await requireApiKeyAccess()
    const secret = createApiKeySecret()
    const createdAt = new Date().toISOString()
    const id = crypto.randomUUID()
    await insertApiKey({
      id,
      name: data.name,
      keyHash: await hashApiKey(secret),
      keyPrefix: secret.slice(0, 12),
      createdAt,
    })
    return {
      ok: true as const,
      apiKey: {
        id,
        name: data.name,
        keyPrefix: secret.slice(0, 12),
        createdAt,
        lastUsedAt: null,
      },
      secret,
    }
  })

export const revokeApiKey = createServerFn({ method: 'POST' })
  .validator((data: unknown) =>
    z.object({ id: z.string().min(1).max(200) }).parse(data),
  )
  .handler(async ({ data }) => {
    await requireApiKeyAccess()
    await deleteApiKeyById(data.id)
    return { ok: true as const }
  })
