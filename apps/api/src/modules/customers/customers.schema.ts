import { z } from 'zod';

export const CreateCustomerSchema = z.object({
  name: z.string().min(1, 'Customer name is required'),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  address: z.string().optional(),
  birthday: z.string().optional(), // YYYY-MM-DD
  customerType: z.enum(['RETAIL', 'WHOLESALE', 'CORPORATE']).default('RETAIL'),
  creditLimit: z.number().min(0).default(0),
});

export const AddLoyaltyPointsSchema = z.object({
  customerId: z.string().uuid(),
  points: z.number(), // Positive to add, negative to deduct
  notes: z.string().optional(),
  orderId: z.string().uuid().optional(),
});

export type CreateCustomerInput = z.infer<typeof CreateCustomerSchema>;
export type AddLoyaltyPointsInput = z.infer<typeof AddLoyaltyPointsSchema>;