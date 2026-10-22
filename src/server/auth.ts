import type {
  AuthenticationResponseJSON,
  RegistrationResponseJSON,
} from '@simplewebauthn/server'
import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import {
  checkPasscode,
  clearSessionCookie,
  createSessionToken,
  isAuthenticated,
  isPasscodeEnabled,
  passkeyAuthenticationOptions,
  passkeyCount,
  passkeyRegistrationOptions,
  removePasskey,
  verifyPasskeyAuthentication,
  verifyPasskeyRegistration,
  writeSessionCookie,
} from './auth.server'

type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue }

type JsonObject = { [key: string]: JsonValue }

function errorMessage(cause: unknown) {
  return cause instanceof Error && cause.message
    ? cause.message
    : '認証に失敗しました'
}

export const getAuthState = createServerFn({ method: 'GET' }).handler(
  async () => {
    const passkeys = await passkeyCount()
    const passcodeEnabled = isPasscodeEnabled()
    const required = passcodeEnabled || passkeys > 0
    return {
      required,
      authenticated: required ? await isAuthenticated() : true,
      passcodeEnabled,
      passkeyCount: passkeys,
    }
  },
)

export const login = createServerFn({ method: 'POST' })
  .validator((data: unknown) =>
    z.object({ passcode: z.string().min(1).max(200) }).parse(data),
  )
  .handler(async ({ data }) => {
    if (!isPasscodeEnabled()) {
      return { ok: false as const, error: 'パスコードが設定されていません' }
    }
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

export const getPasskeyRegistrationOptions = createServerFn({
  method: 'POST',
}).handler(async () => {
  try {
    return {
      ok: true as const,
      options: (await passkeyRegistrationOptions()) as unknown as JsonObject,
    }
  } catch (cause) {
    return { ok: false as const, error: errorMessage(cause) }
  }
})

export const registerPasskey = createServerFn({ method: 'POST' })
  .validator((data: unknown) =>
    z
      .object({
        response: z.unknown(),
        label: z.string().trim().max(60).optional().default(''),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    try {
      await verifyPasskeyRegistration(
        data.response as RegistrationResponseJSON,
        data.label,
      )
      return { ok: true as const }
    } catch (cause) {
      return { ok: false as const, error: errorMessage(cause) }
    }
  })

export const getPasskeyAuthenticationOptions = createServerFn({
  method: 'POST',
}).handler(async () => {
  try {
    return {
      ok: true as const,
      options: (await passkeyAuthenticationOptions()) as unknown as JsonObject,
    }
  } catch (cause) {
    return { ok: false as const, error: errorMessage(cause) }
  }
})

export const loginWithPasskey = createServerFn({ method: 'POST' })
  .validator((data: unknown) =>
    z.object({ response: z.unknown() }).parse(data),
  )
  .handler(async ({ data }) => {
    try {
      await verifyPasskeyAuthentication(
        data.response as AuthenticationResponseJSON,
      )
      return { ok: true as const }
    } catch (cause) {
      return { ok: false as const, error: errorMessage(cause) }
    }
  })

export const deletePasskey = createServerFn({ method: 'POST' })
  .validator((data: unknown) =>
    z.object({ id: z.string().min(1).max(200) }).parse(data),
  )
  .handler(async ({ data }) => {
    try {
      await removePasskey(data.id)
      return { ok: true as const }
    } catch (cause) {
      return { ok: false as const, error: errorMessage(cause) }
    }
  })
