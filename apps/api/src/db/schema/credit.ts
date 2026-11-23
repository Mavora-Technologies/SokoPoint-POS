import { pgTable, uuid, varchar, decimal, timestamp } from 'drizzle-orm/pg-core';
import { tenants } from '../schema';
import { customers } from './customers';

export const creditAccounts = pgTable('credit_accounts', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }).notNull(),
  customerId: uuid('customer_id').references(() => customers.id, { onDelete: 'set null' }),
  customerName: varchar('customer_name', { length: 255 }).notNull(),
  phone: varchar('phone', { length: 50 }).notNull(),
  balance: decimal('balance', { precision: 12, scale: 2 }).default('0.00').notNull(),
  creditLimit: decimal('credit_limit', { precision: 12, scale: 2 }).default('0.00').notNull(),
  status: varchar('status', { length: 50 }).default('Active').notNull(),
  lastTxDate: timestamp('last_tx_date').defaultNow().notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});