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
      
      // ENFORCEMENT: Process the order, create immutable line items, and adjust stock in a single transaction
      const newOrder = await prisma.$transaction(async (tx) => {
        
        // 1. Create the Order envelope
        const order = await tx.order.create({
          data: {
            orderNum: orderNum || `VORA-${Math.floor(Math.random() * 1000000)}`,
            total: Number(total) || 0,
            method: method || 'CASH',
            customer: customer || 'Walk-in Customer'
          }
        });

        // 2. Process Items if provided
        if (items && Array.isArray(items)) {
          for (const item of items) {
            
            // Generate the OrderItem mapping, freezing the current product price forever
            await tx.orderItem.create({
              data: {
                orderId: order.id,
                productId: item.productId,
                quantity: Number(item.quantity),
                price: Number(item.price)
              }
            });

            // Immediately decrement the active inventory stock
            await tx.product.update({
              where: { id: item.productId },
              data: {
                stock: { decrement: Number(item.quantity) }
              }
            });
          }
        }
        
        return order;
      });

      res.status(201).json({ data: newOrder });
    } catch (error) {
      console.error('Failed to create order:', error);
      res.status(500).json({ error: 'Failed to create order and process inventory' });
    }
  }
};