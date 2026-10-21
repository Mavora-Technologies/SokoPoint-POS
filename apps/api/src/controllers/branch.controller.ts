import { Request, Response } from 'express';
import { prisma } from '../db/client';

export const getBranches = async (req: Request, res: Response) => {
  try {
    const branches = await prisma.branch.findMany({ orderBy: { createdAt: 'asc' } });
    res.status(200).json({ data: branches });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch branches' });
  }
};

export const createBranch = async (req: Request, res: Response) => {
  try {
    const branch = await prisma.branch.create({ data: req.body });
    res.status(201).json({ data: branch });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create branch' });
  }
};