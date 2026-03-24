CREATE TABLE `session_rolls` (
	`id` text PRIMARY KEY NOT NULL,
	`campaign_id` text NOT NULL,
	`session_id` text,
	`user_id` text NOT NULL,
	`character_id` text,
	`formula` text NOT NULL,
	`result_json` text NOT NULL,
	`total` integer NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`campaign_id`) REFERENCES `campaigns`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`session_id`) REFERENCES `game_sessions`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
