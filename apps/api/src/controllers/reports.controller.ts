import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

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

export const exportTransactions = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user;
    if (!user || (user.role !== 'ADMIN' && user.role !== 'MANAGER')) {
      res.status(403).json({ success: false, message: 'Unauthorized. Only Admins and Managers can export reports.' });
      return;
    }

    const { startDate, endDate, type } = req.query;
    
    const dateFilter: any = {};
    if (startDate && endDate) {
      dateFilter.gte = new Date(startDate as string);
      const end = new Date(endDate as string);
      end.setHours(23, 59, 59, 999);
      dateFilter.lte = end;
    }

    if (type === 'sales' || type === 'reconciliation') {
      const orders = await prisma.order.findMany({
        where: { createdAt: Object.keys(dateFilter).length > 0 ? dateFilter : undefined },
        include: { items: { include: { product: true } } },
        orderBy: { createdAt: 'desc' }
      });

      const headers = ['Order Number', 'Date', 'Customer', 'Payment Method', 'Status', 'Total (KES)', 'Items Summary'];
      const rows = orders.map(o => {
        const date = o.createdAt.toISOString().split('T')[0];
        const itemsSummary = o.items.map(i => `${i.quantity}x ${i.product?.name || 'Unknown'}`).join('; ');
        return `"${o.orderNum}","${date}","${o.customer}","${o.method}","${o.status}","${o.total}","${itemsSummary}"`;
      });

      const csvContent = [headers.join(','), ...rows].join('\n');
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=sales_reconciliation_${startDate || 'all'}_to_${endDate || 'all'}.csv`);
      res.status(200).send(csvContent);

    } else if (type === 'expenses') {
      const expenses = await prisma.expense.findMany({
        where: { expenseDate: Object.keys(dateFilter).length > 0 ? dateFilter : undefined },
        orderBy: { expenseDate: 'desc' }
      });

      const headers = ['Date', 'Category', 'Authorized By', 'Payment Method', 'Amount (KES)', 'Notes', 'Reference'];
      const rows = expenses.map(e => {
        const date = e.expenseDate.toISOString().split('T')[0];
        return `"${date}","${e.categoryName || 'General'}","${e.userName}","${e.paymentMethod}","${e.amount}","${e.notes || ''}","${e.reference || ''}"`;
      });

      const csvContent = [headers.join(','), ...rows].join('\n');
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=expenses_report_${startDate || 'all'}_to_${endDate || 'all'}.csv`);
      res.status(200).send(csvContent);

    } else {
      res.status(400).json({ success: false, message: 'Invalid report type requested' });
    }
  } catch (error) {
    console.error('Export Error:', error);
    res.status(500).json({ success: false, message: 'Failed to generate export file' });
  }
};