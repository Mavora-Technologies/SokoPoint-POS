import { pgTable, uuid, varchar, integer, timestamp, numeric, text } from 'drizzle-orm/pg-core';

export const floors = pgTable('floors', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').notNull(),
  branchId: uuid('branch_id').notNull(),
  name: varchar('name', { length: 100 }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const tables = pgTable('tables', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').notNull(),
  branchId: uuid('branch_id').notNull(),
  floorId: uuid('floor_id').notNull().references(() => floors.id),
  tableNumber: varchar('table_number', { length: 50 }).notNull(),
  capacity: integer('capacity').notNull().default(2),
  status: varchar('status', { length: 50 }).default('AVAILABLE').notNull(), // AVAILABLE, OCCUPIED, RESERVED, CLEANING
  currentOrderId: uuid('current_order_id'),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const kitchenStations = pgTable('kitchen_stations', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').notNull(),
  branchId: uuid('branch_id').notNull(),
  name: varchar('name', { length: 100 }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const recipes = pgTable('recipes', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').notNull(),
  productId: uuid('product_id').notNull().unique(), // Finished dish
  name: varchar('name', { length: 255 }).notNull(),
  instructions: text('instructions'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const recipeIngredients = pgTable('recipe_ingredients', {
  id: uuid('id').defaultRandom().primaryKey(),
  recipeId: uuid('recipe_id').notNull().references(() => recipes.id, { onDelete: 'cascade' }),
  ingredientProductId: uuid('ingredient_product_id').notNull(), // Raw inventory item
  quantityRequired: numeric('quantity_required', { precision: 10, scale: 4 }).notNull(),
  unit: varchar('unit', { length: 50 }).notNull(),
});