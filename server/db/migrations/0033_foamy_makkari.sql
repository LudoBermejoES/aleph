-- Generalize session_groups into sub_campaigns: covers arcs and quests too, plus a
-- mandatory default sub-campaign per campaign so arcs/sessions/quests are never unassigned.

-- 1. Rename the table and add the isDefault flag (constant default, no rebuild needed).
ALTER TABLE `session_groups` RENAME TO `sub_campaigns`;--> statement-breakpoint
ALTER TABLE `sub_campaigns` ADD `is_default` integer DEFAULT false NOT NULL;--> statement-breakpoint
DROP INDEX `session_groups_campaign_id_slug_unique`;--> statement-breakpoint
CREATE UNIQUE INDEX `sub_campaigns_campaign_id_slug_unique` ON `sub_campaigns` (`campaign_id`,`slug`);--> statement-breakpoint

-- 2. Give every existing campaign exactly one default sub-campaign named "General".
INSERT INTO `sub_campaigns` (`id`, `campaign_id`, `name`, `slug`, `description`, `image_url`, `sort_order`, `is_default`, `created_at`, `updated_at`)
SELECT
  lower(hex(randomblob(16))),
  c.`id`,
  'General',
  'general',
  NULL,
  NULL,
  0,
  1,
  unixepoch(),
  unixepoch()
FROM `campaigns` c
WHERE NOT EXISTS (
  SELECT 1 FROM `sub_campaigns` sc WHERE sc.`campaign_id` = c.`id` AND sc.`is_default` = 1
);--> statement-breakpoint

-- 3. Rename game_sessions.group_id to sub_campaign_id (stays nullable for now; SQLite
--    auto-updates the FK's target-table reference from session_groups to sub_campaigns
--    when the table itself was renamed in step 1).
ALTER TABLE `game_sessions` RENAME COLUMN `group_id` TO `sub_campaign_id`;--> statement-breakpoint

