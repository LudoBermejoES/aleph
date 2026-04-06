CREATE TABLE `diagram_snapshots` (
	`id` text PRIMARY KEY NOT NULL,
	`diagram_id` text NOT NULL,
	`snapshot` text NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`diagram_id`) REFERENCES `diagrams`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `diagram_snapshots_diagram_idx` ON `diagram_snapshots` (`diagram_id`);--> statement-breakpoint
CREATE TABLE `diagrams` (
	`id` text PRIMARY KEY NOT NULL,
	`campaign_id` text NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`diagram_type` text DEFAULT 'freeform' NOT NULL,
	`created_by` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`campaign_id`) REFERENCES `campaigns`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`created_by`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `diagrams_campaign_idx` ON `diagrams` (`campaign_id`);