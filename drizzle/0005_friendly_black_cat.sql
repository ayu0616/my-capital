CREATE TABLE `retirement_accounts` (
	`id` text PRIMARY KEY NOT NULL,
	`provider` text DEFAULT 'JIS&T' NOT NULL,
	`scheme_name` text DEFAULT '会社型確定拠出年金' NOT NULL,
	`balance` integer DEFAULT 0 NOT NULL,
	`total_contributed` integer DEFAULT 0 NOT NULL,
	`monthly_contribution` integer DEFAULT 0 NOT NULL,
	`employer_contribution` integer DEFAULT 0 NOT NULL,
	`valued_at` text DEFAULT '' NOT NULL,
	`notes` text,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `retirement_allocations` (
	`id` text PRIMARY KEY NOT NULL,
	`account_id` text DEFAULT 'default' NOT NULL,
	`label` text NOT NULL,
	`ratio` real DEFAULT 0 NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE INDEX `retirement_allocations_account_idx` ON `retirement_allocations` (`account_id`);--> statement-breakpoint
ALTER TABLE `asset_snapshots` ADD `pension_balance` integer DEFAULT 0 NOT NULL;