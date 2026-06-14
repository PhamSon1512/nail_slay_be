import { z } from 'zod';
import { throwError } from './errors';

export const ProductVariantInputSchema = z.object({
  sku: z.string().optional().nullable(),
  name: z.string().min(1).optional(),
  color: z.string().optional().nullable(),
  size: z.string().optional().nullable(),
  price: z.coerce.number().int().positive().optional(),
  stock: z.coerce.number().int().min(0).optional(),
  imageUrl: z.string().optional().nullable(),
});

export const ProductVariantsInputSchema = z.array(ProductVariantInputSchema).max(50);

export function parseProductVariants(raw: unknown) {
  const parsed = ProductVariantsInputSchema.safeParse(raw);
  if (!parsed.success) {
    return throwError.validation('Dữ liệu biến thể không hợp lệ', { issues: parsed.error.flatten() });
  }
  return parsed.data;
}
