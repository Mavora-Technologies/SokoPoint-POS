//apps/api/src/db/schema/inventory.ts
import { pgTable, uuid, integer, varchar, timestamp, text } from 'drizzle-orm/pg-core';
import { tenants, branches, products, users } from '../schema';

export const inventory = pgTable('inventory', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  branchId: uuid('branch_id').notNull().references(() => branches.id, { onDelete: 'cascade' }),
  productId: uuid('product_id').notNull().references(() => products.id, { onDelete: 'cascade' }),
  quantity: integer('quantity').notNull().default(0),
  lastUpdatedBy: uuid('last_updated_by').references(() => users.id, { onDelete: 'set null' }),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const stockMovements = pgTable('stock_movements', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  branchId: uuid('branch_id').notNull().references(() => branches.id, { onDelete: 'cascade' }),
  productId: uuid('product_id').notNull().references(() => products.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
  movementType: varchar('movement_type', { length: 50 }).notNull(), // SALE, RECEIPT, ADJUSTMENT, TRANSFER
  quantity: integer('quantity').notNull(), // Can be negative for deductions
  referenceId: uuid('reference_id'),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});