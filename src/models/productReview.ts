import { createId } from '@paralleldrive/cuid2';
import { index, integer, sqliteTable as table, text } from 'drizzle-orm/sqlite-core';
import { products } from './product';
import { users } from './user';

export const productReviews = table(
  'product_reviews',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => createId()),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    productId: text('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    rating: integer('rating').notNull(), // 1 to 5
    content: text('content'), // optional text content
    imagesJson: text('images_json'), // JSON array of image URLs
    adminReply: text('admin_reply'), // reply from admin
    adminReplyAt: integer('admin_reply_at', { mode: 'timestamp' }),
    createdAt: integer('created_at', { mode: 'timestamp' })
      .notNull()
      .$default(() => new Date()),
    updatedAt: integer('updated_at', { mode: 'timestamp' }),
    deletedAt: integer('deleted_at', { mode: 'timestamp' }),
  },
  (t) => [index('product_reviews_user_id_idx').on(t.userId), index('product_reviews_product_id_idx').on(t.productId)],
);
