CREATE TABLE `entity_relations` (
	`id` text PRIMARY KEY NOT NULL,
	`campaign_id` text NOT NULL,
	`source_entity_id` text NOT NULL,
	`target_entity_id` text NOT NULL,
	`relation_type_id` text NOT NULL,
	`forward_label` text NOT NULL,
	`reverse_label` text NOT NULL,
	`attitude` integer DEFAULT 0,
	`description` text,
	`metadata_json` text,
	`visibility` text DEFAULT 'public' NOT NULL,
	`is_pinned` integer DEFAULT false NOT NULL,
	`created_by` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`campaign_id`) REFERENCES `campaigns`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`source_entity_id`) REFERENCES `entities`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`target_entity_id`) REFERENCES `entities`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`relation_type_id`) REFERENCES `relation_types`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`created_by`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `relation_types` (
	`id` text PRIMARY KEY NOT NULL,
	`campaign_id` text NOT NULL,
	`slug` text NOT NULL,
	`forward_label` text NOT NULL,
	`reverse_label` text NOT NULL,
	`is_builtin` integer DEFAULT false NOT NULL,
	FOREIGN KEY (`campaign_id`) REFERENCES `campaigns`(`id`) ON UPDATE no action ON DELETE cascade
);
