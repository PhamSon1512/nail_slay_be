PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_media` (
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
	CONSTRAINT `fk_media_created_by_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE SET NULL,
	CONSTRAINT `fk_media_updated_by_users_id_fk` FOREIGN KEY (`updated_by`) REFERENCES `users`(`id`) ON DELETE SET NULL,
	CONSTRAINT `fk_media_deleted_by_users_id_fk` FOREIGN KEY (`deleted_by`) REFERENCES `users`(`id`) ON DELETE SET NULL,
	CONSTRAINT "media_file_size_positive" CHECK("file_size" > 0),
	CONSTRAINT "media_file_type_mime" CHECK(instr("file_type", '/') > 0)
);
--> statement-breakpoint
INSERT INTO `__new_media`(`id`, `file_name`, `file_type`, `file_size`, `bucket_key`, `title`, `description`, `tags`, `created_by`, `updated_by`, `deleted_by`, `created_at`, `updated_at`, `deleted_at`) SELECT `id`, `file_name`, `file_type`, `file_size`, `bucket_key`, `title`, `description`, `tags`, `created_by`, `updated_by`, `deleted_by`, `created_at`, `updated_at`, `deleted_at` FROM `media`;--> statement-breakpoint
DROP TABLE `media`;--> statement-breakpoint
ALTER TABLE `__new_media` RENAME TO `media`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `media_created_by_idx` ON `media` (`created_by`);--> statement-breakpoint
CREATE INDEX `media_updated_by_idx` ON `media` (`updated_by`);--> statement-breakpoint
CREATE INDEX `media_deleted_by_idx` ON `media` (`deleted_by`);--> statement-breakpoint
CREATE INDEX `media_deleted_at_idx` ON `media` (`deleted_at`);--> statement-breakpoint
CREATE INDEX `users_refresh_token_idx` ON `users` (`refresh_token`);--> statement-breakpoint
ALTER TABLE `role_permissions` DROP COLUMN `updated_at`;