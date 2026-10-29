import { Request, Response } from 'express';
import { prisma } from '../db/client';

export const getSuppliers = async (_req: Request, res: Response): Promise<void> => {
  try {
    const suppliers = await prisma.supplier.findMany({ 
      orderBy: { createdAt: 'desc' } 
    });
    res.status(200).json({ success: true, data: suppliers });
  } catch (error) {
    console.error('Failed to fetch suppliers:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch suppliers' });
  }
};

export const createSupplier = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, contactPerson, email, phone, category } = req.body;
    const supplier = await prisma.supplier.create({
      data: {
        name: String(name),
        contactPerson: String(contactPerson),
        email: email ? String(email) : null,
        phone: String(phone),
        category: category ? String(category) : 'General',
      }
    });
    res.status(201).json({ success: true, data: supplier });
  } catch (error) {
    console.error('Failed to create supplier:', error);
    res.status(500).json({ success: false, error: 'Failed to create supplier' });
  }
};

export const deleteSupplier = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    
    // Optional: Check if supplier is linked to products/inventory before deletion
    await prisma.supplier.delete({
      where: { id: String(id) }
    });

    res.status(200).json({ success: true, message: 'Supplier deleted successfully' });
  } catch (error: any) {
    console.error('Failed to delete supplier:', error);
    
    // Catch PostgreSQL foreign key constraint violations (P2003)
    if (error.code === 'P2003') {
      res.status(409).json({ success: false, error: 'Cannot delete: Supplier is linked to existing items.' });
      return;
    }

    res.status(500).json({ success: false, error: 'Failed to delete supplier' });
  }
};