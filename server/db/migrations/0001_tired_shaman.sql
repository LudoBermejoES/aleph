CREATE TABLE `abilities` (
	`id` text PRIMARY KEY NOT NULL,
	`character_id` text NOT NULL,
	`name` text NOT NULL,
	`type` text DEFAULT 'custom' NOT NULL,
	`description` text,
	`tags_json` text,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`is_secret` integer DEFAULT false NOT NULL,
	FOREIGN KEY (`character_id`) REFERENCES `characters`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `character_connections` (
	`id` text PRIMARY KEY NOT NULL,
	`character_id` text NOT NULL,
	`target_entity_id` text NOT NULL,
	`label` text,
	`description` text,
	`sort_order` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`character_id`) REFERENCES `characters`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `character_folders` (
	`id` text PRIMARY KEY NOT NULL,
	`campaign_id` text NOT NULL,
	`name` text NOT NULL,
	`parent_folder_id` text,
	`sort_order` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`campaign_id`) REFERENCES `campaigns`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `character_stats` (
	`id` text PRIMARY KEY NOT NULL,
	`character_id` text NOT NULL,
	`stat_definition_id` text NOT NULL,
	`value` text,
	FOREIGN KEY (`character_id`) REFERENCES `characters`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`stat_definition_id`) REFERENCES `stat_definitions`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `characters` (
	`id` text PRIMARY KEY NOT NULL,
	`entity_id` text NOT NULL,
	`character_type` text DEFAULT 'npc' NOT NULL,
	`race` text,
	`class` text,
	`alignment` text,
	`status` text DEFAULT 'alive' NOT NULL,
	`location_entity_id` text,
	`owner_user_id` text,
	`is_companion_of` text,
	FOREIGN KEY (`entity_id`) REFERENCES `entities`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`owner_user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `characters_entity_id_unique` ON `characters` (`entity_id`);--> statement-breakpoint
CREATE TABLE `stat_definitions` (
	`id` text PRIMARY KEY NOT NULL,
	`stat_group_id` text NOT NULL,
	`name` text NOT NULL,
	`key` text NOT NULL,
	`value_type` text DEFAULT 'number' NOT NULL,
	`default_value` text,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`is_secret` integer DEFAULT false NOT NULL,
	FOREIGN KEY (`stat_group_id`) REFERENCES `stat_groups`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `stat_groups` (
	`id` text PRIMARY KEY NOT NULL,
	`campaign_id` text NOT NULL,
	`name` text NOT NULL,
	`template_id` text,
	`player_editable` integer DEFAULT false NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`campaign_id`) REFERENCES `campaigns`(`id`) ON UPDATE no action ON DELETE cascade
);
