import { defineRelations } from 'drizzle-orm';
import { addresses } from './address';
import { auditLogs } from './auditLog';
import { cartItems } from './cartItem';
import { categories } from './category';
import { complaints } from './complaint';
import { media } from './media';
import { orders } from './order';
import { orderItems } from './orderItem';
import { products } from './product';
import { productReviews } from './productReview';
import { productVariants } from './productVariant';
import { settings } from './setting';
import { users } from './user';

export const schemaRelations = defineRelations(
  {
    users,
    media,
    auditLogs,
    addresses,
    categories,
    products,
    productVariants,
    cartItems,
    orders,
    orderItems,
    productReviews,
    complaints,
    settings,
  },
  (helpers) => ({
    users: {
      media: helpers.many.media({ alias: 'media_uploader' }),
      auditLogs: helpers.many.auditLogs({ alias: 'audit_actor' }),
      addresses: helpers.many.addresses(),
      cartItems: helpers.many.cartItems(),
      orders: helpers.many.orders(),
      complaints: helpers.many.complaints(),
    },
    media: {
      uploader: helpers.one.users({
        from: helpers.media.createdBy,
        to: helpers.users.id,
        alias: 'media_uploader',
      }),
      updater: helpers.one.users({
        from: helpers.media.updatedBy,
        to: helpers.users.id,
        alias: 'media_updater',
      }),
      deleter: helpers.one.users({
        from: helpers.media.deletedBy,
        to: helpers.users.id,
        alias: 'media_deleter',
      }),
    },
    auditLogs: {
      actor: helpers.one.users({
        from: helpers.auditLogs.actorId,
        to: helpers.users.id,
        alias: 'audit_actor',
      }),
    },
    addresses: {
      user: helpers.one.users({ from: helpers.addresses.userId, to: helpers.users.id }),
      orders: helpers.many.orders(),
    },
    categories: {
      products: helpers.many.products(),
    },
    products: {
      category: helpers.one.categories({ from: helpers.products.categoryId, to: helpers.categories.id }),
      variants: helpers.many.productVariants(),
      cartItems: helpers.many.cartItems(),
      orderItems: helpers.many.orderItems(),
    },
    productVariants: {
      product: helpers.one.products({ from: helpers.productVariants.productId, to: helpers.products.id }),
    },
    cartItems: {
      user: helpers.one.users({ from: helpers.cartItems.userId, to: helpers.users.id }),
      product: helpers.one.products({ from: helpers.cartItems.productId, to: helpers.products.id }),
    },
    orders: {
      user: helpers.one.users({ from: helpers.orders.userId, to: helpers.users.id }),
      address: helpers.one.addresses({ from: helpers.orders.addressId, to: helpers.addresses.id }),
      items: helpers.many.orderItems(),
      complaint: helpers.one.complaints({ from: helpers.orders.id, to: helpers.complaints.orderId }),
    },
    orderItems: {
      order: helpers.one.orders({ from: helpers.orderItems.orderId, to: helpers.orders.id }),
      product: helpers.one.products({ from: helpers.orderItems.productId, to: helpers.products.id }),
    },
    complaints: {
      order: helpers.one.orders({ from: helpers.complaints.orderId, to: helpers.orders.id }),
      user: helpers.one.users({ from: helpers.complaints.userId, to: helpers.users.id }),
    },
    productReviews: {
      user: helpers.one.users({ from: helpers.productReviews.userId, to: helpers.users.id }),
      product: helpers.one.products({ from: helpers.productReviews.productId, to: helpers.products.id }),
    },
  }),
);
