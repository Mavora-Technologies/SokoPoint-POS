import { z } from 'zod';

export const createOrderSchema = z.object({
  paymentMethod: z.string().min(1, 'Payment method is required'),
  items: z.array(
    z.object({
      productId: z.string().uuid(),
      quantity: z.number().min(1),
      unitPrice: z.number().min(0),
    })
  ).min(1, 'Cart cannot be empty'),
});