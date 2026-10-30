import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

export const ReportsController = {
  exportReport: async (req: Request, res: Response) => {
    try {
      const { format, startDate, endDate } = req.body;

      const dateFilter: any = {};
      if (startDate || endDate) {
        dateFilter.createdAt = {};
        if (startDate) dateFilter.createdAt.gte = new Date(startDate);
        if (endDate) {
          const end = new Date(endDate);
          end.setHours(23, 59, 59, 999);
          dateFilter.createdAt.lte = end;
        }
      }

      const orders = await prisma.order.findMany({
        where: dateFilter,
        include: { items: true },
        orderBy: { createdAt: 'desc' }
      });

      if (format === 'csv') {
        const headers = ['Order ID', 'Date', 'Customer', 'Cashier', 'Payment Method', 'Status', 'Total (KES)'];
        const rows = orders.map(o => [
          o.orderNum || o.id,
          o.createdAt ? new Date(o.createdAt).toISOString() : '',
          `"${o.customer || 'Walk-in'}"`,
          `"${(o as any).cashier || 'Cashier'}"`,
          o.method || 'CASH',
          o.status || 'Completed',
          o.total || 0
        ]);

        const csvContent = [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
        
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=sales_report_${new Date().toISOString().slice(0, 10)}.csv`);
        return res.status(200).send(csvContent);
      }

      const htmlContent = `
        <table>
          <tr><th>Order ID</th><th>Date</th><th>Customer</th><th>Cashier</th><th>Method</th><th>Status</th><th>Total</th></tr>
          ${orders.map(o => `<tr>
            <td>${o.orderNum || o.id}</td>
            <td>${o.createdAt ? new Date(o.createdAt).toLocaleString() : ''}</td>
            <td>${o.customer || 'Walk-in'}</td>
            <td>${(o as any).cashier || 'Cashier'}</td>
            <td>${o.method || 'CASH'}</td>
            <td>${o.status || 'Completed'}</td>
            <td>${o.total || 0}</td>
          </tr>`).join('')}
        </table>
      `;

      res.setHeader('Content-Type', 'application/vnd.ms-excel');
      res.setHeader('Content-Disposition', `attachment; filename=sales_report_${new Date().toISOString().slice(0, 10)}.xls`);
      return res.status(200).send(htmlContent);

    } catch (error) {
      console.error('Failed to export report:', error);
      res.status(500).json({ error: 'Failed to generate report export' });
    }
  }
};