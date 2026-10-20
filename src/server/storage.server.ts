import { env } from 'cloudflare:workers'

/** Best-effort R2 cleanup. Server-only. */
export async function removeImage(key: string | null | undefined) {
  if (!key || !key.startsWith('gear/')) return
  try {
    await env.GEAR_IMAGES.delete(key)
  } catch {
    // Image cleanup is best-effort; never block deleting the record.
  }
}
