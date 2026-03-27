CREATE TABLE `organization_locations` (
	`organization_id` text NOT NULL,
	`location_entity_id` text NOT NULL,
	PRIMARY KEY(`organization_id`, `location_entity_id`),
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`location_entity_id`) REFERENCES `entities`(`id`) ON UPDATE no action ON DELETE cascade
);
