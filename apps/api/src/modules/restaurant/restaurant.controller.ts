import { Request, Response } from 'express';
import { RestaurantService } from './restaurant.service';
import { CreateFloorSchema, CreateTableSchema, UpdateTableStatusSchema, CreateRecipeSchema } from './restaurant.schema';

export const createFloor = async (req: Request, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const validated = CreateFloorSchema.parse(req.body);
    const floor = await RestaurantService.createFloor(req.user.tenantId, validated);
    return res.status(201).json({ message: 'Floor created', data: floor });
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
};

export const createTable = async (req: Request, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const validated = CreateTableSchema.parse(req.body);
    const table = await RestaurantService.createTable(req.user.tenantId, validated);
    return res.status(201).json({ message: 'Table created', data: table });
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
};

export const getTables = async (req: Request, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const branchId = (req.query.branchId as string) || req.user.branchId;
    const tableList = await RestaurantService.getTables(req.user.tenantId, branchId);
    return res.json({ data: tableList });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
};

export const updateTableStatus = async (req: Request, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const validated = UpdateTableStatusSchema.parse(req.body);
    const updated = await RestaurantService.updateTableStatus(
      req.user.tenantId,
      req.user.userId,
      validated
    );
    return res.json({ message: 'Table status updated', data: updated });
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
};

export const createRecipe = async (req: Request, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const validated = CreateRecipeSchema.parse(req.body);
    const recipe = await RestaurantService.createRecipe(
      req.user.tenantId,
      req.user.userId,
      validated
    );
    return res.status(201).json({ message: 'Recipe created', data: recipe });
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
};