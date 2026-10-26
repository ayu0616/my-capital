import {
  index,
  integer,
  real,
  sqliteTable,
  text,
  uniqueIndex,
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
/*  Authentication                                                            */
/* -------------------------------------------------------------------------- */

/**
 * パスキー（WebAuthn）の資格情報。単一ユーザーなので user_id は持たない。
 * credential_id と公開鍵は base64url 文字列で保存する。
 */
export const authPasskeys = sqliteTable(
  'auth_passkeys',
  {
    id: text('id').primaryKey(),
    credentialId: text('credential_id').notNull().unique(),
    publicKey: text('public_key').notNull(),
    counter: integer('counter').notNull().default(0),
    transports: text('transports').notNull().default(''), // カンマ区切り
    label: text('label').notNull().default(''),
    createdAt: text('created_at').notNull(),
    lastUsedAt: text('last_used_at'),
  },
  (table) => [index('auth_passkeys_created_idx').on(table.createdAt)],
)

/**
 * セッション署名に使うサーバー側の秘密。
 * APP_PASSCODE を使わないパスキーのみの運用でも、推測できない秘密を保つ。
 */
export const authConfig = sqliteTable('auth_config', {
  id: text('id').primaryKey(), // fixed: 'default'
  sessionSecret: text('session_secret').notNull(),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
})

/**
 * WebAuthn のチャレンジ。検証時に一度だけ消費する。
 */
export const authChallenges = sqliteTable(
  'auth_challenges',
  {
    challenge: text('challenge').primaryKey(),
    kind: text('kind').notNull(), // 'registration' | 'authentication'
    expiresAt: text('expires_at').notNull(), // ISO 8601
    createdAt: text('created_at').notNull(),
  },
  (table) => [index('auth_challenges_expires_idx').on(table.expiresAt)],
)

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
  recordedAt: text('recorded_at').notNull().default(''), // 会社ページの記録日 YYYY-MM-DD
  averageAcquisitionPrice: real('average_acquisition_price').notNull().default(0), // 平均取得単価
  carryoverAmount: integer('carryover_amount').notNull().default(0), // 繰越金
  updatedAt: text('updated_at').notNull(),
})

/**
 * 持株会から証券口座へ引き出した履歴。
 * 引出し時に持株会の現在株数を減らし、この履歴に移動した株数を残す。
 */
