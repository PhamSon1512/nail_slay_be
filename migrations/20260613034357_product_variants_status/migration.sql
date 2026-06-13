ALTER TABLE `products` DROP COLUMN `size_options`;
ALTER TABLE `products` DROP COLUMN `form_options`;
ALTER TABLE `products` ADD COLUMN `status` text DEFAULT 'active' NOT NULL;
CREATE INDEX `products_status_idx` ON `products` (`status`);

CREATE TABLE `product_variants` (
  `id` text PRIMARY KEY NOT NULL,
  `product_id` text NOT NULL,
  `sku` text,
  `name` text NOT NULL,
  `color` text,
  `size` text,
  `price` integer NOT NULL,
  `stock` integer DEFAULT 0 NOT NULL,
  `image_url` text,
  `sort_order` integer DEFAULT 0 NOT NULL,
  `created_at` integer NOT NULL,
  `updated_at` integer,
  FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE cascade
);

CREATE UNIQUE INDEX `product_variants_sku_udx` ON `product_variants` (`sku`);
CREATE INDEX `product_variants_product_id_idx` ON `product_variants` (`product_id`);
CREATE INDEX `product_variants_sort_order_idx` ON `product_variants` (`sort_order`);