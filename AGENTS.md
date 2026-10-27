# AGENTS.md

`README.md` is the setup/deploy/calculation reference; update it when those change.

## Setup and checks

- Use npm; `package-lock.json` is the lockfile. The `pnpm` key in `package.json` is not used by this repo.
- `npm run dev` serves on port 3000 via Vite and the Cloudflare plugin.
- Local dev emulates D1/R2 under `.wrangler/state` (gitignored); remote resources are only needed for deploy.
- Fresh local DB: `npm run db:migrate`; add demo data with `npm run db:seed`, or both via `npm run db:setup`. The seed is idempotent but uses `INSERT OR REPLACE` and overwrites seeded rows, including the singleton settings; do not run it over data you want to keep (`db:seed:remote` included).
- Reset local state: stop dev, delete `.wrangler/state`, then `npm run db:migrate`.
- There is no test runner, lint/format script, or CI. Verify with `npm run typecheck` and `npm run build`.
- Schema change: edit `src/db/schema.ts`, run `npx drizzle-kit generate`, then `npm run db:migrate`. Do not use `drizzle-kit push` for D1; production needs `npm run db:migrate:remote` before deploy.
- `src/routeTree.gen.ts` and `worker-configuration.d.ts` are generated; do not hand-edit. Regenerate with `npm run generate-routes` / `npm run cf-typegen`.

## Architecture and data

- Server-only modules use `.server.ts` and may import `cloudflare:workers`. Browser-rendered code must not import them; use `src/server/queries.ts` for reads and `src/server/actions.ts` for writes. API handlers under `src/routes/api/**` may import them directly.
- `queries.ts` is intentionally thin `createServerFn` wrappers; keep DB access in `db.server.ts`.
- The Worker entry is TanStack Start's `@tanstack/react-start/server-entry`; for normal endpoints add routes under `src/routes/api/**`, not a separate Worker entrypoint.
- CRUD pages read via route loaders and call `router.invalidate()` after mutations.
- Shared/derived metrics belong in `src/lib/finance.ts`; use those helpers rather than re-deriving portfolio, NISA, holding, gear, lens-fund, or ROI values. `README.md`'s 計算の前提 is the domain spec. NISA target, Fujitsu threshold, and lens-fund target are user settings, not constants.
- `src/lib/format.ts` pins the app to JST with UTC-noon date-only helpers. Use `todayDateOnly`, `parseDateOnly`, `toDateOnlyString`, and `formatYen`/`formatPercent`; do not use raw `toISOString().slice(0, 10)` for app date fields.
- D1 access goes through `getDb()` in `src/db/client.server.ts`; schema is `src/db/schema.ts`. `app_settings` and `holding_stock_status` are singletons keyed `default`; read them with `readSettings()`/`readHolding()`.
- Holding data is duplicated: current values in `holding_stock_status`, monthly history in `asset_snapshots.holding_*`. Update schema, migration, actions, snapshot dialog, seed, and finance together.
- Shareholder-benefit goals live in `stock_goals`; they are targets, not assets, so never add them to net worth. CSV import updates matching goals by stock code when `auto_update_from_csv` is enabled. Use `buildStockGoalSummaries` instead of re-deriving pace.
- JIS&T lives in singleton `retirement_accounts` plus `retirement_allocations`; its current balance is also stored per month in `asset_snapshots.pension_balance`. Saving the account updates the latest snapshot’s pension balance, so net worth and the trend stay aligned. Use `buildRetirementSummary` for gain, monthly contribution, and allocation totals.
- Snapshot queries are ascending by `yearMonth`; the latest is `.at(-1)`. Yen totals are integer columns; prices/shares are `real`. Dates are `YYYY-MM-DD`, months `YYYY-MM`.
- Scholarships and loans live in `loans` plus repayment history in `loan_payments`. Their outstanding total is mirrored to `asset_entries` key `loan_balance` and deducted from every snapshot total/net worth; keep the aggregate update in `actions.ts` when loan or payment rows change.
- Net worth includes gear resale and holding carryover; carryover is also a separate portfolio slice. For Fujitsu concentration use `buildCurrentPortfolio`; its ratio is against total assets including cash, carryover, and gear, before liabilities.
- Single-user app; do not add user tables/tenancy without an explicit request.

## Cloudflare and auth

- Bindings: D1 `DB` (`my-capital-db`), R2 `GEAR_IMAGES` (`my-capital-gear`). Read them with `import { env } from 'cloudflare:workers'`, not `process.env`.
- `APP_PASSCODE` is optional. When set, all pages except `/login`, plus the image/upload APIs, require the session cookie. Registered passkeys also require login even when `APP_PASSCODE` is unset. With neither configured, the app is open and `/login` redirects to `/`.
- Passkeys are WebAuthn credentials stored in `auth_passkeys`; challenges live in `auth_challenges`, and the session signing secret in `auth_config`. Auth server functions are in `src/server/auth.ts` with crypto/WebAuthn work in `auth.server.ts`. `isAuthRequired()` and `isAuthenticated()` are async and may query D1.
- The root auth guard protects pages, not API routes. New API routes must check `isAuthenticated()` themselves; see the image/upload routes.
- Local secrets go in `.dev.vars` (copy `.dev.vars.example`). It is read at startup, so restart `npm run dev` after changing `APP_PASSCODE`; unset it (or remove `.dev.vars`) to return to open mode when no passkeys are registered.
- Secrets are not in `wrangler types`; declare them in `src/env.d.ts` (see `APP_PASSCODE`).
- Gear uploads accept JPEG/PNG/WebP up to 8 MB and store keys under `gear/YYYY-MM-DD/`; the image route only serves `gear/` keys.
- `wrangler.jsonc` still has the all-zero `database_id`; local dev works, but remote commands/deploy need the real ID. First deploy: `npx wrangler d1 create my-capital-db`, paste the printed ID, `npx wrangler r2 bucket create my-capital-gear`, `npm run db:migrate:remote`, optionally `npx wrangler secret put APP_PASSCODE`, then `npm run deploy`.

## UI and copy

- Body copy, labels, errors, toasts, empty states, and metadata are Japanese; existing English kickers/brand names (e.g. Overview, AUTHENTICATION, PRIVATE LEDGER) are intentional. Describe data and actions plainly; avoid metaphors, slogans, rhetorical questions, and lifestyle copy.
- Keep `純資産（機材込み）`, `警告ライン`, `買取目安`, `自己投資`. Do not reintroduce `真の純資産`, `安全弁`, `リセール`, or `人的資本`.
- NISA copy uses the configured target, never a hardcoded ¥18M. An empty portfolio shows `データなし`, not `上限内`.
- 不要なセカンダリラベルや説明を避ける。レイアウトに説明させる。
- UI primitives are hand-built in `src/components/ui`; there is no shadcn CLI/Radix layer to regenerate. Tailwind v4 theme tokens live in `src/styles.css`.
- Pair `MoneyInput` with `parseYenInput` for yen fields; it strips separators and rounds to yen.
- Wrap Recharts in `ClientChart` (`src/components/charts/client-chart.tsx`); it waits for hydration so SSR does not measure a zero-width container.
- Check 390px and 1440px for horizontal overflow. `.qa/` is gitignored local browser-QA output; its Playwright scripts are not installed by `npm install` and are not a test suite.