export const holdingWithdrawals = sqliteTable(
  'holding_withdrawals',
  {
    id: text('id').primaryKey(),
    withdrawnAt: text('withdrawn_at').notNull(), // YYYY-MM-DD
    shares: real('shares').notNull().default(0),
    averageAcquisitionPrice: real('average_acquisition_price').notNull().default(0),
    stockPrice: real('stock_price').notNull().default(0),
    destination: text('destination').notNull().default('SMBC日興証券'),
    notes: text('notes'),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (table) => [
    index('holding_withdrawals_withdrawn_at_idx').on(table.withdrawnAt),
  ],
)

/* -------------------------------------------------------------------------- */
/*  Shareholder-benefit stock goals                                            */
/* -------------------------------------------------------------------------- */

/**
 * 優待目的で集めている個別株の目標。
 * 現在株数は手入力のほか、楽天証券CSVの銘柄コード一致で更新できる。
 */
export const stockGoals = sqliteTable(
  'stock_goals',
  {
    id: text('id').primaryKey(),
    code: text('code').notNull().default(''), // 証券コード。CSV照合に使う
    name: text('name').notNull(),
    account: text('account').notNull().default('楽天証券'),
    targetShares: real('target_shares').notNull().default(100),
    currentShares: real('current_shares').notNull().default(0),
    targetDate: text('target_date').notNull(), // YYYY-MM-DD
    minimumPurchaseUnit: integer('minimum_purchase_unit').notNull().default(1),
    averageAcquisitionPrice: real('average_acquisition_price').notNull().default(0),
    currentPrice: real('current_price').notNull().default(0),
    monthlyBudget: integer('monthly_budget').notNull().default(0),
    benefitNote: text('benefit_note').notNull().default(''),
    notes: text('notes'),
    autoUpdateFromCsv: integer('auto_update_from_csv').notNull().default(1),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (table) => [
    index('stock_goals_code_idx').on(table.code),
    index('stock_goals_target_date_idx').on(table.targetDate),
  ],
)

/* -------------------------------------------------------------------------- */
/*  Defined-contribution pension (JIS&T)                                       */
/* -------------------------------------------------------------------------- */

export const retirementAccounts = sqliteTable('retirement_accounts', {
  id: text('id').primaryKey(), // fixed: 'default'
  provider: text('provider').notNull().default('JIS&T'),
  schemeName: text('scheme_name').notNull().default('会社型確定拠出年金'),
  balance: integer('balance').notNull().default(0), // 評価額
  totalContributed: integer('total_contributed').notNull().default(0), // 累計拠出額
  monthlyContribution: integer('monthly_contribution').notNull().default(0), // 本人の月額拠出
  employerContribution: integer('employer_contribution').notNull().default(0), // 会社の月額拠出
  valuedAt: text('valued_at').notNull().default(''), // 評価日 YYYY-MM-DD
  notes: text('notes'),
  updatedAt: text('updated_at').notNull(),
})

export const retirementAllocations = sqliteTable(
  'retirement_allocations',
  {
    id: text('id').primaryKey(),
    accountId: text('account_id').notNull().default('default'),
    label: text('label').notNull(),
    ratio: real('ratio').notNull().default(0), // 0-100
    sortOrder: integer('sort_order').notNull().default(0),
  },
  (table) => [
    index('retirement_allocations_account_idx').on(table.accountId),
  ],
)

/* -------------------------------------------------------------------------- */
/*  Financial accounts (metadata)                                              */
/* -------------------------------------------------------------------------- */

/**
 * 口座の役割を整理するためのメタデータ。残高そのものは
 * asset_snapshots と持株会・証券インポート側で管理する。
 */
export const financialAccounts = sqliteTable('financial_accounts', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  institution: text('institution').notNull(),
  kind: text('kind').notNull(), // 'brokerage' | 'bank' | 'pension'
  role: text('role').notNull().default(''),
  notes: text('notes'),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
})

/* -------------------------------------------------------------------------- */
/*  Securities holdings imported from a brokerage CSV                          */
/* -------------------------------------------------------------------------- */

export const securitiesImportBatches = sqliteTable(
  'securities_import_batches',
  {
    id: text('id').primaryKey(),
    asOfDate: text('as_of_date').notNull(), // YYYY-MM-DD
    account: text('account').notNull().default('楽天証券'),
    fileName: text('file_name').notNull().default(''),
    totalValue: integer('total_value').notNull().default(0),
    productValue: integer('product_value').notNull().default(0),
    cashValue: integer('cash_value').notNull().default(0),
    stockValue: integer('stock_value').notNull().default(0),
    fundValue: integer('fund_value').notNull().default(0),
    otherValue: integer('other_value').notNull().default(0),
    fujitsuValue: integer('fujitsu_value').notNull().default(0),
    holdingCount: integer('holding_count').notNull().default(0),
    importedAt: text('imported_at').notNull(),
  },
  (table) => [
    index('securities_import_batches_as_of_idx').on(table.asOfDate),
  ],
)

export const securitiesHoldings = sqliteTable(
  'securities_holdings',
  {
    id: text('id').primaryKey(),
    batchId: text('batch_id').notNull(),
    asOfDate: text('as_of_date').notNull(), // YYYY-MM-DD
    account: text('account').notNull().default('楽天証券'),
    category: text('category').notNull(), // 'stock' | 'fund' | 'other'
    type: text('type').notNull(), // 国内株式、投資信託などCSVの種別
    code: text('code').notNull().default(''),
    name: text('name').notNull(),
    accountType: text('account_type').notNull().default(''), // NISA成長投資枠など
    quantity: real('quantity').notNull().default(0),
    unit: text('unit').notNull().default(''),
    averagePrice: real('average_price').notNull().default(0),
    currentPrice: real('current_price').notNull().default(0),
    marketValue: integer('market_value').notNull().default(0),
    profitLoss: integer('profit_loss').notNull().default(0),
    profitLossPercent: real('profit_loss_percent').notNull().default(0),
    costBasis: integer('cost_basis').notNull().default(0),
    isFujitsu: integer('is_fujitsu').notNull().default(0),
    source: text('source').notNull().default('rakuten_csv'),
    importedAt: text('imported_at').notNull(),
  },
  (table) => [
    index('securities_holdings_as_of_idx').on(table.asOfDate),
    index('securities_holdings_batch_idx').on(table.batchId),
    uniqueIndex('securities_holdings_unique_idx').on(
      table.asOfDate,
      table.account,
      table.code,
      table.name,
      table.accountType,
    ),
  ],
)

/* -------------------------------------------------------------------------- */
/*  Scholarships & loans (liabilities)                                         */
/* -------------------------------------------------------------------------- */

/**
 * 奨学金・ローンの台帳。残高は返済記録で減らせるほか、直接編集もできる。
 * 残高の合計は asset_entries の loan_balance に集約し、純資産から差し引く。
 */
export const loans = sqliteTable(
  'loans',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    lender: text('lender').notNull().default(''),
    kind: text('kind').notNull().default('scholarship'), // 'scholarship' | 'loan' | 'other'
    principalAmount: integer('principal_amount').notNull().default(0), // 借入額
    currentBalance: integer('current_balance').notNull().default(0), // 現在の残高
    interestRate: real('interest_rate').notNull().default(0), // 年利（%）
    monthlyPayment: integer('monthly_payment').notNull().default(0), // 月額返済
    borrowedAt: text('borrowed_at').notNull().default(''), // YYYY-MM-DD
    repaymentEndDate: text('repayment_end_date').notNull().default(''), // YYYY-MM-DD
    notes: text('notes'),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (table) => [
    index('loans_repayment_end_idx').on(table.repaymentEndDate),
  ],
)

/**
 * 奨学金・ローンの返済履歴。元金が現在残高から差し引かれる。
 */
export const loanPayments = sqliteTable(
  'loan_payments',
  {
    id: text('id').primaryKey(),
    loanId: text('loan_id').notNull(),
    paidAt: text('paid_at').notNull(), // YYYY-MM-DD
    amount: integer('amount').notNull().default(0), // 返済額
    principalAmount: integer('principal_amount').notNull().default(0), // 元金
    interestAmount: integer('interest_amount').notNull().default(0), // 利息
    balanceAfter: integer('balance_after').notNull().default(0), // 返済後残高
    notes: text('notes'),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (table) => [
    index('loan_payments_loan_idx').on(table.loanId),
    index('loan_payments_paid_at_idx').on(table.paidAt),
  ],
)

/* -------------------------------------------------------------------------- */
/*  Monthly asset snapshots                                                    */
/* -------------------------------------------------------------------------- */

export const assetSnapshots = sqliteTable(
  'asset_snapshots',
  {
    id: text('id').primaryKey(),
    yearMonth: text('year_month').notNull().unique(), // '2026-10'
    cashAmount: integer('cash_amount').notNull(), // 銀行などの現預金
    nisaOrkanAmount: integer('nisa_orkan_amount').notNull().default(0), // 旧: オルカン時価
    nisaSp500Amount: integer('nisa_sp500_amount').notNull().default(0), // 旧: S&P500 時価
    nisaMutualFundAmount: integer('nisa_mutual_fund_amount').notNull().default(0), // 投資信託の評価額
    nisaIndividualStockAmount: integer('nisa_individual_stock_amount').notNull().default(0), // 個別株の評価額（富士通ロマン枠を除く）
    nisaOtherAssetAmount: integer('nisa_other_asset_amount').notNull().default(0), // 債券・金などその他の証券
    securitiesCashAmount: integer('securities_cash_amount').notNull().default(0), // 証券口座の預り金
    pensionBalance: integer('pension_balance').notNull().default(0), // 確定拠出年金の評価額
    nisaContributedPrincipal: integer('nisa_contributed_principal').notNull(), // NISA 累計元本
    fujitsuRomanStockShares: real('fujitsu_roman_stock_shares').notNull().default(0), // NISA ロマン枠
    holdingStockShares: real('holding_stock_shares').notNull().default(0), // 持株会の保有株数
    withdrawnHoldingShares: real('withdrawn_holding_shares').notNull().default(0), // 証券口座へ引出し済みの株数
    holdingAverageAcquisitionPrice: real('holding_average_acquisition_price').notNull().default(0), // 持株会の平均取得単価
    holdingCarryoverAmount: integer('holding_carryover_amount').notNull().default(0), // 持株会の繰越金
    fujitsuCurrentPrice: real('fujitsu_current_price').notNull(), // 基準株価
    loanBalance: integer('loan_balance').notNull().default(0), // 奨学金・ローンの残高（純資産から控除）
    gearResaleAmount: integer('gear_resale_amount').notNull().default(0), // 機材残存価値
    notes: text('notes'),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (table) => [index('asset_snapshots_year_month_idx').on(table.yearMonth)],
)

/* -------------------------------------------------------------------------- */
/*  Asset entries (item-level valuation ledger)                                */
/* -------------------------------------------------------------------------- */

/**
 * 資産の各項目を、評価日ごとに記録する台帳。
 * 月次スナップショットはここから「項目ごとに最新値を繰越して」導出する。
 * 1つの月に複数回記録した場合は、評価日が新しい値が優先される。
 */
export const assetEntries = sqliteTable(
  'asset_entries',
  {
    id: text('id').primaryKey(),
    itemKey: text('item_key').notNull(), // bank_cash, securities_cash, mutual_funds, ...
    valuedAt: text('valued_at').notNull(), // YYYY-MM-DD
    value: real('value').notNull().default(0),
    notes: text('notes'),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (table) => [
    uniqueIndex('asset_entries_item_date_idx').on(table.itemKey, table.valuedAt),
    index('asset_entries_item_idx').on(table.itemKey),
    index('asset_entries_valued_at_idx').on(table.valuedAt),
  ],
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
export type AuthPasskey = typeof authPasskeys.$inferSelect
export type AuthChallenge = typeof authChallenges.$inferSelect
export type HoldingStockStatus = typeof holdingStockStatus.$inferSelect
export type HoldingWithdrawal = typeof holdingWithdrawals.$inferSelect
export type StockGoal = typeof stockGoals.$inferSelect
export type RetirementAccount = typeof retirementAccounts.$inferSelect
export type RetirementAllocation = typeof retirementAllocations.$inferSelect
export type FinancialAccount = typeof financialAccounts.$inferSelect
export type SecuritiesImportBatch = typeof securitiesImportBatches.$inferSelect
export type SecuritiesHolding = typeof securitiesHoldings.$inferSelect
export type Loan = typeof loans.$inferSelect
export type LoanPayment = typeof loanPayments.$inferSelect
export type AssetSnapshot = typeof assetSnapshots.$inferSelect
export type AssetEntry = typeof assetEntries.$inferSelect
export type CameraGear = typeof cameraGears.$inferSelect
export type SelfInvestment = typeof selfInvestments.$inferSelect
export type CareerEvent = typeof careerEvents.$inferSelect
