import { z } from 'zod';

export const createProductSchema = z.object({
  name: z.string().min(2, 'Product name is required'),
  description: z.string().optional(),
  sku: z.string().optional(),
  barcode: z.string().optional(),
  categoryId: z.string().uuid('Invalid category ID').optional(),
  costPrice: z.number().min(0, 'Cost price cannot be negative'),
  sellingPrice: z.number().min(0, 'Selling price cannot be negative'),
  taxRate: z.number().min(0).optional().default(0),
  minimumStock: z.number().int().min(0).optional().default(0),
  reorderLevel: z.number().int().min(0).optional().default(0),
});