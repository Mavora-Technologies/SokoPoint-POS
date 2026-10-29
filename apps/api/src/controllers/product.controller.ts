import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const getProducts = async (req: Request, res: Response): Promise<void> => {
  try {
    const products = await prisma.product.findMany({
      orderBy: { createdAt: 'desc' }
    });
    res.status(200).json({ success: true, data: products });
  } catch (error) {
    console.error('Failed to fetch products:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const createProduct = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, category, sellingPrice, stock, sku, imageUrl, status } = req.body;
    const newProduct = await prisma.product.create({
      data: {
        name: String(name),
        category: category ? String(category) : 'General',
        sellingPrice: Number(sellingPrice) || 0,
        stock: Number(stock) || 0,
        sku: sku ? String(sku) : null,
        imageUrl: imageUrl ? String(imageUrl) : null,
        status: status ? String(status) : 'ACTIVE',
      } as any
    });
    res.status(201).json({ success: true, data: newProduct });
  } catch (error) {
    console.error('Create failed:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const updateProduct = async (req: Request, res: Response): Promise<void> => {
  try {
    const rawId = req.params.id || req.query.id;
    const productId = Array.isArray(rawId) ? rawId[0] : rawId;

    if (!productId) {
      res.status(400).json({ success: false, message: 'ID required' });
      return;
    }

    // Extracted 'status' to allow the frontend to Deactivate products
    const { name, category, sellingPrice, stock, sku, imageUrl, status } = req.body;

    const updatedProduct = await prisma.product.update({
      where: { id: String(productId) },
      data: {
        ...(name !== undefined && { name: String(name) }),
        ...(category !== undefined && { category: String(category) }),
        ...(sellingPrice !== undefined && { sellingPrice: Number(sellingPrice) }),
        ...(stock !== undefined && { stock: Number(stock) }), 
        ...(sku !== undefined && { sku: String(sku) }),
        ...(imageUrl !== undefined && { imageUrl: String(imageUrl) }),
        ...(status !== undefined && { status: String(status) }), // Allows INACTIVE updates
      },
    });

    res.status(200).json({ success: true, data: updatedProduct });
  } catch (error) {
    console.error('Update failed:', error);
    res.status(500).json({ success: false, message: 'Update failed' });
  }
};

export const deleteProduct = async (req: Request, res: Response): Promise<void> => {
  try {
    const rawId = req.params.id || req.query.id;
    const productId = String(Array.isArray(rawId) ? rawId[0] : rawId);
    
    if (!productId) {
       res.status(400).json({ success: false, message: 'ID required' });
       return;
    }

    // 1. STRICT CHECK: Verify if this product exists in ANY past order
    const salesCount = await prisma.orderItem.count({
      where: { productId: productId }
    });

    // 2. BLOCK DELETION if it has been sold
    if (salesCount > 0) {
      res.status(409).json({ 
        success: false, 
        message: 'Cannot delete this product because it has existing sales records. To preserve sales history and financial transparency, deactivate the product instead.' 
      });
      return;
    }

    // 3. SAFE TO DELETE (Never been sold)
    await prisma.product.delete({ where: { id: productId } });
    res.status(200).json({ success: true, message: 'Deleted' });

  } catch (error: any) {
    console.error('Delete failed:', error);
    
    // Failsafe: Catch native PostgreSQL constraint violations (P2003)
    if (error.code === 'P2003') {
      res.status(409).json({ success: false, message: 'Cannot delete: Linked to existing records.' });
      return;
    }
    
    res.status(500).json({ success: false, message: 'Delete failed' });
  }
};