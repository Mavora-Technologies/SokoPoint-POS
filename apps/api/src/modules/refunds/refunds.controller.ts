import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const processRefund = async (req: Request, res: Response): Promise<void> => {
  try {
    const { orderId, initiatorId, approverId, amount, reason } = req.body;

    if (!orderId || !initiatorId || !approverId || !amount || !reason) {
      res.status(400).json({ success: false, message: 'All refund fields are required.' });
      return;
    }

    // Execute all database operations in a single transaction
    const result = await prisma.$transaction(async (tx) => {
      // 1. Verify the order exists and isn't already refunded
      const order = await tx.order.findUnique({
        where: { id: orderId },
        include: { items: true },
      });

      if (!order) throw new Error('Order not found');
      if (order.status === 'Refunded') throw new Error('Order has already been refunded');

      // 2. Create the immutable Refund ledger record
      const refund = await tx.refund.create({
        data: {
          tenantId: order.tenantId,
          orderId,
          initiatorId,
          approverId,
          amount: parseFloat(amount),
          reason,
          status: 'Approved',
        },
      });

      // 3. Update original Order status
      await tx.order.update({
        where: { id: orderId },
        data: { status: 'Refunded' },
      });

      // 4. Restore product inventory for every item in the order
      for (const item of order.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { increment: item.quantity } },
        });
      }

      return refund;
    });

    res.status(201).json({ success: true, data: result });
  } catch (error: any) {
    console.error('Refund processing error:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to process refund' });
  }
};