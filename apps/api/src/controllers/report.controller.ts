import { Request, Response } from 'express';
import { prisma } from '../db/client';

export const getFinancialSummary = async (_req: Request, res: Response) => {
  try {
    const orders = await prisma.order.findMany();
    const expenses = await prisma.expense.findMany();

    const totalRevenue = orders.reduce((sum, order) => sum + order.total, 0);
    const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);
    const netProfit = totalRevenue - totalExpenses;

    res.status(200).json({
      data: {
        totalRevenue,
        totalExpenses,
        netProfit,
        totalOrders: orders.length,
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch report metrics' });
  }
};