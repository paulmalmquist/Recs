CREATE TABLE `dismissals` (
	`user_id` text NOT NULL,
	`app_id` text NOT NULL,
	`created_at` text NOT NULL,
	PRIMARY KEY(`user_id`, `app_id`)
);
--> statement-breakpoint
CREATE TABLE `events` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`app_id` text NOT NULL,
	`event_type` text NOT NULL,
	`created_at` text NOT NULL,
	`request_id` text,
	`position` text,
	`model_version` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_events_user_time` ON `events` (`user_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `profiles` (
	`user_id` text PRIMARY KEY NOT NULL,
	`persona` text DEFAULT 'architect' NOT NULL
);
--> statement-breakpoint
CREATE TABLE `saved_apps` (
	`user_id` text NOT NULL,
	`app_id` text NOT NULL,
	`saved_at` text NOT NULL,
	PRIMARY KEY(`user_id`, `app_id`)
);
