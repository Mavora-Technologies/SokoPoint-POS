import { Request, Response } from 'express';
import { prisma } from '../db/client';

export const getInventory = async (_req: Request, res: Response) => {
  try {
    // Fetch all product fields without restrictions
    const inventory = await prisma.product.findMany({ 
      orderBy: { createdAt: 'desc' } 
    });
    res.status(200).json({ data: inventory });
  } catch (error) {
    console.error('Fetch inventory error:', error);
    res.status(500).json({ error: 'Failed to fetch inventory' });
  }
};

export const adjustStock = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { stock } = req.body;

    const updated = await prisma.product.update({
      where: { id: id as string },
      data: { stock: parseInt(stock, 10) }
    } as any);

    res.status(200).json({ data: updated });
  } catch (error) {
    console.error('Adjust stock error:', error);
    res.status(500).json({ error: 'Failed to adjust stock' });
  }
};