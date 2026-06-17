import type { DrizzleDB } from '../../@types';
import { and, desc, eq, sql } from 'drizzle-orm';
import { orderItems, orders, productReviews, users } from '../../models';
import { throwError } from '../../utils';

export class ReviewService {
  constructor(private readonly db: DrizzleDB) {}

  async createReview(userId: string, data: { productId: string; rating: number; content?: string; images?: string[] }) {
    // Check if the user has purchased the product
    const hasPurchased = await this.db
      .select({ id: orders.id })
      .from(orders)
      .innerJoin(orderItems, eq(orders.id, orderItems.orderId))
      .where(
        and(
          eq(orders.userId, userId),
          eq(orderItems.productId, data.productId),
          // We assume COMPLETED or similar status means the user has the product
          // Adjust the status string based on actual business logic if needed.
          eq(orders.status, 'COMPLETED'),
        ),
      )
      .limit(1)
      .get();

    if (!hasPurchased) {
      return throwError.badRequest('Bạn cần mua sản phẩm này và đơn hàng đã hoàn thành để có thể đánh giá.');
    }

    const imagesJson = data.images && data.images.length > 0 ? JSON.stringify(data.images) : null;

    const [review] = await this.db
      .insert(productReviews)
      .values({
        userId,
        productId: data.productId,
        rating: data.rating,
        content: data.content,
        imagesJson,
      })
      .returning();

    return review;
  }

  async getReviewsByProduct(productId: string, limit: number, offset: number) {
    const query = this.db
      .select({
        review: productReviews,
        user: {
          firstName: users.firstName,
          lastName: users.lastName,
          avatar: users.avatar,
        },
      })
      .from(productReviews)
      .leftJoin(users, eq(productReviews.userId, users.id))
      .where(eq(productReviews.productId, productId))
      .orderBy(desc(productReviews.createdAt));

    const data = await query.limit(limit).offset(offset).all();

    const [totalRecord] = await this.db
      .select({ count: sql<number>`cast(count(${productReviews.id}) as integer)` })
      .from(productReviews)
      .where(eq(productReviews.productId, productId));

    return {
      data: data.map((d) => ({
        ...d.review,
        user: d.user,
      })),
      total: totalRecord?.count || 0,
    };
  }

  async replyToReview(reviewId: string, adminReply: string) {
    const [updated] = await this.db
      .update(productReviews)
      .set({
        adminReply,
        adminReplyAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(productReviews.id, reviewId))
      .returning();

    if (!updated) {
      return throwError.notFound('Review');
    }

    return updated;
  }
}
