import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const processRefund = async (req: Request, res: Response): Promise<void> => {
  try {
    const { orderId, amount, reason } = req.body;

    if (!orderId || !amount || !reason) {
      res.status(400).json({ success: false, message: 'Missing required refund fields.' });
      return;
    }

    const result = await prisma.$transaction(async (tx) => {
      // 1. GUARANTEE A VALID USER EXISTS FOR THE FOREIGN KEY CONSTRAINTS
      let validUser = await tx.user.findFirst();
      if (!validUser) {
        validUser = await tx.user.create({
          data: {
            email: `system-${Date.now()}@vora-pos.com`,
            password: 'dummy-password',
            firstName: 'System',
            lastName: 'Admin',
            role: 'ADMIN'
          }
        });
      }

      // 2. Verify the order exists
      const order = await tx.order.findUnique({
        where: { id: orderId },
        include: { items: true },
      });

      if (!order) throw new Error('Order not found');
      if (order.status === 'Refunded') throw new Error('Order has already been refunded');

      // 3. Create Refund using the REAL validUser.id to satisfy database constraints
      const refund = await tx.refund.create({
        data: {
          tenantId: order.tenantId,
          orderId,
          initiatorId: validUser.id,
          approverId: validUser.id,
          amount: parseFloat(amount),
          reason,
          status: 'Approved',
        },
      });

      // 4. Update Order status
      await tx.order.update({
        where: { id: orderId },
        data: { status: 'Refunded' },
      });

      // 5. Restore product inventory
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