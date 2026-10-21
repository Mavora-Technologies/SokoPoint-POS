import { z } from 'zod';

export const AdjustStockSchema = z.object({
  productId: z.string().min(1, "Product ID is required"),
  branchId: z.string().min(1, "Branch ID is required"),
  quantityChange: z.number(),
  movementType: z.string(),
  notes: z.string().optional().default('Manual adjustment'),
});