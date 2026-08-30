CREATE TABLE `session_character_xp` (
	`id` text PRIMARY KEY NOT NULL,
	`session_id` text NOT NULL,
	`character_id` text NOT NULL,
	`xp` integer NOT NULL,
	FOREIGN KEY (`session_id`) REFERENCES `game_sessions`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`character_id`) REFERENCES `characters`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `session_character_xp_session_character` ON `session_character_xp` (`session_id`,`character_id`);--> statement-breakpoint
CREATE INDEX `idx_session_character_xp_character` ON `session_character_xp` (`character_id`);--> statement-breakpoint
ALTER TABLE `session_attendance` DROP COLUMN `xp`;