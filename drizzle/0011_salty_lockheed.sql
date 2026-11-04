CREATE TABLE `holding_contribution_changes` (
	`id` text PRIMARY KEY NOT NULL,
	`effective_month` text NOT NULL,
	`monthly_contribution` integer DEFAULT 0 NOT NULL,
	`incentive_rate` real DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `holding_contribution_changes_effective_month_idx` ON `holding_contribution_changes` (`effective_month`);--> statement-breakpoint
ALTER TABLE `holding_stock_status` ADD `contribution_start_month` text DEFAULT '' NOT NULL;