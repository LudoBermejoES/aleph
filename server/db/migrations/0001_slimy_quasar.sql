CREATE TABLE `campaign_invitations` (
	`id` text PRIMARY KEY NOT NULL,
	`campaign_id` text NOT NULL,
	`token` text NOT NULL,
	`role` text DEFAULT 'player' NOT NULL,
	`created_by` text NOT NULL,
	`expires_at` integer NOT NULL,
	`used_at` integer,
	FOREIGN KEY (`campaign_id`) REFERENCES `campaigns`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `campaign_invitations_token_unique` ON `campaign_invitations` (`token`);--> statement-breakpoint
CREATE TABLE `campaign_member_permissions` (
	`id` text PRIMARY KEY NOT NULL,
	`campaign_member_id` text NOT NULL,
	`permission` text NOT NULL,
	`granted_by` text NOT NULL,
	`granted_at` integer NOT NULL,
	FOREIGN KEY (`campaign_member_id`) REFERENCES `campaign_members`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`granted_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `member_permission_unique` ON `campaign_member_permissions` (`campaign_member_id`,`permission`);--> statement-breakpoint
CREATE TABLE `campaign_members` (
	`id` text PRIMARY KEY NOT NULL,
	`campaign_id` text NOT NULL,
	`user_id` text NOT NULL,
	`role` text DEFAULT 'player' NOT NULL,
	`joined_at` integer NOT NULL,
	FOREIGN KEY (`campaign_id`) REFERENCES `campaigns`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `campaign_members_unique` ON `campaign_members` (`campaign_id`,`user_id`);--> statement-breakpoint
CREATE TABLE `entity_permissions` (
	`id` text PRIMARY KEY NOT NULL,
	`entity_id` text NOT NULL,
	`target_user_id` text,
	`target_role` text,
	`permission` text NOT NULL,
	`effect` text NOT NULL,
	`granted_by` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`target_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`granted_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `entity_specific_viewers` (
	`entity_id` text NOT NULL,
	`user_id` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
