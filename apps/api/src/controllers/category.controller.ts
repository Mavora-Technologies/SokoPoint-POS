import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const getCategories = async (req: Request, res: Response): Promise<void> => {
  try {
    const categories = await prisma.category.findMany({
      orderBy: { createdAt: 'desc' }
    });
    res.status(200).json({ success: true, data: categories });
  } catch (error) {
    console.error('Failed to fetch categories:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const createCategory = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, description } = req.body;
    const newCategory = await prisma.category.create({
      data: {
        name: String(name).trim(),
        description: description ? String(description) : null,
      }
    });
    res.status(201).json({ success: true, data: newCategory });
  } catch (error) {
    console.error('Create failed:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const deleteCategory = async (req: Request, res: Response): Promise<void> => {
  try {
    const rawId = req.params.id || req.query.id;
    const categoryId = String(Array.isArray(rawId) ? rawId[0] : rawId);
    
    if (!categoryId) {
       res.status(400).json({ success: false, message: 'ID required' });
       return;
    }

    // 1. Fetch the category to get its exact name
    const category = await prisma.category.findUnique({
      where: { id: categoryId }
    });

    if (!category) {
      res.status(404).json({ success: false, message: 'Category not found' });
      return;
    }

    // 2. STRICT CHECK: Verify if this category is assigned to ANY product
    const linkedProductsCount = await prisma.product.count({
      where: { category: category.name }
    });

    // 3. BLOCK DELETION if products are using it
    if (linkedProductsCount > 0) {
      res.status(409).json({ 
        success: false, 
        message: `The category "${category.name}" cannot be deleted because it is currently assigned to ${linkedProductsCount} product(s). Please reassign those products first.` 
      });
      return;
    }

    // 4. SAFE TO DELETE (No products linked)
    await prisma.category.delete({ where: { id: categoryId } });
    res.status(200).json({ success: true, message: 'Deleted' });

  } catch (error: any) {
    console.error('Delete failed:', error);
    res.status(500).json({ success: false, message: 'Delete failed' });
  }
};