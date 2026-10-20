import {
  index,
  integer,
  real,
  sqliteTable,
  text,
} from 'drizzle-orm/sqlite-core'

/**
 * Asset & Life Studio — D1 schema
 *
 * All amounts are stored in Japanese yen (integer) unless noted.
 * The app is single-user today, but every table is shaped so a
 * `user_id` column can be added later for multi-tenant use.
 */

/* -------------------------------------------------------------------------- */
/*  App settings (singleton)                                                   */
/* -------------------------------------------------------------------------- */

export const appSettings = sqliteTable('app_settings', {
  id: text('id').primaryKey(), // fixed: 'default'
  nickname: text('nickname').notNull().default(''),
  birthDate: text('birth_date').notNull().default('1997-02-18'), // YYYY-MM-DD
  nisaTargetAmount: integer('nisa_target_amount').notNull().default(18_000_000),
  nisaTargetAge: integer('nisa_target_age').notNull().default(35),
  fujitsuAlertThreshold: real('fujitsu_alert_threshold').notNull().default(0.15),
  gearFundTarget: integer('gear_fund_target').notNull().default(150_000),
  gearFundSaved: integer('gear_fund_saved').notNull().default(0),
  updatedAt: text('updated_at').notNull(),
})

/* -------------------------------------------------------------------------- */
/*  Holding association (Fujitsu / employee stock purchase plan)              */
/* -------------------------------------------------------------------------- */

export const holdingStockStatus = sqliteTable('holding_stock_status', {
  id: text('id').primaryKey(), // fixed: 'default'
  monthlyContribution: integer('monthly_contribution').notNull().default(33_000),
  companyIncentiveRate: real('company_incentive_rate').notNull().default(0.15),
  currentAccumulatedShares: real('current_accumulated_shares').notNull().default(0),
  latestStockPrice: real('latest_stock_price').notNull().default(0),
  targetShares: integer('target_shares').notNull().default(100),
  updatedAt: text('updated_at').notNull(),
})

/* -------------------------------------------------------------------------- */
/*  Monthly asset snapshots                                                    */
/* -------------------------------------------------------------------------- */

export const assetSnapshots = sqliteTable(
  'asset_snapshots',
  {
    id: text('id').primaryKey(),
    yearMonth: text('year_month').notNull().unique(), // '2026-10'
    cashAmount: integer('cash_amount').notNull(), // 現預金
    nisaOrkanAmount: integer('nisa_orkan_amount').notNull(), // オルカン時価
    nisaSp500Amount: integer('nisa_sp500_amount').notNull(), // S&P500 時価
    nisaContributedPrincipal: integer('nisa_contributed_principal').notNull(), // NISA 累計元本
    fujitsuRomanStockShares: real('fujitsu_roman_stock_shares').notNull().default(0), // NISA ロマン枠
    holdingStockShares: real('holding_stock_shares').notNull().default(0), // 持株会の保有株数
    fujitsuCurrentPrice: real('fujitsu_current_price').notNull(), // 基準株価
    gearResaleAmount: integer('gear_resale_amount').notNull().default(0), // 機材残存価値
    notes: text('notes'),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (table) => [index('asset_snapshots_year_month_idx').on(table.yearMonth)],
)

/* -------------------------------------------------------------------------- */
/*  Camera gear ledger                                                         */
/* -------------------------------------------------------------------------- */

export const cameraGears = sqliteTable('camera_gears', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  category: text('category').notNull(), // 'body' | 'lens' | 'accessory'
  purchasedAt: text('purchased_at').notNull(), // YYYY-MM-DD
  purchasePrice: integer('purchase_price').notNull().default(0),
  resaleValue: integer('resale_value').notNull().default(0),
  imageKey: text('image_key'), // R2 object key
  notes: text('notes'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
})

/* -------------------------------------------------------------------------- */
/*  Self investment & human capital                                            */
/* -------------------------------------------------------------------------- */

export const selfInvestments = sqliteTable('self_investments', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  category: text('category').notNull(), // 'cert' | 'udemy' | 'book' | 'other'
  cost: integer('cost').notNull().default(0),
  completedAt: text('completed_at').notNull(), // YYYY-MM-DD
  notes: text('notes'),
  createdAt: text('created_at').notNull(),
})

export const careerEvents = sqliteTable('career_events', {
  id: text('id').primaryKey(),
  occurredAt: text('occurred_at').notNull(),
  title: text('title').notNull(), // 例: 昇格 Lv7 → Lv8
  annualIncomeIncrease: integer('annual_income_increase').notNull().default(0),
  notes: text('notes'),
  createdAt: text('created_at').notNull(),
})

/* -------------------------------------------------------------------------- */
/*  Inferred types                                                             */
/* -------------------------------------------------------------------------- */

export type AppSettings = typeof appSettings.$inferSelect
export type HoldingStockStatus = typeof holdingStockStatus.$inferSelect
export type AssetSnapshot = typeof assetSnapshots.$inferSelect
export type CameraGear = typeof cameraGears.$inferSelect
export type SelfInvestment = typeof selfInvestments.$inferSelect
export type CareerEvent = typeof careerEvents.$inferSelect
