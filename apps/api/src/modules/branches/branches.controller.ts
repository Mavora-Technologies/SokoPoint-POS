import { Request, Response } from 'express';
import { db } from '../../db';
import { sql } from 'drizzle-orm';

type AuthRequest = Request & {
  auth?: { tenantId?: string; userId?: string; email?: string; role?: string };
  user?: { tenantId?: string; userId?: string; email?: string; role?: string };
};

const rowsOf = (result: any): any[] => (Array.isArray(result) ? result : result?.rows || []);

const getTenantId = (req: AuthRequest): string | null =>
  req.auth?.tenantId || req.user?.tenantId || (req.headers['x-tenant-id'] as string) || null;

export class BranchesController {
  // GET /api/v1/branches
  static async getBranches(req: AuthRequest, res: Response) {
    try {
      const tenantId = getTenantId(req);
      if (!tenantId) {
        return res.status(401).json({ success: false, message: 'Unauthorized: missing tenant context' });
      }

      const result = await db.execute(sql`
        SELECT id,
               tenant_id AS "tenantId",
               business_id AS "businessId",
               name,
               COALESCE(branch_code, '') AS "branchCode",
               COALESCE(location, '') AS location,
               COALESCE(phone, '') AS phone,
               COALESCE(email, '') AS email,
               COALESCE(is_headquarters, FALSE) AS "isHeadquarters",
               COALESCE(is_active, TRUE) AS "isActive",
               created_at AS "createdAt"
        FROM branches
        WHERE tenant_id = ${tenantId}
        ORDER BY COALESCE(is_headquarters, FALSE) DESC, created_at ASC
      `);

      return res.status(200).json({ success: true, data: rowsOf(result) });
    } catch (error: any) {
      console.error('[BRANCHES GET ERROR]', error);
      return res.status(500).json({
        success: false,
        message: error?.cause?.message || error?.message || 'Failed to fetch branches',
      });
    }
  }

  // POST /api/v1/branches
  static async createBranch(req: AuthRequest, res: Response) {
    try {
      const tenantId = getTenantId(req);
      if (!tenantId) {
        return res.status(401).json({ success: false, message: 'Unauthorized: missing tenant context' });
      }

      const {
        name,
        branchCode = '',
        location = '',
        phone = '',
        email = '',
        isHeadquarters = false,
        isActive = true,
      } = req.body || {};

      if (!name || !String(name).trim()) {
        return res.status(400).json({ success: false, message: 'Branch name is required.' });
      }

      // Resolve primary businessId for this tenant
      const bizRes = await db.execute(sql`
        SELECT id FROM businesses WHERE tenant_id = ${tenantId} LIMIT 1
      `);
      const businessId = rowsOf(bizRes)[0]?.id;
      if (!businessId) {
        return res.status(400).json({
          success: false,
          message: 'No associated business profile found for this tenant.',
        });
      }

      const safeName = String(name).trim();
      const safeCode = String(branchCode || `BR-${Math.floor(10 + Math.random() * 89)}`)
        .trim()
        .toUpperCase();
      const safeLocation = String(location || '').trim();
      const safePhone = String(phone || '').trim();
      const safeEmail = String(email || '').trim().toLowerCase();

      const inserted = await db.execute(sql`
        INSERT INTO branches (
          tenant_id, business_id, name, branch_code, location, phone, email, is_headquarters, is_active
        )
        VALUES (
          ${tenantId}, ${businessId}, ${safeName}, ${safeCode}, ${safeLocation},
          ${safePhone}, ${safeEmail}, ${Boolean(isHeadquarters)}, ${Boolean(isActive)}
        )
        RETURNING id,
                  tenant_id AS "tenantId",
                  business_id AS "businessId",
                  name,
                  COALESCE(branch_code, '') AS "branchCode",
                  COALESCE(location, '') AS location,
                  COALESCE(phone, '') AS phone,
                  COALESCE(email, '') AS email,
                  COALESCE(is_headquarters, FALSE) AS "isHeadquarters",
                  COALESCE(is_active, TRUE) AS "isActive",
                  created_at AS "createdAt"
      `);

      return res.status(201).json({
        success: true,
        message: 'Branch created successfully',
        data: rowsOf(inserted)[0],
      });
    } catch (error: any) {
      console.error('[BRANCHES POST ERROR]', error);
      return res.status(500).json({
        success: false,
        message: error?.cause?.message || error?.message || 'Failed to create branch',
      });
    }
  }

  // PUT /api/v1/branches/:id
  static async updateBranch(req: AuthRequest, res: Response) {
    try {
      const tenantId = getTenantId(req);
      if (!tenantId) {
        return res.status(401).json({ success: false, message: 'Unauthorized: missing tenant context' });
      }

      const id = String(req.params.id);
      const { name, branchCode, location, phone, email, isHeadquarters, isActive } = req.body || {};

      const updated = await db.execute(sql`
        UPDATE branches
        SET name = COALESCE(${name ? String(name).trim() : null}, name),
            branch_code = COALESCE(${branchCode !== undefined ? String(branchCode).trim().toUpperCase() : null}, branch_code),
            location = COALESCE(${location !== undefined ? String(location).trim() : null}, location),
            phone = COALESCE(${phone !== undefined ? String(phone).trim() : null}, phone),
            email = COALESCE(${email !== undefined ? String(email).trim().toLowerCase() : null}, email),
            is_headquarters = COALESCE(${isHeadquarters !== undefined ? Boolean(isHeadquarters) : null}, is_headquarters),
            is_active = COALESCE(${isActive !== undefined ? Boolean(isActive) : null}, is_active)
        WHERE id = ${id} AND tenant_id = ${tenantId}
        RETURNING id,
                  tenant_id AS "tenantId",
                  business_id AS "businessId",
                  name,
                  COALESCE(branch_code, '') AS "branchCode",
                  COALESCE(location, '') AS location,
                  COALESCE(phone, '') AS phone,
                  COALESCE(email, '') AS email,
                  COALESCE(is_headquarters, FALSE) AS "isHeadquarters",
                  COALESCE(is_active, TRUE) AS "isActive",
                  created_at AS "createdAt"
      `);

      const row = rowsOf(updated)[0];
      if (!row) {
        return res.status(404).json({ success: false, message: 'Branch not found or unauthorized' });
      }

      return res.status(200).json({ success: true, message: 'Branch updated successfully', data: row });
    } catch (error: any) {
      console.error('[BRANCHES PUT ERROR]', error);
      return res.status(500).json({
        success: false,
        message: error?.cause?.message || error?.message || 'Failed to update branch',
      });
    }
  }
}