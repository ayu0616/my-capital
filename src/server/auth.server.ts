import { env } from 'cloudflare:workers'
import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
  type AuthenticationResponseJSON,
  type RegistrationResponseJSON,
  type WebAuthnCredential,
} from '@simplewebauthn/server'
import {
  deleteCookie,
  getCookie,
  getRequest,
  setCookie,
} from '@tanstack/react-start/server'
import {
  consumeAuthChallenge,
  countPasskeys,
  createAuthSessionSecret,
  deletePasskey,
  insertPasskey,
  readAuthSessionSecret,
  readPasskeyByCredentialId,
  readPasskeys,
  saveAuthChallenge,
  updatePasskeyUsage,
} from './db.server'

/**
 * Optional single-user authentication.
 *
 * `APP_PASSCODE` (wrangler secret / .dev.vars) enables password-style login.
 * Passkeys registered from settings also enable the login gate, even when
 * `APP_PASSCODE` is unset. When neither is configured the app stays open,
 * which keeps local development simple.
 */

const COOKIE_NAME = 'als_session'
const CHALLENGE_COOKIE = 'als_webauthn'
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30
const CHALLENGE_TTL_SECONDS = 60 * 5
const SESSION_SALT = 'asset-life-session-v2'
const RP_NAME = 'Asset & Life Studio'

let cachedSessionSecret: string | null = null
let cachedKey: Promise<CryptoKey> | null = null
let cachedKeyMaterial: string | null = null

function configuredPasscode() {
  return (env.APP_PASSCODE ?? '').trim()
}

export function isPasscodeEnabled() {
  return configuredPasscode().length > 0
}

export async function passkeyCount() {
  try {
    return await countPasskeys()
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : String(cause)
    if (/no such table/i.test(message)) return 0
    throw cause
  }
}

export async function isAuthRequired() {
  if (isPasscodeEnabled()) return true
  return (await passkeyCount()) > 0
}

function toBase64Url(bytes: Uint8Array) {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function fromBase64Url(value: string) {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/')
  const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=')
  const binary = atob(padded)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes
}

function parseTransports(value: string) {
  return value
    .split(',')
    .map((transport) => transport.trim())
    .filter(Boolean)
}

async function sessionSecret() {
  if (cachedSessionSecret) return cachedSessionSecret
  let stored: string | null = null
  try {
    stored = await readAuthSessionSecret()
  } catch (cause) {
    if (isPasscodeEnabled()) return configuredPasscode()
    throw cause
  }
  if (stored) {
    cachedSessionSecret = stored
    return stored
  }
  const secret = toBase64Url(crypto.getRandomValues(new Uint8Array(32)))
  cachedSessionSecret = await createAuthSessionSecret(secret)
  return cachedSessionSecret
}

async function hmacKey() {
  const material = `${await sessionSecret()}:${configuredPasscode()}`
  if (cachedKey && cachedKeyMaterial === material) return cachedKey
  cachedKeyMaterial = material
  cachedKey = (async () => {
    const baseKey = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(material),
      'PBKDF2',
      false,
      ['deriveKey'],
    )
    return crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: new TextEncoder().encode(SESSION_SALT),
        iterations: 100_000,
        hash: 'SHA-256',
      },
      baseKey,
      { name: 'HMAC', hash: 'SHA-256', length: 256 },
      false,
      ['sign', 'verify'],
    )
  })()
  return cachedKey
}

async function sign(payload: string) {
  const key = await hmacKey()
  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(payload),
  )
  return toBase64Url(new Uint8Array(signature))
}

export async function createSessionToken() {
  const expiresAt = Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS
  const payload = `v1.${expiresAt}`
  return `${payload}.${await sign(payload)}`
}

export async function verifySessionToken(token: string | undefined) {
  if (!token) return false
  const parts = token.split('.')
  if (parts.length !== 3 || parts[0] !== 'v1') return false
  const expiresAt = Number(parts[1])
  if (!Number.isFinite(expiresAt) || expiresAt < Math.floor(Date.now() / 1000)) {
    return false
  }
  const expected = await sign(`v1.${expiresAt}`)
  const actual = parts[2]
  if (actual.length !== expected.length) return false
  let diff = 0
  for (let i = 0; i < actual.length; i += 1) {
    diff |= actual.charCodeAt(i) ^ expected.charCodeAt(i)
  }
  return diff === 0
}

export async function isAuthenticated() {
  if (!(await isAuthRequired())) return true
  return verifySessionToken(getCookie(COOKIE_NAME))
}

async function digest(value: string) {
  const hash = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(value),
  )
  return new Uint8Array(hash)
}

export async function checkPasscode(input: string) {
  const expected = configuredPasscode()
  if (!expected) return false
  if (input.length === 0 || input.length > 200) return false
  const [actualHash, expectedHash] = await Promise.all([
    digest(input),
    digest(expected),
  ])
  let diff = 0
  for (let i = 0; i < actualHash.length; i += 1) {
    diff |= actualHash[i] ^ expectedHash[i]
  }
  return diff === 0
}

function cookieOptions(maxAge: number) {
  const url = new URL(getRequest().url)
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    path: '/',
    maxAge,
    secure: url.protocol === 'https:',
  }
}

