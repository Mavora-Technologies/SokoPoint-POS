import { Request, Response } from 'express';
import { prisma } from '../db/client';

export const getCategories = async (_req: Request, res: Response) => {
  try {
    const categories = await (prisma as any).category.findMany({ 
      orderBy: { name: 'asc' } 
    });
    res.status(200).json({ data: categories });
  } catch (error) {
    console.error('Fetch categories error:', error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
};

export const createCategory = async (req: Request, res: Response) => {
  try {
    const { name, description } = req.body;
    const category = await (prisma as any).category.create({
      data: {
        name,
        description: description || ''
      }
    });
    res.status(201).json({ data: category });
  } catch (error) {
    console.error('Create category error:', error);
    res.status(500).json({ error: 'Failed to create category' });
  }
};