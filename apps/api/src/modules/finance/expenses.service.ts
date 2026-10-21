import { eq, and, desc } from 'drizzle-orm';
import { db } from '../../db';
import { expenses, expenseCategories } from '../../db/schema/finance';
import { users } from '../../db/schema';

export class ExpensesService {
  // --- CATEGORIES ---
  static async createCategory(tenantId: string, data: { name: string; description?: string }) {
    const [category] = await db.insert(expenseCategories).values({
      tenantId,
      name: data.name,
      description: data.description,
    }).returning();
    return category;
  }

  static async getCategories(tenantId: string) {
    return await db.select()
      .from(expenseCategories)
      .where(and(eq(expenseCategories.tenantId, tenantId), eq(expenseCategories.isActive, true)))
      .orderBy(expenseCategories.name);
  }

  // --- EXPENSES ---
  static async createExpense(tenantId: string, branchId: string, userId: string, data: any) {
    const [expense] = await db.insert(expenses).values({
      tenantId,
      branchId,
      userId,
      categoryId: data.categoryId,
      amount: data.amount.toString(),
      paymentMethod: data.paymentMethod,
      reference: data.reference,
      notes: data.notes,
      expenseDate: data.expenseDate ? new Date(data.expenseDate) : new Date(),
    }).returning();
    return expense;
  }

  static async getExpenses(tenantId: string, branchId: string) {
    return await db.select({
      id: expenses.id,
      amount: expenses.amount,
      paymentMethod: expenses.paymentMethod,
      reference: expenses.reference,
      notes: expenses.notes,
      expenseDate: expenses.expenseDate,
      categoryName: expenseCategories.name,
      userName: users.firstName,
    })
    .from(expenses)
    .leftJoin(expenseCategories, eq(expenses.categoryId, expenseCategories.id))
    .innerJoin(users, eq(expenses.userId, users.id))
    .where(and(eq(expenses.tenantId, tenantId), eq(expenses.branchId, branchId)))
    .orderBy(desc(expenses.expenseDate));
  }
}