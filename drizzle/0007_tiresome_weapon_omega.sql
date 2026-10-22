CREATE TABLE `auth_challenges` (
	`challenge` text PRIMARY KEY NOT NULL,
	`kind` text NOT NULL,
	`expires_at` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `auth_challenges_expires_idx` ON `auth_challenges` (`expires_at`);--> statement-breakpoint
CREATE TABLE `auth_config` (
	`id` text PRIMARY KEY NOT NULL,
	`session_secret` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `auth_passkeys` (
	`id` text PRIMARY KEY NOT NULL,
	`credential_id` text NOT NULL,
	`public_key` text NOT NULL,
	`counter` integer DEFAULT 0 NOT NULL,
	`transports` text DEFAULT '' NOT NULL,
	`label` text DEFAULT '' NOT NULL,
	`created_at` text NOT NULL,
	`last_used_at` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `auth_passkeys_credential_id_unique` ON `auth_passkeys` (`credential_id`);--> statement-breakpoint
CREATE INDEX `auth_passkeys_created_idx` ON `auth_passkeys` (`created_at`);