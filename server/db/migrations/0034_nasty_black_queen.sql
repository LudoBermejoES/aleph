CREATE TABLE `entity_nicknames` (
	`id` text PRIMARY KEY NOT NULL,
	`entity_id` text NOT NULL,
	`nickname` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`entity_id`) REFERENCES `entities`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `entity_nicknames_entity_nickname_unique` ON `entity_nicknames` (`entity_id`,"nickname" COLLATE NOCASE);