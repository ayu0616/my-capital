CREATE TABLE `stock_goals` (
	`id` text PRIMARY KEY NOT NULL,
	`code` text DEFAULT '' NOT NULL,
	`name` text NOT NULL,
	`account` text DEFAULT '楽天証券' NOT NULL,
	`target_shares` real DEFAULT 100 NOT NULL,
	`current_shares` real DEFAULT 0 NOT NULL,
	`target_date` text NOT NULL,
	`minimum_purchase_unit` integer DEFAULT 1 NOT NULL,
	`average_acquisition_price` real DEFAULT 0 NOT NULL,
	`current_price` real DEFAULT 0 NOT NULL,
	`monthly_budget` integer DEFAULT 0 NOT NULL,
	`benefit_note` text DEFAULT '' NOT NULL,
	`notes` text,
	`auto_update_from_csv` integer DEFAULT 1 NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `stock_goals_code_idx` ON `stock_goals` (`code`);--> statement-breakpoint
CREATE INDEX `stock_goals_target_date_idx` ON `stock_goals` (`target_date`);