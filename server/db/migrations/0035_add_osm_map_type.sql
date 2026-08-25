ALTER TABLE `maps` ADD `type` text DEFAULT 'image' NOT NULL;--> statement-breakpoint
ALTER TABLE `maps` ADD `center_lat` real;--> statement-breakpoint
ALTER TABLE `maps` ADD `center_lng` real;--> statement-breakpoint
ALTER TABLE `maps` ADD `default_zoom` integer;