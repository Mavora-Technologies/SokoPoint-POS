import { pgTable, uuid, varchar, numeric, timestamp, text, boolean } from 'drizzle-orm/pg-core';
import { orders } from './orders';
import { users } from './users';

export const deliveryZones = pgTable('delivery_zones', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').notNull(),
  branchId: uuid('branch_id').notNull(),
  name: varchar('name', { length: 100 }).notNull(),
  baseFee: numeric('base_fee', { precision: 10, scale: 2 }).notNull().default('0.00'),
  estimatedMinutes: numeric('estimated_minutes').notNull(),
  active: boolean('active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const riders = pgTable('riders', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').notNull(),
  branchId: uuid('branch_id').notNull(),
  userId: uuid('user_id').references(() => users.id),
  vehicleType: varchar('vehicle_type', { length: 50 }).notNull(),
  licensePlate: varchar('license_plate', { length: 50 }),
  status: varchar('status', { length: 50 }).default('AVAILABLE').notNull(),
  active: boolean('active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const deliveries = pgTable('deliveries', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').notNull(),
  orderId: uuid('order_id').notNull().references(() => orders.id),
  riderId: uuid('rider_id').references(() => riders.id),
  deliveryZoneId: uuid('delivery_zone_id').references(() => deliveryZones.id),
  status: varchar('status', { length: 50 }).default('PENDING').notNull(),
  trackingCode: varchar('tracking_code', { length: 100 }).unique().notNull(),
  isCod: boolean('is_cod').default(false).notNull(),
  codAmountToCollect: numeric('cod_amount_to_collect', { precision: 12, scale: 2 }),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const deliveryStatusHistory = pgTable('delivery_status_history', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').notNull(),
  deliveryId: uuid('delivery_id').notNull().references(() => deliveries.id, { onDelete: 'cascade' }),
  status: varchar('status', { length: 50 }).notNull(),
  notes: text('notes'),
  recordedAt: timestamp('recorded_at').defaultNow().notNull(),
  recordedBy: uuid('recorded_by').notNull(),
});

export const proofOfDelivery = pgTable('proof_of_delivery', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').notNull(),
  deliveryId: uuid('delivery_id').notNull().references(() => deliveries.id, { onDelete: 'cascade' }),
  mediaUrl: varchar('media_url', { length: 255 }).notNull(),
  mediaId: varchar('media_id', { length: 255 }).notNull(),
  signatureName: varchar('signature_name', { length: 100 }),
  capturedAt: timestamp('captured_at').defaultNow().notNull(),
});