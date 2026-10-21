import { Request, Response } from 'express';
import { prisma } from '../db/client';

export const getCreditAccounts = async (_req: Request, res: Response) => {
  try {
    const accounts = await (prisma as any).creditAccount.findMany({ orderBy: { customerName: 'asc' } });
    res.status(200).json({ data: accounts });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch credit accounts' });
  }
};

export const createCreditAccount = async (req: Request, res: Response) => {
  try {
    const { customerName, phone, balance } = req.body;
    const account = await (prisma as any).creditAccount.create({
      data: {
        customerName,
        phone,
        balance: parseFloat(balance || 0),
        status: 'Active'
      }
    });
    res.status(201).json({ data: account });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create credit account' });
  }
};