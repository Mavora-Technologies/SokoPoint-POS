import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

export const OrderController = {
  getAll: async (_req: Request, res: Response) => {
    try {
      const orders = await prisma.order.findMany({ 
        include: { items: true },
        orderBy: { createdAt: 'desc' } 
      });
      res.status(200).json({ data: orders });
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch orders' });
    }
  },

  create: async (req: Request, res: Response) => {
    try {
      const { orderNum, total, method, customer, items } = req.body;
      
      const newOrder = await prisma.$transaction(async (tx) => {
        // 1. Create the Order envelope
        const order = await tx.order.create({
          data: {
            orderNum: orderNum || `SOKO-${Math.floor(Math.random() * 1000000)}`,
            total: Number(total) || 0,
            method: method || 'CASH',
            customer: customer || 'Walk-in Customer'
          }
        });

        // 2. Process Items (This is what locks the product history!)
        if (items && Array.isArray(items)) {
          for (const item of items) {
            await tx.orderItem.create({
              data: {
                orderId: order.id,
                productId: item.productId,
                quantity: Number(item.quantity),
                price: Number(item.price)
              }
            });

            await tx.product.update({
              where: { id: item.productId },
              data: { stock: { decrement: Number(item.quantity) } }
            });
          }
        }
        return order;
      });

      // 3. Return the exact structure the frontend receipt component needs
      res.status(201).json({ 
        success: true,
        data: newOrder,
        orderNum: newOrder.orderNum,
        message: "Order created successfully"
      });
    } catch (error) {
      console.error('Failed to create order:', error);
      res.status(500).json({ error: 'Failed to process order' });
    }
  }
};