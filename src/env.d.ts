/**
 * Runtime configuration provided as a Wrangler secret rather than a static var,
 * so it does not appear in the generated `wrangler types` output.
 *
 * Set with: npx wrangler secret put APP_PASSCODE
 * Local dev:  add APP_PASSCODE=... to .dev.vars
 */
export {}

declare global {
  namespace Cloudflare {
    interface Env {
      APP_PASSCODE?: string
    }
  }
}
