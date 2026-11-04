CREATE TABLE `step_records` (
	`id` text PRIMARY KEY NOT NULL,
	`date` text NOT NULL,
	`steps` integer DEFAULT 0 NOT NULL,
	`place` text,
	`source` text DEFAULT 'manual' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `step_records_date_idx` ON `step_records` (`date`);--> statement-breakpoint
ALTER TABLE `app_settings` ADD `stride_cm` real DEFAULT 70 NOT NULL;