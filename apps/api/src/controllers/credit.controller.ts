import { Request, Response } from 'express';
import { prisma } from '../db/client';

export const getCreditAccounts = async (_req: Request, res: Response): Promise<void> => {
  try {
    const accounts = await (prisma as any).creditAccount.findMany({ 
      orderBy: { customerName: 'asc' } 
    });
    res.status(200).json({ success: true, data: accounts });
  } catch (error) {
    console.error('Failed to fetch credit accounts:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch credit accounts' });
  }
};

export const createCreditAccount = async (req: Request, res: Response): Promise<void> => {
  try {
    const { customerName, phone, balance, status } = req.body;
    const account = await (prisma as any).creditAccount.create({
      data: {
        customerName: String(customerName),
        phone: String(phone),
        balance: parseFloat(balance || 0),
        status: status || (parseFloat(balance || 0) > 0 ? 'Active' : 'Settled')
      }
    });
    res.status(201).json({ success: true, data: account });
  } catch (error) {
    console.error('Failed to create credit account:', error);
    res.status(500).json({ success: false, error: 'Failed to create credit account' });
  }
};

export const deleteCreditAccount = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    await (prisma as any).creditAccount.delete({
      where: { id: String(id) }
    });
    res.status(200).json({ success: true, message: 'Credit account deleted successfully' });
  } catch (error) {
    console.error('Failed to delete credit account:', error);
    res.status(500).json({ success: false, error: 'Failed to delete credit account' });
  }
};