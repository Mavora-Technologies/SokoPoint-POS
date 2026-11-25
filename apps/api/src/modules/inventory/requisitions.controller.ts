import { Request, Response } from 'express';
import { db } from '../../db';
import { products } from '../../db/schema';
import { eq, and, inArray, sql } from 'drizzle-orm';

type AuthRequest = Request & {
  auth?: { tenantId?: string; userId?: string; email?: string; role?: string };
  user?: { tenantId?: string; userId?: string; email?: string; role?: string };
};

const rowsOf = (result: any): any[] => (Array.isArray(result) ? result : result?.rows || []);

export class RequisitionsController {
  // GET /api/v1/inventory/requisitions
  static async getAll(req: AuthRequest, res: Response) {
    try {
      const tenantId = req.auth?.tenantId || req.user?.tenantId;
      if (!tenantId) {
        return res.status(401).json({ success: false, message: 'Unauthorized: missing tenant context' });
      }

      const reqRes = await db.execute(sql`
        SELECT id,
               reference,
               branch_name AS "branchName",
               department,
               supplier_id AS "supplierId",
               supplier_name AS "supplierName",
               priority,
               estimated_commitment::float AS "estimatedCommitment",
               status,
               submitted_by AS "submittedBy",
               notes,
               created_at AS "createdAt",
               updated_at AS "updatedAt"
        FROM purchase_requisitions
        WHERE tenant_id = ${tenantId}
        ORDER BY created_at DESC
      `);

      const reqList = rowsOf(reqRes);

      const itemsRes = await db.execute(sql`
        SELECT i.id,
               i.requisition_id AS "requisitionId",
               i.product_id AS "productId",
               i.quantity,
               i.unit_cost::float AS "unitCost",
               i.subtotal::float AS "subtotal",
               p.name AS "productName",
               COALESCE(p.sku, 'NO-SKU') AS "sku",
               COALESCE(p.reorder_level, p.minimum_stock, 0)::int AS "currentOnHand"
        FROM purchase_requisition_items i
        JOIN products p
          ON p.id = i.product_id
         AND p.tenant_id = i.tenant_id
        WHERE i.tenant_id = ${tenantId}
        ORDER BY p.name ASC
      `);

      const itemsByReq = new Map<string, any[]>();
      for (const line of rowsOf(itemsRes)) {
        const list = itemsByReq.get(line.requisitionId) || [];
        list.push(line);
        itemsByReq.set(line.requisitionId, list);
      }

      const enriched = reqList.map((r: any) => ({
        ...r,
        items: itemsByReq.get(r.id) || [],
      }));

      return res.status(200).json({ success: true, data: enriched });
    } catch (error: any) {
      console.error('[REQUISITIONS GET ERROR]', error);
      return res.status(500).json({
        success: false,
        message: error?.message || 'Failed to load purchase requisitions',
      });
    }
  }

  // POST /api/v1/inventory/requisitions
  static async create(req: AuthRequest, res: Response) {
    try {
      const tenantId = req.auth?.tenantId || req.user?.tenantId;
      if (!tenantId) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }

      const {
        branchName = 'Main Branch',
        department = 'RETAIL_FLOOR',
        priority = 'NORMAL',
        notes = '',
        items = [],
      } = req.body || {};

      if (!Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ success: false, message: 'Add at least one SKU to submit a requisition.' });
      }

      const productIds = Array.from(new Set(items.map((i: any) => String(i.productId))));
      const dbProducts = await db
        .select()
        .from(products)
        .where(and(eq(products.tenantId, tenantId), inArray(products.id, productIds)));

      const prodMap = new Map(dbProducts.map((p) => [p.id, p]));
      const submittedBy = req.auth?.email || req.user?.email || 'Admin';
      const ref = `PR-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

      let totalCommitment = 0;
      const pricedLines = items.map((line: any) => {
        const prod = prodMap.get(String(line.productId));
        if (!prod) {
          throw new Error('One or more selected products do not belong to this tenant.');
        }
        const qty = Math.max(1, parseInt(String(line.quantity), 10) || 1);
        const unitCost = Number(prod.costPrice ?? prod.sellingPrice ?? 0);
        const subtotal = qty * unitCost;
        totalCommitment += subtotal;
        return { productId: prod.id, qty, unitCost, subtotal };
      });

      const created = await db.transaction(async (tx) => {
        const prRes = await tx.execute(sql`
          INSERT INTO purchase_requisitions (
            tenant_id, reference, branch_name, department, priority,
            estimated_commitment, status, submitted_by, notes
          )
          VALUES (
            ${tenantId}, ${ref}, ${branchName}, ${department}, ${priority},
            ${totalCommitment.toFixed(2)}, 'PENDING_REVIEW', ${submittedBy}, ${notes}
          )
          RETURNING id, reference, status, estimated_commitment::float AS "estimatedCommitment"
        `);

        const pr = rowsOf(prRes)[0];

        for (const line of pricedLines) {
          await tx.execute(sql`
            INSERT INTO purchase_requisition_items (
              tenant_id, requisition_id, product_id, quantity, unit_cost, subtotal
            )
            VALUES (
              ${tenantId}, ${pr.id}, ${line.productId}, ${line.qty},
              ${line.unitCost.toFixed(2)}, ${line.subtotal.toFixed(2)}
            )
          `);
        }

        return pr;
      });

      return res.status(201).json({ success: true, data: created });
    } catch (error: any) {
      console.error('[REQUISITIONS CREATE ERROR]', error);
      return res.status(400).json({
        success: false,
        message: error?.message || 'Failed to submit purchase requisition',
      });
    }
  }

  // PATCH /api/v1/inventory/requisitions/:id/status
  static async updateStatus(req: AuthRequest, res: Response) {
    try {
      const tenantId = req.auth?.tenantId || req.user?.tenantId;
      if (!tenantId) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }

      const reqId = String(req.params.id);
      const { status } = req.body || {};

      const allowed = ['PENDING_REVIEW', 'APPROVED', 'CONVERTED_TO_PO', 'REJECTED'];
      if (!allowed.includes(String(status))) {
        return res.status(400).json({ success: false, message: 'Invalid requisition status.' });
      }

      const updRes = await db.execute(sql`
        UPDATE purchase_requisitions
        SET status = ${String(status)},
            updated_at = NOW()
        WHERE id = ${reqId} AND tenant_id = ${tenantId}
        RETURNING id, reference, status
      `);

      const updated = rowsOf(updRes)[0];
      if (!updated) {
        return res.status(404).json({ success: false, message: 'Purchase requisition not found.' });
      }

      return res.status(200).json({ success: true, data: updated });
    } catch (error: any) {
      console.error('[REQUISITIONS STATUS ERROR]', error);
      return res.status(500).json({
        success: false,
        message: error?.message || 'Failed to update requisition status',
      });
    }
  }
}