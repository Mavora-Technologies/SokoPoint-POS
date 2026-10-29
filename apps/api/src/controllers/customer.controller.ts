import { Request, Response } from 'express';
import { prisma } from '../db/client';

export const getCustomers = async (_req: Request, res: Response): Promise<void> => {
  try {
    const customers = await (prisma as any).customer.findMany({ 
      orderBy: { name: 'asc' } 
    });
    res.status(200).json({ success: true, data: customers });
  } catch (error) {
    console.error('Failed to fetch customers:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch customers' });
  }
};

export const createCustomer = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, email, phone, points } = req.body;
    const customer = await (prisma as any).customer.create({
      data: {
        name: String(name),
        email: email ? String(email) : null,
        phone: phone ? String(phone) : null,
        points: points ? Number(points) : 0,
      }
    });
    res.status(201).json({ success: true, data: customer });
  } catch (error) {
    console.error('Failed to create customer:', error);
    res.status(500).json({ success: false, error: 'Failed to create customer' });
  }
};

export const deleteCustomer = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    await (prisma as any).customer.delete({
      where: { id: String(id) }
    });
    res.status(200).json({ success: true, message: 'Customer deleted successfully' });
  } catch (error: any) {
    console.error('Failed to delete customer:', error);
    if (error.code === 'P2003') {
      res.status(409).json({ success: false, error: 'Cannot delete: Customer has active orders or credit accounts.' });
      return;
    }
    res.status(500).json({ success: false, error: 'Failed to delete customer' });
  }
};