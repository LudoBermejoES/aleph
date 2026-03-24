CREATE TABLE `entity_types` (
	`id` text PRIMARY KEY NOT NULL,
	`campaign_id` text NOT NULL,
	`slug` text NOT NULL,
	`name` text NOT NULL,
	`icon` text,
	`is_builtin` integer DEFAULT false NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`campaign_id`) REFERENCES `campaigns`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `entities` (
	`id` text PRIMARY KEY NOT NULL,
	`campaign_id` text NOT NULL,
	`type` text NOT NULL,
	`name` text NOT NULL,
	`slug` text NOT NULL,
	`file_path` text NOT NULL,
	`visibility` text DEFAULT 'members' NOT NULL,
	`content_hash` text,
	`parent_id` text,
	`template_id` text,
	`created_by` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`campaign_id`) REFERENCES `campaigns`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `entities_campaign_slug` ON `entities` (`campaign_id`,`slug`);--> statement-breakpoint
CREATE TABLE `entity_tags` (
	`entity_id` text NOT NULL,
	`tag_id` text NOT NULL,
	FOREIGN KEY (`entity_id`) REFERENCES `entities`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`tag_id`) REFERENCES `tags`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `entity_template_fields` (
	`id` text PRIMARY KEY NOT NULL,
	`template_id` text NOT NULL,
	`key` text NOT NULL,
	`label` text NOT NULL,
	`field_type` text NOT NULL,
	`options_json` text,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`required` integer DEFAULT false NOT NULL,
	FOREIGN KEY (`template_id`) REFERENCES `entity_templates`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `entity_templates` (
	`id` text PRIMARY KEY NOT NULL,
	`campaign_id` text NOT NULL,
	`entity_type_slug` text NOT NULL,
	`name` text NOT NULL,
	`is_default` integer DEFAULT false NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`campaign_id`) REFERENCES `campaigns`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `tags` (
	`id` text PRIMARY KEY NOT NULL,
	`campaign_id` text NOT NULL,
	`name` text NOT NULL,
	`slug` text NOT NULL,
	`color` text,
	FOREIGN KEY (`campaign_id`) REFERENCES `campaigns`(`id`) ON UPDATE no action ON DELETE cascade
);
