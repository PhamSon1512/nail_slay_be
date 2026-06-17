import { z } from 'zod';

export const ReviewSchema = z.object({
  id: z.string(),
  userId: z.string(),
  productId: z.string(),
  rating: z.number().min(1).max(5),
  content: z.string().nullable().optional(),
  imagesJson: z.string().nullable().optional(),
  adminReply: z.string().nullable().optional(),
  adminReplyAt: z.coerce.date().nullable().optional(),
  createdAt: z.coerce.date().nullable().optional(),
  updatedAt: z.coerce.date().nullable().optional(),
});

export const CreateReviewRequestSchema = z.object({
  productId: z.string(),
  rating: z.number().int().min(1).max(5),
  content: z.string().optional(),
  images: z.array(z.string().url()).optional(),
});

export const AdminReplyRequestSchema = z.object({
  adminReply: z.string().min(1),
});

export const ReviewWithUserSchema = ReviewSchema.extend({
  user: z
    .object({
      firstName: z.string().nullable().optional(),
      lastName: z.string().nullable().optional(),
      avatar: z.string().nullable().optional(),
    })
    .nullable()
    .optional(),
});
