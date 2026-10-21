CREATE TABLE `financial_accounts` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`institution` text NOT NULL,
	`kind` text NOT NULL,
	`role` text DEFAULT '' NOT NULL,
	`notes` text,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `holding_withdrawals` (
	`id` text PRIMARY KEY NOT NULL,
	`withdrawn_at` text NOT NULL,
	`shares` real DEFAULT 0 NOT NULL,
	`average_acquisition_price` real DEFAULT 0 NOT NULL,
	`stock_price` real DEFAULT 0 NOT NULL,
	`destination` text DEFAULT 'SMBC日興証券' NOT NULL,
	`notes` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `holding_withdrawals_withdrawn_at_idx` ON `holding_withdrawals` (`withdrawn_at`);--> statement-breakpoint
ALTER TABLE `asset_snapshots` ADD `withdrawn_holding_shares` real DEFAULT 0 NOT NULL;