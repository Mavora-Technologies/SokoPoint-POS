import { Request, Response } from 'express';
import { prisma } from '../db/client';

export const getShifts = async (_req: Request, res: Response) => {
  try {
    const shifts = await prisma.shift.findMany({ orderBy: { createdAt: 'desc' } });
    res.status(200).json({ data: shifts });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch shifts' });
  }
};

export const createShift = async (req: Request, res: Response) => {
  try {
    const shift = await prisma.shift.create({ data: req.body });
    res.status(201).json({ data: shift });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create shift' });
  }
};

export const endShift = async (req: Request, res: Response) => {
  try {
    const shift = await prisma.shift.update({
      where: { id: req.params.id as string },
      data: { status: 'Closed', endTime: new Date() }
    });
    res.status(200).json({ data: shift });
  } catch (error) {
    res.status(500).json({ error: 'Failed to end shift' });
  }
};