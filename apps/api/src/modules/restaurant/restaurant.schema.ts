import { z } from 'zod';

export const CreateFloorSchema = z.object({
  branchId: z.string().uuid('Valid branch ID required'),
  name: z.string().min(1, 'Floor name is required'),
});

export const CreateTableSchema = z.object({
  branchId: z.string().uuid('Valid branch ID required'),
  floorId: z.string().uuid('Valid floor ID required'),
  tableNumber: z.string().min(1, 'Table number is required'),
  capacity: z.number().int().positive().default(2),
});

export const UpdateTableStatusSchema = z.object({
  tableId: z.string().uuid('Valid table ID required'),
  status: z.enum(['AVAILABLE', 'OCCUPIED', 'RESERVED', 'CLEANING']),
  currentOrderId: z.string().uuid().optional().nullable(),
});

export const RecipeIngredientSchema = z.object({
  ingredientProductId: z.string().uuid('Valid ingredient product ID required'),
  quantityRequired: z.number().positive('Quantity must be greater than 0'),
  unit: z.string().min(1, 'Unit is required'),
});

export const CreateRecipeSchema = z.object({
  productId: z.string().uuid('Valid product ID required'),
  name: z.string().min(1, 'Recipe name is required'),
  instructions: z.string().optional(),
  ingredients: z.array(RecipeIngredientSchema).min(1, 'At least one ingredient is required'),
});

export type CreateFloorInput = z.infer<typeof CreateFloorSchema>;
export type CreateTableInput = z.infer<typeof CreateTableSchema>;
export type UpdateTableStatusInput = z.infer<typeof UpdateTableStatusSchema>;
export type CreateRecipeInput = z.infer<typeof CreateRecipeSchema>;