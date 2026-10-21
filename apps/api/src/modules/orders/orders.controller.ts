import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

export const OrderController = {
  getAll: async (_req: Request, res: Response) => {
    try {
      const orders = await prisma.order.findMany({ orderBy: { createdAt: 'desc' } });
      res.status(200).json({ data: orders });
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch orders' });
    }
  },

  create: async (req: Request, res: Response) => {
    try {
      const { orderNum, total, method, customer } = req.body;
      const newOrder = await prisma.order.create({
        data: {
          orderNum: orderNum || `VORA-${Math.floor(Math.random() * 1000000)}`,
          total: Number(total) || 0,
          method: method || 'CASH',
          customer: customer || 'Walk-in Customer'
        }
      });
      res.status(201).json({ data: newOrder });
    } catch (error) {
      res.status(500).json({ error: 'Failed to create order' });
    }
  }
};