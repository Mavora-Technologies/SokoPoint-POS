import { Request, Response } from 'express';
import { prisma } from '../db/client';

export const getCustomers = async (_req: Request, res: Response) => {
  try {
    const customers = await prisma.customer.findMany({ orderBy: { createdAt: 'desc' } });
    res.status(200).json({ data: customers });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch customers' });
  }
};

export const createCustomer = async (req: Request, res: Response) => {
  try {
    const customer = await prisma.customer.create({ data: req.body });
    res.status(201).json({ data: customer });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create customer' });
  }
};