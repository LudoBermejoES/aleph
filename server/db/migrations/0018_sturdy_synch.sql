CREATE TABLE `entity_secret_notes` (
	`id` text PRIMARY KEY NOT NULL,
	`entity_id` text NOT NULL,
	`content` text DEFAULT '' NOT NULL,
	`updated_by` text NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`entity_id`) REFERENCES `entities`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`updated_by`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `entity_secret_notes_entity_id_unique` ON `entity_secret_notes` (`entity_id`);--> statement-breakpoint
CREATE TABLE `secret_reveals` (
	`id` text PRIMARY KEY NOT NULL,
	`entity_id` text NOT NULL,
	`secret_block_id` text NOT NULL,
	`revealed_by` text NOT NULL,
	`revealed_at` integer NOT NULL,
	FOREIGN KEY (`entity_id`) REFERENCES `entities`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`revealed_by`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `secret_reveals_entity_block` ON `secret_reveals` (`entity_id`,`secret_block_id`);