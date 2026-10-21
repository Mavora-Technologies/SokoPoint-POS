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
    const { name, category, sellingPrice, stock, sku, imageUrl } = req.body;
    const newProduct = await prisma.product.create({
      data: {
        name: String(name),
        category: category ? String(category) : 'General',
        sellingPrice: Number(sellingPrice) || 0,
        stock: Number(stock) || 0,
        sku: sku ? String(sku) : null,
        imageUrl: imageUrl ? String(imageUrl) : null,
      } as any
    });
    res.status(201).json({ success: true, data: newProduct });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// THIS IS THE FUNCTION YOUR POS TERMINAL IS TRYING TO REACH
export const updateProduct = async (req: Request, res: Response): Promise<void> => {
  try {
    const rawId = req.params.id || req.query.id;
    const productId = Array.isArray(rawId) ? rawId[0] : rawId;

    if (!productId) {
      res.status(400).json({ success: false, message: 'ID required' });
      return;
    }

    const { name, category, sellingPrice, stock, sku, imageUrl } = req.body;

    const updatedProduct = await prisma.product.update({
      where: { id: String(productId) },
      data: {
        ...(name !== undefined && { name: String(name) }),
        ...(category !== undefined && { category: String(category) }),
        ...(sellingPrice !== undefined && { sellingPrice: Number(sellingPrice) }),
        ...(stock !== undefined && { stock: Number(stock) }), // Stock drops here
        ...(sku !== undefined && { sku: String(sku) }),
        ...(imageUrl !== undefined && { imageUrl: String(imageUrl) }),
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
    const productId = Array.isArray(rawId) ? rawId[0] : rawId;
    if (!productId) {
       res.status(400).json({ success: false, message: 'ID required' });
       return;
    }
    await prisma.product.delete({ where: { id: String(productId) } });
    res.status(200).json({ success: true, message: 'Deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Delete failed' });
  }
};