INSERT INTO relation_types (id, campaign_id, slug, forward_label, reverse_label, is_builtin)
SELECT lower(hex(randomblob(16))), c.id, 'parent_of', 'parent of', 'child of', 1
FROM campaigns c
WHERE NOT EXISTS (
  SELECT 1 FROM relation_types rt WHERE rt.campaign_id = c.id AND rt.slug = 'parent_of'
);--> statement-breakpoint
INSERT INTO relation_types (id, campaign_id, slug, forward_label, reverse_label, is_builtin)
SELECT lower(hex(randomblob(16))), c.id, 'spouse_of', 'spouse of', 'spouse of', 1
FROM campaigns c
WHERE NOT EXISTS (
  SELECT 1 FROM relation_types rt WHERE rt.campaign_id = c.id AND rt.slug = 'spouse_of'
);--> statement-breakpoint
INSERT INTO relation_types (id, campaign_id, slug, forward_label, reverse_label, is_builtin)
SELECT lower(hex(randomblob(16))), c.id, 'sibling_of', 'sibling of', 'sibling of', 1
FROM campaigns c
WHERE NOT EXISTS (
  SELECT 1 FROM relation_types rt WHERE rt.campaign_id = c.id AND rt.slug = 'sibling_of'
);
