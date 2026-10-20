CREATE TABLE `app_settings` (
	`id` text PRIMARY KEY NOT NULL,
	`nickname` text DEFAULT '' NOT NULL,
	`birth_date` text DEFAULT '1997-02-18' NOT NULL,
	`nisa_target_amount` integer DEFAULT 18000000 NOT NULL,
	`nisa_target_age` integer DEFAULT 35 NOT NULL,
	`fujitsu_alert_threshold` real DEFAULT 0.15 NOT NULL,
	`gear_fund_target` integer DEFAULT 150000 NOT NULL,
	`gear_fund_saved` integer DEFAULT 0 NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `asset_snapshots` (
	`id` text PRIMARY KEY NOT NULL,
	`year_month` text NOT NULL,
	`cash_amount` integer NOT NULL,
	`nisa_orkan_amount` integer NOT NULL,
	`nisa_sp500_amount` integer NOT NULL,
	`nisa_contributed_principal` integer NOT NULL,
	`fujitsu_roman_stock_shares` real DEFAULT 0 NOT NULL,
	`holding_stock_shares` real DEFAULT 0 NOT NULL,
	`fujitsu_current_price` real NOT NULL,
	`gear_resale_amount` integer DEFAULT 0 NOT NULL,
	`notes` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `asset_snapshots_year_month_unique` ON `asset_snapshots` (`year_month`);--> statement-breakpoint
CREATE INDEX `asset_snapshots_year_month_idx` ON `asset_snapshots` (`year_month`);--> statement-breakpoint
CREATE TABLE `camera_gears` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`category` text NOT NULL,
	`purchased_at` text NOT NULL,
	`purchase_price` integer DEFAULT 0 NOT NULL,
	`resale_value` integer DEFAULT 0 NOT NULL,
	`image_key` text,
	`notes` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `career_events` (
	`id` text PRIMARY KEY NOT NULL,
	`occurred_at` text NOT NULL,
	`title` text NOT NULL,
	`annual_income_increase` integer DEFAULT 0 NOT NULL,
	`notes` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `holding_stock_status` (
	`id` text PRIMARY KEY NOT NULL,
	`monthly_contribution` integer DEFAULT 33000 NOT NULL,
	`company_incentive_rate` real DEFAULT 0.15 NOT NULL,
	`current_accumulated_shares` real DEFAULT 0 NOT NULL,
	`latest_stock_price` real DEFAULT 0 NOT NULL,
	`target_shares` integer DEFAULT 100 NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `self_investments` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`category` text NOT NULL,
	`cost` integer DEFAULT 0 NOT NULL,
	`completed_at` text NOT NULL,
	`notes` text,
	`created_at` text NOT NULL
);
