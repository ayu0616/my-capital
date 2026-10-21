CREATE TABLE `securities_holdings` (
	`id` text PRIMARY KEY NOT NULL,
	`batch_id` text NOT NULL,
	`as_of_date` text NOT NULL,
	`account` text DEFAULT '楽天証券' NOT NULL,
	`category` text NOT NULL,
	`type` text NOT NULL,
	`code` text DEFAULT '' NOT NULL,
	`name` text NOT NULL,
	`account_type` text DEFAULT '' NOT NULL,
	`quantity` real DEFAULT 0 NOT NULL,
	`unit` text DEFAULT '' NOT NULL,
	`average_price` real DEFAULT 0 NOT NULL,
	`current_price` real DEFAULT 0 NOT NULL,
	`market_value` integer DEFAULT 0 NOT NULL,
	`profit_loss` integer DEFAULT 0 NOT NULL,
	`profit_loss_percent` real DEFAULT 0 NOT NULL,
	`cost_basis` integer DEFAULT 0 NOT NULL,
	`is_fujitsu` integer DEFAULT 0 NOT NULL,
	`source` text DEFAULT 'rakuten_csv' NOT NULL,
	`imported_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `securities_holdings_as_of_idx` ON `securities_holdings` (`as_of_date`);--> statement-breakpoint
CREATE INDEX `securities_holdings_batch_idx` ON `securities_holdings` (`batch_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `securities_holdings_unique_idx` ON `securities_holdings` (`as_of_date`,`account`,`code`,`name`,`account_type`);--> statement-breakpoint
CREATE TABLE `securities_import_batches` (
	`id` text PRIMARY KEY NOT NULL,
	`as_of_date` text NOT NULL,
	`account` text DEFAULT '楽天証券' NOT NULL,
	`file_name` text DEFAULT '' NOT NULL,
	`total_value` integer DEFAULT 0 NOT NULL,
	`product_value` integer DEFAULT 0 NOT NULL,
	`cash_value` integer DEFAULT 0 NOT NULL,
	`stock_value` integer DEFAULT 0 NOT NULL,
	`fund_value` integer DEFAULT 0 NOT NULL,
	`other_value` integer DEFAULT 0 NOT NULL,
	`fujitsu_value` integer DEFAULT 0 NOT NULL,
	`holding_count` integer DEFAULT 0 NOT NULL,
	`imported_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `securities_import_batches_as_of_idx` ON `securities_import_batches` (`as_of_date`);--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_asset_snapshots` (
	`id` text PRIMARY KEY NOT NULL,
	`year_month` text NOT NULL,
	`cash_amount` integer NOT NULL,
	`nisa_orkan_amount` integer DEFAULT 0 NOT NULL,
	`nisa_sp500_amount` integer DEFAULT 0 NOT NULL,
	`nisa_mutual_fund_amount` integer DEFAULT 0 NOT NULL,
	`nisa_individual_stock_amount` integer DEFAULT 0 NOT NULL,
	`nisa_other_asset_amount` integer DEFAULT 0 NOT NULL,
	`securities_cash_amount` integer DEFAULT 0 NOT NULL,
	`nisa_contributed_principal` integer NOT NULL,
	`fujitsu_roman_stock_shares` real DEFAULT 0 NOT NULL,
	`holding_stock_shares` real DEFAULT 0 NOT NULL,
	`withdrawn_holding_shares` real DEFAULT 0 NOT NULL,
	`holding_average_acquisition_price` real DEFAULT 0 NOT NULL,
	`holding_carryover_amount` integer DEFAULT 0 NOT NULL,
	`fujitsu_current_price` real NOT NULL,
	`gear_resale_amount` integer DEFAULT 0 NOT NULL,
	`notes` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_asset_snapshots`("id", "year_month", "cash_amount", "nisa_orkan_amount", "nisa_sp500_amount", "nisa_mutual_fund_amount", "nisa_individual_stock_amount", "nisa_other_asset_amount", "securities_cash_amount", "nisa_contributed_principal", "fujitsu_roman_stock_shares", "holding_stock_shares", "withdrawn_holding_shares", "holding_average_acquisition_price", "holding_carryover_amount", "fujitsu_current_price", "gear_resale_amount", "notes", "created_at", "updated_at") SELECT "id", "year_month", "cash_amount", "nisa_orkan_amount", "nisa_sp500_amount", ("nisa_orkan_amount" + "nisa_sp500_amount"), 0, 0, 0, "nisa_contributed_principal", "fujitsu_roman_stock_shares", "holding_stock_shares", "withdrawn_holding_shares", "holding_average_acquisition_price", "holding_carryover_amount", "fujitsu_current_price", "gear_resale_amount", "notes", "created_at", "updated_at" FROM `asset_snapshots`;--> statement-breakpoint
DROP TABLE `asset_snapshots`;--> statement-breakpoint
ALTER TABLE `__new_asset_snapshots` RENAME TO `asset_snapshots`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `asset_snapshots_year_month_unique` ON `asset_snapshots` (`year_month`);--> statement-breakpoint
CREATE INDEX `asset_snapshots_year_month_idx` ON `asset_snapshots` (`year_month`);