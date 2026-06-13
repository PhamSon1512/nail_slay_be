import { env } from 'cloudflare:test';
import { eq } from 'drizzle-orm';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { addresses, cartItems, categories, products, users } from '../../../models';
import { ECOMMERCE_DDL } from '../../../test/ecommerce-ddl';
import { AUDIT_LOGS_DDL, bearerHeader, getDb, jsonRequest, makeTestApp, USERS_DDL, USERS_IDX } from '../../../test/helpers';
import { hashPassword } from '../../../utils/password';
import AuthRoutes from '../../auth';
import CartRoutes from '../../cart';
import CheckoutRoutes from '../index';

const authApp = makeTestApp('/auth', AuthRoutes);
const cartApp = makeTestApp('/cart', CartRoutes);
const checkoutApp = makeTestApp('/checkout', CheckoutRoutes);

async function setupSchema() {
  await env.DB.exec(USERS_DDL);
  for (const idx of USERS_IDX) await env.DB.exec(idx);
  await env.DB.exec(AUDIT_LOGS_DDL);
  for (const ddl of ECOMMERCE_DDL) await env.DB.exec(ddl);
}

async function createUser(email: string, password: string) {
  const hashed = await hashPassword(password);
  const [user] = await getDb().insert(users).values({ email, password: hashed, role: 'user' }).returning();
  return user;
}

async function loginToken(email: string, password: string) {
  const res = await authApp.fetch(new Request('http://localhost/auth/login', jsonRequest('POST', { email, password })), env);
  const body = (await res.json()) as { access_token: string };
  return body.access_token;
}

beforeAll(async () => {
  await setupSchema();
});

beforeEach(async () => {
  await getDb().delete(cartItems);
  await getDb().delete(products);
  await getDb().delete(categories);
  await getDb().delete(addresses);
  await getDb().delete(users);
});

describe('E-commerce checkout flow', () => {
  it('login returns access_token and user object', async () => {
    await createUser('buyer@test.com', 'password123');

    const res = await authApp.fetch(
      new Request('http://localhost/auth/login', jsonRequest('POST', { email: 'buyer@test.com', password: 'password123' })),
      env,
    );

    expect(res.status).toBe(200);
    const body = (await res.json()) as { access_token: string; user: { email: string } };
    expect(body.access_token).toBeTruthy();
    expect(body.user.email).toBe('buyer@test.com');
  });

  it('checkout deducts stock and clears cart', async () => {
    await createUser('buyer@test.com', 'password123');
    const token = await loginToken('buyer@test.com', 'password123');
    const user = await getDb().select().from(users).where(eq(users.email, 'buyer@test.com')).get();

    const [category] = await getDb().insert(categories).values({ name: 'Test', slug: 'test' }).returning();
    const [product] = await getDb()
      .insert(products)
      .values({ categoryId: category.id, name: 'Nail', slug: 'nail', price: 100000, stock: 10, imageUrls: [] })
      .returning();
    const [address] = await getDb()
      .insert(addresses)
      .values({ userId: user!.id, detail: '123 Street', isDefault: true })
      .returning();

    await cartApp.fetch(
      new Request('http://localhost/cart', jsonRequest('POST', { product_id: product.id, quantity: 2 }, bearerHeader(token))),
      env,
    );

    const checkoutRes = await checkoutApp.fetch(
      new Request(
        'http://localhost/checkout',
        jsonRequest('POST', { address_id: address.id, payment_method: 'BANK_TRANSFER' }, bearerHeader(token)),
      ),
      env,
    );

    expect(checkoutRes.status).toBe(201);
    const checkoutBody = (await checkoutRes.json()) as { order: { total_amount: number; status: string } };
    expect(checkoutBody.order.total_amount).toBe(200000);
    expect(checkoutBody.order.status).toBe('PENDING_PAYMENT');

    const updatedProduct = await getDb().select().from(products).where(eq(products.id, product.id)).get();
    expect(updatedProduct?.stock).toBe(8);

    const cartRows = await getDb().select().from(cartItems).where(eq(cartItems.userId, user!.id)).all();
    expect(cartRows.length).toBe(0);
  });
});

describe('Order status transitions', () => {
  it('user can mark order as RECEIVED from DELIVERED', async () => {
    const { canUserTransition } = await import('../../../utils/orderStatus');
    expect(canUserTransition('DELIVERED', 'RECEIVED')).toBe(true);
    expect(canUserTransition('DELIVERED', 'COMPLAINED')).toBe(true);
    expect(canUserTransition('PENDING_PAYMENT', 'RECEIVED')).toBe(false);
  });
});
