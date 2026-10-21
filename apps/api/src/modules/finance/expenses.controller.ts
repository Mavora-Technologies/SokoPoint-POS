import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const ExpensesController = {
  getExpenses: async (_req: Request, res: Response) => {
    try {
      const expenses = await prisma.expense.findMany({ 
        orderBy: { expenseDate: 'desc' } 
      });
      // Map fields so the frontend gets 'title' and 'category' correctly
      const formatted = expenses.map((e: any) => ({
        id: e.id,
        title: e.title || e.notes || 'Expense Item',
        amount: e.amount,
        category: e.categoryName || e.category || 'Utilities',
        date: e.expenseDate || e.createdAt || new Date()
      }));
      res.status(200).json({ data: formatted });
    } catch (error) {
      console.error('Fetch Expenses Error:', error);
      res.status(500).json({ error: 'Failed to fetch expenses' });
    }
  },

  create: async (req: Request, res: Response) => {
    try {
      const { title, amount, category, paymentMethod, reference, notes, userName } = req.body;
      
      const newExpense = await prisma.expense.create({
        data: {
          amount: Number(amount) || 0,
          paymentMethod: paymentMethod || 'Cash',
          categoryName: category || req.body.categoryName || 'Utilities',
          notes: title || notes || 'Operational Expense',
          userName: userName || 'Admin',
        }
      });

      res.status(201).json({ 
        data: {
          id: newExpense.id,
          title: newExpense.notes || title,
          amount: newExpense.amount,
          category: newExpense.categoryName,
          date: newExpense.expenseDate || new Date()
        } 
      });
    } catch (error) {
      console.error('Create Expense Error:', error);
      res.status(500).json({ error: 'Failed to create expense' });
    }
  }
};