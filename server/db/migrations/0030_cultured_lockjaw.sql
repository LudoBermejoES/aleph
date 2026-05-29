CREATE INDEX `idx_tags_campaign` ON `tags` (`campaign_id`);--> statement-breakpoint
CREATE INDEX `idx_arcs_campaign` ON `arcs` (`campaign_id`);--> statement-breakpoint
CREATE INDEX `idx_quests_campaign` ON `quests` (`campaign_id`);--> statement-breakpoint
CREATE INDEX `idx_currencies_campaign` ON `currencies` (`campaign_id`);--> statement-breakpoint
CREATE INDEX `idx_inventories_campaign` ON `inventories` (`campaign_id`);--> statement-breakpoint
CREATE INDEX `idx_items_campaign` ON `items` (`campaign_id`);--> statement-breakpoint
CREATE INDEX `idx_orgs_campaign` ON `organizations` (`campaign_id`);