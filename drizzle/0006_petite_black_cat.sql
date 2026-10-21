CREATE TABLE `asset_entries` (
	`id` text PRIMARY KEY NOT NULL,
	`item_key` text NOT NULL,
	`valued_at` text NOT NULL,
	`value` real DEFAULT 0 NOT NULL,
	`notes` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `asset_entries_item_date_idx` ON `asset_entries` (`item_key`,`valued_at`);--> statement-breakpoint
CREATE INDEX `asset_entries_item_idx` ON `asset_entries` (`item_key`);--> statement-breakpoint
CREATE INDEX `asset_entries_valued_at_idx` ON `asset_entries` (`valued_at`);

-- Backfill from monthly snapshots so existing history becomes per-item entries.
INSERT OR IGNORE INTO asset_entries (id, item_key, valued_at, value, notes, created_at, updated_at)
SELECT 'mig-' || id || '-bank_cash', 'bank_cash', year_month || '-01', cash_amount, notes, created_at, updated_at FROM asset_snapshots WHERE cash_amount IS NOT NULL;
INSERT OR IGNORE INTO asset_entries (id, item_key, valued_at, value, notes, created_at, updated_at)
SELECT 'mig-' || id || '-securities_cash', 'securities_cash', year_month || '-01', securities_cash_amount, NULL, created_at, updated_at FROM asset_snapshots WHERE securities_cash_amount IS NOT NULL;
INSERT OR IGNORE INTO asset_entries (id, item_key, valued_at, value, notes, created_at, updated_at)
SELECT 'mig-' || id || '-mutual_funds', 'mutual_funds', year_month || '-01', nisa_mutual_fund_amount, NULL, created_at, updated_at FROM asset_snapshots WHERE nisa_mutual_fund_amount IS NOT NULL;
INSERT OR IGNORE INTO asset_entries (id, item_key, valued_at, value, notes, created_at, updated_at)
SELECT 'mig-' || id || '-individual_stocks', 'individual_stocks', year_month || '-01', nisa_individual_stock_amount, NULL, created_at, updated_at FROM asset_snapshots WHERE nisa_individual_stock_amount IS NOT NULL;
INSERT OR IGNORE INTO asset_entries (id, item_key, valued_at, value, notes, created_at, updated_at)
SELECT 'mig-' || id || '-other_securities', 'other_securities', year_month || '-01', nisa_other_asset_amount, NULL, created_at, updated_at FROM asset_snapshots WHERE nisa_other_asset_amount IS NOT NULL;
INSERT OR IGNORE INTO asset_entries (id, item_key, valued_at, value, notes, created_at, updated_at)
SELECT 'mig-' || id || '-pension', 'pension', year_month || '-01', pension_balance, NULL, created_at, updated_at FROM asset_snapshots WHERE pension_balance IS NOT NULL;
INSERT OR IGNORE INTO asset_entries (id, item_key, valued_at, value, notes, created_at, updated_at)
SELECT 'mig-' || id || '-nisa_principal', 'nisa_principal', year_month || '-01', nisa_contributed_principal, NULL, created_at, updated_at FROM asset_snapshots WHERE nisa_contributed_principal IS NOT NULL;
INSERT OR IGNORE INTO asset_entries (id, item_key, valued_at, value, notes, created_at, updated_at)
SELECT 'mig-' || id || '-fujitsu_roman_shares', 'fujitsu_roman_shares', year_month || '-01', fujitsu_roman_stock_shares, NULL, created_at, updated_at FROM asset_snapshots WHERE fujitsu_roman_stock_shares IS NOT NULL;
INSERT OR IGNORE INTO asset_entries (id, item_key, valued_at, value, notes, created_at, updated_at)
SELECT 'mig-' || id || '-holding_shares', 'holding_shares', year_month || '-01', holding_stock_shares, NULL, created_at, updated_at FROM asset_snapshots WHERE holding_stock_shares IS NOT NULL;
INSERT OR IGNORE INTO asset_entries (id, item_key, valued_at, value, notes, created_at, updated_at)
SELECT 'mig-' || id || '-holding_average_price', 'holding_average_price', year_month || '-01', holding_average_acquisition_price, NULL, created_at, updated_at FROM asset_snapshots WHERE holding_average_acquisition_price IS NOT NULL;
INSERT OR IGNORE INTO asset_entries (id, item_key, valued_at, value, notes, created_at, updated_at)
SELECT 'mig-' || id || '-holding_carryover', 'holding_carryover', year_month || '-01', holding_carryover_amount, NULL, created_at, updated_at FROM asset_snapshots WHERE holding_carryover_amount IS NOT NULL;
INSERT OR IGNORE INTO asset_entries (id, item_key, valued_at, value, notes, created_at, updated_at)
SELECT 'mig-' || id || '-fujitsu_price', 'fujitsu_price', year_month || '-01', fujitsu_current_price, NULL, created_at, updated_at FROM asset_snapshots WHERE fujitsu_current_price IS NOT NULL;
INSERT OR IGNORE INTO asset_entries (id, item_key, valued_at, value, notes, created_at, updated_at)
SELECT 'mig-' || id || '-gear_resale', 'gear_resale', year_month || '-01', gear_resale_amount, NULL, created_at, updated_at FROM asset_snapshots WHERE gear_resale_amount IS NOT NULL;