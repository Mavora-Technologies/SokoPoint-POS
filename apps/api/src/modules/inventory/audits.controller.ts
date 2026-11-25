import { Request, Response } from 'express';
import { db } from '../../db';
import { products } from '../../db/schema';
import { eq, and, sql } from 'drizzle-orm';

type AuthRequest = Request & {
  auth?: { tenantId?: string; userId?: string; email?: string; role?: string };
  user?: { tenantId?: string; userId?: string; email?: string; role?: string };
};

const rowsOf = (result: any): any[] => (Array.isArray(result) ? result : result?.rows || []);

export class AuditsController {
  // GET /api/v1/inventory/audits
  static async getAll(req: AuthRequest, res: Response) {
    try {
      const tenantId = req.auth?.tenantId || req.user?.tenantId;
      if (!tenantId) {
        return res.status(401).json({ success: false, message: 'Unauthorized: missing tenant context' });
      }

      const result = await db.execute(sql`
        SELECT id, reference, branch_name AS "branch", auditor_name AS "auditor",
               status, total_items_counted AS "totalItemsCounted",
               variance_value::float AS "varianceValue", notes, created_at AS "date"
        FROM stock_audits
        WHERE tenant_id = ${tenantId}
        ORDER BY created_at DESC
      `);

      return res.status(200).json({ success: true, data: rowsOf(result) });
    } catch (error: any) {
      console.error('[AUDITS GET ERROR]', error);
      return res.status(500).json({
        success: false,
        message: error?.message || 'Failed to load audit sessions',
      });
    }
  }

  // GET /api/v1/inventory/audits/:id
  static async getById(req: AuthRequest, res: Response) {
    try {
      const tenantId = req.auth?.tenantId || req.user?.tenantId;
      if (!tenantId) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }

      const auditId = String(req.params.id);
      const auditRes = await db.execute(sql`
        SELECT id, reference, branch_name AS "branch", auditor_name AS "auditor",
               status, total_items_counted AS "totalItemsCounted",
               variance_value::float AS "varianceValue", notes, created_at AS "date"
        FROM stock_audits
        WHERE id = ${auditId} AND tenant_id = ${tenantId}
        LIMIT 1
      `);

      const audit = rowsOf(auditRes)[0];
      if (!audit) {
        return res.status(404).json({ success: false, message: 'Audit session not found' });
      }

      const itemsRes = await db.execute(sql`
        SELECT i.id, i.product_id AS "productId", i.system_qty AS "systemQty",
               i.physical_count AS "physicalCount", i.variance,
               i.unit_cost::float AS "unitCost", i.variance_value::float AS "varianceValue",
               i.remarks, p.name AS "productName", COALESCE(p.sku, 'N/A') AS "sku",
               COALESCE(p.barcode, '') AS "barcode"
        FROM stock_audit_items i
        JOIN products p ON p.id = i.product_id
        WHERE i.audit_id = ${auditId} AND i.tenant_id = ${tenantId}
        ORDER BY p.name ASC
      `);

      return res.status(200).json({
        success: true,
        data: { ...audit, items: rowsOf(itemsRes) },
      });
    } catch (error: any) {
      console.error('[AUDITS GET BY ID ERROR]', error);
      return res.status(500).json({
        success: false,
        message: error?.message || 'Failed to load audit report',
      });
    }
  }

  // POST /api/v1/inventory/audits
  static async create(req: AuthRequest, res: Response) {
    try {
      const tenantId = req.auth?.tenantId || req.user?.tenantId;
      if (!tenantId) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }

      const { branch = 'Main Branch', notes = '', status = 'APPROVED', items = [] } = req.body || {};
      if (!Array.isArray(items) || items.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'At least one counted product is required to submit a stocktake.',
        });
      }

      const auditor = req.auth?.email || req.user?.email || 'Admin';
      const ref = `AUD-${Math.floor(1000 + Math.random() * 9000)}`;

      // Load authoritative unit costs from tenant catalog
      const prodRows = await db
        .select({
          id: products.id,
          costPrice: products.costPrice,
          sellingPrice: products.sellingPrice,
        })
        .from(products)
        .where(eq(products.tenantId, tenantId));

      const prodCostMap = new Map(
        prodRows.map((p) => [p.id, Number(p.costPrice ?? p.sellingPrice ?? 0)])
      );

      let totalVarianceValue = 0;
      const normalizedItems = items.map((item: any) => {
        const systemQty = Number(item.systemQty ?? 0);
        const physicalCount = Math.max(0, Number(item.physicalCount ?? 0));
        const variance = physicalCount - systemQty;
        const unitCost = prodCostMap.get(String(item.productId)) ?? 0;
        const varianceValue = variance * unitCost;
        totalVarianceValue += varianceValue;

        return {
          productId: String(item.productId),
          systemQty,
          physicalCount,
          variance,
          unitCost,
          varianceValue,
          remarks: item.remarks ? String(item.remarks).trim() : null,
        };
      });

      const createdAudit = await db.transaction(async (tx) => {
        const auditRes = await tx.execute(sql`
          INSERT INTO stock_audits (tenant_id, reference, branch_name, auditor_name, status, total_items_counted, variance_value, notes)
          VALUES (${tenantId}, ${ref}, ${branch}, ${auditor}, ${status}, ${normalizedItems.length}, ${totalVarianceValue.toFixed(2)}, ${notes})
          RETURNING id, reference, branch_name AS "branch", auditor_name AS "auditor", status,
                    total_items_counted AS "totalItemsCounted", variance_value::float AS "varianceValue", created_at AS "date"
        `);

        const audit = rowsOf(auditRes)[0];

        for (const line of normalizedItems) {
          await tx.execute(sql`
            INSERT INTO stock_audit_items (tenant_id, audit_id, product_id, system_qty, physical_count, variance, unit_cost, variance_value, remarks)
            VALUES (${tenantId}, ${audit.id}, ${line.productId}, ${line.systemQty}, ${line.physicalCount}, ${line.variance}, ${line.unitCost.toFixed(2)}, ${line.varianceValue.toFixed(2)}, ${line.remarks})
          `);

          // Reconcile stock and log movement when approved and a discrepancy exists
          if (status === 'APPROVED' && line.variance !== 0) {
            await tx
              .update(products)
              .set({
                reorderLevel: line.physicalCount,
                minimumStock: line.physicalCount,
                updatedAt: new Date(),
              })
              .where(and(eq(products.id, line.productId), eq(products.tenantId, tenantId)));

            await tx.execute(sql`
              INSERT INTO stock_movements (tenant_id, product_id, reference, type, quantity_change, operator_name, notes)
              VALUES (${tenantId}, ${line.productId}, ${ref}, 'ADJUSTMENT', ${line.variance}, ${auditor}, ${line.remarks || `Physical audit reconciliation (${branch})`})
            `);
          }
        }

        return audit;
      });

      return res.status(201).json({ success: true, data: createdAudit });
    } catch (error: any) {
      console.error('[AUDITS CREATE ERROR]', error);
      return res.status(500).json({
        success: false,
        message: error?.message || 'Failed to save audit session',
      });
    }
  }
}