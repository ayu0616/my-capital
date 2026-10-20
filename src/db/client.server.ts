import { env } from 'cloudflare:workers'
import { drizzle } from 'drizzle-orm/d1'
import * as schema from './schema'

/**
 * D1 + Drizzle client. Call inside server functions / server routes only.
 * The binding is declared in wrangler.jsonc and typed via `wrangler types`.
 */
export function getDb() {
  return drizzle(env.DB, { schema })
}

export type Database = ReturnType<typeof getDb>