export function writeSessionCookie(token: string) {
  setCookie(COOKIE_NAME, token, cookieOptions(SESSION_TTL_SECONDS))
}

export function clearSessionCookie() {
  deleteCookie(COOKIE_NAME, { path: '/' })
}

function writeChallengeCookie(challenge: string) {
  setCookie(CHALLENGE_COOKIE, challenge, cookieOptions(CHALLENGE_TTL_SECONDS))
}

function clearChallengeCookie() {
  deleteCookie(CHALLENGE_COOKIE, { path: '/' })
}

async function startChallenge(
  challenge: string,
  kind: 'registration' | 'authentication',
) {
  await saveAuthChallenge(challenge, kind, CHALLENGE_TTL_SECONDS)
  writeChallengeCookie(challenge)
}

async function takeChallenge(kind: 'registration' | 'authentication') {
  const challenge = getCookie(CHALLENGE_COOKIE)
  clearChallengeCookie()
  if (!challenge) return null
  return consumeAuthChallenge(challenge, kind)
}

function relyingParty() {
  const url = new URL(getRequest().url)
  return { rpID: url.hostname, origin: url.origin }
}

async function requireRegistrationAccess() {
  if (!(await isAuthRequired())) return
  if (!(await isAuthenticated())) {
    throw new Error('ログインしてからパスキーを追加してください')
  }
}

export async function passkeyRegistrationOptions() {
  await requireRegistrationAccess()
  const passkeys = await readPasskeys()
  const { rpID } = relyingParty()
  const options = await generateRegistrationOptions({
    rpName: RP_NAME,
    rpID,
    userID: new TextEncoder().encode('asset-life-studio-default'),
    userName: 'asset-life-studio',
    userDisplayName: RP_NAME,
    attestationType: 'none',
    excludeCredentials: passkeys.map((passkey) => ({
      id: passkey.credentialId,
      transports: parseTransports(passkey.transports),
    })),
    authenticatorSelection: {
      residentKey: 'preferred',
      userVerification: 'required',
    },
  })
  await startChallenge(options.challenge, 'registration')
  return options
}

export async function verifyPasskeyRegistration(
  response: RegistrationResponseJSON,
  label: string,
) {
  const challenge = await takeChallenge('registration')
  if (!challenge) {
    throw new Error('パスキーの登録を開始できませんでした。もう一度お試しください')
  }
  const { rpID, origin } = relyingParty()
  const verification = await verifyRegistrationResponse({
    response,
    expectedChallenge: challenge.challenge,
    expectedOrigin: origin,
    expectedRPID: rpID,
    requireUserVerification: true,
  })
  if (!verification.verified || !verification.registrationInfo) {
    throw new Error('パスキーを確認できませんでした')
  }

  const { credential } = verification.registrationInfo
  const existing = await readPasskeyByCredentialId(credential.id)
  if (existing) {
    throw new Error('このパスキーはすでに登録されています')
  }

  const trimmedLabel = label.trim().slice(0, 60)
  await insertPasskey({
    id: crypto.randomUUID(),
    credentialId: credential.id,
    publicKey: toBase64Url(credential.publicKey),
    counter: credential.counter,
    transports: (credential.transports ?? []).join(','),
    label: trimmedLabel || 'パスキー',
    createdAt: new Date().toISOString(),
  })
  writeSessionCookie(await createSessionToken())
  return { ok: true as const }
}

export async function passkeyAuthenticationOptions() {
  const passkeys = await readPasskeys()
  if (passkeys.length === 0) {
    throw new Error('パスキーが登録されていません')
  }
  const { rpID } = relyingParty()
  const options = await generateAuthenticationOptions({
    rpID,
    allowCredentials: passkeys.map((passkey) => ({
      id: passkey.credentialId,
      transports: parseTransports(passkey.transports),
    })),
    userVerification: 'required',
  })
  await startChallenge(options.challenge, 'authentication')
  return options
}

export async function verifyPasskeyAuthentication(
  response: AuthenticationResponseJSON,
) {
  const challenge = await takeChallenge('authentication')
  if (!challenge) {
    throw new Error('ログインを開始できませんでした。もう一度お試しください')
  }
  const stored = await readPasskeyByCredentialId(response.id)
  if (!stored) {
    throw new Error('このパスキーは登録されていません')
  }
  const credential: WebAuthnCredential = {
    id: stored.credentialId,
    publicKey: fromBase64Url(stored.publicKey),
    counter: stored.counter,
    transports: parseTransports(stored.transports),
  }
  const { rpID, origin } = relyingParty()
  const verification = await verifyAuthenticationResponse({
    response,
    expectedChallenge: challenge.challenge,
    expectedOrigin: origin,
    expectedRPID: rpID,
    credential,
    requireUserVerification: true,
  })
  if (!verification.verified) {
    throw new Error('パスキーを確認できませんでした')
  }
  await updatePasskeyUsage(
    stored.id,
    verification.authenticationInfo.newCounter,
  )
  writeSessionCookie(await createSessionToken())
  return { ok: true as const }
}

export async function removePasskey(id: string) {
  if (!(await isAuthenticated())) {
    throw new Error('ログインが必要です')
  }
  await deletePasskey(id)
  return { ok: true as const }
}
