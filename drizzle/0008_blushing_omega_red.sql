CREATE TABLE `loan_payments` (
	`id` text PRIMARY KEY NOT NULL,
	`loan_id` text NOT NULL,
	`paid_at` text NOT NULL,
	`amount` integer DEFAULT 0 NOT NULL,
	`principal_amount` integer DEFAULT 0 NOT NULL,
	`interest_amount` integer DEFAULT 0 NOT NULL,
	`balance_after` integer DEFAULT 0 NOT NULL,
	`notes` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `loan_payments_loan_idx` ON `loan_payments` (`loan_id`);--> statement-breakpoint
CREATE INDEX `loan_payments_paid_at_idx` ON `loan_payments` (`paid_at`);--> statement-breakpoint
CREATE TABLE `loans` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`lender` text DEFAULT '' NOT NULL,
	`kind` text DEFAULT 'scholarship' NOT NULL,
	`principal_amount` integer DEFAULT 0 NOT NULL,
	`current_balance` integer DEFAULT 0 NOT NULL,
	`interest_rate` real DEFAULT 0 NOT NULL,
	`monthly_payment` integer DEFAULT 0 NOT NULL,
	`borrowed_at` text DEFAULT '' NOT NULL,
	`repayment_end_date` text DEFAULT '' NOT NULL,
	`notes` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `loans_repayment_end_idx` ON `loans` (`repayment_end_date`);--> statement-breakpoint
ALTER TABLE `asset_snapshots` ADD `loan_balance` integer DEFAULT 0 NOT NULL;