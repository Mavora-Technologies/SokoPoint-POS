import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

export const CustomerController = {
  getAll: async (_req: Request, res: Response) => {
    try {
      const customers = await prisma.customer.findMany({ orderBy: { name: 'asc' } });
      res.status(200).json({ data: customers });
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch customers' });
    }
  },

  create: async (req: Request, res: Response) => {
    try {
      const { name, email, phone } = req.body;
      const newCustomer = await prisma.customer.create({
        data: {
          name: name || 'New Customer',
          email: email || null,
          phone: phone || null,
          points: 0
        }
      });
      res.status(201).json({ data: newCustomer });
    } catch (error) {
      res.status(500).json({ error: 'Failed to create customer' });
    }
  }
};