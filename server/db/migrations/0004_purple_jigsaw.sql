CREATE TABLE `map_groups` (
	`id` text PRIMARY KEY NOT NULL,
	`map_id` text NOT NULL,
	`name` text NOT NULL,
	`color` text,
	`visible_default` integer DEFAULT true NOT NULL,
	FOREIGN KEY (`map_id`) REFERENCES `maps`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `map_layers` (
	`id` text PRIMARY KEY NOT NULL,
	`map_id` text NOT NULL,
	`name` text NOT NULL,
	`type` text DEFAULT 'standard' NOT NULL,
	`image_path` text,
	`opacity` real DEFAULT 1 NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`visible_default` integer DEFAULT true NOT NULL,
	FOREIGN KEY (`map_id`) REFERENCES `maps`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `map_pins` (
	`id` text PRIMARY KEY NOT NULL,
	`map_id` text NOT NULL,
	`entity_id` text,
	`child_map_id` text,
	`label` text,
	`lat` real NOT NULL,
	`lng` real NOT NULL,
	`icon` text,
	`color` text,
	`visibility` text DEFAULT 'public' NOT NULL,
	`group_id` text,
	FOREIGN KEY (`map_id`) REFERENCES `maps`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`entity_id`) REFERENCES `entities`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`child_map_id`) REFERENCES `maps`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `map_regions` (
	`id` text PRIMARY KEY NOT NULL,
	`map_id` text NOT NULL,
	`name` text,
	`geojson` text NOT NULL,
	`color` text,
	`opacity` real DEFAULT 0.3,
	`entity_id` text,
	`visibility` text DEFAULT 'public' NOT NULL,
	FOREIGN KEY (`map_id`) REFERENCES `maps`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`entity_id`) REFERENCES `entities`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `maps` (
	`id` text PRIMARY KEY NOT NULL,
	`campaign_id` text NOT NULL,
	`name` text NOT NULL,
	`slug` text NOT NULL,
	`parent_map_id` text,
	`image_path` text,
	`width` integer,
	`height` integer,
	`min_zoom` integer DEFAULT 0,
	`max_zoom` integer DEFAULT 4,
	`is_tiled` integer DEFAULT false NOT NULL,
	`visibility` text DEFAULT 'members' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`campaign_id`) REFERENCES `campaigns`(`id`) ON UPDATE no action ON DELETE cascade
);
