import { pgTable, uuid, varchar, numeric, timestamp, date, text, boolean } from 'drizzle-orm/pg-core';
import { orders, tenants } from '../schema'; // <-- FIX: Correctly imports from your main schema file

export const customers = pgTable('customers', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }), // <-- FIX: Added missing tenant relation
  branchId: uuid('branch_id'), // Nullable for global customers
  name: varchar('name', { length: 255 }).notNull(),
  phone: varchar('phone', { length: 50 }),
  email: varchar('email', { length: 255 }),
  address: text('address'),
  birthday: date('birthday'),
  customerType: varchar('customer_type', { length: 50 }).default('RETAIL').notNull(),
  creditLimit: numeric('credit_limit', { precision: 12, scale: 2 }).default('0.00'),
  outstandingBalance: numeric('outstanding_balance', { precision: 12, scale: 2 }).default('0.00'),
  loyaltyPoints: numeric('loyalty_points', { precision: 10, scale: 2 }).default('0.00'),
  active: boolean('active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const loyaltyTransactions = pgTable('loyalty_transactions', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }), // <-- FIX: Added missing tenant relation
  customerId: uuid('customer_id').notNull().references(() => customers.id, { onDelete: 'cascade' }),
  orderId: uuid('order_id').references(() => orders.id), // Nullable if adjustment was manual
  transactionType: varchar('transaction_type', { length: 50 }).notNull(), // EARN, REDEEM, ADJUSTMENT
  points: numeric('points', { precision: 10, scale: 2 }).notNull(), // Can be negative for redemptions
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});