import { z } from 'zod';

export const createShiftSchema = z.object({
  userId: z.string().uuid(),
  branchId: z.string().uuid().optional(),
  title: z.string().min(2),
  date: z.string().min(4),
  startTime: z.string().min(2),
  endTime: z.string().min(2),
});

export const clockInSchema = z.object({
  userId: z.string().uuid().optional(),
  branchId: z.string().uuid().optional(),
  method: z.enum(['PIN', 'BIOMETRIC', 'TERMINAL']).default('TERMINAL'),
});

export const createHandoverSchema = z.object({
  shiftId: z.string().uuid().optional(),
  branchId: z.string().uuid().optional(),
  notes: z.string().min(3),
  cashCounted: z.number().nonnegative().optional(),
  issuesFlagged: z.string().optional(),
});

export const openDrawerSchema = z.object({
  branchId: z.string().uuid().optional(),
  terminalName: z.string().min(1).default('POS Terminal 1'),
  openingFloat: z.number().nonnegative(),
});

export const closeDrawerSchema = z.object({
  actualCash: z.number().nonnegative(),
  notes: z.string().optional(),
});

export const createEmployeeSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional(),
  password: z.string().min(8),
  role: z
    .enum([
      'BUSINESS_ADMIN',
      'BRANCH_MANAGER',
      'STORE_MANAGER',
      'WHOLESALE_MANAGER',
      'CASHIER',
      'INVENTORY_MANAGER',
      'ACCOUNTANT',
    ])
    .default('CASHIER'),
  branchId: z.string().uuid().optional(),
});