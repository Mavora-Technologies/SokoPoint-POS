import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

export const SupplierController = {
  getAll: async (_req: Request, res: Response) => {
    try {
      const suppliers = await prisma.supplier.findMany({ orderBy: { name: 'asc' } });
      res.status(200).json({ data: suppliers });
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch suppliers' });
    }
  },

  create: async (req: Request, res: Response) => {
    try {
      const { name, contactPerson, email, phone, category } = req.body;
      const newSupplier = await prisma.supplier.create({
        data: {
          name,
          contactPerson: contactPerson || 'N/A',
          email: email || null,
          phone: phone || 'N/A',
          category: category || 'General'
        }
      });
      res.status(201).json({ data: newSupplier });
    } catch (error) {
      res.status(500).json({ error: 'Failed to create supplier' });
    }
  }
};