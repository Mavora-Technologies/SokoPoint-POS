import { Request, Response } from 'express';
import { prisma } from '../db/client';

export const getSuppliers = async (_req: Request, res: Response) => {
  try {
    const suppliers = await prisma.supplier.findMany({ orderBy: { createdAt: 'desc' } });
    res.status(200).json({ data: suppliers });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch suppliers' });
  }
};

export const createSupplier = async (req: Request, res: Response) => {
  try {
    const supplier = await prisma.supplier.create({
      data: {
        name: req.body.name,
        contactPerson: req.body.contactPerson,
        email: req.body.email,
        phone: req.body.phone,
        category: req.body.category || 'General',
      }
    });
    res.status(201).json({ data: supplier });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create supplier' });
  }
};