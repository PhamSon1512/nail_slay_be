CREATE TABLE `users` (
	`id` text PRIMARY KEY,
	`email` text NOT NULL,
	`password` text NOT NULL,
	`first_name` text,
	`last_name` text,
	`full_name` text,
	`role` text DEFAULT 'user',
	`refresh_token` text,
	`created_at` integer NOT NULL,
	`updated_at` integer,
	`deleted_at` integer,
	CONSTRAINT `fk_users_role_roles_slug_fk` FOREIGN KEY (`role`) REFERENCES `roles`(`slug`) ON DELETE SET NULL
);
--> statement-breakpoint
CREATE TABLE `media` (
	`id` text PRIMARY KEY,
	`file_name` text NOT NULL,
	`file_type` text NOT NULL,
	`file_size` integer NOT NULL,
	`bucket_key` text NOT NULL UNIQUE,
	`title` text,
	`description` text,
	`tags` text,
	`created_by` text,
	`updated_by` text,
	`deleted_by` text,
	`created_at` integer NOT NULL,
	`updated_at` integer,
	`deleted_at` integer,
	CONSTRAINT `fk_media_created_by_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`),
	CONSTRAINT `fk_media_updated_by_users_id_fk` FOREIGN KEY (`updated_by`) REFERENCES `users`(`id`),
	CONSTRAINT `fk_media_deleted_by_users_id_fk` FOREIGN KEY (`deleted_by`) REFERENCES `users`(`id`),
	CONSTRAINT "media_file_size_positive" CHECK("file_size" > 0)
);
--> statement-breakpoint
CREATE TABLE `permissions` (
	`id` text PRIMARY KEY,
	`resource` text NOT NULL,
	`action` text NOT NULL,
	`description` text,
	`created_at` integer NOT NULL,
	`updated_at` integer
);
--> statement-breakpoint
CREATE TABLE `role_permissions` (
	`role_slug` text NOT NULL,
	`permission_id` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer,
	CONSTRAINT `role_permissions_pk` PRIMARY KEY(`role_slug`, `permission_id`),
	CONSTRAINT `fk_role_permissions_role_slug_roles_slug_fk` FOREIGN KEY (`role_slug`) REFERENCES `roles`(`slug`) ON DELETE CASCADE,
	CONSTRAINT `fk_role_permissions_permission_id_permissions_id_fk` FOREIGN KEY (`permission_id`) REFERENCES `permissions`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE TABLE `roles` (
	`slug` text PRIMARY KEY,
	`name` text NOT NULL,
	`description` text,
	`parent_slug` text,
	`created_at` integer NOT NULL,
	`updated_at` integer,
	CONSTRAINT `fk_roles_parent_slug_roles_slug_fk` FOREIGN KEY (`parent_slug`) REFERENCES `roles`(`slug`) ON DELETE SET NULL,
	CONSTRAINT "roles_slug_no_spaces" CHECK("slug" NOT LIKE '% %'),
	CONSTRAINT "roles_slug_lowercase" CHECK("slug" = lower("slug"))
);
--> statement-breakpoint
CREATE INDEX `user_deleted_at_idx` ON `users` (`deleted_at`);--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_active_udx` ON `users` (`email`) WHERE "users"."deleted_at" IS NULL;--> statement-breakpoint
CREATE INDEX `media_created_by_idx` ON `media` (`created_by`);--> statement-breakpoint
CREATE INDEX `media_updated_by_idx` ON `media` (`updated_by`);--> statement-breakpoint
CREATE INDEX `media_deleted_by_idx` ON `media` (`deleted_by`);--> statement-breakpoint
CREATE INDEX `media_deleted_at_idx` ON `media` (`deleted_at`);--> statement-breakpoint
CREATE UNIQUE INDEX `permission_resource_action_idx` ON `permissions` (`resource`,`action`);--> statement-breakpoint
CREATE INDEX `role_permissions_role_idx` ON `role_permissions` (`role_slug`);