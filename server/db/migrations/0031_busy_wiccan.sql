CREATE TABLE `character_notes` (
	`id` text PRIMARY KEY NOT NULL,
	`character_id` text NOT NULL,
	`author_user_id` text NOT NULL,
	`body` text DEFAULT '' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`character_id`) REFERENCES `characters`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`author_user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `character_notes_char_author` ON `character_notes` (`character_id`,`author_user_id`);--> statement-breakpoint
CREATE INDEX `idx_character_notes_character` ON `character_notes` (`character_id`);--> statement-breakpoint
CREATE INDEX `idx_character_notes_author` ON `character_notes` (`author_user_id`);