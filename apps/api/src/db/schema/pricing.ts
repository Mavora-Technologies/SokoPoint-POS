import { pgTable, uuid, varchar, decimal, boolean, timestamp } from 'drizzle-orm/pg-core';

export const promotions = pgTable('promotions', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  code: varchar('code', { length: 100 }),
  discountType: varchar('discount_type', { length: 20 }).default('PERCENTAGE').notNull(),
  discountValue: decimal('discount_value', { precision: 12, scale: 2 }).default('0.00').notNull(),
  minPurchase: decimal('min_purchase', { precision: 12, scale: 2 }).default('0.00').notNull(),
  startDate: timestamp('start_date'),
  endDate: timestamp('end_date'),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});