import { Request, Response } from 'express';
import { db } from '../../db';
import { branches, businesses } from '../../db/schema';
import { eq, and } from 'drizzle-orm';

export class BranchesController {
  
  // GET /api/v1/branches - Fetch all branches for the logged-in tenant
  static async getBranches(req: Request, res: Response) {
    try {
      const tenantId = req.headers['x-tenant-id'] as string;
      if (!tenantId) return res.status(400).json({ success: false, message: 'Tenant ID is required' });

      const allBranches = await db.select()
        .from(branches)
        .where(eq(branches.tenantId, tenantId));

      return res.status(200).json({ success: true, data: allBranches });
    } catch (error: any) {
      console.error('[BRANCHES GET]', error);
      return res.status(500).json({ success: false, message: error.message || 'Failed to fetch branches' });
    }
  }

  // POST /api/v1/branches - Create a new branch
  static async createBranch(req: Request, res: Response) {
    try {
      const tenantId = req.headers['x-tenant-id'] as string;
      if (!tenantId) return res.status(400).json({ success: false, message: 'Tenant ID is required' });

      const { name, location, isActive } = req.body;
      if (!name) return res.status(400).json({ success: false, message: 'Branch name is required' });

      // We must fetch the primary businessId for this tenant to satisfy the foreign key relation
      const businessRes = await db.select().from(businesses).where(eq(businesses.tenantId, tenantId)).limit(1);
      if (businessRes.length === 0) {
        return res.status(400).json({ success: false, message: 'No associated business profile found for this tenant.' });
      }
      
      const businessId = businessRes[0].id;

      const [newBranch] = await db.insert(branches).values({
        tenantId,
        businessId,
        name,
        location: location || '',
        isActive: isActive !== undefined ? isActive : true
      }).returning();

      return res.status(201).json({ success: true, message: 'Branch created successfully', data: newBranch });
    } catch (error: any) {
      console.error('[BRANCHES POST]', error);
      return res.status(500).json({ success: false, message: error.message || 'Failed to create branch' });
    }
  }

  // PUT /api/v1/branches/:id - Update or toggle status of a branch
  static async updateBranch(req: Request, res: Response) {
    try {
      const tenantId = req.headers['x-tenant-id'] as string;
      const id = req.params.id as string; // Fix: Explicitly cast as string to satisfy Drizzle
      
      if (!tenantId) return res.status(400).json({ success: false, message: 'Tenant ID is required' });

      const { name, location, isActive } = req.body;

      // Note: We use `and()` to strictly enforce that a user can only edit a branch if it belongs to their tenantId
      const [updatedBranch] = await db.update(branches)
        .set({
          ...(name && { name }),
          ...(location !== undefined && { location }),
          ...(isActive !== undefined && { isActive })
        })
        .where(and(
          eq(branches.id, id), 
          eq(branches.tenantId, tenantId)
        ))
        .returning();

      if (!updatedBranch) {
         return res.status(404).json({ success: false, message: 'Branch not found or unauthorized' });
      }

      return res.status(200).json({ success: true, message: 'Branch updated successfully', data: updatedBranch });
    } catch (error: any) {
      console.error('[BRANCHES PUT]', error);
      return res.status(500).json({ success: false, message: error.message || 'Failed to update branch' });
    }
  }
}