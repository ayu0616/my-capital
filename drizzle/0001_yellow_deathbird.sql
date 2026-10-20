ALTER TABLE `asset_snapshots` ADD `holding_average_acquisition_price` real DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `asset_snapshots` ADD `holding_carryover_amount` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `holding_stock_status` ADD `recorded_at` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `holding_stock_status` ADD `average_acquisition_price` real DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `holding_stock_status` ADD `carryover_amount` integer DEFAULT 0 NOT NULL;