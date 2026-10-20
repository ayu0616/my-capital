import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import {
  checkPasscode,
  clearSessionCookie,
  createSessionToken,
  isAuthRequired,
  isAuthenticated,
  writeSessionCookie,
} from './auth.server'

export const getAuthState = createServerFn({ method: 'GET' }).handler(
  async () => {
    const required = isAuthRequired()
    return {
      required,
      authenticated: required ? await isAuthenticated() : true,
    }
  },
)

export const login = createServerFn({ method: 'POST' })
  .validator((data: unknown) =>
    z.object({ passcode: z.string().min(1).max(200) }).parse(data),
  )
  .handler(async ({ data }) => {
    if (!isAuthRequired()) return { ok: true as const }
    if (!(await checkPasscode(data.passcode))) {
      return { ok: false as const, error: 'パスコードが正しくありません' }
    }
    writeSessionCookie(await createSessionToken())
    return { ok: true as const }
  })

export const logout = createServerFn({ method: 'POST' }).handler(async () => {
  clearSessionCookie()
  return { ok: true as const }
})
