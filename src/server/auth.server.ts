import { env } from 'cloudflare:workers'
import {
  deleteCookie,
  getCookie,
  getRequest,
  setCookie,
} from '@tanstack/react-start/server'

/**
 * Optional single-user passcode gate.
 *
 * Set `APP_PASSCODE` (wrangler secret / .dev.vars) to require a login.
 * When it is unset the app stays open, which keeps local development simple.
 */

const COOKIE_NAME = 'als_session'
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30

let cachedPasscode: string | null = null
let cachedKey: Promise<CryptoKey> | null = null

function configuredPasscode() {
  return (env.APP_PASSCODE ?? '').trim()
}

export function isAuthRequired() {
  return configuredPasscode().length > 0
}

function toBase64Url(bytes: Uint8Array) {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

async function hmacKey() {
  const passcode = configuredPasscode()
  if (cachedKey && cachedPasscode === passcode) return cachedKey
  cachedPasscode = passcode
  cachedKey = (async () => {
    const baseKey = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(passcode),
      'PBKDF2',
      false,
      ['deriveKey'],
    )
    return crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: new TextEncoder().encode('asset-life-session-v1'),
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
  if (!isAuthRequired()) return true
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
  if (!expected) return true
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

export function writeSessionCookie(token: string) {
  const url = new URL(getRequest().url)
  setCookie(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_TTL_SECONDS,
    secure: url.protocol === 'https:',
  })
}

export function clearSessionCookie() {
  deleteCookie(COOKIE_NAME, { path: '/' })
}
