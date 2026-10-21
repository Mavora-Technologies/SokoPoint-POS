import { Request, Response } from 'express';
import { prisma } from '../db/client';

export const getTills = async (req: Request, res: Response) => {
  try {
    const tills = await prisma.till.findMany({ orderBy: { createdAt: 'asc' } });
    res.status(200).json({ data: tills });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch tills' });
  }
};

export const createTill = async (req: Request, res: Response) => {
  try {
    const till = await prisma.till.create({ data: req.body });
    res.status(201).json({ data: till });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create till' });
  }
};

export const updateTillStatus = async (req: Request, res: Response) => {
  try {
    const till = await prisma.till.update({
      where: { id: req.params.id as string }, // Cast as string to satisfy Prisma's unique input type
      data: req.body
    });
    res.status(200).json({ data: till });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update till' });
  }
};