-- Organizations as entities: add entity_id FK and backfill paired entity rows.
-- Strategy: reuse each org's UUID as the entity row's UUID (no collision between tables).
-- Slug collision handling: if an entity with the same (campaign_id, slug) already exists,
-- the entity row gets slug '<orig>-org'; the org's own slug is unchanged.
ALTER TABLE `organizations` ADD `entity_id` text REFERENCES entities(id) ON DELETE SET NULL;--> statement-breakpoint

-- Backfill: insert a paired entity row for every existing organization
INSERT INTO `entities` (`id`, `campaign_id`, `type`, `name`, `slug`, `file_path`, `visibility`, `created_by`, `created_at`, `updated_at`)
SELECT
  o.`id`,
  o.`campaign_id`,
  'organization',
  o.`name`,
  CASE
    WHEN EXISTS (
      SELECT 1 FROM `entities` e
      WHERE e.`campaign_id` = o.`campaign_id` AND e.`slug` = o.`slug`
    )
    THEN o.`slug` || '-org'
    ELSE o.`slug`
  END,
  '',
  'members',
  (SELECT c.`created_by` FROM `campaigns` c WHERE c.`id` = o.`campaign_id`),
  o.`created_at`,
  o.`updated_at`
FROM `organizations` o;--> statement-breakpoint

-- Link every org to its new entity row
UPDATE `organizations` SET `entity_id` = `id`;--> statement-breakpoint

-- Index for joins
CREATE INDEX `idx_orgs_entity_id` ON `organizations` (`entity_id`);
