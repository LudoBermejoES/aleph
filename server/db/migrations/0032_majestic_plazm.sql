CREATE TABLE `entity_images` (
	`id` text PRIMARY KEY NOT NULL,
	`campaign_id` text NOT NULL,
	`entity_id` text NOT NULL,
	`filename` text NOT NULL,
	`url` text NOT NULL,
	`caption` text,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`is_primary` integer DEFAULT false NOT NULL,
	`created_by` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`campaign_id`) REFERENCES `campaigns`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`entity_id`) REFERENCES `entities`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`created_by`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_entity_images_entity` ON `entity_images` (`entity_id`,`sort_order`);--> statement-breakpoint
CREATE INDEX `idx_entity_images_campaign` ON `entity_images` (`campaign_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `entity_images_one_primary` ON `entity_images` (`entity_id`) WHERE is_primary = 1;