ALTER TABLE `user` ADD `role` text NOT NULL DEFAULT 'user';--> statement-breakpoint
UPDATE `user` SET `role` = 'admin' WHERE `email` = 'ludobermejo@gmail.com';
