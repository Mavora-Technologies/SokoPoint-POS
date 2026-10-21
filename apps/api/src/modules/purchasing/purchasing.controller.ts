import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const PurchasingController = {
  getAll: async (_req: Request, res: Response) => {
    try {
      const pos = await prisma.purchaseOrder.findMany({ orderBy: { createdAt: 'desc' } });
      res.status(200).json({ data: pos });
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch POs' });
    }
  },

  create: async (req: Request, res: Response) => {
    try {
      const { poNumber, supplierName, itemsSummary, totalCost } = req.body;
      const newPO = await prisma.purchaseOrder.create({
        data: {
          poNumber: poNumber || `PO-${Math.floor(Math.random() * 1000000)}`,
          supplierName: supplierName || 'Unknown Supplier',
          itemsSummary: itemsSummary || 'N/A',
          totalCost: Number(totalCost) || 0,
          status: 'Pending'
        }
      });
      res.status(201).json({ data: newPO });
    } catch (error) {
      res.status(500).json({ error: 'Failed to create purchase order' });
    }
  }
};