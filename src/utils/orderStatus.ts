export const ORDER_STATUSES = [
  'PENDING_PAYMENT',
  'PAID',
  'SHIPPING',
  'DELIVERED',
  'RECEIVED',
  'COMPLAINED',
  'CANCELLED',
  'RESOLVED',
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const COMPLAINT_STATUSES = ['OPEN', 'RESOLVED'] as const;
export type ComplaintStatus = (typeof COMPLAINT_STATUSES)[number];

export const PAYMENT_METHODS = ['BANK_TRANSFER'] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

const ADMIN_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PENDING_PAYMENT: ['PAID', 'CANCELLED'],
  PAID: ['SHIPPING'],
  SHIPPING: ['DELIVERED'],
  DELIVERED: [],
  RECEIVED: [],
  COMPLAINED: ['RESOLVED'],
  CANCELLED: [],
  RESOLVED: [],
};

const USER_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PENDING_PAYMENT: [],
  PAID: [],
  SHIPPING: [],
  DELIVERED: ['RECEIVED', 'COMPLAINED'],
  RECEIVED: [],
  COMPLAINED: [],
  CANCELLED: [],
  RESOLVED: [],
};

export function canAdminTransition(from: OrderStatus, to: OrderStatus): boolean {
  return ADMIN_TRANSITIONS[from]?.includes(to) ?? false;
}

export function canUserTransition(from: OrderStatus, to: OrderStatus): boolean {
  return USER_TRANSITIONS[from]?.includes(to) ?? false;
}
