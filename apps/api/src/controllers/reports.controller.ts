import { Request, Response } from 'express';
import { prisma } from '../db/client';

export const getDashboardAnalytics = async (_req: Request, res: Response) => {
  try {
    const [products, orders, expenses] = await Promise.all([
      prisma.product.findMany(),
      prisma.order.findMany({ orderBy: { createdAt: 'desc' } }),
      prisma.expense.findMany(),
    ]);

    const totalRevenue = orders.reduce((sum, o) => sum + Number(o.total || 0), 0);
    const totalExpenses = expenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);
    const netProfit = totalRevenue - totalExpenses;
    const lowStockCount = products.filter((p: any) => Number(p.stock || 0) <= Number(p.minimumStock || 5)).length;

    const categoryMap: { [key: string]: number } = {};
    products.forEach((p: any) => {
      const cat = p.category || 'Uncategorized';
      categoryMap[cat] = (categoryMap[cat] || 0) + 1;
    });

    const categoryDistribution = Object.keys(categoryMap).map(name => ({
      name,
      count: categoryMap[name],
    }));

    res.status(200).json({
      success: true,
      data: {
        totalRevenue,
        totalOrders: orders.length,
        totalProducts: products.length,
        totalExpenses,
        netProfit,
        lowStockCount,
        recentOrders: orders.slice(0, 5),
        categoryDistribution,
      },
    });
  } catch (error) {
    console.error('Analytics Error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch analytics' });
  }
};