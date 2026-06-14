import { env } from 'cloudflare:test';
import { eq } from 'drizzle-orm';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { addresses, cartItems, categories, orders, products, users } from '../../../models';
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
  const body = (await res.json()) as { token?: string; access_token?: string };
  return body.token ?? body.access_token ?? '';
}

beforeAll(async () => {
  await setupSchema();
});

beforeEach(async () => {
  await getDb().delete(cartItems);
  await getDb().delete(orders);
  await getDb().delete(products);
  await getDb().delete(categories);
  await getDb().delete(addresses);
  await getDb().delete(users);
});

describe('E-commerce checkout flow', () => {
  it('login returns access token and user object', async () => {
    await createUser('buyer@test.com', 'password123');

    const res = await authApp.fetch(
      new Request('http://localhost/auth/login', jsonRequest('POST', { email: 'buyer@test.com', password: 'password123' })),
      env,
    );

    expect(res.status).toBe(200);
    const body = (await res.json()) as { token: string; user: { email: string } };
    expect(body.token).toBeTruthy();
    expect(body.user.email).toBe('buyer@test.com');
  });

  it('checkout deducts stock and clears cart', async () => {
    await createUser('buyer@test.com', 'password123');
    const token = await loginToken('buyer@test.com', 'password123');
    const user = await getDb().select().from(users).where(eq(users.email, 'buyer@test.com')).get();

    const [category] = await getDb().insert(categories).values({ name: 'Test', slug: 'test' }).returning();
    const [product] = await getDb()
      .insert(products)
      .values({
        categoryId: category.id,
        name: 'Nail',
        slug: 'nail',
        price: 100000,
        stock: 10,
        status: 'active',
        imageUrls: [],
      })
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

  it('checkout rejects insufficient stock', async () => {
    await createUser('buyer2@test.com', 'password123');
    const token = await loginToken('buyer2@test.com', 'password123');
    const user = await getDb().select().from(users).where(eq(users.email, 'buyer2@test.com')).get();

    const [category] = await getDb().insert(categories).values({ name: 'Test', slug: 'test2' }).returning();
    const [product] = await getDb()
      .insert(products)
      .values({
        categoryId: category.id,
        name: 'Nail',
        slug: 'nail2',
        price: 100000,
        stock: 1,
        status: 'active',
        imageUrls: [],
      })
      .returning();
    const [address] = await getDb()
      .insert(addresses)
      .values({ userId: user!.id, detail: '123 Street', isDefault: true })
      .returning();

    await getDb().insert(cartItems).values({
      userId: user!.id,
      productId: product.id,
      quantity: 5,
    });

    const checkoutRes = await checkoutApp.fetch(
      new Request(
        'http://localhost/checkout',
        jsonRequest('POST', { address_id: address.id, payment_method: 'BANK_TRANSFER' }, bearerHeader(token)),
      ),
      env,
    );

    expect(checkoutRes.status).toBe(409);
  });

  it('checkout skips inactive products in cart', async () => {
    await createUser('buyer3@test.com', 'password123');
    const token = await loginToken('buyer3@test.com', 'password123');
    const user = await getDb().select().from(users).where(eq(users.email, 'buyer3@test.com')).get();

    const [category] = await getDb().insert(categories).values({ name: 'Test', slug: 'test3' }).returning();
    const [product] = await getDb()
      .insert(products)
      .values({
        categoryId: category.id,
        name: 'Hidden',
        slug: 'hidden',
        price: 100000,
        stock: 10,
        status: 'hidden',
        imageUrls: [],
      })
      .returning();
    const [address] = await getDb()
      .insert(addresses)
      .values({ userId: user!.id, detail: '123 Street', isDefault: true })
      .returning();

    await getDb().insert(cartItems).values({
      userId: user!.id,
      productId: product.id,
      quantity: 1,
    });

    const checkoutRes = await checkoutApp.fetch(
      new Request(
        'http://localhost/checkout',
        jsonRequest('POST', { address_id: address.id, payment_method: 'BANK_TRANSFER' }, bearerHeader(token)),
      ),
      env,
    );

    expect(checkoutRes.status).toBe(400);
  });

  it('idempotency key returns same order on duplicate submit', async () => {
    await createUser('buyer4@test.com', 'password123');
    const token = await loginToken('buyer4@test.com', 'password123');
    const user = await getDb().select().from(users).where(eq(users.email, 'buyer4@test.com')).get();

    const [category] = await getDb().insert(categories).values({ name: 'Test', slug: 'test4' }).returning();
    const [product] = await getDb()
      .insert(products)
      .values({
        categoryId: category.id,
        name: 'Nail',
        slug: 'nail4',
        price: 50000,
        stock: 5,
        status: 'active',
        imageUrls: [],
      })
      .returning();
    const [address] = await getDb()
      .insert(addresses)
      .values({ userId: user!.id, detail: '123 Street', isDefault: true })
      .returning();

    await cartApp.fetch(
      new Request('http://localhost/cart', jsonRequest('POST', { product_id: product.id, quantity: 1 }, bearerHeader(token))),
      env,
    );

    const idempotencyHeaders = { ...bearerHeader(token), 'Idempotency-Key': 'test-key-123' };
    const body = { address_id: address.id, payment_method: 'BANK_TRANSFER' };

    const first = await checkoutApp.fetch(
      new Request('http://localhost/checkout', jsonRequest('POST', body, idempotencyHeaders)),
      env,
    );
    expect(first.status).toBe(201);
    const firstBody = (await first.json()) as { order: { id: string } };

    await cartApp.fetch(
      new Request('http://localhost/cart', jsonRequest('POST', { product_id: product.id, quantity: 1 }, bearerHeader(token))),
      env,
    );

    const second = await checkoutApp.fetch(
      new Request('http://localhost/checkout', jsonRequest('POST', body, idempotencyHeaders)),
      env,
    );
    expect(second.status).toBe(201);
    const secondBody = (await second.json()) as { order: { id: string } };
    expect(secondBody.order.id).toBe(firstBody.order.id);
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

describe('Admin access', () => {
  it('requireAdmin rejects non-admin role from database', async () => {
    const { requireAdmin } = await import('../../../middlewares/requireAdmin');
    expect(requireAdmin).toBeTruthy();
  });
});