-- 4. Rebuild arcs with a NOT NULL sub_campaign_id, backfilling every row to its
--    campaign's default sub-campaign (no prior grouping concept existed for arcs).
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_arcs` (
	`id` text PRIMARY KEY NOT NULL,
	`campaign_id` text NOT NULL,
	`sub_campaign_id` text NOT NULL,
	`name` text NOT NULL,
	`slug` text NOT NULL,
	`description` text,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'planned' NOT NULL,
	FOREIGN KEY (`campaign_id`) REFERENCES `campaigns`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`sub_campaign_id`) REFERENCES `sub_campaigns`(`id`) ON UPDATE no action ON DELETE no action
);--> statement-breakpoint
INSERT INTO `__new_arcs` (`id`, `campaign_id`, `sub_campaign_id`, `name`, `slug`, `description`, `sort_order`, `status`)
SELECT
  `id`, `campaign_id`,
  (SELECT sc.`id` FROM `sub_campaigns` sc WHERE sc.`campaign_id` = `arcs`.`campaign_id` AND sc.`is_default` = 1),
  `name`, `slug`, `description`, `sort_order`, `status`
FROM `arcs`;--> statement-breakpoint
DROP TABLE `arcs`;--> statement-breakpoint
ALTER TABLE `__new_arcs` RENAME TO `arcs`;--> statement-breakpoint
CREATE INDEX `idx_arcs_campaign` ON `arcs` (`campaign_id`);--> statement-breakpoint
CREATE INDEX `idx_arcs_sub_campaign` ON `arcs` (`sub_campaign_id`);--> statement-breakpoint

-- 5. Rebuild quests the same way.
CREATE TABLE `__new_quests` (
	`id` text PRIMARY KEY NOT NULL,
	`campaign_id` text NOT NULL,
	`sub_campaign_id` text NOT NULL,
	`name` text NOT NULL,
	`slug` text NOT NULL,
	`description` text,
	`status` text DEFAULT 'active' NOT NULL,
	`parent_quest_id` text,
	`entity_id` text,
	`is_secret` integer DEFAULT false NOT NULL,
	`assigned_character_ids_json` text,
	`log_file_path` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`campaign_id`) REFERENCES `campaigns`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`sub_campaign_id`) REFERENCES `sub_campaigns`(`id`) ON UPDATE no action ON DELETE no action
);--> statement-breakpoint
INSERT INTO `__new_quests` (`id`, `campaign_id`, `sub_campaign_id`, `name`, `slug`, `description`, `status`, `parent_quest_id`, `entity_id`, `is_secret`, `assigned_character_ids_json`, `log_file_path`, `created_at`, `updated_at`)
SELECT
  `id`, `campaign_id`,
  (SELECT sc.`id` FROM `sub_campaigns` sc WHERE sc.`campaign_id` = `quests`.`campaign_id` AND sc.`is_default` = 1),
  `name`, `slug`, `description`, `status`, `parent_quest_id`, `entity_id`, `is_secret`, `assigned_character_ids_json`, `log_file_path`, `created_at`, `updated_at`
FROM `quests`;--> statement-breakpoint
DROP TABLE `quests`;--> statement-breakpoint
ALTER TABLE `__new_quests` RENAME TO `quests`;--> statement-breakpoint
CREATE INDEX `idx_quests_campaign` ON `quests` (`campaign_id`);--> statement-breakpoint
CREATE INDEX `idx_quests_sub_campaign` ON `quests` (`sub_campaign_id`);--> statement-breakpoint

-- 6. Rebuild game_sessions to enforce NOT NULL on sub_campaign_id, backfilling any
--    NULL (previously ungrouped) session to its campaign's default sub-campaign while
--    preserving whatever sub-campaign a session was already explicitly assigned to.
CREATE TABLE `__new_game_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`campaign_id` text NOT NULL,
	`title` text NOT NULL,
	`slug` text NOT NULL,
	`session_number` integer NOT NULL,
	`scheduled_date` text,
	`status` text DEFAULT 'planned' NOT NULL,
	`summary` text,
	`arc_id` text,
	`chapter_id` text,
	`sub_campaign_id` text NOT NULL,
	`log_file_path` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`campaign_id`) REFERENCES `campaigns`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`arc_id`) REFERENCES `arcs`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`chapter_id`) REFERENCES `chapters`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`sub_campaign_id`) REFERENCES `sub_campaigns`(`id`) ON UPDATE no action ON DELETE no action
);--> statement-breakpoint
INSERT INTO `__new_game_sessions` (`id`, `campaign_id`, `title`, `slug`, `session_number`, `scheduled_date`, `status`, `summary`, `arc_id`, `chapter_id`, `sub_campaign_id`, `log_file_path`, `created_at`, `updated_at`)
SELECT
  `id`, `campaign_id`, `title`, `slug`, `session_number`, `scheduled_date`, `status`, `summary`, `arc_id`, `chapter_id`,
  COALESCE(`sub_campaign_id`, (SELECT sc.`id` FROM `sub_campaigns` sc WHERE sc.`campaign_id` = `game_sessions`.`campaign_id` AND sc.`is_default` = 1)),
  `log_file_path`, `created_at`, `updated_at`
FROM `game_sessions`;--> statement-breakpoint
DROP TABLE `game_sessions`;--> statement-breakpoint
ALTER TABLE `__new_game_sessions` RENAME TO `game_sessions`;--> statement-breakpoint
CREATE INDEX `idx_sessions_status` ON `game_sessions` (`status`);--> statement-breakpoint
CREATE INDEX `idx_sessions_arc` ON `game_sessions` (`arc_id`);--> statement-breakpoint
CREATE INDEX `idx_sessions_chapter` ON `game_sessions` (`chapter_id`);--> statement-breakpoint
CREATE INDEX `idx_sessions_sub_campaign` ON `game_sessions` (`sub_campaign_id`);--> statement-breakpoint
PRAGMA foreign_keys=ON;
