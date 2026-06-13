import type { HonoCtx } from '../../@types';
import type { CreateAddressSchema, UpdateAddressSchema } from './openapi';
import type { z } from 'zod';
import { and, eq } from 'drizzle-orm';
import { addresses } from '../../models';
import { throwError } from '../../utils';

export async function listAddresses(c: HonoCtx) {
  const userId = c.var.jwtPayload.id!;
  return c.var.db.select().from(addresses).where(eq(addresses.userId, userId)).all();
}

export async function createAddress(c: HonoCtx, input: z.infer<typeof CreateAddressSchema>) {
  const userId = c.var.jwtPayload.id!;

  return c.var.db.transaction(async (tx) => {
    if (input.isDefault) {
      await tx.update(addresses).set({ isDefault: false, updatedAt: new Date() }).where(eq(addresses.userId, userId));
    }

    const [created] = await tx
      .insert(addresses)
      .values({ userId, detail: input.detail, isDefault: input.isDefault ?? false })
      .returning();
    return created;
  });
}

export async function updateAddress(c: HonoCtx, id: string, input: z.infer<typeof UpdateAddressSchema>) {
  const userId = c.var.jwtPayload.id!;

  const existing = await c.var.db
    .select()
    .from(addresses)
    .where(and(eq(addresses.id, id), eq(addresses.userId, userId)))
    .get();
  if (!existing) return throwError.notFound('Address not found', { id });

  return c.var.db.transaction(async (tx) => {
    if (input.isDefault) {
      await tx.update(addresses).set({ isDefault: false, updatedAt: new Date() }).where(eq(addresses.userId, userId));
    }

    const [updated] = await tx
      .update(addresses)
      .set({ ...input, updatedAt: new Date() })
      .where(and(eq(addresses.id, id), eq(addresses.userId, userId)))
      .returning();
    return updated;
  });
}

export async function deleteAddress(c: HonoCtx, id: string) {
  const userId = c.var.jwtPayload.id!;

  const existing = await c.var.db
    .select()
    .from(addresses)
    .where(and(eq(addresses.id, id), eq(addresses.userId, userId)))
    .get();
  if (!existing) return throwError.notFound('Address not found', { id });

  await c.var.db.delete(addresses).where(and(eq(addresses.id, id), eq(addresses.userId, userId)));
  return { success: true };
}
